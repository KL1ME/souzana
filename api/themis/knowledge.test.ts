import assert from "node:assert/strict"
import { mkdtempSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { KnowledgeDatabase, queryTerms, type KnowledgeDocument } from "./knowledge"
import { websiteKnowledge } from "./seed"
import { site } from "../../lib/content"

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

test("verification blocks local withdrawal, changed passages, and citation edits after retrieval", () => {
  const mutations: ((db: KnowledgeDatabase) => void)[] = [
    (db) => db.remove("faq:lease"),
    (db) => db.importDocuments([document({ approved: false })]),
    (db) => db.importDocuments([document({ content: "Η παλιά πληροφορία ανακλήθηκε." })]),
    (db) => db.importDocuments([document({ title: "Νέος τίτλος" })]),
    (db) => db.importDocuments([document({ sourceUrl: "https://example.test/new-approved-faq" })]),
    (db) => db.importDocuments([document({ updatedAt: "2026-01-02T00:00:00Z" })]),
  ]
  for (const mutate of mutations) {
    const db = new KnowledgeDatabase(":memory:")
    try {
      db.importDocuments([document()])
      const excerpts = db.search("μισθώσεις")
      assert.equal(excerpts.length, 1)
      assert.doesNotThrow(() => db.verify(excerpts))
      mutate(db)
      assert.throws(() => db.verify(excerpts), /withdrawn, expired, or changed/)
    } finally { db.close() }
  }
})

test("verification rejects a document that expires while an answer is being generated", (t) => {
  const now = Date.now()
  t.mock.timers.enable({ apis: ["Date"], now })
  const db = new KnowledgeDatabase(":memory:")
  try {
    db.importDocuments([document({ expiresAt: new Date(now + 1000).toISOString() })])
    const excerpts = db.search("μισθώσεις")
    assert.equal(excerpts.length, 1)
    db.verify(excerpts)
    t.mock.timers.tick(1000)
    assert.throws(() => db.verify(excerpts), /expired/)
  } finally { db.close() }
})

test("local verification observes revocation by another database connection", () => {
  const directory = mkdtempSync(join(tmpdir(), "themis-revocation-"))
  const path = join(directory, "themis.sqlite")
  const serving = new KnowledgeDatabase(path)
  const operator = new KnowledgeDatabase(path)
  try {
    operator.importDocuments([document()])
    const excerpts = serving.search("μισθώσεις")
    assert.equal(excerpts.length, 1)
    operator.importDocuments([document({ approved: false })])
    assert.throws(() => serving.verify(excerpts), /withdrawn/)
  } finally {
    serving.close()
    operator.close()
    rmSync(directory, { recursive: true, force: true })
  }
})

test("local verification checks forged passages, permits separately verified Drive passages, and honors cancellation", () => {
  const db = new KnowledgeDatabase(":memory:")
  try {
    db.importDocuments([document()])
    const excerpts = db.search("μισθώσεις")
    assert.throws(() => db.verify([{ ...excerpts[0], content: "An unsupported answer." }]), /changed/)
    assert.throws(() => db.verify([{ ...excerpts[0], content: "   " }]), /changed/)
    assert.doesNotThrow(() => db.verify([{ ...excerpts[0], id: "drive:document1", version: "drivev1:fixture" }, ...excerpts]))
    const controller = new AbortController()
    controller.abort()
    assert.throws(() => db.verify(excerpts, controller.signal), (error: unknown) => error instanceof DOMException && error.name === "AbortError")
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

test("contact questions retrieve the same published phone, email, and address as the website footer", () => {
  const db = new KnowledgeDatabase(":memory:")
  try {
    db.importDocuments(websiteKnowledge(), true)
    for (const question of ["Πώς μπορώ να επικοινωνήσω μαζί σας;", "Ποιο είναι το τηλέφωνό σας;", "Ποιο είναι το email σας;", "Ποια είναι η διεύθυνσή σας;", "How can I reach you?", "What is your phone number?", "What is your email address?"]) {
      const contact = db.search(question).find((result) => result.id === "website:contact")
      assert.ok(contact, question)
      for (const phone of site.footer.phones) assert.ok(contact.content.includes(phone.label), question)
      assert.ok(contact.content.includes(site.footer.email), question)
      assert.ok(contact.content.includes(site.footer.address.label), question)
      assert.equal(contact.sourceUrl, `${site.url}/`)
      assert.doesNotMatch(contact.content, /δεν δημοσιεύει τηλέφωνο|email, διευθύνσεις/)
      assert.match(contact.content, /δεν δημοσιεύει ωράριο ή τρόπο κράτησης ραντεβού/)
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
