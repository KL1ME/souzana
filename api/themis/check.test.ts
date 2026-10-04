import assert from "node:assert/strict"
import { once } from "node:events"
import { createServer, type Server } from "node:http"
import { test } from "node:test"
import { checkThemis } from "./check"
import { createThemisServer } from "./http"
import { KnowledgeDatabase } from "./knowledge"
import { websiteKnowledge } from "./seed"

async function listen(server: Server) {
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const address = server.address()
  assert.ok(address && typeof address !== "string")
  return `http://127.0.0.1:${address.port}/api/themis`
}

function close(server: Server) {
  server.closeAllConnections()
  return new Promise<void>((done) => server.close(() => done()))
}

test("operator check verifies a real HTTP greeting and optional sourced question without retrying", async () => {
  const knowledge = new KnowledgeDatabase(":memory:")
  knowledge.importDocuments(websiteKnowledge(), true)
  let calls = 0
  const server = createThemisServer({ apiKey: "", model: "fixture", allowedOrigins: ["https://example.com"], knowledge,
    generateResponse: async (body) => {
      calls++
      if ((body.text as { format: { name: string } }).format.name === "scope_decision") {
        assert.deepEqual(body.input, [{ role: "user", content: "Ποιο είναι το τηλέφωνο;" }])
        return [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify({ route: "firm" }) }] }]
      }
      const format = body.text as { format: { schema: { properties: { citation_ids: { items: { enum: string[] } } } } } }
      return [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify({
        answer_found: true, answer: "Δείτε τα δημοσιευμένα στοιχεία επικοινωνίας.", citation_ids: [format.format.schema.properties.citation_ids.items.enum[0]],
      }) }] }]
    } })
  try {
    const endpoint = await listen(server)
    const result = await checkThemis({ endpoint, origin: "https://example.com", question: "Ποιο είναι το τηλέφωνο;" })
    assert.deepEqual(result.map(({ check, ok }) => ({ check, ok })), ["health", "preflight", "greeting", "question"].map((check) => ({ check, ok: true })))
    assert.equal(result.at(-1)?.source, "database")
    assert.ok(result.every((step) => step.durationMs >= 0))
    assert.equal(calls, 2)
  } finally { await close(server); knowledge.close() }
})

test("failed configuration or origin stops the check before sending a visitor message", async () => {
  const knowledge = new KnowledgeDatabase(":memory:")
  const server = createThemisServer({ apiKey: "", model: "", allowedOrigins: ["https://example.com"], knowledge })
  try {
    const endpoint = await listen(server)
    const result = await checkThemis({ endpoint, origin: "https://wrong.example", question: "Τηλέφωνο;" })
    assert.deepEqual(result.map(({ check, ok }) => ({ check, ok })), [{ check: "health", ok: false }, { check: "preflight", ok: false }])
    assert.equal(result[1].status, 403)
  } finally { await close(server); knowledge.close() }
})

test("check deadlines bound a host that never sends response headers", async () => {
  const server = createServer(() => undefined)
  try {
    const endpoint = await listen(server)
    const result = await checkThemis({ endpoint, origin: "https://example.com", timeoutMs: 20 })
    assert.equal(result.length, 2)
    assert.ok(result.every((step) => !step.ok && step.status === 0))
  } finally { await close(server) }
})

test("check preserves a gateway's HTTP status when its response is HTML rather than JSON", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(502, { "Content-Type": "text/html" })
    response.end("<h1>Gateway error</h1>")
  })
  try {
    const endpoint = await listen(server)
    const result = await checkThemis({ endpoint, origin: "https://example.com" })
    assert.ok(result.every((step) => !step.ok && step.status === 502))
  } finally { await close(server) }
})

test("check rejects credential-bearing endpoints and website paths before networking", async () => {
  await assert.rejects(checkThemis({ endpoint: "https://secret@example.com/api/themis", origin: "https://example.com" }))
  await assert.rejects(checkThemis({ endpoint: "http://example.com/api/themis", origin: "https://example.com" }))
  await assert.rejects(checkThemis({ endpoint: "https://example.com/api/themis?key=secret", origin: "https://example.com" }))
  await assert.rejects(checkThemis({ endpoint: "https://example.com/api/themis", origin: "https://example.com/souzana/" }))
})
