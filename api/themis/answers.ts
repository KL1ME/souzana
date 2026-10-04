import type { ThemisAnswer, ThemisCitation, ThemisMessage, ThemisSource } from "@/lib/themis"
import { queryTerms, type KnowledgeSearch } from "./knowledge"
import { themisInstructions } from "./prompt"
import { clockAnswer } from "./clock"
import { conversationAnswer } from "@/lib/themis-conversation"

export type AnswerConfig = {
  apiKey: string
  model: string
  knowledge: KnowledgeSearch
  webSearchEnabled?: boolean
  webAllowedDomains?: string[]
  allowGeneralFallback?: boolean
  generateResponse?: (body: Record<string, unknown>, signal: AbortSignal) => Promise<unknown[]>
}

export class ProviderError extends Error {
  constructor(public status: number, public code: string) { super(code) }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

async function callProvider(body: Record<string, unknown>, config: AnswerConfig, fetchImpl: typeof fetch, signal: AbortSignal) {
  if (config.generateResponse) return config.generateResponse(body, signal)
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.model, max_output_tokens: 1600, store: false, ...body }), signal,
  })
  if (!response.ok) throw new ProviderError(response.status === 429 ? 429 : 502, "provider_unavailable")
  const result: unknown = await response.json()
  if (!record(result) || result.status !== "completed" || !Array.isArray(result.output)) throw new ProviderError(502, "invalid_provider_response")
  return result.output as unknown[]
}

function outputText(output: unknown[]) {
  let reply = ""
  const annotations: Record<string, unknown>[] = []
  for (const item of output) {
    if (!record(item) || item.type !== "message" || item.role !== "assistant" || !Array.isArray(item.content)) continue
    for (const part of item.content) {
      if (!record(part) || part.type !== "output_text" || typeof part.text !== "string") continue
      if (reply) reply += "\n"
      const offset = reply.length
      reply += part.text
      if (Array.isArray(part.annotations)) for (const annotation of part.annotations) {
        if (record(annotation)) annotations.push({ ...annotation,
          start_index: typeof annotation.start_index === "number" ? annotation.start_index + offset : -1,
          end_index: typeof annotation.end_index === "number" ? annotation.end_index + offset : -1,
        })
      }
    }
  }
  if (!reply.trim() || reply.length > 10_000) throw new ProviderError(502, "invalid_provider_response")
  return { reply, annotations }
}

function databaseAnswer(answer: string, sources: ThemisSource[]): ThemisAnswer {
  let reply = answer.trim()
  const citations: ThemisCitation[] = []
  reply += "\n\nΠηγές: "
  sources.forEach((_source, index) => {
    if (index) reply += " "
    const start = reply.length
    reply += `[${index + 1}]`
    citations.push({ start, end: reply.length, sourceIndex: index })
  })
  return { reply, source: "database", sources, citations }
}

