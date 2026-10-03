import { createHash, randomUUID } from "node:crypto"
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises"
import { dirname, resolve, sep } from "node:path"

export type DriveApproval = {
  driveId: string
  driveVersion: string
  contentHash: string
  title: string
  sourceUrl: string
  publicCitationVerified: boolean
  reviewedAt: string
  expiresAt: string | null
}

export type CatalogueEntry = {
  driveId: string
  name: string
  mimeType: string
  driveVersion: string
  modifiedTime: string
  contentHash: string | null
  status: "pending" | "approved" | "active" | "withdrawn" | "unsupported"
  approval: DriveApproval | null
  indexedFileId: string | null
}

export type DriveCatalogue = {
  schemaVersion: 1
  revision: number
  folderId: string
  vectorStoreId: string | null
  lastInventoryAt: string | null
  entries: CatalogueEntry[]
  garbage: string[]
}

export function contentHash(bytes: Uint8Array) { return createHash("sha256").update(bytes).digest("hex") }
export function approvalVersion(approval: DriveApproval) {
  return `drivev1:${contentHash(Buffer.from(JSON.stringify([approval.driveId, approval.driveVersion, approval.contentHash,
    approval.title, approval.sourceUrl, approval.publicCitationVerified, approval.reviewedAt, approval.expiresAt])))}`
}

export function validateDriveId(id: string) {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(id)) throw new Error("Invalid Drive file or folder ID.")
}

function date(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)) }
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value) }

export function validateApproval(value: unknown): asserts value is DriveApproval {
  if (!record(value) || typeof value.driveId !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(value.driveId) ||
    typeof value.driveVersion !== "string" || !/^\d{1,30}$/.test(value.driveVersion) ||
    typeof value.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(value.contentHash) ||
    typeof value.title !== "string" || !value.title.trim() || value.title.length > 300 ||
    typeof value.sourceUrl !== "string" || value.sourceUrl.length > 2000 || value.publicCitationVerified !== true ||
    !date(value.reviewedAt) || (value.expiresAt !== null && !date(value.expiresAt))) {
    throw new Error("Approval requires an exact version/hash, review date, title, and verified public citation.")
  }
  const url = new URL(value.sourceUrl)
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid public citation URL.")
}

export function activeEntry(entry: CatalogueEntry, now = Date.now()) {
  return entry.status === "active" && Boolean(entry.indexedFileId) && Boolean(entry.approval) &&
    entry.contentHash === entry.approval?.contentHash && entry.driveVersion === entry.approval?.driveVersion &&
    (!entry.approval?.expiresAt || Date.parse(entry.approval.expiresAt) > now)
}

function validateCatalogue(value: unknown, folderId: string): asserts value is DriveCatalogue {
  if (!record(value) || value.schemaVersion !== 1 || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0 ||
    value.folderId !== folderId || (value.vectorStoreId !== null && (typeof value.vectorStoreId !== "string" || !/^vs_[a-zA-Z0-9_-]+$/.test(value.vectorStoreId))) ||
    (value.lastInventoryAt !== null && !date(value.lastInventoryAt)) || !Array.isArray(value.entries) || value.entries.length > 1000 ||
    !Array.isArray(value.garbage) || value.garbage.length > 2000 || value.garbage.some((id) => typeof id !== "string" || !/^file[-_][a-zA-Z0-9_-]+$/.test(id))) {
    throw new Error("Invalid Drive catalogue or folder mismatch.")
  }
  const ids = new Set<string>()
  for (const entry of value.entries) {
    if (!record(entry) || typeof entry.driveId !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(entry.driveId) || ids.has(entry.driveId) ||
      typeof entry.name !== "string" || entry.name.length > 1000 || typeof entry.mimeType !== "string" || entry.mimeType.length > 200 ||
      typeof entry.driveVersion !== "string" || !/^\d{1,30}$/.test(entry.driveVersion) || !date(entry.modifiedTime) ||
      (entry.contentHash !== null && (typeof entry.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(entry.contentHash))) ||
      !["pending", "approved", "active", "withdrawn", "unsupported"].includes(String(entry.status)) ||
      (entry.indexedFileId !== null && (typeof entry.indexedFileId !== "string" || !/^file[-_][a-zA-Z0-9_-]+$/.test(entry.indexedFileId)))) {
      throw new Error("Invalid Drive catalogue entry.")
    }
    if (entry.approval !== null) {
      validateApproval(entry.approval)
      if (entry.approval.driveId !== entry.driveId) throw new Error("Approval identity mismatch.")
    }
    ids.add(entry.driveId)
  }
}

// Local first-stage catalogue. Use a persistent volume; Cloud Run needs a durable remote adapter.
export class FileCatalogueStore {
  readonly path: string
  constructor(path: string, readonly folderId: string) {
    validateDriveId(folderId)
    this.path = resolve(path)
    for (const directory of ["public", "out"]) {
      const unsafe = resolve(directory)
      if (this.path === unsafe || this.path.startsWith(unsafe + sep)) throw new Error("Keep the catalogue outside publicly served directories.")
    }
  }

  async read(): Promise<DriveCatalogue> {
    try {
      const metadata = await stat(this.path)
      if (metadata.size > 4 * 1024 * 1024) throw new Error("Drive catalogue is too large.")
      const result: unknown = JSON.parse(await readFile(this.path, "utf8"))
      validateCatalogue(result, this.folderId)
      return result
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      return { schemaVersion: 1, revision: 0, folderId: this.folderId, vectorStoreId: null, lastInventoryAt: null, entries: [], garbage: [] }
    }
  }

  async write(catalogue: DriveCatalogue, expectedRevision: number) {
    validateCatalogue(catalogue, this.folderId)
    if (catalogue.revision !== expectedRevision) throw new Error("Drive catalogue revision mismatch.")
    const current = await this.read()
    if (current.revision !== expectedRevision) throw new Error("Drive catalogue changed; repeat the operation.")
    const next = { ...catalogue, revision: expectedRevision + 1 }
    const serialized = JSON.stringify(next, null, 2) + "\n"
    if (Buffer.byteLength(serialized) > 4 * 1024 * 1024) throw new Error("Drive catalogue is too large.")
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 })
    const temporary = `${this.path}.${randomUUID()}.tmp`
    const file = await open(temporary, "wx", 0o600)
    try { await file.writeFile(serialized); await file.sync() }
    finally { await file.close() }
    try { await rename(temporary, this.path) }
    catch (error) { await unlink(temporary).catch(() => {}); throw error }
    const directory = await open(dirname(this.path), "r")
    try { await directory.sync() } finally { await directory.close() }
    return next
  }

  async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 })
    const lockPath = this.path + ".lock"
    let lock
    try { lock = await open(lockPath, "wx", 0o600) }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("Another Drive command is running. A stale lock requires operator review.")
      throw error
    }
    try { return await operation() }
    finally { await lock.close(); await unlink(lockPath) }
  }
}
