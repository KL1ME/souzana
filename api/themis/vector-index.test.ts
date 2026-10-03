import assert from "node:assert/strict"
import test from "node:test"
import { createKnowledgeStore, KnowledgeIndexError, OpenAIKnowledgeIndex, type IndexedDocument } from "./vector-index"

const DOCUMENT: IndexedDocument = {
  id: "drive:approved123", contentHash: "a".repeat(64), driveVersion: "17", title: "Εγκεκριμένες πληροφορίες",
  bytes: new TextEncoder().encode("Δημόσια πληροφορία στα ελληνικά."), filename: "approved.txt", mimeType: "text/plain",
}
const FILE = "file-owned123"
const STORE = "vs_test123"
type Request = { url: string; init: RequestInit }

function response(value: unknown, status = 200) { return Response.json(value, { status }) }
function attachment(status = "completed", extra: Record<string, unknown> = {}) {
  return { object: "vector_store.file", id: FILE, vector_store_id: STORE, status, ...extra }
}
function hit(extra: Record<string, unknown> = {}) {
  return { file_id: FILE, filename: "approved.txt", score: 0.9,
    attributes: { source_id: DOCUMENT.id, content_hash: DOCUMENT.contentHash, drive_version: DOCUMENT.driveVersion },
    content: [{ type: "text", text: "Ελληνική πληροφορία." }], ...extra }
}
function page(data: unknown[] = [hit()], extra: Record<string, unknown> = {}) {
  return { object: "vector_store.search_results.page", search_query: ["Ελληνική ερώτηση"], data, has_more: false, next_page: null, ...extra }
}
function fixture(handle: (request: Request, index: number) => Promise<Response> | Response, options: { pollIntervalMs?: number; pollTimeoutMs?: number } = {}) {
  const calls: Request[] = []
  const fetchImpl = (async (url, init) => {
    const call = { url: String(url), init: init ?? {} }
    calls.push(call)
    return handle(call, calls.length - 1)
  }) as typeof fetch
  return { calls, index: new OpenAIKnowledgeIndex({ apiKey: "mock-key", vectorStoreId: STORE, fetchImpl,
    pollIntervalMs: 1, pollTimeoutMs: 1000, ...options }) }
}
function code(expected: string) {
  return (error: unknown) => error instanceof KnowledgeIndexError && error.code === expected && error.message === expected
}

test("publication uploads approved bytes, binds source attributes, and waits until indexing completes", async () => {
  const { index, calls } = fixture((_request, i) => response([
    { object: "file", id: FILE }, attachment("in_progress"), attachment("in_progress"), attachment(),
  ][i]))
  assert.equal(await index.publish(DOCUMENT), FILE)
  assert.equal(calls.length, 4)
  assert.equal(calls[0].url, "https://api.openai.com/v1/files")
  assert.equal(calls[0].init.redirect, "error")
  const form = calls[0].init.body as FormData
  assert.equal(form.get("purpose"), "assistants")
  const file = form.get("file") as File
  assert.equal(file.name, DOCUMENT.filename)
  assert.equal(file.type, DOCUMENT.mimeType)
  assert.equal(await file.text(), new TextDecoder().decode(DOCUMENT.bytes))
  assert.deepEqual(JSON.parse(calls[1].init.body as string), { file_id: FILE, attributes: {
    source_id: DOCUMENT.id, content_hash: DOCUMENT.contentHash, drive_version: DOCUMENT.driveVersion,
  } })
  assert.equal(calls[2].url, `https://api.openai.com/v1/vector_stores/${STORE}/files/${FILE}`)
  assert.equal(calls[2].init.method, "GET")
  assert.equal(calls[0].init.signal, calls[3].init.signal)
})

