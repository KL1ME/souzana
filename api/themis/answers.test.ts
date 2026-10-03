import assert from "node:assert/strict"
import { test, type TestContext } from "node:test"
import { parseThemisAnswer, type ThemisMessage } from "@/lib/themis"
import { answerQuestion, ProviderError, type AnswerConfig } from "./answers"
import { KnowledgeDatabase } from "./knowledge"

const messages: ThemisMessage[] = [{ role: "user", content: "Πού είναι τα γραφεία σας;" }]
const missing: ThemisMessage[] = [{ role: "user", content: "Τι προβλέπει ο κανονισμός για κυβερνοασφάλεια;" }]
const decline = { answer_found: false, answer: "", citation_ids: [] }
const decision = { answer_found: true, answer: "Το γραφείο βρίσκεται στην Καλαμάτα.", citation_ids: ["faq:location"] }

function config(t: TestContext, overrides: Partial<AnswerConfig> = {}): AnswerConfig {
  const knowledge = new KnowledgeDatabase(":memory:")
  knowledge.importDocuments([{ id: "faq:location", title: "Γραφεία", content: "Το γραφείο βρίσκεται στην Καλαμάτα.",
    sourceUrl: "https://example.test/location", tags: ["γραφεία"], approved: true, origin: "manual", updatedAt: "2026-01-01T00:00:00Z", expiresAt: null }])
  t.after(() => knowledge.close())
  return { apiKey: "fixture-only", model: "fixture-model", knowledge, ...overrides }
}

function response(value: unknown) {
  return Response.json({ status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: typeof value === "string" ? value : JSON.stringify(value) }] }] })
}

function webResponse(url = "https://www.gov.gr/example", searched = true, annotations = true) {
  const text = "Ενδεικτική τεκμηριωμένη πληροφορία. [1]"
  return Response.json({ status: "completed", output: [
    ...(searched ? [{ type: "web_search_call", status: "completed" }] : []),
    { type: "message", role: "assistant", content: [{ type: "output_text", text, annotations: annotations ? [{ type: "url_citation", url, title: "Επίσημη πηγή", start_index: text.length - 3, end_index: text.length }] : [] }] },
  ] })
}

test("an approved database answer ends the pipeline without a web call", async (t) => {
  let calls = 0
  const result = await answerQuestion(messages, config(t), async (_url, init) => {
    calls++
    const body = JSON.parse(String(init?.body))
    assert.equal(body.text.format.name, "database_answer")
    assert.match(body.instructions, /Το γραφείο βρίσκεται στην Καλαμάτα/)
    assert.equal(body.tools, undefined)
    return response(decision)
  }, new AbortController().signal)
  assert.equal(calls, 1)
  assert.equal(result.source, "database")
  assert.equal(result.sources[0].url, "https://example.test/location")
  assert.equal(result.reply.slice(result.citations[0].start, result.citations[0].end), "[1]")
  assert.deepEqual(parseThemisAnswer(result), result)
})

test("simple clock questions use the server clock after retrieval without model or web calls", async (t) => {
  let searches = 0
  const base = config(t, { allowGeneralFallback: true })
  const knowledge = { search() { searches++; return base.knowledge.search("γραφεία") } }
  const result = await answerQuestion([{ role: "user", content: "τι ωρα ειναι" }], { ...base, knowledge }, async () => {
    throw new Error("clock answers must not call a provider")
  }, new AbortController().signal)
  assert.equal(searches, 1)
  assert.equal(result.source, "clock")
  assert.match(result.reply, /Europe\/Athens/)
  assert.ok(parseThemisAnswer(result))
})

test("related excerpts that cannot answer the question fall through to required web search", async (t) => {
  const stages: string[] = []
  const result = await answerQuestion(messages, config(t), async (_url, init) => {
    const body = JSON.parse(String(init?.body))
    if (body.text) { stages.push("database"); return response(decline) }
    stages.push("web")
    assert.equal(body.tool_choice, "required")
    assert.deepEqual(body.tools, [{ type: "web_search", filters: { allowed_domains: ["gov.gr", "et.gr", "europa.eu"] } }])
    return webResponse()
  }, new AbortController().signal)
  assert.deepEqual(stages, ["database", "web"])
  assert.equal(result.source, "web")
  assert.ok(parseThemisAnswer(result))
})

test("database misses go straight to the web and use the configured source domains", async (t) => {
  let calls = 0
  const result = await answerQuestion(missing, config(t, { webAllowedDomains: ["europa.eu"] }), async (_url, init) => {
    calls++
    const body = JSON.parse(String(init?.body))
    assert.equal(body.text, undefined)
    assert.deepEqual(body.tools[0].filters.allowed_domains, ["europa.eu"])
    return webResponse("https://eur-lex.europa.eu/example")
  }, new AbortController().signal)
  assert.equal(calls, 1)
  assert.equal(result.source, "web")
})

test("an explicit empty domain list searches the public web and still requires real citations", async (t) => {
  const result = await answerQuestion(missing, config(t, { webAllowedDomains: [] }), async (_url, init) => {
    const body = JSON.parse(String(init?.body))
    assert.deepEqual(body.tools, [{ type: "web_search" }])
    return webResponse("https://www.nasa.gov/example")
  }, new AbortController().signal)
  assert.equal(result.source, "web")
  assert.ok(parseThemisAnswer(result))
})

