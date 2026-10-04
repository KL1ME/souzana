// Explicit operator smoke check; never runs periodically or reads private credentials.
import { parseArgs } from "node:util"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { THEMIS_MAX_MESSAGE_LENGTH, parseThemisAnswer } from "../../lib/themis"

type CheckOptions = { endpoint: string; origin: string; question?: string; timeoutMs?: number }
type CheckResult = { check: string; status: number; durationMs: number; ok: boolean; source?: string; retryAfter?: string | null }

export async function checkThemis(options: CheckOptions): Promise<CheckResult[]> {
  const endpoint = new URL(options.endpoint)
  const origin = new URL(options.origin)
  const loopback = ["localhost", "127.0.0.1", "[::1]"]
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== "/api/themis" ||
    !(endpoint.protocol === "https:" || (endpoint.protocol === "http:" && loopback.includes(endpoint.hostname)))) {
    throw new Error("Use an HTTPS /api/themis URL, or HTTP on loopback, without credentials or query parameters.")
  }
  if (origin.origin !== options.origin || !["https:", "http:"].includes(origin.protocol)) {
    throw new Error("Use an exact website origin without a path or trailing slash.")
  }
  if (options.question !== undefined && (!options.question.trim() || options.question.length > THEMIS_MAX_MESSAGE_LENGTH)) {
    throw new Error(`The optional question must contain 1-${THEMIS_MAX_MESSAGE_LENGTH} characters.`)
  }
  const timeoutMs = options.timeoutMs ?? 90_000
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 180_000) throw new Error("Invalid check timeout.")
  const results: CheckResult[] = []
  async function step(check: string, url: string, init: RequestInit, valid: (response: Response, body: unknown) => boolean, json = true) {
    const start = performance.now()
    const signal = AbortSignal.timeout(timeoutMs)
    let status = 0
    try {
      const response = await fetch(url, { ...init, credentials: "omit", redirect: "error", signal })
      status = response.status
      const body: unknown = json ? await response.json() : undefined
      const source = check === "greeting" || check === "question" ? parseThemisAnswer(body)?.source : undefined
      const result = { check, status: response.status, durationMs: Math.round(performance.now() - start),
        ok: valid(response, body), ...(source ? { source } : {}), ...(response.status === 429 ? { retryAfter: response.headers.get("Retry-After") } : {}) }
      results.push(result)
      return result.ok
    } catch {
      results.push({ check, status, durationMs: Math.round(performance.now() - start), ok: false })
      return false
    }
  }
  const ready = await step("health", new URL("/health", endpoint).href, { method: "GET" }, (response, body) =>
    response.ok && Boolean(body && typeof body === "object" && "ready" in body && body.ready === true))
  const cors = await step("preflight", endpoint.href, { method: "OPTIONS", headers: {
    Origin: options.origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type",
  } }, (response) => response.status === 204 && response.headers.get("Access-Control-Allow-Origin") === options.origin &&
    Boolean(response.headers.get("Access-Control-Allow-Methods")?.split(",").map((method) => method.trim()).includes("POST")) &&
    Boolean(response.headers.get("Access-Control-Allow-Headers")?.toLowerCase().split(",").map((header) => header.trim()).includes("content-type")), false)
  if (!ready || !cors) return results
  async function chat(check: string, content: string) {
    return step(check, endpoint.href, { method: "POST", headers: { Origin: options.origin, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content }] }) }, (response, body) =>
      response.ok && response.headers.get("Access-Control-Allow-Origin") === options.origin && parseThemisAnswer(body) !== null)
  }
  if (await chat("greeting", "Καλησπέρα") && options.question !== undefined) await chat("question", options.question.trim())
  return results
}

async function main() {
  const { values } = parseArgs({ options: { url: { type: "string" }, origin: { type: "string" }, question: { type: "string" } } })
  if (!values.url || !values.origin) throw new Error("Usage: npm run themis:check -- --url https://HOST/api/themis --origin https://WEBSITE [--question 'Public test question']")
  const results = await checkThemis({ endpoint: values.url, origin: values.origin, question: values.question })
  // Only timings and contract status; never print prompts, answer text, or provider diagnostics.
  console.log(JSON.stringify(results, null, 2))
  if (results.some((result) => !result.ok)) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "THEMIS check failed."); process.exitCode = 1 })
}
