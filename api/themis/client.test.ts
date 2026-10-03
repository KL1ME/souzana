import assert from "node:assert/strict"
import { test } from "node:test"
import { requestThemisAnswer } from "../../lib/themis-client"

const messages = [{ role: "user" as const, content: "Πού έχετε γραφεία;" }]
const answer = { reply: "Καλαμάτα και Αθήνα. [1]", source: "database", sources: [{ id: "website:locations", title: "Γραφεία", url: "https://example.com/team/" }], citations: [{ start: 19, end: 22, sourceIndex: 0 }] }

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
