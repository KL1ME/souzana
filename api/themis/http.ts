import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { THEMIS_MAX_CONVERSATION_LENGTH, THEMIS_MAX_HISTORY, THEMIS_MAX_MESSAGE_LENGTH, type ThemisMessage } from "@/lib/themis"
import { themisInstructions } from "./prompt"

const MAX_BODY_BYTES = 64 * 1024
const MAX_REPLY_LENGTH = 6000

export type ThemisConfig = {
  apiKey: string
  model: string
  allowedOrigins: string[]
  requestsPerMinute?: number
  maxConcurrentRequests?: number
  timeoutMs?: number
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
  if (!isRecord(body) || !Array.isArray(body.messages) || !body.messages.length ||
    body.messages.length > THEMIS_MAX_HISTORY || body.messages.length % 2 !== 1) {
    throw new HttpError(400, "invalid_messages")
  }
  let total = 0
  const messages = body.messages.map((message: unknown, index: number): ThemisMessage => {
    const role = index % 2 === 0 ? "user" : "assistant"
    if (!isRecord(message) || message.role !== role || typeof message.content !== "string") {
      throw new HttpError(400, "invalid_messages")
    }
    const content = message.content.trim()
    if (!content || content.length > (role === "user" ? THEMIS_MAX_MESSAGE_LENGTH : MAX_REPLY_LENGTH)) {
      throw new HttpError(400, "invalid_messages")
    }
    total += content.length
    return { role, content }
  })
  if (total > THEMIS_MAX_CONVERSATION_LENGTH) throw new HttpError(413, "conversation_too_large")
  return messages
}

function readJson(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    let overflow = false
    const chunks: Buffer[] = []
    request.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        if (!overflow) {
          overflow = true
          chunks.length = 0
          reject(new HttpError(413, "body_too_large"))
        }
      } else if (!overflow) chunks.push(chunk)
    })
    request.on("end", () => {
      if (overflow) return
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")))
      } catch {
        reject(new HttpError(400, "invalid_json"))
      }
    })
    request.on("error", () => reject(new HttpError(400, "invalid_request")))
    request.on("aborted", () => reject(new HttpError(400, "invalid_request")))
  })
}

function respond(response: ServerResponse, status: number, body: unknown) {
  if (response.destroyed) return
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
  response.end(JSON.stringify(body))
}

async function generateReply(messages: ThemisMessage[], config: ThemisConfig, fetchImpl: typeof fetch, signal: AbortSignal) {
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      instructions: themisInstructions(),
      input: messages,
      max_output_tokens: 1200,
      store: false,
    }),
    signal,
  })
  if (!response.ok) throw new HttpError(response.status === 429 ? 429 : 502, "provider_unavailable")
  const result: unknown = await response.json()
  if (!isRecord(result) || result.status !== "completed" || !Array.isArray(result.output)) {
    throw new HttpError(502, "invalid_provider_response")
  }
  const reply = result.output.flatMap((item: unknown) => {
    if (!isRecord(item) || item.type !== "message" || item.role !== "assistant" || !Array.isArray(item.content)) return []
    return item.content.flatMap((content: unknown) =>
      isRecord(content) && content.type === "output_text" && typeof content.text === "string" ? [content.text] : []
    )
  }).join("\n").trim()
  if (!reply || reply.length > MAX_REPLY_LENGTH) throw new HttpError(502, "invalid_provider_response")
  return reply
}

export function createThemisServer(config: ThemisConfig, fetchImpl: typeof fetch = fetch) {
  const origins = new Set(config.allowedOrigins)
  const clients = new Map<string, { count: number; expires: number }>()
  const perMinute = config.requestsPerMinute ?? 12
  const maxConcurrent = config.maxConcurrentRequests ?? 4
  let active = 0

  const server = createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store")
    response.setHeader("X-Content-Type-Options", "nosniff")
    response.setHeader("Vary", "Origin")

    const path = request.url?.split("?")[0]
    if (path === "/health" && request.method === "GET") {
      respond(response, 200, { name: "THEMIS", ready: Boolean(config.apiKey && config.model) })
      return
    }
    if (path !== "/api/themis") {
      respond(response, 404, { error: "not_found" })
      return
    }

    const origin = request.headers.origin
    if (!origin || !origins.has(origin)) {
      respond(response, 403, { error: "origin_not_allowed" })
      return
    }
    response.setHeader("Access-Control-Allow-Origin", origin)
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    response.setHeader("Access-Control-Allow-Headers", "Content-Type")
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

    // Use the actual socket peer. Proxy headers are deliberately not trusted.
    const now = Date.now()
    for (const [key, client] of clients) if (client.expires <= now) clients.delete(key)
    const address = request.socket.remoteAddress ?? "unknown"
    const client = clients.get(address) ?? { count: 0, expires: now + 60_000 }
    if (client.count >= perMinute || active >= maxConcurrent || (clients.size >= 10_000 && !clients.has(address))) {
      response.setHeader("Retry-After", "60")
      respond(response, 429, { error: "rate_limited" })
      return
    }
    client.count++
    clients.set(address, client)
    if (!config.apiKey || !config.model) {
      respond(response, 503, { error: "not_configured" })
      return
    }
    if (request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
      respond(response, 415, { error: "json_required" })
      return
    }
    if (Number(request.headers["content-length"]) > MAX_BODY_BYTES) {
      respond(response, 413, { error: "body_too_large" })
      request.resume()
      return
    }

    active++
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 30_000)
    timer.unref()
    response.on("close", () => controller.abort())
    try {
      const messages = validateMessages(await readJson(request))
      const reply = await generateReply(messages, config, fetchImpl, controller.signal)
      respond(response, 200, { reply })
    } catch (failure) {
      const status = failure instanceof HttpError ? failure.status : controller.signal.aborted ? 504 : 502
      const code = failure instanceof HttpError ? failure.code : controller.signal.aborted ? "request_timeout" : "provider_unavailable"
      if (status === 429) response.setHeader("Retry-After", "60")
      respond(response, status, { error: code })
    } finally {
      clearTimeout(timer)
      active--
    }
  })

  server.requestTimeout = 10_000
  server.headersTimeout = 5000
  return server
}
