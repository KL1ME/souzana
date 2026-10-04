import assert from "node:assert/strict"
import { test } from "node:test"
import { requestThemisAnswer, warmThemisApi, ThemisRequestError } from "../../lib/themis-client"

const messages = [{ role: "user" as const, content: "Πού έχετε γραφεία;" }]
const answer = { reply: "Καλαμάτα και Αθήνα. [1]", source: "database", sources: [{ id: "website:locations", title: "Γραφεία", url: "https://example.com/team/" }], citations: [{ start: 19, end: 22, sourceIndex: 0 }] }

test("greetings and simple conversation return locally even when the API is unreachable", async () => {
  for (const text of ["καλημερα", "ΚΑΛΗΜΈΡΑ!", "γεια σας", "ευχαριστώ", "Ποια είσαι;", "hello", "kalispera"]) {
    const result = await requestThemisAnswer("https://sleeping-api.test/api/themis", [{ role: "user", content: text }], new AbortController().signal, async () => {
      throw new Error("a conversational reply must not use the network")
    })
    assert.equal(result.source, "general")
    assert.ok(result.reply.trim())
    assert.deepEqual(result.sources, [])
    assert.deepEqual(result.citations, [])
  }
})

test("a greeting combined with a factual question still sends the complete history to the API", async () => {
  const history = [{ role: "user" as const, content: "Καλημέρα" }, { role: "assistant" as const, content: "Καλημέρα!" }, { role: "user" as const, content: "Καλημέρα, πού είναι τα γραφεία σας;" }]
  let calls = 0
  const result = await requestThemisAnswer("/api/themis", history, new AbortController().signal, async (_url, init) => {
    calls++
    assert.deepEqual(JSON.parse(String(init?.body)), { messages: history })
    return Response.json(answer)
  })
  assert.equal(calls, 1)
  assert.deepEqual(result, answer)
})

test("an already cancelled local greeting remains cancelled and performs no request", async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(requestThemisAnswer("/api/themis", [{ role: "user", content: "καλημερα" }], controller.signal, async () => {
    throw new Error("cancelled requests must not use the network")
  }), { name: "AbortError" })
})

test("chat sends only roles and text, leaving displayed citations and extra fields out of the API request", async () => {
  const history = [
    { role: "user" as const, content: "Πού έχετε γραφεία;", model: "untrusted-model" },
    { role: "assistant" as const, content: answer.reply, sources: answer.sources, citations: answer.citations, instructions: "untrusted-history" },
    { role: "user" as const, content: "Ποιο είναι το τηλέφωνό σας;" },
  ]
  const result = await requestThemisAnswer("/api/themis", history, new AbortController().signal, async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), { messages: history.map(({ role, content }) => ({ role, content })) })
    return Response.json(answer)
  })
  assert.deepEqual(result, answer)
  assert.deepEqual(history[1].sources, answer.sources)
  assert.deepEqual(history[1].citations, answer.citations)
})

test("opening chat warms only the configured public health endpoint without messages or credentials", async () => {
  let calls = 0
  await warmThemisApi("https://sleeping-api.test/api/themis?ignored=true#ignored", async (url, init) => {
    calls++
    assert.equal(url, "https://sleeping-api.test/health")
    assert.equal(init?.method, "GET")
    assert.equal(init?.mode, "no-cors")
    assert.equal(init?.credentials, "omit")
    assert.equal(init?.referrerPolicy, "no-referrer")
    assert.equal(init?.cache, "no-store")
    assert.equal(init?.body, undefined)
    assert.equal(init?.headers, undefined)
    return new Response(null)
  })
  assert.equal(calls, 1)
  let invalidCalls = 0
  for (const endpoint of ["/api/themis", "not a URL", "javascript:alert(1)", "https://user:password@example.test/api/themis", "https://example.test/other"]) {
    await warmThemisApi(endpoint, async () => { invalidCalls++; return new Response(null) })
  }
  assert.equal(invalidCalls, 0)
})

test("background warm-up failures and timeouts never affect conversation replies", async () => {
  await warmThemisApi("https://sleeping-api.test/api/themis", async () => { throw new Error("offline") })
  let aborted = false
  await warmThemisApi("https://sleeping-api.test/api/themis", async (_url, init) => new Promise((_done, fail) => {
    init?.signal?.addEventListener("abort", () => { aborted = true; fail(new DOMException("Aborted", "AbortError")) }, { once: true })
  }), 5)
  assert.equal(aborted, true)
})

