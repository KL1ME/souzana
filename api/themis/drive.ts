export type DriveFile = {
  id: string
  name: string
  mimeType: string
  version: string
  modifiedTime: string
  size?: number
  parents: string[]
}

export type DriveContent = {
  file: DriveFile
  bytes: Uint8Array
  filename: string
  mimeType: string
}

export interface DriveSource {
  list(signal?: AbortSignal): Promise<DriveFile[]>
  read(file: DriveFile, signal?: AbortSignal): Promise<DriveContent>
}

export type GoogleDriveConfig = {
  folderId: string
  accessToken: () => Promise<string>
  fetchImpl?: typeof fetch
  maxFiles?: number
  maxFileBytes?: number
}

export class DriveError extends Error {
  constructor(public readonly code: string, message: string, public readonly status?: number) {
    super(message)
    this.name = "DriveError"
  }
}

const apiBase = "https://www.googleapis.com/drive/v3/files"
const folderMime = "application/vnd.google-apps.folder"
const documentMime = "application/vnd.google-apps.document"
const metadataFields = "id,name,mimeType,version,modifiedTime,size,parents,trashed"
const supportedBlobs = new Map([
  ["text/plain", ".txt"],
  ["text/markdown", ".md"],
  ["application/pdf", ".pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
])

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value)
}

function invalidMetadata(): never {
  throw new DriveError("drive_invalid_metadata", "Google Drive returned invalid file metadata.")
}

function parseMetadata(value: unknown): { file: DriveFile; trashed: boolean } {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidMetadata()
  const item = value as Record<string, unknown>
  if (!validId(item.id) || typeof item.name !== "string" || !item.name.trim() || item.name.length > 1000 ||
    typeof item.mimeType !== "string" || item.mimeType.length > 200 || !/^[\w.+-]+\/[\w.+-]+$/.test(item.mimeType) ||
    typeof item.version !== "string" || !/^[0-9]{1,100}$/.test(item.version) ||
    typeof item.modifiedTime !== "string" || item.modifiedTime.length > 64 || !Number.isFinite(Date.parse(item.modifiedTime)) ||
    typeof item.trashed !== "boolean") invalidMetadata()
  const parents = item.parents ?? []
  if (!Array.isArray(parents) || parents.length > 10 || !parents.every(validId) || new Set(parents).size !== parents.length) invalidMetadata()
  let size: number | undefined
  if (item.size !== undefined) {
    if ((typeof item.size !== "string" || !/^\d{1,20}$/.test(item.size)) && typeof item.size !== "number") invalidMetadata()
    size = Number(item.size)
    if (!Number.isSafeInteger(size) || size < 0) invalidMetadata()
  }
  return {
    file: { id: item.id, name: item.name, mimeType: item.mimeType, version: item.version,
      modifiedTime: item.modifiedTime, ...(size === undefined ? {} : { size }), parents: [...parents] },
    trashed: item.trashed,
  }
}

function sameVersion(expected: DriveFile, actual: DriveFile): boolean {
  return expected.id === actual.id && expected.version === actual.version && expected.modifiedTime === actual.modifiedTime &&
    expected.name === actual.name && expected.mimeType === actual.mimeType && expected.size === actual.size &&
    expected.parents.length === actual.parents.length && expected.parents.every((parent) => actual.parents.includes(parent))
}

function safeFilename(name: string, extension: string): string {
  const stem = name.normalize("NFC").replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, "_")
    .replace(/^\.+/, "").replace(/\.[^.]+$/, "").replace(/[.\s]+$/, "").slice(0, 150).trim()
  return `${stem || "document"}${extension}`
}

async function boundedBytes(response: Response, maximum: number, signal?: AbortSignal): Promise<Uint8Array> {
  const declared = response.headers.get("content-length")
  if (declared !== null && /^\d+$/.test(declared) && Number(declared) > maximum) {
    await response.body?.cancel()
    throw new DriveError("drive_file_too_large", "Google Drive response exceeds the configured size limit.")
  }
  if (!response.body) return new Uint8Array()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      signal?.throwIfAborted()
      const result = await reader.read()
      if (result.done) break
      length += result.value.byteLength
      if (length > maximum) throw new DriveError("drive_file_too_large", "Google Drive response exceeds the configured size limit.")
      chunks.push(result.value)
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}