test("terminal indexing failure removes both staging resources and preserves the failure", async () => {
  const { index, calls } = fixture((_request, i) => {
    if (i === 0) return response({ object: "file", id: FILE })
    if (i === 1) return response(attachment("failed", { last_error: { message: "Do not leak this private message" } }))
    return response({ secret: "cleanup failure details" }, 503)
  })
  await assert.rejects(index.publish(DOCUMENT), code("indexing_failed"))
  assert.deepEqual(calls.slice(2).map((call) => [call.url, call.init.method]), [
    [`https://api.openai.com/v1/vector_stores/${STORE}/files/${FILE}`, "DELETE"],
    [`https://api.openai.com/v1/files/${FILE}`, "DELETE"],
  ])
})

test("attach HTTP failure and malformed attach results also clean up a known upload", async () => {
  for (const invalid of [response({ error: { message: "private provider details" } }, 400), response(attachment("completed", { id: "file-other" })),
    response(attachment("cancelled"))]) {
    const { index, calls } = fixture((_request, i) => i === 0 ? response({ object: "file", id: FILE }) : i === 1 ? invalid : response({ deleted: true }))
    await assert.rejects(index.publish(DOCUMENT), (error: unknown) => error instanceof KnowledgeIndexError && !error.message.includes("private"))
    assert.equal(calls.length, 4)
    assert.equal(calls[2].init.method, "DELETE")
    assert.equal(calls[3].init.method, "DELETE")
  }
})

test("malformed upload with a valid file ID attempts cleanup instead of orphaning the file", async () => {
  const { index, calls } = fixture((_request, i) => response(i === 0 ? { object: "wrong", id: FILE } : { deleted: true }))
  await assert.rejects(index.publish(DOCUMENT), code("invalid_index_response"))
  assert.equal(calls.length, 3)
})

test("caller cancellation interrupts polling and uses a fresh signal for staging cleanup", async () => {
  const controller = new AbortController()
  const { index, calls } = fixture((_request, i) => {
    if (i === 0) return response({ object: "file", id: FILE })
    if (i === 1) {
      setTimeout(() => controller.abort("caller-only secret"), 5)
      return response(attachment("in_progress"))
    }
    return response({ deleted: true })
  }, { pollIntervalMs: 100 })
  await assert.rejects(index.publish(DOCUMENT, controller.signal), (error: unknown) => error instanceof DOMException && error.name === "AbortError" && !error.message.includes("secret"))
  assert.equal(calls.length, 4)
  assert.equal(calls[0].init.signal?.aborted, true)
  assert.equal(calls[2].init.signal?.aborted, false)
})

test("publication polling has an overall timeout and cleans up unfinished staging files", async () => {
  const { index, calls } = fixture(({ init }, i) => response(init.method === "DELETE" ? { deleted: true } : i === 0 ? { object: "file", id: FILE } : attachment("in_progress")),
    { pollTimeoutMs: 15, pollIntervalMs: 100 })
  const start = Date.now()
  await assert.rejects(index.publish(DOCUMENT), code("index_timeout"))
  assert.ok(Date.now() - start < 1000)
  assert.equal(calls.length, 4)
  assert.equal(calls[2].init.method, "DELETE")
})

test("the deadline also bounds a provider request that does not settle", async () => {
  const { index, calls } = fixture(({ init }, i) => {
    if (i === 0) return response({ object: "file", id: FILE })
    if (init.method === "DELETE") return response({ deleted: true })
    return new Promise<Response>(() => undefined)
  }, { pollTimeoutMs: 15 })
  await assert.rejects(index.publish(DOCUMENT), code("index_timeout"))
  assert.equal(calls.length, 4)
})

test("an already aborted operation does not upload or search", async () => {
  const { index, calls } = fixture(() => { throw new Error("must not be called") })
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(index.publish(DOCUMENT, controller.signal), { name: "AbortError" })
  await assert.rejects(index.search("Πληροφορίες", controller.signal), { name: "AbortError" })
  assert.equal(calls.length, 0)
})

