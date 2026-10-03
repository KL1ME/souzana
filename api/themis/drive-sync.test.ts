import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test, type TestContext } from "node:test"
import { activeEntry, contentHash, FileCatalogueStore, type DriveApproval } from "./catalogue"
import { approveDrive, reviewDrive, syncDrive, withdrawDrive } from "./drive-sync"
import type { DriveContent, DriveFile, DriveSource } from "./drive"
import type { IndexedDocument, KnowledgeIndex } from "./vector-index"

const versionTime = "2026-01-01T00:00:00Z"
const sourceUrl = "https://example.test/public/faq"
const bytes = Buffer.from("Εγκεκριμένες δημόσιες πληροφορίες για ακίνητα.")

function file(id = "document_fixture1"): DriveFile {
  return { id, name: "FAQ.txt", mimeType: "text/plain", version: "1", modifiedTime: versionTime, parents: ["folder_fixture"] }
}

class MockDrive implements DriveSource {
  files: DriveFile[] = [file()]
  contents = new Map<string, Uint8Array>([[this.files[0].id, bytes]])
  listFailure = false
  beforeList?: () => Promise<void>
  beforeRead?: (expected: DriveFile) => Promise<void>
  async list() {
    await this.beforeList?.()
    if (this.listFailure) throw new Error("fixture inventory unavailable")
    return structuredClone(this.files)
  }
  async read(expected: DriveFile): Promise<DriveContent> {
    await this.beforeRead?.(expected)
    const current = this.files.find((item) => item.id === expected.id)
    if (!current || current.version !== expected.version || current.modifiedTime !== expected.modifiedTime) throw new Error("fixture Drive version changed")
    return { file: structuredClone(current), bytes: this.contents.get(expected.id)!, filename: current.name, mimeType: current.mimeType }
  }
}

class MockIndex implements KnowledgeIndex {
  published: IndexedDocument[] = []
  removed: string[] = []
  onPublish?: (document: IndexedDocument) => Promise<void>
  onRemove?: (id: string) => Promise<void>
  async publish(document: IndexedDocument) {
    this.published.push(document)
    await this.onPublish?.(document)
    return `file_fixture${this.published.length}`
  }
  async search() { return [] }
  async remove(id: string) { this.removed.push(id); await this.onRemove?.(id) }
}

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "themis-drive-sync-"))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return { store: new FileCatalogueStore(join(directory, "catalogue.json"), "folder_fixture"), source: new MockDrive(), index: new MockIndex() }
}

function approved(draft: DriveApproval): DriveApproval {
  return { ...draft, sourceUrl, publicCitationVerified: true, expiresAt: null }
}

async function approveFixture(source: MockDrive, store: FileCatalogueStore) {
  const drafts = await reviewDrive(source, store)
  await approveDrive(source, store, drafts.map(approved))
  return drafts.map(approved)
}

async function activeFixture(source: MockDrive, store: FileCatalogueStore, index: MockIndex) {
  await approveFixture(source, store)
  await syncDrive(source, store, index, "vs_fixture")
}

test("review requires explicit exact-version approval before completed publication becomes active", async (t) => {
  const { source, store, index } = await fixture(t)
  const draft = (await reviewDrive(source, store))[0]
  assert.equal(draft.driveVersion, "1")
  assert.equal(draft.contentHash, contentHash(bytes))
  assert.equal(draft.sourceUrl, "")
  assert.equal(draft.publicCitationVerified, false)
  await assert.rejects(approveDrive(source, store, [draft]), /verified public citation/)
  assert.equal((await store.read()).entries[0].approval, null)
  await approveDrive(source, store, [approved(draft)])
  index.onPublish = async () => {
    const current = await store.read()
    assert.equal(current.entries[0].status, "approved")
    assert.equal(activeEntry(current.entries[0]), false)
    assert.equal(current.entries[0].indexedFileId, null)
  }
  const result = await syncDrive(source, store, index, "vs_fixture")
  assert.deepEqual(result, { published: 1, active: 1, pendingReview: 0, cleanupPending: 0 })
  const catalogue = await store.read()
  assert.equal(catalogue.vectorStoreId, "vs_fixture")
  assert.equal(catalogue.entries[0].indexedFileId, "file_fixture1")
  assert.equal(activeEntry(catalogue.entries[0]), true)
  assert.equal(index.published[0].contentHash, draft.contentHash)
  assert.equal(index.published[0].driveVersion, "1")
  assert.equal(index.published[0].id, `drive:${draft.driveId}`)
})

