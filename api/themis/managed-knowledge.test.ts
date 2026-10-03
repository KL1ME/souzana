import assert from "node:assert/strict"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test, type TestContext } from "node:test"
import { approvalVersion, FileCatalogueStore, type CatalogueEntry, type DriveCatalogue } from "./catalogue"
import type { KnowledgeExcerpt, KnowledgeSearch } from "./knowledge"
import { CombinedKnowledge, ManagedDriveKnowledge } from "./managed-knowledge"
import type { IndexHit, KnowledgeIndex } from "./vector-index"

const vectorStoreId = "vs_fixture"
const entry: CatalogueEntry = {
  driveId: "document1", name: "internal name.pdf", mimeType: "application/pdf", driveVersion: "3",
  modifiedTime: "2026-01-01T00:00:00Z", contentHash: "a".repeat(64), status: "active", indexedFileId: "file-active1",
  approval: { driveId: "document1", driveVersion: "3", contentHash: "a".repeat(64), title: "Εγκεκριμένες δημόσιες πληροφορίες",
    sourceUrl: "https://example.test/public/faq", publicCitationVerified: true, reviewedAt: "2026-01-02T00:00:00Z", expiresAt: null },
}

function hit(overrides: Partial<IndexHit> = {}): IndexHit {
  return { fileId: "file-active1", text: "Η εγκεκριμένη ελληνική απάντηση.", score: 0.9,
    attributes: { source_id: "drive:document1", content_hash: "a".repeat(64), drive_version: "3", title: "untrusted provider title", source_url: "https://untrusted.example/" },
    ...overrides }
}

async function fixture(t: TestContext, overrides: Partial<DriveCatalogue> = {}) {
  const directory = await mkdtemp(join(tmpdir(), "themis-managed-"))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const catalogue = new FileCatalogueStore(join(directory, "catalogue.json"), "approved_folder")
  await catalogue.write({ schemaVersion: 1, revision: 0, folderId: "approved_folder", vectorStoreId,
    lastInventoryAt: new Date().toISOString(), entries: [structuredClone(entry)], garbage: [], ...overrides }, 0)
  let handler: (question: string, signal?: AbortSignal) => Promise<IndexHit[]> = async () => [hit()]
  const calls: { question: string; signal?: AbortSignal }[] = []
  const index: KnowledgeIndex = {
    async publish() { throw new Error("search must never publish") },
    async remove() { throw new Error("search must never remove") },
    async search(question, signal) { calls.push({ question, signal }); return handler(question, signal) },
  }
  const managed = new ManagedDriveKnowledge({ catalogue, index, vectorStoreId })
  const update = async (change: (current: DriveCatalogue) => void) => {
    const current = await catalogue.read()
    change(current)
    return catalogue.write(current, current.revision)
  }
  return { catalogue, index, managed, calls, update, respond: (next: typeof handler) => { handler = next } }
}

test("approved exact-version hits use catalogue titles and public URLs, with bounded unique excerpts", async (t) => {
  const { managed, respond, calls } = await fixture(t)
  respond(async () => [hit(), hit(), ...Array.from({ length: 8 }, (_, number) => hit({ text: `${number}:${"κ".repeat(2000)}` }))])
  const controller = new AbortController()
  const result = await managed.search("Ελληνική ερώτηση", controller.signal)
  assert.equal(result.length, 6)
  assert.equal(calls[0].signal, controller.signal)
  assert.equal(calls[0].question, "Ελληνική ερώτηση")
  assert.ok(result.every((excerpt) => excerpt.content.length <= 1800))
  assert.deepEqual(result[0], { id: "drive:document1", title: entry.approval!.title, content: hit().text,
    sourceUrl: entry.approval!.sourceUrl, updatedAt: entry.approval!.reviewedAt,
    version: `${approvalVersion(entry.approval!)}:file-active1` })
  await managed.verify(result)
})

