import { parseThemisAnswer, type ThemisMessage } from "./themis"
import { conversationAnswer } from "./themis-conversation"

/** Standard AbortController works on older Safari versions without AbortSignal.any/timeout. */
export async function requestThemisAnswer(endpoint: string, messages: ThemisMessage[], signal: AbortSignal, fetchImpl: typeof fetch = fetch, timeoutMs = 75_000) {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError")
  const latest = messages.at(-1)
  const local = latest?.role === "user" ? conversationAnswer(latest.content) : null
  if (local) return local

  const controller = new AbortController()
  let timedOut = false
  const cancel = () => controller.abort()
  signal.addEventListener("abort", cancel, { once: true })
  if (signal.aborted) cancel()
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
  try {
    const response = await fetchImpl(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }), credentials: "omit", signal: controller.signal })
    if (!response.ok) {
      if (response.status === 503) {
        const error = await response.json().catch(() => null)
        if (error?.error === "not_configured") throw new Error("not_configured")
      }
      throw new Error(response.status === 429 ? "busy" : response.status === 504 ? "timeout" : "unavailable")
    }
    const answer = parseThemisAnswer(await response.json())
    if (!answer) throw new Error("unavailable")
    return answer
  } catch (error) {
    if (timedOut) throw new Error("timeout")
    throw error
  } finally {
    clearTimeout(timer)
    signal.removeEventListener("abort", cancel)
  }
}

/** Start a sleeping test API while the visitor is reading or typing; no conversation is sent. */
export async function warmThemisApi(endpoint: string, fetchImpl: typeof fetch = fetch, timeoutMs = 60_000) {
  let healthUrl: URL
  try {
    healthUrl = new URL(endpoint)
    if (!["http:", "https:"].includes(healthUrl.protocol) || healthUrl.username || healthUrl.password || healthUrl.pathname !== "/api/themis") return
    healthUrl.pathname = "/health"
    healthUrl.search = ""
    healthUrl.hash = ""
  } catch { return }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    // Health is public and has no CORS response headers; an opaque response is enough to wake it.
    await fetchImpl(healthUrl.toString(), { method: "GET", mode: "no-cors", credentials: "omit",
      cache: "no-store", referrerPolicy: "no-referrer", signal: controller.signal })
  } catch { /* Waking the API is best effort and must never block a local reply. */ }
  finally { clearTimeout(timer) }
}
