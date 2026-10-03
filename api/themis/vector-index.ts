export type IndexedDocument = {
  id: string
  contentHash: string
  driveVersion: string
  title: string
  bytes: Uint8Array
  filename: string
  mimeType: string
}

export type IndexHit = {
  fileId: string
  text: string
  score: number
  attributes: Record<string, string | number | boolean>
}

export interface KnowledgeIndex {
  publish(document: IndexedDocument, signal?: AbortSignal): Promise<string>
  search(question: string, signal?: AbortSignal): Promise<IndexHit[]>
  /** Only pass file IDs created for this catalogue; this deletes the uploaded file too. */
  remove(fileId: string, signal?: AbortSignal): Promise<void>
}

export type OpenAIKnowledgeIndexConfig = {
  apiKey: string
  vectorStoreId: string
  fetchImpl?: typeof fetch
  pollIntervalMs?: number
  pollTimeoutMs?: number
}

export class KnowledgeIndexError extends Error {
  constructor(public code: string, public status?: number) { super(code) }
}

const API = "https://api.openai.com/v1"
const MAX_JSON_BYTES = 2 * 1024 * 1024
const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_TEXT_LENGTH = 12_000
const FILE_ID = /^file[-_][A-Za-z0-9]+$/

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function text(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && !/[\u0000-\u001f\u007f]/.test(value)
}

function fileId(value: unknown): value is string {
  return text(value, 200) && FILE_ID.test(value)
}

function aborted(signal: AbortSignal): never {
  if (signal.reason instanceof KnowledgeIndexError) throw signal.reason
  throw new DOMException("The operation was aborted.", "AbortError")
}

function checkSignal(signal: AbortSignal) {
  if (signal.aborted) aborted(signal)
}

function operation(timeoutMs: number, caller?: AbortSignal) {
  const controller = new AbortController()
  const abort = () => controller.abort(new DOMException("The operation was aborted.", "AbortError"))
  if (caller?.aborted) abort()
  else caller?.addEventListener("abort", abort, { once: true })
  const timer = setTimeout(() => controller.abort(new KnowledgeIndexError("index_timeout")), timeoutMs)
  return { signal: controller.signal, dispose: () => {
    clearTimeout(timer)
    caller?.removeEventListener("abort", abort)
  } }
}

async function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    // The promise may already have started before cancellation was observed.
    void promise.catch(() => undefined)
    aborted(signal)
  }
  let onAbort: () => void = () => undefined
  const interruption = new Promise<never>((_resolve, reject) => {
    onAbort = () => { try { aborted(signal) } catch (error) { reject(error) } }
    signal.addEventListener("abort", onAbort, { once: true })
    if (signal.aborted) onAbort()
  })
  try { return await Promise.race([promise, interruption]) }
  finally { signal.removeEventListener("abort", onAbort) }
}

async function pause(ms: number, signal: AbortSignal) {
  checkSignal(signal)
  let timer: ReturnType<typeof setTimeout> | undefined
  try { await abortable(new Promise<void>((resolve) => { timer = setTimeout(resolve, ms) }), signal) }
  finally { clearTimeout(timer) }
}

async function json(response: Response, signal: AbortSignal): Promise<unknown> {
  const declared = response.headers.get("content-length")
  if (declared && Number(declared) > MAX_JSON_BYTES) {
    void response.body?.cancel().catch(() => undefined)
    throw new KnowledgeIndexError("invalid_index_response")
  }
  if (!response.body) throw new KnowledgeIndexError("invalid_index_response")
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  let completed = false
  try {
    while (true) {
      const part = await abortable(reader.read(), signal)
      if (part.done) { completed = true; break }
      length += part.value.byteLength
      if (length > MAX_JSON_BYTES) throw new KnowledgeIndexError("invalid_index_response")
      chunks.push(part.value)
    }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) }
    catch { throw new KnowledgeIndexError("invalid_index_response") }
  } catch (error) {
    checkSignal(signal)
    if (error instanceof KnowledgeIndexError) throw error
    throw new KnowledgeIndexError("invalid_index_response")
  } finally {
    if (!completed) void reader.cancel().catch(() => undefined)
    try { reader.releaseLock() } catch { /* Preserve the bounded-read error. */ }
  }
}

function attributes(value: unknown): Record<string, string | number | boolean> {
  if (value === null) return {}
  if (!record(value) || Object.keys(value).length > 16) throw new KnowledgeIndexError("invalid_index_response")
  const result: Record<string, string | number | boolean> = Object.create(null)
  for (const [key, attribute] of Object.entries(value)) {
    if (!text(key, 64) || !((typeof attribute === "string" && attribute.length <= 512) ||
      (typeof attribute === "number" && Number.isFinite(attribute)) || typeof attribute === "boolean")) {
      throw new KnowledgeIndexError("invalid_index_response")
    }
    result[key] = attribute
  }
  return result
}

