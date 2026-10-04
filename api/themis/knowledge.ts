import { chmodSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"

export type KnowledgeDocument = {
  id: string
  title: string
  content: string
  sourceUrl: string
  tags: string[]
  approved: boolean
  updatedAt: string
  expiresAt: string | null
  origin: "website" | "manual"
}

export type KnowledgeExcerpt = Pick<KnowledgeDocument, "id" | "title" | "content" | "sourceUrl" | "updatedAt"> & { version?: string }
export interface KnowledgeSearch {
  search(question: string, signal?: AbortSignal): KnowledgeExcerpt[] | Promise<KnowledgeExcerpt[]>
  verify?(excerpts: KnowledgeExcerpt[], signal?: AbortSignal): void | Promise<void>
}

const stopWords = new Set("και για την τον τις τους των στη στην στο στα με απο ειναι ενα μια πως που ποιοι ποιος ποιες τι να θα σε σας μου μας μπορω μπορειτε the a an of to is are how what where can you your about and for".split(" ").map(normalized))

export function normalized(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/ς/g, "σ")
}

export function queryTerms(text: string) {
  return [...new Set((normalized(text).match(/[\p{L}\p{N}]+/gu) ?? []).filter((term) => term.length > 2 && !stopWords.has(term)))].slice(0, 24)
}

function chunks(content: string) {
  const result: string[] = []
  for (let start = 0; start < content.length;) {
    let end = Math.min(start + 1800, content.length)
    if (end < content.length) {
      const space = content.lastIndexOf(" ", end)
      if (space > start + 1000) end = space
    }
    result.push(content.slice(start, end))
    if (end === content.length) break
    start = end - 200
  }
  return result
}

function validate(document: KnowledgeDocument) {
  if (!document || typeof document.id !== "string" || !/^[a-zA-Z0-9:_-]{1,120}$/.test(document.id) ||
    typeof document.title !== "string" || !document.title.trim() || document.title.length > 300 ||
    typeof document.content !== "string" || !document.content.trim() || document.content.length > 60_000 ||
    typeof document.sourceUrl !== "string" || typeof document.approved !== "boolean" || !["website", "manual"].includes(document.origin) ||
    !Array.isArray(document.tags) || document.tags.length > 40 || document.tags.some((tag) => typeof tag !== "string" || tag.length > 100) ||
    typeof document.updatedAt !== "string" || !Number.isFinite(Date.parse(document.updatedAt)) ||
    (document.expiresAt !== null && (typeof document.expiresAt !== "string" || !Number.isFinite(Date.parse(document.expiresAt))))) {
    throw new Error("Invalid knowledge document.")
  }
  const url = new URL(document.sourceUrl)
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || document.sourceUrl.length > 2000) {
    throw new Error("Knowledge sources must be public HTTP(S) URLs without credentials.")
  }
}

