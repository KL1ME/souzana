import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { THEMIS_MAX_CONVERSATION_LENGTH, THEMIS_MAX_HISTORY, THEMIS_MAX_MESSAGE_LENGTH, type ThemisMessage } from "@/lib/themis"
import { answerQuestion, ProviderError, type AnswerConfig } from "./answers"
import { positiveInteger, ThemisRateLimiter, type RateLimitConfig } from "./rate-limit"

const MAX_BODY_BYTES = 64 * 1024
const MAX_REPLY_LENGTH = 6000

export type ThemisConfig = AnswerConfig & RateLimitConfig & {
  allowedOrigins: string[]
  maxConcurrentRequests?: number
  timeoutMs?: number
  bodyTimeoutMs?: number
  localOnly?: boolean
}

class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function validateMessages(body: unknown): ThemisMessage[] {
  if (!isRecord(body) || Object.keys(body).length !== 1 || !Array.isArray(body.messages) || !body.messages.length ||
    body.messages.length > THEMIS_MAX_HISTORY || body.messages.length % 2 !== 1) {
    throw new HttpError(400, "invalid_messages")
  }
  let total = 0
  const messages = body.messages.map((message: unknown, index: number): ThemisMessage => {
    const role = index % 2 === 0 ? "user" : "assistant"
    if (!isRecord(message) || message.role !== role || typeof message.content !== "string" ||
      Object.keys(message).some((key) => !["role", "content", ...(role === "assistant" ? ["sources", "citations"] : [])].includes(key)) ||
      (message.sources !== undefined && (!Array.isArray(message.sources) || message.sources.length > 16)) ||
      (message.citations !== undefined && (!Array.isArray(message.citations) || message.citations.length > 128))) {
      throw new HttpError(400, "invalid_messages")
    }
    const content = message.content.trim()
    if (!content || content.length > (role === "user" ? THEMIS_MAX_MESSAGE_LENGTH : MAX_REPLY_LENGTH)) {
      throw new HttpError(400, "invalid_messages")
    }
    total += content.length
    // Older open clients send prior assistant citation metadata. Discard it;
    // history never authorizes evidence or changes provider configuration.
    return { role, content }
  })
  if (total > THEMIS_MAX_CONVERSATION_LENGTH) throw new HttpError(413, "conversation_too_large")
  return messages
}

function readJson(request: IncomingMessage, signal: AbortSignal): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    let settled = false
    const chunks: Buffer[] = []
    const finish = (failure?: unknown, value?: unknown) => {
      if (settled) return
      settled = true
      request.removeListener("data", data)
      request.removeListener("end", end)
      request.removeListener("aborted", invalid)
      signal.removeEventListener("abort", cancel)
      chunks.length = 0
      if (failure) { reject(failure); request.resume() }
      else resolve(value)
    }
    const data = (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) finish(new HttpError(413, "body_too_large"))
      else chunks.push(chunk)
    }
    const end = () => {
      try {
        finish(undefined, JSON.parse(Buffer.concat(chunks).toString("utf8")))
      } catch {
        finish(new HttpError(400, "invalid_json"))
      }
    }
    const invalid = () => finish(new HttpError(400, "invalid_request"))
    const cancel = () => finish(signal.reason)
    request.on("data", data)
    request.once("end", end)
    // Keep an error listener for a later socket failure while a rejected body drains.
    request.once("error", invalid)
    request.once("aborted", invalid)
    signal.addEventListener("abort", cancel, { once: true })
    if (signal.aborted) cancel()
  })
}

/** Bound the response even when an injected retrieval/provider adapter ignores cancellation. */
function withCancellation<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const cancel = () => { signal.removeEventListener("abort", cancel); reject(signal.reason) }
    signal.addEventListener("abort", cancel, { once: true })
    Promise.resolve().then(() => {
      signal.throwIfAborted()
      return operation()
    }).then((value) => {
      signal.removeEventListener("abort", cancel)
      resolve(value)
    }, (failure) => {
      signal.removeEventListener("abort", cancel)
      reject(failure)
    })
  })
}

function respond(response: ServerResponse, status: number, body: unknown) {
  if (response.destroyed) return
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
  response.end(JSON.stringify(body))
}

