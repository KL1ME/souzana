import assert from "node:assert/strict"
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { test, type TestContext } from "node:test"
import { activeEntry, approvalVersion, contentHash, FileCatalogueStore, validateApproval, type CatalogueEntry, type DriveApproval } from "./catalogue"

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "themis-catalogue-"))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return { directory, store: new FileCatalogueStore(join(directory, "catalogue.json"), "folder_fixture") }
}

function approval(): DriveApproval {
  return { driveId: "document_fixture", driveVersion: "1", contentHash: contentHash(Buffer.from("Approved text")),
    title: "Approved public FAQ", sourceUrl: "https://example.test/faq", publicCitationVerified: true,
    reviewedAt: "2026-01-01T00:00:00Z", expiresAt: null }
}

function entry(): CatalogueEntry {
  const reviewed = approval()
  return { driveId: reviewed.driveId, driveVersion: reviewed.driveVersion, name: "FAQ.txt", mimeType: "text/plain",
    modifiedTime: "2026-01-01T00:00:00Z", contentHash: reviewed.contentHash, status: "active", approval: reviewed, indexedFileId: "file_fixture1" }
}

test("catalogue persists complete revisions atomically with private permissions", async (t) => {
  const { directory, store } = await fixture(t)
  const empty = await store.read()
  assert.equal(empty.revision, 0)
  const next = await store.exclusive(() => store.write({ ...empty, vectorStoreId: "vs_fixture", entries: [entry()] }, 0))
  assert.equal(next.revision, 1)
  const reopened = new FileCatalogueStore(store.path, store.folderId)
  assert.deepEqual(await reopened.read(), next)
  assert.deepEqual(await readdir(directory), ["catalogue.json"])
  assert.equal((await stat(store.path)).mode & 0o777, 0o600)
  assert.deepEqual(JSON.parse(await readFile(store.path, "utf8")), next)
})

test("stale revisions cannot replace the current catalogue", async (t) => {
  const { store } = await fixture(t)
  const original = await store.read()
  const current = await store.write({ ...original, entries: [entry()] }, 0)
  await assert.rejects(store.write({ ...original, entries: [] }, 0), /catalogue changed/)
  assert.deepEqual(await store.read(), current)
})

test("an oversized serialized catalogue cannot replace a readable catalogue", async (t) => {
  const { store } = await fixture(t)
  const current = await store.write(await store.read(), 0)
  const entries = Array.from({ length: 1000 }, (_, index) => {
    const document = entry()
    document.driveId = `document_fixture${index}`
    document.name = "ν".repeat(1000)
    document.approval = { ...approval(), driveId: document.driveId, title: "t".repeat(300), sourceUrl: `https://example.test/${"p".repeat(1950)}` }
    return document
  })
  await assert.rejects(store.write({ ...current, entries }, current.revision), /too large/)
  assert.deepEqual(await store.read(), current)
})

test("folder mismatch, corrupt JSON, duplicate identities and unsupported schemas fail closed", async (t) => {
  const { store } = await fixture(t)
  const base = await store.read()
  for (const value of [
    { ...base, schemaVersion: 2 },
    { ...base, folderId: "different_folder" },
    { ...base, revision: -1 },
    { ...base, entries: [entry(), entry()] },
    { ...base, garbage: ["not-an-openai-file"] },
    { ...base, entries: [{ ...entry(), approval: { ...approval(), driveId: "different_document" } }] },
  ]) {
    await writeFile(store.path, JSON.stringify(value))
    await assert.rejects(store.read(), /Invalid|mismatch/)
  }
  await writeFile(store.path, "{truncated")
  await assert.rejects(store.read(), SyntaxError)
})

test("approvals require public-citation attestation and reject executable or credential URLs", () => {
  assert.doesNotThrow(() => validateApproval(approval()))
  for (const value of [
    { ...approval(), publicCitationVerified: false },
    { ...approval(), sourceUrl: "javascript:alert(1)" },
    { ...approval(), sourceUrl: "data:text/plain,secret" },
    { ...approval(), sourceUrl: "https://user:password@example.test/faq" },
    { ...approval(), sourceUrl: "file:///private/document" },
    { ...approval(), driveVersion: "not-numeric" },
    { ...approval(), contentHash: "a".repeat(63) },
  ]) assert.throws(() => validateApproval(value))
})

test("active evidence requires exact approved content/version and remains blocked after expiry", () => {
  const active = entry()
  assert.equal(activeEntry(active), true)
  assert.equal(activeEntry({ ...active, status: "withdrawn" }), false)
  assert.equal(activeEntry({ ...active, status: "approved" }), false)
  assert.equal(activeEntry({ ...active, contentHash: contentHash(Buffer.from("Edited")) }), false)
  assert.equal(activeEntry({ ...active, driveVersion: "2" }), false)
  assert.equal(activeEntry({ ...active, indexedFileId: null }), false)
  assert.equal(activeEntry({ ...active, approval: { ...approval(), expiresAt: "2026-01-02T00:00:00Z" } }, Date.parse("2026-01-02T00:00:00Z")), false)
  assert.notEqual(approvalVersion(approval()), approvalVersion({ ...approval(), sourceUrl: "https://example.test/new" }))
  assert.notEqual(approvalVersion(approval()), approvalVersion({ ...approval(), title: "Changed title" }))
})

test("command lock excludes competing writers and releases after exceptions", async (t) => {
  const { store } = await fixture(t)
  const other = new FileCatalogueStore(store.path, store.folderId)
  await store.exclusive(async () => {
    await assert.rejects(other.exclusive(async () => undefined), /Another Drive command/)
  })
  await assert.rejects(store.exclusive(async () => { throw new Error("fixture failure") }), /fixture failure/)
  await assert.doesNotReject(other.exclusive(async () => undefined))
  await writeFile(store.path + ".lock", "stale lock")
  await assert.rejects(store.exclusive(async () => undefined), /stale lock requires operator review/)
  assert.equal(await readFile(store.path + ".lock", "utf8"), "stale lock")
})

test("catalogue paths under the static public and export directories are rejected", () => {
  for (const directory of ["public", "out"]) {
    assert.throws(() => new FileCatalogueStore(resolve(directory, "private", "catalogue.json"), "folder_fixture"), /publicly served/)
  }
})