test("explicit managed search requests thirty rewritten results and keeps all scores for catalogue filtering", async () => {
  const { index, calls } = fixture(() => response(page([hit({ score: 0, content: [
    { type: "text", text: "Πρώτο απόσπασμα." }, { type: "text", text: " " }, { type: "text", text: "Δεύτερο απόσπασμα." },
  ] })])))
  const hits = await index.search("Ελληνική ερώτηση")
  assert.deepEqual(JSON.parse(calls[0].init.body as string), { query: "Ελληνική ερώτηση", rewrite_query: true, max_num_results: 30 })
  assert.equal(calls[0].url, `https://api.openai.com/v1/vector_stores/${STORE}/search`)
  assert.equal(hits[0].text, "Πρώτο απόσπασμα.\nΔεύτερο απόσπασμα.")
  assert.equal(hits[0].fileId, FILE)
  assert.equal(hits[0].score, 0)
  assert.equal(hits[0].attributes.content_hash, DOCUMENT.contentHash)
})

test("empty valid results are a miss; empty text is not exposed as an excerpt", async () => {
  const empty = fixture(() => response(page([])))
  assert.deepEqual(await empty.index.search("Ερώτηση"), [])
  const blank = fixture(() => response(page([hit({ content: [{ type: "text", text: "   " }], attributes: null })])))
  assert.deepEqual(await blank.index.search("Ερώτηση"), [])
})

test("malformed search envelopes and rows fail instead of becoming knowledge misses", async () => {
  const invalid = [
    {}, page([], { object: "wrong" }), page([], { has_more: "false" }), page([], { search_query: null }), page([], { next_page: 10 }),
    page(Array.from({ length: 31 }, () => hit())), page([hit({ file_id: "file-owned/../../secret" })]), page([hit({ score: -0.1 })]),
    page([hit({ score: 1.1 })]), page([hit({ attributes: { content_hash: {} } })]), page([hit({ content: [{ type: "image", text: "wrong" }] })]),
    page([hit({ content: [{ type: "text", text: "x".repeat(12_001) }] })]), page([hit({ filename: null })]),
    page([hit(), null]), page([hit({ attributes: Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`key${i}`, true])) })]),
  ]
  for (const value of invalid) {
    const { index } = fixture(() => response(value))
    await assert.rejects(index.search("Ερώτηση"), code("invalid_index_response"))
  }
})

test("provider errors and invalid JSON never expose the response body or credentials", async () => {
  for (const status of [401, 429, 500]) {
    const { index } = fixture(() => response({ error: "mock-key private server text" }, status))
    await assert.rejects(index.search("Ερώτηση"), (error: unknown) => error instanceof KnowledgeIndexError && error.code === "index_unavailable" && error.status === status && !error.message.includes("key"))
  }
  const invalid = fixture(() => new Response("not json mock-key"))
  await assert.rejects(invalid.index.search("Ερώτηση"), code("invalid_index_response"))
  const network = fixture(() => { throw new Error("mock-key and request secret") })
  await assert.rejects(network.index.search("Ερώτηση"), code("index_unavailable"))
  const brokenBody = fixture(() => new Response(new ReadableStream({ start(controller) {
    controller.error(new Error("mock-key and body transport secret"))
  } })))
  await assert.rejects(brokenBody.index.search("Ερώτηση"), code("invalid_index_response"))
})

test("response bodies exceeding a fixed size are rejected", async () => {
  const { index } = fixture(() => new Response("{}", { headers: { "Content-Length": String(3 * 1024 * 1024) } }))
  await assert.rejects(index.search("Ερώτηση"), code("invalid_index_response"))
})