test("short follow-up questions retain the previous user topic and ignore assistant evidence", async (t) => {
  const history: ThemisMessage[] = [messages[0], { role: "assistant", content: "Untrusted assistant text", sources: [{ id: "fake", title: "fake", url: "https://example.test" }] }, { role: "user", content: "Και πού;" }]
  const result = await answerQuestion(history, config(t), async (_url, init) => {
    const body = JSON.parse(String(init?.body))
    assert.equal(body.text.format.name, "database_answer")
    assert.equal(body.input[1].sources, undefined)
    return response(decision)
  }, new AbortController().signal)
  assert.equal(result.source, "database")
})

test("database failures stop before any provider request", async (t) => {
  await assert.rejects(answerQuestion(messages, config(t, { knowledge: { search() { throw new Error("private database diagnostic") } } }), async () => {
    throw new Error("provider must not run")
  }, new AbortController().signal), (error: unknown) => error instanceof ProviderError && error.status === 503 && error.code === "knowledge_unavailable")
})

test("unapproved IDs, absent evidence, and malformed database decisions fail closed", async (t) => {
  for (const value of [
    { ...decision, citation_ids: ["unapproved:fake"] },
    { ...decision, citation_ids: [] },
    { ...decision, answer: "" },
    { ...decline, citation_ids: ["unapproved:fake"] },
    "not JSON",
  ]) {
    let calls = 0
    await assert.rejects(answerQuestion(messages, config(t), async () => { calls++; return response(value) }, new AbortController().signal),
      (error: unknown) => error instanceof ProviderError && error.code === "invalid_database_answer")
    assert.equal(calls, 1)
  }
})

test("uncited answers, simulated searches, and unapproved citation hosts are not presented as evidence", async (t) => {
  for (const result of [
    webResponse("https://gov.gr.attacker.test/"),
    webResponse("https://user:password@gov.gr/"),
    webResponse("javascript:alert(1)"),
    webResponse("https://www.gov.gr/example", false),
    webResponse("https://www.gov.gr/example", true, false),
  ]) {
    const answer = await answerQuestion(missing, config(t), async () => result, new AbortController().signal)
    assert.equal(answer.source, "unavailable")
    assert.deepEqual(answer.sources, [])
  }
})

test("model-memory fallback is opt-in and visibly labelled after unsuccessful web evidence", async (t) => {
  let calls = 0
  const answer = await answerQuestion(missing, config(t, { allowGeneralFallback: true }), async (_url, init) => {
    calls++
    const body = JSON.parse(String(init?.body))
    if (body.tools) return webResponse("https://www.gov.gr/example", true, false)
    assert.match(body.instructions, /Do not state current legislation/)
    return response("Γενική εξήγηση μιας έννοιας.")
  }, new AbortController().signal)
  assert.equal(calls, 2)
  assert.equal(answer.source, "general")
  assert.match(answer.reply, /^Γενική πληροφορία χωρίς επαληθευμένη πηγή/)
  assert.deepEqual(answer.sources, [])
})

test("disabling web and general fallback performs no provider calls for a database miss", async (t) => {
  const answer = await answerQuestion(missing, config(t, { webSearchEnabled: false }), async () => { throw new Error("must not call") }, new AbortController().signal)
  assert.equal(answer.source, "unavailable")
})

test("awaits asynchronous knowledge retrieval and verifies evidence before and after generation", async (t) => {
  const stages: string[] = []
  const base = config(t)
  const knowledge = {
    async search(question: string) { stages.push("search"); await Promise.resolve(); return base.knowledge.search(question) },
    async verify() { stages.push("verify"); await Promise.resolve() },
  }
  const result = await answerQuestion(messages, { ...base, knowledge }, async () => {
    stages.push("generate"); return response(decision)
  }, new AbortController().signal)
  assert.equal(result.source, "database")
  assert.deepEqual(stages, ["search", "verify", "generate", "verify"])
})

test("evidence revoked during model generation returns a controlled failure without fallback", async (t) => {
  let verification = 0
  let calls = 0
  const base = config(t)
  const knowledge = { search: base.knowledge.search.bind(base.knowledge), verify() {
    if (++verification === 2) throw new Error("private withdrawal diagnostic")
  } }
  await assert.rejects(answerQuestion(messages, { ...base, knowledge }, async () => {
    calls++; return response(decision)
  }, new AbortController().signal), (error: unknown) => error instanceof ProviderError && error.status === 503 && error.code === "knowledge_unavailable")
  assert.equal(calls, 1)
})

test("insufficient database passages are not carried into the web generation prompt", async (t) => {
  const result = await answerQuestion(messages, config(t), async (_url, init) => {
    const body = JSON.parse(String(init?.body))
    if (body.text) return response(decline)
    assert.ok(!body.instructions.includes("Το γραφείο βρίσκεται στην Καλαμάτα."))
    return webResponse()
  }, new AbortController().signal)
  assert.equal(result.source, "web")
})

test("browser contract rejects unsafe links, missing sources, invalid offsets, and overlapping citations", () => {
  const answer = { reply: "Answer [1] [2]", source: "web", sources: [{ id: "1", title: "Source", url: "https://gov.gr/" }], citations: [{ start: 7, end: 10, sourceIndex: 0 }] }
  assert.ok(parseThemisAnswer(answer))
  for (const invalid of [
    { ...answer, sources: [{ id: "1", title: "Source", url: "javascript:alert(1)" }] },
    { ...answer, sources: [] },
    { ...answer, citations: [] },
    { ...answer, citations: [{ start: -1, end: 2, sourceIndex: 0 }] },
    { ...answer, citations: [{ start: 7, end: 50, sourceIndex: 0 }] },
    { ...answer, citations: [{ start: 7, end: 10, sourceIndex: 2 }] },
    { ...answer, citations: [...answer.citations, { start: 9, end: 12, sourceIndex: 0 }] },
  ]) assert.equal(parseThemisAnswer(invalid), null)
})