export function createThemisServer(config: ThemisConfig, fetchImpl: typeof fetch = fetch) {
  if (!Array.isArray(config.allowedOrigins) || !config.allowedOrigins.length || config.allowedOrigins.length > 100 || config.allowedOrigins.some((origin) => {
    try {
      const url = new URL(origin)
      return !["http:", "https:"].includes(url.protocol) || url.origin !== origin
    } catch { return true }
  })) throw new Error("THEMIS origins must be exact HTTP(S) origins.")
  if (config.localOnly && config.allowedOrigins.some((origin) => {
    const url = new URL(origin)
    return url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.origin !== origin
  })) throw new Error("Local THEMIS origins must be exact loopback HTTP origins.")
  const ready = Boolean(config.generateResponse || (config.apiKey && config.model))
  const origins = new Set(config.allowedOrigins)
  const limiter = new ThemisRateLimiter(config)
  const maxConcurrent = positiveInteger(config.maxConcurrentRequests ?? 4, "maxConcurrentRequests", 100)
  const timeoutMs = positiveInteger(config.timeoutMs ?? 60_000, "timeoutMs", 120_000)
  const bodyTimeoutMs = positiveInteger(config.bodyTimeoutMs ?? 10_000, "bodyTimeoutMs", 30_000)
  const reserveProviderCall = (signal?: AbortSignal | null) => {
    signal?.throwIfAborted()
    const retryAfter = limiter.reserveProviderCall()
    if (retryAfter) throw new ProviderError(429, "rate_limited", retryAfter)
  }
  const guardedFetch: typeof fetch = async (url, init) => {
    reserveProviderCall(init?.signal)
    return fetchImpl(url, init)
  }
  const answerConfig: AnswerConfig = config.generateResponse ? { ...config, generateResponse: async (body, signal) => {
    reserveProviderCall(signal)
    return config.generateResponse!(body, signal)
  } } : config
  let active = 0

  const server = createServer({ maxHeaderSize: 8192 }, async (request, response) => {
    response.setHeader("Cache-Control", "no-store")
    response.setHeader("X-Content-Type-Options", "nosniff")
    response.setHeader("Vary", "Origin")
    if (config.localOnly && !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress ?? "")) {
      respond(response, 403, { error: "local_only" })
      return
    }

    const path = request.url?.split("?")[0]
    if (path === "/health" && request.method === "GET") {
      respond(response, 200, { name: "THEMIS", ready, model: config.model || null })
      return
    }
    if (path !== "/api/themis") {
      respond(response, 404, { error: "not_found" })
      return
    }

    const reject = (status: number, error: string, retryAfter?: number) => {
      if (retryAfter !== undefined) response.setHeader("Retry-After", String(retryAfter))
      // Do not keep an unread or rejected upload alive on a persistent connection.
      response.setHeader("Connection", "close")
      respond(response, status, { error })
      request.resume()
    }

    const origin = request.headers.origin
    if (origin && origins.has(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin)
      response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
      response.setHeader("Access-Control-Allow-Headers", "Content-Type")
      response.setHeader("Access-Control-Expose-Headers", "Retry-After")
    }
    // Origin controls browser access, not identity. Quotas also cover spoofed/missing origins.
    if (request.method === "POST") {
      if (active >= maxConcurrent) { reject(429, "rate_limited", 1); return }
      // The socket peer is trustworthy; forwarded headers remain untrusted.
      const retryAfter = limiter.admit(request.socket.remoteAddress ?? "unknown")
      if (retryAfter) { reject(429, "rate_limited", retryAfter); return }
    }

    if (!origin || !origins.has(origin)) {
      reject(403, "origin_not_allowed")
      return
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204)
      response.end()
      return
    }
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST, OPTIONS")
      respond(response, 405, { error: "method_not_allowed" })
      return
    }

    if (!ready) {
      reject(503, "not_configured")
      return
    }
    if (request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
      reject(415, "json_required")
      return
    }
    if (request.headers["content-encoding"] && request.headers["content-encoding"] !== "identity") {
      reject(415, "json_required")
      return
    }
    if (Number(request.headers["content-length"]) > MAX_BODY_BYTES) {
      reject(413, "body_too_large")
      return
    }

    active++
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let bodyTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => controller.abort(), bodyTimeoutMs)
    timer.unref()
    bodyTimer.unref()
    response.on("close", () => controller.abort())
    try {
      const answer = await withCancellation(async () => {
        const messages = validateMessages(await readJson(request, controller.signal))
        clearTimeout(bodyTimer)
        bodyTimer = undefined
        return answerQuestion(messages, answerConfig, guardedFetch, controller.signal)
      }, controller.signal)
      respond(response, 200, answer)
    } catch (failure) {
      const status = controller.signal.aborted ? 504 : failure instanceof HttpError || failure instanceof ProviderError ? failure.status : 502
      const code = controller.signal.aborted ? "request_timeout" : failure instanceof HttpError || failure instanceof ProviderError ? failure.code : "provider_unavailable"
      if (status === 429 && failure instanceof ProviderError && failure.retryAfterSeconds !== undefined) {
        response.setHeader("Retry-After", String(failure.retryAfterSeconds))
      }
      if (!request.complete) response.setHeader("Connection", "close")
      respond(response, status, { error: code })
    } finally {
      clearTimeout(timer)
      clearTimeout(bodyTimer)
      active--
    }
  })

  server.requestTimeout = bodyTimeoutMs
  server.headersTimeout = Math.min(5000, bodyTimeoutMs)
  return server
}