export class KnowledgeDatabase implements KnowledgeSearch {
  private db: DatabaseSync

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    this.db = new DatabaseSync(path)
    if (path !== ":memory:") chmodSync(path, 0o600)
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL,
        source_url TEXT NOT NULL, tags TEXT NOT NULL, approved INTEGER NOT NULL,
        updated_at TEXT NOT NULL, expires_at TEXT, origin TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
        id UNINDEXED, title, content, tags, excerpt UNINDEXED, tokenize='unicode61'
      );
      PRAGMA user_version = 1;
    `)
  }

  private put(document: KnowledgeDocument) {
    this.db.prepare("DELETE FROM knowledge_fts WHERE id = ?").run(document.id)
    this.db.prepare(`INSERT INTO documents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content,
      source_url=excluded.source_url, tags=excluded.tags, approved=excluded.approved,
      updated_at=excluded.updated_at, expires_at=excluded.expires_at, origin=excluded.origin`)
      .run(document.id, document.title.trim(), document.content.trim(), document.sourceUrl,
        JSON.stringify(document.tags), Number(document.approved), new Date(document.updatedAt).toISOString(),
        document.expiresAt ? new Date(document.expiresAt).toISOString() : null, document.origin)
    const insert = this.db.prepare("INSERT INTO knowledge_fts(id,title,content,tags,excerpt) VALUES (?,?,?,?,?)")
    for (const excerpt of chunks(document.content)) {
      insert.run(document.id, normalized(document.title), normalized(excerpt), normalized(document.tags.join(" ")), excerpt)
    }
  }

  importDocuments(documents: KnowledgeDocument[], replaceWebsite = false) {
    if (!Array.isArray(documents) || documents.length > 1000) throw new Error("Import at most 1000 documents at once.")
    for (const document of documents) {
      validate(document)
      if (document.id.startsWith("drive:") || (replaceWebsite ? document.origin !== "website" || !document.id.startsWith("website:") : document.origin !== "manual" || document.id.startsWith("website:"))) {
        throw new Error("Website and Drive IDs are reserved; imported documents must have origin manual.")
      }
    }
    if (new Set(documents.map((document) => document.id)).size !== documents.length) throw new Error("Duplicate document IDs.")
    this.db.exec("BEGIN IMMEDIATE")
    try {
      if (replaceWebsite) {
        this.db.exec("DELETE FROM knowledge_fts WHERE id IN (SELECT id FROM documents WHERE origin='website'); DELETE FROM documents WHERE origin='website';")
      }
      for (const document of documents) this.put(document)
      this.db.exec("COMMIT")
    } catch (error) {
      this.db.exec("ROLLBACK")
      throw error
    }
  }

  search(question: string): KnowledgeExcerpt[] {
    const terms = queryTerms(question)
    if (!terms.length) return []
    const query = terms.map((term) => `"${term.length > 6 ? term.slice(0, -2) : term}"*`).join(" OR ")
    const rows = this.db.prepare(`SELECT d.id, d.title, f.excerpt AS content, d.source_url AS sourceUrl, d.updated_at AS updatedAt
      FROM knowledge_fts f JOIN documents d ON d.id=f.id
      WHERE knowledge_fts MATCH ? AND d.approved=1 AND (d.expires_at IS NULL OR d.expires_at > ?)
      ORDER BY bm25(knowledge_fts,0,5,1,3,0) LIMIT 6`).all(query, new Date().toISOString())
    return rows as KnowledgeExcerpt[]
  }

  verify(excerpts: KnowledgeExcerpt[], signal?: AbortSignal): void {
    signal?.throwIfAborted()
    const current = this.db.prepare(`SELECT 1 FROM documents d
      WHERE d.id=? AND d.title=? AND d.source_url=? AND d.updated_at=?
        AND d.approved=1 AND (d.expires_at IS NULL OR d.expires_at > ?)
        AND instr(d.content,trim(?)) > 0`)
    const now = new Date().toISOString()
    for (const excerpt of excerpts) {
      // Combined retrieval passes the Drive passages to their own catalogue verifier.
      if (excerpt.id.startsWith("drive:")) continue
      if (!excerpt.content.trim() || !current.get(excerpt.id, excerpt.title, excerpt.sourceUrl, excerpt.updatedAt, now, excerpt.content)) {
        throw new Error("A retrieved local document was withdrawn, expired, or changed before answering.")
      }
    }
    signal?.throwIfAborted()
  }

  list() {
    return this.db.prepare("SELECT id,title,approved,origin,updated_at AS updatedAt,expires_at AS expiresAt FROM documents ORDER BY id").all()
  }

  remove(id: string) {
    this.db.exec("BEGIN IMMEDIATE")
    try {
      this.db.prepare("DELETE FROM knowledge_fts WHERE id=?").run(id)
      this.db.prepare("DELETE FROM documents WHERE id=?").run(id)
      this.db.exec("COMMIT")
    } catch (error) { this.db.exec("ROLLBACK"); throw error }
  }

  close() { this.db.close() }
}