test("new documents remain pending and are never automatically approved or uploaded", async (t) => {
  const { source, store, index } = await fixture(t)
  const result = await syncDrive(source, store, index, "vs_fixture")
  assert.equal(result.published, 0)
  assert.equal(result.pendingReview, 1)
  assert.equal(index.published.length, 0)
  assert.equal((await store.read()).entries[0].approval, null)
})

test("changed Drive versions invalidate approved evidence and require another review", async (t) => {
  const { source, store, index } = await fixture(t)
  await activeFixture(source, store, index)
  const previousApproval = (await store.read()).entries[0].approval
  source.files[0].version = "2"
  source.files[0].modifiedTime = "2026-01-02T00:00:00Z"
  source.contents.set(source.files[0].id, Buffer.from("Changed content"))
  const result = await syncDrive(source, store, index, "vs_fixture")
  const current = await store.read()
  assert.equal(result.published, 0)
  assert.equal(current.entries[0].status, "pending")
  assert.equal(current.entries[0].indexedFileId, null)
  assert.deepEqual(current.entries[0].approval, previousApproval)
  assert.equal(index.published.length, 1)
  assert.deepEqual(index.removed, ["file_fixture1"])
  await assert.rejects(approveDrive(source, store, [previousApproval]), /changed or left/)
})

test("withdrawals and removals block evidence before remote cleanup, including cleanup failures", async (t) => {
  for (const mode of ["withdraw", "remove"] as const) {
    const { source, store, index } = await fixture(t)
    await activeFixture(source, store, index)
    if (mode === "withdraw") await withdrawDrive(store, source.files[0].id)
    else source.files = []
    index.onRemove = async () => {
      const current = await store.read()
      assert.equal(activeEntry(current.entries[0]), false)
      assert.equal(current.entries[0].indexedFileId, null)
      assert.ok(current.garbage.includes("file_fixture1"))
      throw new Error("fixture cleanup unavailable")
    }
    const result = await syncDrive(source, store, index, "vs_fixture")
    const current = await store.read()
    assert.equal(result.active, 0)
    assert.equal(result.cleanupPending, 1)
    assert.deepEqual(current.garbage, ["file_fixture1"])
    assert.equal(index.published.length, 1)
  }
})

test("failed inventory preserves entries while marking knowledge freshness unavailable", async (t) => {
  const { source, store, index } = await fixture(t)
  await activeFixture(source, store, index)
  const before = await store.read()
  source.listFailure = true
  await assert.rejects(syncDrive(source, store, index, "vs_fixture"), /inventory unavailable/)
  const after = await store.read()
  assert.deepEqual(after.entries, before.entries)
  assert.deepEqual(after.garbage, before.garbage)
  assert.equal(after.lastInventoryAt, null)
  assert.deepEqual(index.removed, [])
})

test("freshness is unavailable throughout inventory and content scanning", async (t) => {
  const { source, store, index } = await fixture(t)
  await activeFixture(source, store, index)
  source.beforeList = async () => assert.equal((await store.read()).lastInventoryAt, null)
  source.beforeRead = async () => assert.equal((await store.read()).lastInventoryAt, null)
  await reviewDrive(source, store)
  assert.ok((await store.read()).lastInventoryAt)
})

test("a failed content scan keeps remote freshness unavailable and performs no publication or cleanup", async (t) => {
  const { source, store, index } = await fixture(t)
  await activeFixture(source, store, index)
  source.beforeRead = async () => { throw new Error("fixture document download unavailable") }
  await assert.rejects(syncDrive(source, store, index, "vs_fixture"), /download unavailable/)
  assert.equal((await store.read()).lastInventoryAt, null)
  assert.equal(index.published.length, 1)
  assert.deepEqual(index.removed, [])
})

