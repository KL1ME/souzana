import { parseThemisAnswer, type ThemisMessage } from "./themis"

/** Standard AbortController works on older Safari versions without AbortSignal.any/timeout. */
export async function requestThemisAnswer(endpoint: string, messages: ThemisMessage[], signal: AbortSignal, fetchImpl: typeof fetch = fetch, timeoutMs = 75_000) {
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