test("unknown, withdrawn, superseded, and attribute-mismatched indexed results cannot reach the model", async (t) => {
  const withdrawn = structuredClone(entry)
  withdrawn.driveId = "withdrawn1"
  withdrawn.approval!.driveId = "withdrawn1"
  withdrawn.status = "withdrawn"
  withdrawn.indexedFileId = "file-withdrawn1"
  const { managed, respond } = await fixture(t, { entries: [structuredClone(entry), withdrawn] })
  respond(async () => [
    hit({ fileId: "file-unknown" }),
    hit({ fileId: "file-withdrawn1", attributes: { source_id: "drive:withdrawn1", content_hash: "a".repeat(64), drive_version: "3" } }),
    hit({ fileId: "file-oldversion" }),
    hit({ attributes: {} }),
    hit({ attributes: { source_id: "drive:document1", content_hash: "a".repeat(64) } }),
    hit({ attributes: { source_id: "drive:document1", content_hash: "b".repeat(64), drive_version: "3" } }),
    hit({ attributes: { source_id: "drive:document1", content_hash: "a".repeat(64), drive_version: "2" } }),
    hit({ attributes: { source_id: "drive:other_document", content_hash: "a".repeat(64), drive_version: "3" } }),
    hit(),
  ])
  const result = await managed.search("Ερώτηση")
  assert.equal(result.length, 1)
  assert.equal(result[0].id, "drive:document1")
})

test("empty, pending, withdrawn, and expired catalogues skip index requests", async (t) => {
  const cases: CatalogueEntry[][] = [[], ...["pending", "withdrawn", "unsupported", "approved"].map((status) => [{ ...structuredClone(entry), status: status as CatalogueEntry["status"] }]),
    [{ ...structuredClone(entry), approval: { ...entry.approval!, expiresAt: new Date(Date.now() - 1000).toISOString() } }]]
  for (const entries of cases) {
    const { managed, calls } = await fixture(t, { entries })
    assert.deepEqual(await managed.search("Ερώτηση"), [])
    assert.equal(calls.length, 0)
  }
})