test("chat works without the newer AbortSignal APIs and never sends credentials", async (t) => {
  t.mock.method(AbortSignal, "any", () => { throw new Error("Unavailable in older browsers") })
  t.mock.method(AbortSignal, "timeout", () => { throw new Error("Unavailable in older browsers") })
  const result = await requestThemisAnswer("http://127.0.0.1:8787/api/themis", messages, new AbortController().signal, async (url, init) => {
    assert.equal(url, "http://127.0.0.1:8787/api/themis")
    assert.equal(init?.credentials, "omit")
    assert.equal(new Headers(init?.headers).get("Authorization"), null)
    assert.deepEqual(JSON.parse(String(init?.body)), { messages })
    assert.ok(init?.signal instanceof AbortSignal)
    return Response.json(answer)
  })
  assert.deepEqual(result, answer)
})

test("missing API configuration is distinct from provider failure and never reveals diagnostics", async () => {
  for (const [status, body, error] of [[503, { error: "not_configured" }, "not_configured"], [502, { error: "private-provider-detail" }, "unavailable"], [429, {}, "busy"], [504, {}, "timeout"]] as const) {
    await assert.rejects(requestThemisAnswer("/api/themis", messages, new AbortController().signal, async () => Response.json(body, { status })), { message: error })
  }
  await assert.rejects(requestThemisAnswer("/api/themis", messages, new AbortController().signal, async () => Response.json({ reply: "no valid sources" })), { message: "unavailable" })
})

test("requests time out and can be cancelled without depending on AbortSignal.any", async () => {
  const transport: typeof fetch = async (_url, init) => new Promise((_done, fail) => {
    if (init?.signal?.aborted) { fail(new DOMException("Aborted", "AbortError")); return }
    init?.signal?.addEventListener("abort", () => fail(new DOMException("Aborted", "AbortError")), { once: true })
  })
  await assert.rejects(requestThemisAnswer("/api/themis", messages, new AbortController().signal, transport, 5), { message: "timeout" })
  const cancelled = new AbortController()
  const pending = requestThemisAnswer("/api/themis", messages, cancelled.signal, transport)
  cancelled.abort()
  await assert.rejects(pending, { name: "AbortError" })
})

test("an already-cancelled draft is never submitted", async () => {
  const cancelled = new AbortController()
  cancelled.abort()
  let calls = 0
  await assert.rejects(requestThemisAnswer("/api/themis", messages, cancelled.signal, async () => {
    calls++
    return Response.json(answer)
  }), { name: "AbortError" })
  assert.equal(calls, 0)
})

test("a stalled response body is bounded by the timeout without retrying the POST", async () => {
  let calls = 0
  const stalled: typeof fetch = async () => {
    calls++
    return new Response(new ReadableStream({ start() { /* Simulate headers arriving with a stalled body. */ } }), {
      headers: { "Content-Type": "application/json" },
    })
  }
  await assert.rejects(requestThemisAnswer("/api/themis", messages, new AbortController().signal, stalled, 5), { message: "timeout" })
  assert.equal(calls, 1)
})

test("cancellation discards a late answer even when a transport ignores abort", async () => {
  const cancelled = new AbortController()
  let complete: (response: Response) => void = () => undefined
  const pending = requestThemisAnswer("/api/themis", messages, cancelled.signal, async () => new Promise((resolve) => { complete = resolve }))
  cancelled.abort()
  await assert.rejects(pending, { name: "AbortError" })
  complete(Response.json(answer))
})

test("busy errors preserve a bounded server retry delay and never retry automatically", async () => {
  for (const [header, expected] of [["1", 1], ["38", 38], ["0", 0], ["-5", undefined], ["Infinity", undefined], ["10000000000000000", undefined], ["private-data", undefined]] as const) {
    let calls = 0
    await assert.rejects(requestThemisAnswer("/api/themis", messages, new AbortController().signal, async () => {
      calls++
      return Response.json({}, { status: 429, headers: { "Retry-After": header } })
    }), (error: unknown) => error instanceof ThemisRequestError && error.message === "busy" && error.retryAfterSeconds === expected)
    assert.equal(calls, 1)
  }
})