function validateDocument(document: IndexedDocument) {
  if (!text(document.id, 512) || typeof document.contentHash !== "string" || !/^[a-fA-F0-9]{64}$/.test(document.contentHash) ||
    !text(document.driveVersion, 512) || !text(document.title, 300) || !text(document.filename, 255) ||
    /[\\/]/.test(document.filename) || !text(document.mimeType, 128) || !/^[\w.+-]+\/[\w.+-]+$/.test(document.mimeType) ||
    !(document.bytes instanceof Uint8Array) || !document.bytes.byteLength || document.bytes.byteLength > MAX_FILE_BYTES) {
    throw new KnowledgeIndexError("invalid_index_document")
  }
}

export async function createKnowledgeStore(config: { apiKey: string; folderId: string; fetchImpl?: typeof fetch }, signal?: AbortSignal): Promise<string> {
  if (!text(config.apiKey, 1000) || !text(config.folderId, 200) || !/^[A-Za-z0-9_-]+$/.test(config.folderId)) {
    throw new KnowledgeIndexError("invalid_index_config")
  }
  const op = operation(30_000, signal)
  try {
    checkSignal(op.signal)
    let response: Response
    try {
      // Creation is deliberately attempted once: a lost response may still mean the store exists.
      response = await abortable((config.fetchImpl ?? fetch)(`${API}/vector_stores`, {
        method: "POST", signal: op.signal, redirect: "error",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "OpenAI-Beta": "assistants=v2" },
        body: JSON.stringify({ name: "THEMIS approved knowledge", metadata: { drive_folder_id: config.folderId } }),
      }), op.signal)
    } catch {
      checkSignal(op.signal)
      throw new KnowledgeIndexError("index_unavailable")
    }
    if (!response.ok) {
      void response.body?.cancel().catch(() => undefined)
      throw new KnowledgeIndexError("index_unavailable", response.status)
    }
    const result = await json(response, op.signal)
    if (!record(result) || result.object !== "vector_store" || !text(result.id, 200) || !/^vs_[A-Za-z0-9]+$/.test(result.id)) {
      throw new KnowledgeIndexError("invalid_index_response")
    }
    return result.id
  } finally { op.dispose() }
}

export class OpenAIKnowledgeIndex implements KnowledgeIndex {
  private readonly fetchImpl: typeof fetch
  private readonly pollIntervalMs: number
  private readonly pollTimeoutMs: number

  constructor(private readonly config: OpenAIKnowledgeIndexConfig) {
    this.pollIntervalMs = config.pollIntervalMs ?? 500
    this.pollTimeoutMs = config.pollTimeoutMs ?? 120_000
    if (!text(config.apiKey, 1000) || !text(config.vectorStoreId, 200) || !/^vs_[A-Za-z0-9]+$/.test(config.vectorStoreId) ||
      !Number.isInteger(this.pollIntervalMs) || this.pollIntervalMs < 1 || this.pollIntervalMs > 30_000 ||
      !Number.isInteger(this.pollTimeoutMs) || this.pollTimeoutMs < 1 || this.pollTimeoutMs > 600_000) {
      throw new KnowledgeIndexError("invalid_index_config")
    }
    this.fetchImpl = config.fetchImpl ?? fetch
  }

  private async request(path: string, init: RequestInit, signal: AbortSignal, absentAllowed = false) {
    checkSignal(signal)
    let response: Response
    try {
      response = await abortable(this.fetchImpl(`${API}${path}`, { ...init, signal, redirect: "error", headers: {
        Authorization: `Bearer ${this.config.apiKey}`, "OpenAI-Beta": "assistants=v2", ...init.headers,
      } }), signal)
    } catch {
      checkSignal(signal)
      throw new KnowledgeIndexError("index_unavailable")
    }
    if (!response.ok) {
      void response.body?.cancel().catch(() => undefined)
      if (absentAllowed && response.status === 404) return null
      throw new KnowledgeIndexError("index_unavailable", response.status)
    }
    return response
  }

  private attachment(value: unknown, id: string): "in_progress" | "completed" {
    if (!record(value) || value.object !== "vector_store.file" || value.id !== id || value.vector_store_id !== this.config.vectorStoreId ||
      !["in_progress", "completed", "failed", "cancelled"].includes(value.status as string)) {
      throw new KnowledgeIndexError("invalid_index_response")
    }
    if (value.status === "failed" || value.status === "cancelled") throw new KnowledgeIndexError("indexing_failed")
    return value.status as "in_progress" | "completed"
  }

