import assert from "node:assert/strict"
import { mkdtempSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { KnowledgeDatabase, queryTerms, type KnowledgeDocument } from "./knowledge"
import { websiteKnowledge } from "./seed"

function document(overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return { id: "faq:lease", title: "Μισθώσεις ακινήτων", content: "Η ομάδα εξετάζει διαφορές μισθώσεων ακινήτων.",
    sourceUrl: "https://example.test/approved-faq", tags: ["leases"], approved: true,
    updatedAt: "2026-01-01T00:00:00Z", expiresAt: null, origin: "manual", ...overrides }
}

test("knowledge persists across process restarts with a private database file", () => {
  const directory = mkdtempSync(join(tmpdir(), "themis-knowledge-"))
  const path = join(directory, "data", "themis.sqlite")
  try {
    const first = new KnowledgeDatabase(path)
    first.importDocuments([document()])
    first.close()
    const second = new KnowledgeDatabase(path)
    try {
      assert.equal(second.search("ΜΙΣΘΩΣΕΙΣ")[0].id, "faq:lease")
      if (process.platform !== "win32") assert.equal(statSync(path).mode & 0o777, 0o600)
    } finally { second.close() }
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test("Greek accents, final sigma, English tags, and inflected words remain searchable", () => {
  const db = new KnowledgeDatabase(":memory:")
  try {
    db.importDocuments([document()])
    for (const question of ["ΜΙΣΘΏΣΕΙΣ", "μισθώσεων", "ακίνητα", "leases"]) {
      assert.equal(db.search(question)[0].id, "faq:lease", question)
    }
    assert.deepEqual(queryTerms("Ποιος και ποιες είναι οι υπηρεσίες σας;"), ["υπηρεσιεσ"])
    assert.deepEqual(db.search("και για την σας"), [])
  } finally { db.close() }
})

test("draft and expired records cannot supply an answer, including after approval changes", () => {
  const db = new KnowledgeDatabase(":memory:")
  try {
    db.importDocuments([document({ approved: false }), document({ id: "faq:expired", expiresAt: "2000-01-01T00:00:00Z" })])
    assert.deepEqual(db.search("μισθώσεις"), [])
    db.importDocuments([document()])
    assert.equal(db.search("μισθώσεις").length, 1)
    db.importDocuments([document({ approved: false })])
    assert.deepEqual(db.search("μισθώσεις"), [])
  } finally { db.close() }
})

test("natural city questions retrieve the published firm location evidence", () => {
  const db = new KnowledgeDatabase(":memory:")
  try {
    db.importDocuments(websiteKnowledge(), true)
    for (const question of ["Και σε ποιες πόλεις δραστηριοποιείστε;", "Σε ποια πόλη βρίσκεστε;", "Where are you based?"]) {
      const result = db.search(question)[0]
      assert.equal(result.id, "website:locations", question)
      assert.match(result.content, /Καλαμάτα/)
      assert.match(result.content, /Αθήνα/)
    }
  } finally { db.close() }
})

test("retrieves a matching passage late in a long document and bounds context size", () => {
  const db = new KnowledgeDatabase(":memory:")
  try {
    db.importDocuments([document({ title: "Εγκεκριμένο έγγραφο", tags: [], content: `${"Αρχική εισαγωγή. ".repeat(600)} Η εξαιρετική λέξη ζαφειροσκέπαστο βρίσκεται στο τελευταίο τμήμα.` })])
    const results = db.search("ζαφειροσκέπαστο")
    assert.ok(results.length > 0 && results.length <= 6)
    assert.match(results[0].content, /ζαφειροσκέπαστο/)
    assert.ok(results.every((result) => result.content.length <= 1800))
  } finally { db.close() }
})

test("website refresh preserves manual records and reserves website identities", () => {
  const db = new KnowledgeDatabase(":memory:")
  try {
    db.importDocuments(websiteKnowledge(), true)
    db.importDocuments([document()])
    const refreshed = websiteKnowledge().filter((entry) => entry.id !== "website:team")
    db.importDocuments(refreshed, true)
    assert.ok(db.list().some((entry) => entry.id === "faq:lease"))
    assert.ok(!db.list().some((entry) => entry.id === "website:team"))
    assert.throws(() => db.importDocuments([document({ id: "website:firm" })]), /reserved/)
    assert.throws(() => db.importDocuments([document({ id: "drive:document" })]), /reserved/)
    assert.throws(() => db.importDocuments([document()], true), /reserved/)
  } finally { db.close() }
})

test("invalid imports are atomic and malformed IDs or source URLs are rejected", () => {
  const db = new KnowledgeDatabase(":memory:")
  try {
    db.importDocuments([document()])
    for (const invalid of [
      document({ sourceUrl: "javascript:alert(1)" }),
      document({ sourceUrl: "https://user:password@example.test/" }),
      document({ id: "bad id" }),
      document({ updatedAt: "yesterday" }),
      { ...document(), id: 123 },
      { ...document(), sourceUrl: 123 },
    ]) {
      assert.throws(() => db.importDocuments([document({ id: "faq:new" }), invalid as KnowledgeDocument]))
      assert.equal(db.list().length, 1)
    }
    assert.throws(() => db.importDocuments([document(), document()]), /Duplicate/)
    db.remove("faq:lease")
    assert.deepEqual(db.search("μισθώσεις"), [])
    assert.equal(db.list().length, 0)
  } finally { db.close() }
})

test("search punctuation cannot execute SQL or FTS expressions", () => {
  const db = new KnowledgeDatabase(":memory:")
  try {
    db.importDocuments([document()])
    for (const question of ['" OR *', "'); DROP TABLE documents; --", "NEAR(leases, 2)", "{}[]:()!*"]) {
      assert.doesNotThrow(() => db.search(question))
    }
    assert.equal(db.list().length, 1)
    assert.equal(db.search("leases")[0].id, "faq:lease")
  } finally { db.close() }
})
