import { activeEntry, approvalVersion, type CatalogueEntry, type DriveCatalogue, type FileCatalogueStore } from "./catalogue"
import type { KnowledgeExcerpt, KnowledgeSearch } from "./knowledge"
import type { KnowledgeIndex } from "./vector-index"

export type ManagedDriveKnowledgeConfig = {
  catalogue: FileCatalogueStore
  index: KnowledgeIndex
  vectorStoreId: string
  maxAgeMs?: number
}

function version(entry: CatalogueEntry) {
  return `${approvalVersion(entry.approval!)}:${entry.indexedFileId}`
}

/** The local catalogue authorizes each indexed hit; provider attributes never authorize a document. */
export class ManagedDriveKnowledge implements KnowledgeSearch {
  private readonly maxAgeMs: number

  constructor(private readonly config: ManagedDriveKnowledgeConfig) {
    this.maxAgeMs = config.maxAgeMs ?? 24 * 60 * 60 * 1000
    if (!config.catalogue || !config.index || typeof config.vectorStoreId !== "string" || !/^vs_[a-zA-Z0-9_-]+$/.test(config.vectorStoreId) ||
      !Number.isSafeInteger(this.maxAgeMs) || this.maxAgeMs <= 0 || this.maxAgeMs > 7 * 24 * 60 * 60 * 1000) {
      throw new Error("Invalid managed knowledge configuration.")
    }
  }

  private async catalogue(signal?: AbortSignal): Promise<DriveCatalogue> {
    signal?.throwIfAborted()
    const catalogue = await this.config.catalogue.read()
    signal?.throwIfAborted()
    const now = Date.now()
    const inventoryAt = catalogue.lastInventoryAt === null ? NaN : Date.parse(catalogue.lastInventoryAt)
    if (catalogue.vectorStoreId !== this.config.vectorStoreId || !Number.isFinite(inventoryAt) ||
      inventoryAt < now - this.maxAgeMs || inventoryAt > now + 5 * 60 * 1000) {
      throw new Error("Managed knowledge catalogue is uninitialized, stale, or belongs to another index.")
    }
    return catalogue
  }

  async search(question: string, signal?: AbortSignal): Promise<KnowledgeExcerpt[]> {
    const initial = await this.catalogue(signal)
    if (!initial.entries.some((entry) => activeEntry(entry))) return []
    const hits = await this.config.index.search(question, signal)
    const current = await this.catalogue(signal)
    const byFile = new Map(current.entries.filter((entry) => activeEntry(entry)).map((entry) => [entry.indexedFileId, entry]))
    const excerpts: KnowledgeExcerpt[] = []
    const seen = new Set<string>()
    for (const hit of hits) {
      const entry = byFile.get(hit.fileId)
      if (!entry?.approval || hit.attributes?.source_id !== `drive:${entry.driveId}` ||
        hit.attributes?.content_hash !== entry.contentHash || hit.attributes?.drive_version !== entry.driveVersion ||
        typeof hit.text !== "string" || !hit.text.trim()) continue
      let content = hit.text.slice(0, 1800)
      if (/[\uD800-\uDBFF]$/.test(content)) content = content.slice(0, -1)
      const id = `drive:${entry.driveId}`
      const key = JSON.stringify([id, content])
      if (seen.has(key)) continue
      seen.add(key)
      excerpts.push({ id, title: entry.approval.title, content, sourceUrl: entry.approval.sourceUrl,
        updatedAt: entry.approval.reviewedAt, version: version(entry) })
      if (excerpts.length === 6) break
    }
    return excerpts
  }

  async verify(excerpts: KnowledgeExcerpt[], signal?: AbortSignal): Promise<void> {
    const catalogue = await this.catalogue(signal)
    const entries = new Map(catalogue.entries.filter((entry) => activeEntry(entry)).map((entry) => [`drive:${entry.driveId}`, entry]))
    for (const excerpt of excerpts) {
      if (!excerpt.version?.startsWith("drivev1:")) continue
      const entry = entries.get(excerpt.id)
      if (!entry?.approval || excerpt.version !== version(entry) || excerpt.title !== entry.approval.title ||
        excerpt.sourceUrl !== entry.approval.sourceUrl || excerpt.updatedAt !== entry.approval.reviewedAt) {
        throw new Error("A retrieved Drive document was withdrawn, expired, or changed before answering.")
      }
    }
  }
}

/** Keep website facts available alongside approved documents, with independent revocation checks. */
export class CombinedKnowledge implements KnowledgeSearch {
  constructor(private readonly local: KnowledgeSearch, private readonly remote: KnowledgeSearch) {}

  async search(question: string, signal?: AbortSignal): Promise<KnowledgeExcerpt[]> {
    signal?.throwIfAborted()
    const [local, remote] = await Promise.all([this.local.search(question, signal), this.remote.search(question, signal)])
    signal?.throwIfAborted()
    return [...remote.slice(0, 6), ...local.slice(0, 6)]
  }

  async verify(excerpts: KnowledgeExcerpt[], signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted()
    await Promise.all([this.local.verify?.(excerpts, signal), this.remote.verify?.(excerpts, signal)])
    signal?.throwIfAborted()
  }
}