  async publish(document: IndexedDocument, signal?: AbortSignal): Promise<string> {
    validateDocument(document)
    const op = operation(this.pollTimeoutMs, signal)
    let uploaded: string | undefined
    try {
      const form = new FormData()
      form.append("purpose", "assistants")
      form.append("file", new Blob([new Uint8Array(document.bytes)], { type: document.mimeType }), document.filename)
      const upload = await json((await this.request("/files", { method: "POST", body: form }, op.signal))!, op.signal)
      if (record(upload) && fileId(upload.id)) uploaded = upload.id
      if (!record(upload) || upload.object !== "file" || !uploaded) throw new KnowledgeIndexError("invalid_index_response")
      const path = `/vector_stores/${this.config.vectorStoreId}/files`
      const attached = await json((await this.request(path, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: uploaded, attributes: {
          source_id: document.id, content_hash: document.contentHash, drive_version: document.driveVersion,
        } }),
      }, op.signal))!, op.signal)
      let status = this.attachment(attached, uploaded)
      while (status !== "completed") {
        await pause(this.pollIntervalMs, op.signal)
        const result = await json((await this.request(`${path}/${uploaded}`, { method: "GET" }, op.signal))!, op.signal)
        status = this.attachment(result, uploaded)
      }
      checkSignal(op.signal)
      return uploaded
    } catch (error) {
      if (uploaded) await this.cleanup(uploaded)
      throw error
    } finally { op.dispose() }
  }

  async search(question: string, signal?: AbortSignal): Promise<IndexHit[]> {
    if (typeof question !== "string" || !question.trim() || question.length > 8000) throw new KnowledgeIndexError("invalid_index_question")
    const op = operation(30_000, signal)
    try {
      const result = await json((await this.request(`/vector_stores/${this.config.vectorStoreId}/search`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: question, rewrite_query: true, max_num_results: 30 }),
      }, op.signal))!, op.signal)
      if (!record(result) || result.object !== "vector_store.search_results.page" || !Array.isArray(result.data) || result.data.length > 30 ||
        typeof result.has_more !== "boolean" || !(result.next_page === null || text(result.next_page, 2000)) ||
        !Array.isArray(result.search_query) || result.search_query.length > 16 || result.search_query.some((query) => typeof query !== "string" || query.length > 8000)) {
        throw new KnowledgeIndexError("invalid_index_response")
      }
      const hits: IndexHit[] = []
      for (const row of result.data) {
        if (!record(row) || !fileId(row.file_id) || !text(row.filename, 255) || typeof row.score !== "number" ||
          !Number.isFinite(row.score) || row.score < 0 || row.score > 1 || !Array.isArray(row.content) || row.content.length > 100) {
          throw new KnowledgeIndexError("invalid_index_response")
        }
        const metadata = attributes(row.attributes)
        const parts: string[] = []
        for (const part of row.content) {
          if (!record(part) || part.type !== "text" || typeof part.text !== "string" || part.text.length > MAX_TEXT_LENGTH) {
            throw new KnowledgeIndexError("invalid_index_response")
          }
          if (part.text.trim()) parts.push(part.text)
        }
        const excerpt = parts.join("\n")
        if (excerpt.length > MAX_TEXT_LENGTH) throw new KnowledgeIndexError("invalid_index_response")
        if (excerpt) hits.push({ fileId: row.file_id, text: excerpt, score: row.score, attributes: metadata })
      }
      return hits
    } finally { op.dispose() }
  }

  async remove(id: string, signal?: AbortSignal): Promise<void> {
    if (!fileId(id)) throw new KnowledgeIndexError("invalid_index_file")
    const op = operation(30_000, signal)
    try {
      const detached = await this.request(`/vector_stores/${this.config.vectorStoreId}/files/${id}`, { method: "DELETE" }, op.signal, true)
      void detached?.body?.cancel().catch(() => undefined)
      const deleted = await this.request(`/files/${id}`, { method: "DELETE" }, op.signal, true)
      void deleted?.body?.cancel().catch(() => undefined)
    } finally { op.dispose() }
  }

  private async cleanup(id: string) {
    // Cleanup is best effort; the active catalogue must independently exclude staged files.
    const op = operation(5000)
    try {
      for (const path of [`/vector_stores/${this.config.vectorStoreId}/files/${id}`, `/files/${id}`]) {
        try {
          const response = await this.request(path, { method: "DELETE" }, op.signal, true)
          void response?.body?.cancel().catch(() => undefined)
        } catch { /* Best effort: retain the original publication error. */ }
      }
    } finally { op.dispose() }
  }
}