test("remove detaches then deletes only the supplied owned file and tolerates missing resources", async () => {
  const { index, calls } = fixture(() => response({ error: "missing" }, 404))
  await index.remove(FILE)
  assert.deepEqual(calls.map((call) => [call.url, call.init.method]), [
    [`https://api.openai.com/v1/vector_stores/${STORE}/files/${FILE}`, "DELETE"],
    [`https://api.openai.com/v1/files/${FILE}`, "DELETE"],
  ])
  await assert.rejects(index.remove("file-other/escape"), code("invalid_index_file"))
  assert.equal(calls.length, 2)
})

test("unsafe configuration and unsupported document inputs fail before any provider request", async () => {
  assert.throws(() => new OpenAIKnowledgeIndex({ apiKey: "mock-key", vectorStoreId: "vs_test/path" }), code("invalid_index_config"))
  assert.throws(() => new OpenAIKnowledgeIndex({ apiKey: "", vectorStoreId: STORE }), code("invalid_index_config"))
  assert.throws(() => new OpenAIKnowledgeIndex({ apiKey: "mock-key", vectorStoreId: STORE, pollTimeoutMs: Infinity }), code("invalid_index_config"))
  const { index, calls } = fixture(() => { throw new Error("must not be called") })
  for (const changed of [{ bytes: new Uint8Array() }, { contentHash: "wrong" }, { filename: "../document.txt" }, { mimeType: "text/plain\r\nsecret" }]) {
    await assert.rejects(index.publish({ ...DOCUMENT, ...changed }), code("invalid_index_document"))
  }
  await assert.rejects(index.search(" "), code("invalid_index_question"))
  assert.equal(calls.length, 0)
})

test("store creation makes one fixed request and returns a validated dedicated store ID", async () => {
  const calls: Request[] = []
  const fetchImpl = (async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} })
    return response({ object: "vector_store", id: STORE })
  }) as typeof fetch
  assert.equal(await createKnowledgeStore({ apiKey: "mock-key", folderId: "approved_folder123", fetchImpl }), STORE)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, "https://api.openai.com/v1/vector_stores")
  assert.equal(calls[0].init.method, "POST")
  assert.equal(calls[0].init.redirect, "error")
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer mock-key")
  assert.deepEqual(JSON.parse(calls[0].init.body as string), {
    name: "THEMIS approved knowledge", metadata: { drive_folder_id: "approved_folder123" },
  })
})

test("ambiguous store creation failures are sanitized and never retried", async () => {
  for (const handle of [
    () => response({ error: "mock-key private details" }, 503),
    () => { throw new Error("request mock-key lost after creating store") },
    () => response({ object: "wrong", id: STORE }),
    () => response({ object: "vector_store", id: "vs_bad/path" }),
    () => new Response("mock-key malformed JSON"),
  ]) {
    let calls = 0
    const fetchImpl = (async () => { calls++; return handle() }) as typeof fetch
    await assert.rejects(createKnowledgeStore({ apiKey: "mock-key", folderId: "folder123", fetchImpl }),
      (error: unknown) => error instanceof KnowledgeIndexError && !error.message.includes("key"))
    assert.equal(calls, 1)
  }
})

test("store creation validates configuration and honours caller cancellation", async () => {
  let calls = 0
  const fetchImpl = (async () => { calls++; return new Promise<Response>(() => undefined) }) as typeof fetch
  await assert.rejects(createKnowledgeStore({ apiKey: "mock-key", folderId: "folder/escape", fetchImpl }), code("invalid_index_config"))
  assert.equal(calls, 0)
  const already = new AbortController()
  already.abort()
  await assert.rejects(createKnowledgeStore({ apiKey: "mock-key", folderId: "folder123", fetchImpl }, already.signal), { name: "AbortError" })
  assert.equal(calls, 0)
  const pending = new AbortController()
  const result = createKnowledgeStore({ apiKey: "mock-key", folderId: "folder123", fetchImpl }, pending.signal)
  pending.abort("private cancellation message")
  await assert.rejects(result, (error: unknown) => error instanceof DOMException && error.name === "AbortError" && !error.message.includes("private"))
  assert.equal(calls, 1)
})