test("missing, stale, future-dated, malformed, and mismatched catalogues fail closed", async (t) => {
  const cases: Partial<DriveCatalogue>[] = [
    { lastInventoryAt: null },
    { lastInventoryAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() },
    { lastInventoryAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
    { vectorStoreId: "vs_other" },
  ]
  for (const overrides of cases) {
    const { managed, calls } = await fixture(t, overrides)
    await assert.rejects(managed.search("Ερώτηση"), /catalogue/)
    assert.equal(calls.length, 0)
  }
  const missing = await fixture(t)
  await rm(missing.catalogue.path)
  await assert.rejects(missing.managed.search("Ερώτηση"), /catalogue/)
  const malformed = await fixture(t)
  await writeFile(malformed.catalogue.path, "{bad JSON}")
  await assert.rejects(malformed.managed.search("Ερώτηση"), SyntaxError)
  assert.equal(malformed.calls.length, 0)
})

test("configured freshness is enforced and clock skew within five minutes is tolerated", async (t) => {
  const { catalogue, index } = await fixture(t, { lastInventoryAt: new Date(Date.now() - 60_000).toISOString() })
  const strict = new ManagedDriveKnowledge({ catalogue, index, vectorStoreId, maxAgeMs: 30_000 })
  await assert.rejects(strict.search("Ερώτηση"), /stale/)
  for (const maxAgeMs of [0, -1, Infinity, 7 * 24 * 60 * 60 * 1000 + 1]) {
    assert.throws(() => new ManagedDriveKnowledge({ catalogue, index, vectorStoreId, maxAgeMs }), /configuration/)
  }
  assert.throws(() => new ManagedDriveKnowledge({ catalogue, index, vectorStoreId: "invalid/store" }), /configuration/)
  const future = await fixture(t, { lastInventoryAt: new Date(Date.now() + 2 * 60 * 1000).toISOString() })
  assert.equal((await future.managed.search("Ερώτηση")).length, 1)
})

test("index failures propagate instead of appearing as a knowledge miss", async (t) => {
  const { managed, respond } = await fixture(t)
  const failure = new Error("mock indexing service unavailable")
  respond(async () => { throw failure })
  await assert.rejects(managed.search("Ερώτηση"), (error: unknown) => error === failure)
})

test("reloads the catalogue after search so concurrent removals and changed versions block results", async (t) => {
  for (const revoke of [
    (current: DriveCatalogue) => { current.entries[0].status = "withdrawn" },
    (current: DriveCatalogue) => { current.entries[0].driveVersion = "4" },
    (current: DriveCatalogue) => { current.entries[0].indexedFileId = "file-newversion" },
  ]) {
    const { managed, update, respond } = await fixture(t)
    respond(async () => { await update(revoke); return [hit()] })
    assert.deepEqual(await managed.search("Ερώτηση"), [])
  }
  const stale = await fixture(t)
  stale.respond(async () => { await stale.update((current) => { current.lastInventoryAt = null }); return [hit()] })
  await assert.rejects(stale.managed.search("Ερώτηση"), /catalogue/)
})

test("verification blocks approval changes, revocation, expiry, and index replacement after retrieval", async (t) => {
  const mutations: ((current: DriveCatalogue) => void)[] = [
    (current) => { current.entries[0].status = "withdrawn" },
    (current) => { current.entries[0].approval!.title = "New approved title" },
    (current) => { current.entries[0].approval!.sourceUrl = "https://example.test/new-public-source" },
    (current) => { current.entries[0].approval!.reviewedAt = "2026-01-03T00:00:00Z" },
    (current) => { current.entries[0].approval!.expiresAt = new Date(Date.now() - 1000).toISOString() },
    (current) => { current.entries[0].indexedFileId = "file-replacement" },
  ]
  for (const mutation of mutations) {
    const { managed, update } = await fixture(t)
    const excerpts = await managed.search("Ερώτηση")
    await update(mutation)
    await assert.rejects(managed.verify(excerpts), /withdrawn, expired, or changed/)
  }
})

test("verification rejects forged citation metadata and version tokens while permitting local excerpts", async (t) => {
  const { managed } = await fixture(t)
  const excerpts = await managed.search("Ερώτηση")
  for (const change of [{ title: "provider's title" }, { sourceUrl: "https://untrusted.example/" }, { updatedAt: "2026-01-03T00:00:00Z" }, { version: "drivev1:forged:file-active1" }]) {
    await assert.rejects(managed.verify([{ ...excerpts[0], ...change }]), /withdrawn, expired, or changed/)
  }
  await managed.verify([{ id: "website:locations", title: "Website", content: "Local approved content", sourceUrl: "https://example.test/locations", updatedAt: "2026-01-01T00:00:00Z" }])
})

test("combined knowledge awaits both adapters, prioritizes remote excerpts, and verifies both", async () => {
  const make = (id: string): KnowledgeExcerpt => ({ id, title: id, content: id, sourceUrl: `https://example.test/${id}`, updatedAt: "2026-01-01T00:00:00Z" })
  const local = Array.from({ length: 8 }, (_, number) => make(`local${number}`))
  const remote = Array.from({ length: 8 }, (_, number) => make(`remote${number}`))
  let resolveRemote!: (result: KnowledgeExcerpt[]) => void
  let localCalled = false
  const verified: string[] = []
  const localAdapter: KnowledgeSearch = {
    search() { localCalled = true; return local },
    verify(excerpts) { assert.equal(excerpts.length, 12); verified.push("local") },
  }
  const remoteAdapter: KnowledgeSearch = {
    search() { return new Promise((resolve) => { resolveRemote = resolve }) },
    async verify(excerpts) { assert.equal(excerpts.length, 12); await Promise.resolve(); verified.push("remote") },
  }
  const combined = new CombinedKnowledge(localAdapter, remoteAdapter)
  let complete = false
  const pending = combined.search("Ερώτηση").then((value) => { complete = true; return value })
  await Promise.resolve()
  assert.equal(localCalled, true)
  assert.equal(complete, false)
  resolveRemote(remote)
  const result = await pending
  assert.deepEqual(result.map((item) => item.id), [...remote.slice(0, 6), ...local.slice(0, 6)].map((item) => item.id))
  await combined.verify(result)
  assert.deepEqual(verified, ["local", "remote"])
  const failing = new CombinedKnowledge(localAdapter, { async search() { throw new Error("remote unavailable") } })
  await assert.rejects(failing.search("Ερώτηση"), /remote unavailable/)
})

test("managed and combined adapters honor cancellation before requesting data", async (t) => {
  const { managed, calls } = await fixture(t)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(managed.search("Ερώτηση", controller.signal), (error: unknown) => error instanceof DOMException && error.name === "AbortError")
  await assert.rejects(managed.verify([], controller.signal), (error: unknown) => error instanceof DOMException && error.name === "AbortError")
  assert.equal(calls.length, 0)
  let called = false
  const combined = new CombinedKnowledge({ search() { called = true; return [] } }, { search() { called = true; return [] } })
  await assert.rejects(combined.search("Ερώτηση", controller.signal), (error: unknown) => error instanceof DOMException && error.name === "AbortError")
  assert.equal(called, false)
})