/** Reads only direct children of one folder; it never follows shortcuts or source URLs. */
export class GoogleDriveSource implements DriveSource {
  private readonly fetchImpl: typeof fetch
  private readonly maxFiles: number
  private readonly maxFileBytes: number

  constructor(private readonly config: GoogleDriveConfig) {
    if (!validId(config.folderId)) throw new DriveError("drive_invalid_folder", "A Google Drive folder ID is required.")
    if (typeof config.accessToken !== "function") throw new DriveError("drive_auth_unavailable", "Google Drive authentication is not configured.")
    this.fetchImpl = config.fetchImpl ?? fetch
    this.maxFiles = config.maxFiles ?? 1000
    this.maxFileBytes = config.maxFileBytes ?? 10 * 1024 * 1024
    if (!Number.isSafeInteger(this.maxFiles) || this.maxFiles < 1 || this.maxFiles > 10_000 ||
      !Number.isSafeInteger(this.maxFileBytes) || this.maxFileBytes < 1 || this.maxFileBytes > 100 * 1024 * 1024) {
      throw new DriveError("drive_invalid_limit", "Google Drive limits are invalid.")
    }
  }

  private async request(url: URL, signal?: AbortSignal): Promise<Response> {
    signal?.throwIfAborted()
    let token: string
    try { token = await this.config.accessToken() } catch {
      throw new DriveError("drive_auth_unavailable", "Google Drive authentication is unavailable.")
    }
    if (typeof token !== "string" || !token || token.length > 16_384 || /\s/.test(token)) {
      throw new DriveError("drive_auth_unavailable", "Google Drive authentication is unavailable.")
    }
    signal?.throwIfAborted()
    let response: Response
    try {
      response = await this.fetchImpl(url, { method: "GET", headers: { Authorization: `Bearer ${token}` }, redirect: "error", signal })
    } catch (error) {
      if (signal?.aborted) signal.throwIfAborted()
      if (error instanceof DOMException && error.name === "AbortError") throw error
      throw new DriveError("drive_request_failed", "Google Drive could not be reached.")
    }
    if (response.redirected || response.status >= 300 && response.status < 400 ||
      response.url && !response.url.startsWith(`${apiBase}/`) && response.url !== apiBase && !response.url.startsWith(`${apiBase}?`)) {
      await response.body?.cancel()
      throw new DriveError("drive_redirect_rejected", "Google Drive response redirected outside the expected API.")
    }
    if (!response.ok) {
      await response.body?.cancel()
      const code = response.status === 401 || response.status === 403 ? "drive_access_denied" : response.status === 404 ? "drive_not_found" : "drive_request_failed"
      throw new DriveError(code, "Google Drive could not read the approved folder or file.", response.status)
    }
    return response
  }