export async function answerQuestion(messages: ThemisMessage[], config: AnswerConfig, fetchImpl: typeof fetch, signal: AbortSignal): Promise<ThemisAnswer> {
  const question = messages.at(-1)!.content
  const conversation = conversationAnswer(question)
  if (conversation) return conversation
  const previousQuestion = messages.slice(0, -1).reverse().find((message) => message.role === "user")?.content ?? ""
  const searchQuestion = queryTerms(question).length <= 1 ? `${question}\n${previousQuestion}` : question
  let excerpts
  try {
    excerpts = await config.knowledge.search(searchQuestion, signal)
    await config.knowledge.verify?.(excerpts, signal)
  }
  catch { throw new ProviderError(503, "knowledge_unavailable") }
  if (config.allowGeneralFallback) {
    const clock = clockAnswer(question)
    if (clock) return clock
  }
  const input = messages.map(({ role, content }) => ({ role, content }))

  if (excerpts.length) {
    const ids = [...new Set(excerpts.map((excerpt) => excerpt.id))]
    const output = await callProvider({
      instructions: themisInstructions("database", excerpts), input,
      text: { format: { type: "json_schema", name: "database_answer", strict: true, schema: {
        type: "object", additionalProperties: false,
        properties: { answer_found: { type: "boolean" }, answer: { type: "string" }, citation_ids: { type: "array", items: { type: "string", enum: ids } } },
        required: ["answer_found", "answer", "citation_ids"],
      } } },
    }, config, fetchImpl, signal)
    try { await config.knowledge.verify?.(excerpts, signal) }
    catch { throw new ProviderError(503, "knowledge_unavailable") }
    let decision: unknown
    try { decision = JSON.parse(outputText(output).reply) } catch { throw new ProviderError(502, "invalid_database_answer") }
    if (!record(decision) || typeof decision.answer_found !== "boolean" || typeof decision.answer !== "string" || !Array.isArray(decision.citation_ids) ||
      decision.citation_ids.length > 12 || decision.citation_ids.some((id) => typeof id !== "string" || !ids.includes(id))) {
      throw new ProviderError(502, "invalid_database_answer")
    }
    if (decision.answer_found) {
      if (!decision.answer.trim() || decision.answer.length > 5500 || !decision.citation_ids.length) throw new ProviderError(502, "invalid_database_answer")
      const sources = [...new Set(decision.citation_ids as string[])].map((id) => {
        const excerpt = excerpts.find((excerpt) => excerpt.id === id)!
        return { id, title: excerpt.title, url: excerpt.sourceUrl }
      })
      return databaseAnswer(decision.answer, sources)
    }
  }

  if (config.webSearchEnabled !== false) {
    const domains = config.webAllowedDomains ?? ["gov.gr", "et.gr", "europa.eu"]
    const output = await callProvider({ instructions: themisInstructions("web"), input,
      tools: [{ type: "web_search", ...(domains.length ? { filters: { allowed_domains: domains } } : {}) }], tool_choice: "required",
    }, config, fetchImpl, signal)
    const { reply, annotations } = outputText(output)
    const sources: ThemisSource[] = []
    const citations: ThemisCitation[] = []
    let invalidCitation = false
    for (const annotation of annotations) {
      if (annotation.type !== "url_citation") continue
      if (typeof annotation.url !== "string" || typeof annotation.title !== "string" || !annotation.title.trim() ||
        !Number.isInteger(annotation.start_index) || !Number.isInteger(annotation.end_index)) { invalidCitation = true; continue }
      let url: URL
      try { url = new URL(annotation.url) } catch { invalidCitation = true; continue }
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || annotation.url.length > 2000 ||
        (domains.length && !domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)))) { invalidCitation = true; continue }
      const start = annotation.start_index as number
      const end = annotation.end_index as number
      if (start < 0 || end <= start || end > reply.length) { invalidCitation = true; continue }
      let sourceIndex = sources.findIndex((source) => source.url === annotation.url)
      if (sourceIndex < 0) {
        sourceIndex = sources.length
        sources.push({ id: `web:${sourceIndex + 1}`, title: annotation.title.slice(0, 300), url: annotation.url })
      }
      citations.push({ start, end, sourceIndex })
    }
    citations.sort((a, b) => a.start - b.start)
    const searched = output.some((item) => record(item) && item.type === "web_search_call" && item.status === "completed")
    const overlap = citations.some((citation, index) => index > 0 && citation.start < citations[index - 1].end)
    if (searched && sources.length && sources.length <= 16 && !invalidCitation && !overlap && reply.length <= 6000) {
      return { reply, source: "web", sources, citations }
    }
  }

  if (config.allowGeneralFallback) {
    const { reply } = outputText(await callProvider({ instructions: themisInstructions("general"), input }, config, fetchImpl, signal))
    const labelled = `Γενική πληροφορία χωρίς επαληθευμένη πηγή.\n\n${reply.trim()}`
    if (labelled.length > 6000) throw new ProviderError(502, "invalid_provider_response")
    return { reply: labelled, source: "general", sources: [], citations: [] }
  }
  return { reply: "Δεν βρήκα αρκετή τεκμηριωμένη πληροφορία στη βάση γνώσης ή στις διαθέσιμες πηγές. Ένας δικηγόρος μπορεί να σας βοηθήσει να αξιολογήσετε το ζήτημα.", source: "unavailable", sources: [], citations: [] }
}