test("withdrawn documents that reappear require explicit approval again", async (t) => {
  const { source, store, index } = await fixture(t)
  await activeFixture(source, store, index)
  const original = structuredClone(source.files)
  source.files = []
  await syncDrive(source, store, index, "vs_fixture")
  source.files = original
  const result = await syncDrive(source, store, index, "vs_fixture")
  const current = await store.read()
  assert.equal(result.published, 0)
  assert.equal(current.entries[0].status, "pending")
  assert.equal(activeEntry(current.entries[0]), false)
  assert.equal(index.published.length, 1)
})

test("publication cannot activate an approval changed during indexing and tombstones staging", async (t) => {
  const { source, store, index } = await fixture(t)
  await approveFixture(source, store)
  index.onPublish = async () => {
    const current = await store.read()
    current.entries[0].approval!.sourceUrl = "https://example.test/replacement"
    await store.write(current, current.revision)
  }
  index.onRemove = async () => { throw new Error("fixture cleanup unavailable") }
  await assert.rejects(syncDrive(source, store, index, "vs_fixture"), /changed while indexing/)
  const current = await store.read()
  assert.equal(activeEntry(current.entries[0]), false)
  assert.equal(current.entries[0].indexedFileId, null)
  assert.equal(current.lastInventoryAt, null)
  assert.deepEqual(current.garbage, ["file_fixture1"])
  assert.deepEqual(index.removed, ["file_fixture1"])
})

test("a Drive change after publication prevents activation and records the staged file for cleanup", async (t) => {
  for (const change of ["version", "content"] as const) {
    const { source, store, index } = await fixture(t)
    await approveFixture(source, store)
    index.onPublish = async () => {
      if (change === "version") source.files[0].version = "2"
      else source.contents.set(source.files[0].id, Buffer.from("Changed during publication"))
    }
    await assert.rejects(syncDrive(source, store, index, "vs_fixture"), /changed/)
    const current = await store.read()
    assert.equal(activeEntry(current.entries[0]), false)
    assert.equal(current.entries[0].indexedFileId, null)
    assert.equal(current.lastInventoryAt, null)
    assert.deepEqual(current.garbage, ["file_fixture1"])
    assert.deepEqual(index.removed, ["file_fixture1"])
  }
})

test("expired approval is retired before cleanup and cannot be re-approved", async (t) => {
  const { source, store, index } = await fixture(t)
  await activeFixture(source, store, index)
  const current = await store.read()
  current.entries[0].approval!.expiresAt = "2000-01-01T00:00:00Z"
  await store.write(current, current.revision)
  index.onRemove = async () => assert.equal(activeEntry((await store.read()).entries[0]), false)
  const result = await syncDrive(source, store, index, "vs_fixture")
  assert.equal(result.active, 0)
  assert.equal(result.pendingReview, 1)
  assert.equal(index.published.length, 1)
  await assert.rejects(approveDrive(source, store, [current.entries[0].approval]), /expiry must be in the future/)
})

test("an invalid approval batch never partially approves otherwise valid records", async (t) => {
  const { source, store } = await fixture(t)
  source.files.push(file("document_fixture2"))
  source.contents.set("document_fixture2", bytes)
  const drafts = await reviewDrive(source, store)
  const batch = drafts.map(approved)
  batch[1].contentHash = "0".repeat(64)
  await assert.rejects(approveDrive(source, store, batch), /changed or left/)
  const catalogue = await store.read()
  assert.ok(catalogue.entries.every((entry) => entry.status === "pending" && entry.approval === null))
})

test("a different vector store cannot reuse an active catalogue", async (t) => {
  const { source, store, index } = await fixture(t)
  await activeFixture(source, store, index)
  await assert.rejects(syncDrive(source, store, index, "vs_different"), /Index identity mismatch/)
  assert.equal((await store.read()).vectorStoreId, "vs_fixture")
  assert.equal(index.published.length, 1)
})