  private async json(url: URL, signal?: AbortSignal): Promise<unknown> {
    const response = await this.request(url, signal)
    const bytes = await boundedBytes(response, 2 * 1024 * 1024, signal)
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) } catch { invalidMetadata() }
  }

  private async metadata(id: string, signal?: AbortSignal): Promise<{ file: DriveFile; trashed: boolean }> {
    const url = new URL(`${apiBase}/${id}`)
    url.searchParams.set("fields", metadataFields)
    url.searchParams.set("supportsAllDrives", "true")
    const item = parseMetadata(await this.json(url, signal))
    if (item.file.id !== id) invalidMetadata()
    return item
  }

  private confined(item: { file: DriveFile; trashed: boolean }): DriveFile {
    if (item.trashed || !item.file.parents.includes(this.config.folderId)) {
      throw new DriveError("drive_file_outside_folder", "A Google Drive file is no longer an active child of the approved folder.")
    }
    return item.file
  }

  async list(signal?: AbortSignal): Promise<DriveFile[]> {
    const folder = await this.metadata(this.config.folderId, signal)
    if (folder.trashed || folder.file.mimeType !== folderMime) {
      throw new DriveError("drive_invalid_folder", "The configured Google Drive item is not an active folder.")
    }
    const files: DriveFile[] = []
    const ids = new Set<string>()
    const tokens = new Set<string>()
    let pageToken: string | undefined
    let pages = 0
    do {
      if (++pages > this.maxFiles + 1) throw new DriveError("drive_pagination_failed", "Google Drive pagination exceeds the configured limit.")
      const url = new URL(apiBase)
      url.searchParams.set("q", `'${this.config.folderId}' in parents and trashed = false`)
      url.searchParams.set("fields", `nextPageToken,incompleteSearch,files(${metadataFields})`)
      url.searchParams.set("pageSize", String(Math.min(this.maxFiles, 1000)))
      url.searchParams.set("spaces", "drive")
      url.searchParams.set("supportsAllDrives", "true")
      url.searchParams.set("includeItemsFromAllDrives", "true")
      if (pageToken) url.searchParams.set("pageToken", pageToken)
      const value = await this.json(url, signal)
      if (!value || typeof value !== "object" || Array.isArray(value)) invalidMetadata()
      const page = value as Record<string, unknown>
      if (page.incompleteSearch === true) throw new DriveError("drive_incomplete_search", "Google Drive did not return a complete approved-folder listing.")
      if (page.incompleteSearch !== undefined && page.incompleteSearch !== false || !Array.isArray(page.files)) invalidMetadata()
      for (const raw of page.files) {
        const file = this.confined(parseMetadata(raw))
        if (ids.has(file.id)) throw new DriveError("drive_duplicate_file", "Google Drive returned duplicate files during pagination.")
        ids.add(file.id)
        files.push(file)
        if (files.length > this.maxFiles) throw new DriveError("drive_too_many_files", "The approved folder exceeds the configured file limit.")
      }
      const next = page.nextPageToken
      if (next === undefined || next === "") pageToken = undefined
      else {
        if (typeof next !== "string" || next.length > 4096 || /[\u0000-\u001f\u007f]/.test(next)) invalidMetadata()
        if (tokens.has(next)) throw new DriveError("drive_pagination_failed", "Google Drive returned a repeated page token.")
        tokens.add(next)
        pageToken = next
      }
    } while (pageToken)
    return files
  }

  async read(file: DriveFile, signal?: AbortSignal): Promise<DriveContent> {
    const expected = this.confined(parseMetadata({ ...file, trashed: false }))
    const extension = expected.mimeType === documentMime ? ".txt" : supportedBlobs.get(expected.mimeType)
    if (!extension) throw new DriveError("drive_unsupported_type", "This Google Drive file type is not supported for public knowledge indexing.")
    const before = this.confined(await this.metadata(expected.id, signal))
    if (!sameVersion(expected, before)) throw new DriveError("drive_file_changed", "The Google Drive file changed after it was listed.")
    if (before.mimeType !== documentMime && before.size !== undefined && before.size > this.maxFileBytes) {
      throw new DriveError("drive_file_too_large", "The Google Drive file exceeds the configured size limit.")
    }
    const native = before.mimeType === documentMime
    const url = new URL(`${apiBase}/${before.id}${native ? "/export" : ""}`)
    if (native) url.searchParams.set("mimeType", "text/plain")
    else { url.searchParams.set("alt", "media"); url.searchParams.set("supportsAllDrives", "true") }
    const bytes = await boundedBytes(await this.request(url, signal), this.maxFileBytes, signal)
    const after = this.confined(await this.metadata(before.id, signal))
    if (!sameVersion(before, after)) throw new DriveError("drive_file_changed", "The Google Drive file changed during its download.")
    if (!native && before.size !== undefined && before.size !== bytes.byteLength) {
      throw new DriveError("drive_content_incomplete", "Google Drive returned incomplete file content.")
    }
    return { file: after, bytes, filename: safeFilename(after.name, extension), mimeType: native ? "text/plain" : after.mimeType }
  }
}
