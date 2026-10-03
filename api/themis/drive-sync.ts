import { activeEntry, approvalVersion, contentHash, validateApproval, type CatalogueEntry, type DriveApproval, type DriveCatalogue, FileCatalogueStore } from "./catalogue"
import type { DriveFile, DriveSource } from "./drive"
import type { KnowledgeIndex } from "./vector-index"

const supported = new Set(["application/vnd.google-apps.document", "text/plain", "text/markdown", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"])

function retire(entry: CatalogueEntry, catalogue: DriveCatalogue) {
  if (entry.indexedFileId && !catalogue.garbage.includes(entry.indexedFileId)) catalogue.garbage.push(entry.indexedFileId)
  entry.indexedFileId = null
}

function matches(entry: CatalogueEntry, approval: DriveApproval) {
  return entry.driveId === approval.driveId && entry.driveVersion === approval.driveVersion && entry.contentHash === approval.contentHash
}

async function checkedRead(source: DriveSource, file: DriveFile, folderId: string, signal?: AbortSignal) {
  const result = await source.read(file, signal)
  if (result.file.id !== file.id || result.file.version !== file.version || result.file.modifiedTime !== file.modifiedTime ||
    result.file.name !== file.name || result.file.mimeType !== file.mimeType || !result.file.parents.includes(folderId) || !result.bytes.length) {
    throw new Error("The Drive document changed or is empty.")
  }
  return result
}

/** All writers hold the command lock. A failed inventory never implies a deletion. */
async function scan(source: DriveSource, store: FileCatalogueStore, signal?: AbortSignal) {
  let catalogue = await store.read()
  catalogue = await store.write({ ...catalogue, lastInventoryAt: null }, catalogue.revision)
  const files = await source.list(signal)
  const present = new Map(files.map((file) => [file.id, file]))
  if (present.size !== files.length || files.length > 1000) throw new Error("Invalid or excessive Drive inventory.")
  for (const entry of catalogue.entries) {
    const file = present.get(entry.driveId)
    if (!file) { retire(entry, catalogue); entry.status = "withdrawn"; continue }
    const changed = entry.driveVersion !== file.version || entry.name !== file.name || entry.mimeType !== file.mimeType || entry.modifiedTime !== file.modifiedTime
    if (changed || entry.status === "withdrawn" || !supported.has(file.mimeType)) {
      retire(entry, catalogue)
      entry.contentHash = null
      entry.status = supported.has(file.mimeType) ? "pending" : "unsupported"
    }
    entry.name = file.name; entry.mimeType = file.mimeType; entry.driveVersion = file.version; entry.modifiedTime = file.modifiedTime
    if (entry.approval?.expiresAt && Date.parse(entry.approval.expiresAt) <= Date.now()) {
      retire(entry, catalogue); if (entry.status !== "unsupported") entry.status = "pending"
    }
  }
  for (const file of files) if (!catalogue.entries.some((entry) => entry.driveId === file.id)) {
    catalogue.entries.push({ driveId: file.id, name: file.name, mimeType: file.mimeType, driveVersion: file.version,
      modifiedTime: file.modifiedTime, contentHash: null, status: supported.has(file.mimeType) ? "pending" : "unsupported", approval: null, indexedFileId: null })
  }
  // Do not serve remote evidence during an incomplete content/version verification.
  catalogue = await store.write({ ...catalogue, lastInventoryAt: null }, catalogue.revision)
  for (const file of files) {
    if (!supported.has(file.mimeType)) continue
    const downloaded = await checkedRead(source, file, store.folderId, signal)
    const hash = contentHash(downloaded.bytes)
    const entry = catalogue.entries.find((item) => item.driveId === file.id)!
    if (entry.contentHash && entry.contentHash !== hash) { retire(entry, catalogue); entry.status = "pending" }
    entry.contentHash = hash
    if (entry.approval && !matches(entry, entry.approval) && entry.status !== "pending") {
      retire(entry, catalogue); entry.status = "pending"
    }
    catalogue = await store.write(catalogue, catalogue.revision)
  }
  catalogue = await store.write({ ...catalogue, lastInventoryAt: new Date().toISOString() }, catalogue.revision)
  return { catalogue, files }
}

export async function reviewDrive(source: DriveSource, store: FileCatalogueStore, signal?: AbortSignal): Promise<DriveApproval[]> {
  return store.exclusive(async () => {
    const { catalogue } = await scan(source, store, signal)
    return catalogue.entries.filter((entry) => ["pending", "approved", "active"].includes(entry.status) && entry.contentHash).map((entry) => ({
      driveId: entry.driveId, driveVersion: entry.driveVersion, contentHash: entry.contentHash!, title: entry.approval?.title ?? entry.name.slice(0, 300),
      sourceUrl: entry.approval?.sourceUrl ?? "", publicCitationVerified: false, reviewedAt: new Date().toISOString(), expiresAt: entry.approval?.expiresAt ?? null,
    }))
  })
}

export async function approveDrive(source: DriveSource, store: FileCatalogueStore, approvals: unknown, signal?: AbortSignal) {
  if (!Array.isArray(approvals) || approvals.length > 1000 || !approvals.length) throw new Error("Supply a nonempty array of Drive approvals.")
  for (const approval of approvals) {
    validateApproval(approval)
    if (Date.parse(approval.reviewedAt) > Date.now() + 300_000 || approval.expiresAt && Date.parse(approval.expiresAt) <= Date.now()) {
      throw new Error("Review dates cannot be in the future and approval expiry must be in the future.")
    }
  }
  if (new Set(approvals.map((approval) => approval.driveId)).size !== approvals.length) throw new Error("Duplicate Drive approvals.")
  return store.exclusive(async () => {
    let { catalogue } = await scan(source, store, signal)
    // Validate the whole batch before changing any approvals.
    for (const approval of approvals as DriveApproval[]) {
      const entry = catalogue.entries.find((item) => item.driveId === approval.driveId)
      if (!entry || !["pending", "approved", "active"].includes(entry.status) || !matches(entry, approval)) {
        throw new Error("A document changed or left the folder; generate and review a new approval draft.")
      }
    }
    for (const approval of approvals as DriveApproval[]) {
      const entry = catalogue.entries.find((item) => item.driveId === approval.driveId)!
      const keepActive = activeEntry(entry) && matches(entry, approval)
      entry.approval = { ...approval }
      entry.status = keepActive ? "active" : "approved"
    }
    catalogue = await store.write(catalogue, catalogue.revision)
    return catalogue
  })
}

export async function withdrawDrive(store: FileCatalogueStore, driveId: string) {
  return store.exclusive(async () => {
    const catalogue = await store.read()
    const entry = catalogue.entries.find((item) => item.driveId === driveId)
    if (!entry) throw new Error("Unknown Drive document.")
    retire(entry, catalogue); entry.status = "withdrawn"; entry.approval = null
    return store.write(catalogue, catalogue.revision)
  })
}

export async function syncDrive(source: DriveSource, store: FileCatalogueStore, index: KnowledgeIndex, vectorStoreId: string, signal?: AbortSignal) {
  return store.exclusive(async () => {
    const scanned = await scan(source, store, signal)
    const files = scanned.files
    let catalogue = scanned.catalogue
    if (catalogue.vectorStoreId && catalogue.vectorStoreId !== vectorStoreId) throw new Error("Index identity mismatch; use a separate catalogue for another store.")
    catalogue = await store.write({ ...catalogue, vectorStoreId }, catalogue.revision)
    let published = 0
    for (const file of files) {
      const entry = catalogue.entries.find((item) => item.driveId === file.id)!
      if (entry.status !== "approved" || !entry.approval || !matches(entry, entry.approval)) continue
      const approval = entry.approval
      const fingerprint = approvalVersion(approval)
      const downloaded = await checkedRead(source, file, store.folderId, signal)
      if (contentHash(downloaded.bytes) !== approval.contentHash) throw new Error("A reviewed document changed before upload.")
      const expectedRevision = catalogue.revision
      const uploaded = await index.publish({ id: `drive:${file.id}`, contentHash: approval.contentHash, driveVersion: approval.driveVersion,
        title: approval.title, bytes: downloaded.bytes, filename: downloaded.filename, mimeType: downloaded.mimeType }, signal)
      try {
        // Indexing can take time. Recheck both Drive and approval before activating it.
        const after = await checkedRead(source, file, store.folderId, signal)
        const current = await store.read()
        const target = current.entries.find((item) => item.driveId === file.id)
        if (current.revision !== expectedRevision || !target || target.status !== "approved" || !target.approval ||
          approvalVersion(target.approval) !== fingerprint || !matches(target, approval) || contentHash(after.bytes) !== approval.contentHash ||
          approval.expiresAt && Date.parse(approval.expiresAt) <= Date.now()) throw new Error("Document or approval changed while indexing.")
        target.status = "active"; target.indexedFileId = uploaded
        catalogue = await store.write(current, expectedRevision)
        published++
      } catch (error) {
        const current = await store.read()
        // Tombstone the staging file before best-effort removal. It is never an active source.
        if (!current.garbage.includes(uploaded)) current.garbage.push(uploaded)
        await store.write({ ...current, lastInventoryAt: null }, current.revision)
        await index.remove(uploaded).catch(() => {})
        throw error
      }
    }
    let cleanupPending = 0
    for (const fileId of [...catalogue.garbage]) {
      try {
        await index.remove(fileId, signal)
        catalogue.garbage = catalogue.garbage.filter((id) => id !== fileId)
        catalogue = await store.write(catalogue, catalogue.revision)
      } catch { cleanupPending++ }
    }
    return { published, active: catalogue.entries.filter((entry) => activeEntry(entry)).length,
      pendingReview: catalogue.entries.filter((entry) => entry.status === "pending").length, cleanupPending }
  })
}
