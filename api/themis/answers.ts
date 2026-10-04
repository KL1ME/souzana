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
  constructor(public status: number, public code: string, public retryAfterSeconds?: number) { super(code) }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function providerRetryAfter(response: Response): number | undefined {
  const header = response.headers.get("Retry-After")?.trim()
  if (!header) return undefined
  const seconds = /^\d+$/.test(header) ? Number(header) : Math.ceil((Date.parse(header) - Date.now()) / 1000)
  return Number.isSafeInteger(seconds) && seconds >= 0 && seconds <= 86_400 ? seconds : undefined
}

async function callProvider(body: Record<string, unknown>, config: AnswerConfig, fetchImpl: typeof fetch, signal: AbortSignal) {
  signal.throwIfAborted()
  if (config.generateResponse) {
    const output = await config.generateResponse(body, signal)
    signal.throwIfAborted()
    return output
  }
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.model, max_output_tokens: 1600, store: false,
      ...(config.model === "gpt-6-luna" || config.model.startsWith("gpt-6-luna-") ? { reasoning: { effort: "low" } } : {}), ...body }), signal,
  })
  signal.throwIfAborted()
  if (!response.ok) throw new ProviderError(response.status === 429 ? 429 : 502, "provider_unavailable",
    response.status === 429 ? providerRetryAfter(response) : undefined)
  const result: unknown = await response.json()
  signal.throwIfAborted()
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

function factFreeClarification(reply: string): string | undefined {
  const normalize = (text: string) => text.normalize("NFC").trim()
    .replace(/^\*\*([^*]+)\*\*$/u, "$1").trim().replace(/\s+/gu, " ")
    .replace(/[;;?]$/u, "?")
  return ["Για ποιον τομέα δικαίου χρειάζεστε δικηγόρο;", "Σε ποιον τομέα δικαίου χρειάζεστε δικηγόρο;", "What area of law do you need a lawyer for?"]
    .find((question) => normalize(question) === normalize(reply))
}

function hasReferralIntent(messages: ThemisMessage[]): boolean {
  return messages.some(({ role, content }) => {
    if (role !== "user") return false
    const words: string[] = content.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/ς/g, "σ").match(/[\p{L}]+/gu) ?? []
    const request = words.some((word) => /^(?:προτειν|προτασ|συστ|βρεσ|βρει|ψαχν|αναζητ|χρειαζ|θελω|recommend|suggest|find|looking|need|want)/u.test(word))
    const lawyer = words.some((word) => /^(?:δικηγορ|lawyers?$|attorneys?$)/u.test(word))
    const lawFirm = words.includes("law") && words.some((word) => /^firms?$/u.test(word))
    const otherFirm = words.some((word) => /^(?:αλλ|another$|other$)/u.test(word)) &&
      words.some((word) => /^(?:γραφει|εταιρει|firms?$)/u.test(word))
    return request && (lawyer || lawFirm || otherFirm)
  })
}

async function referralClarification(messages: ThemisMessage[], config: AnswerConfig, fetchImpl: typeof fetch, signal: AbortSignal): Promise<ThemisAnswer | undefined> {
  const output = await callProvider({ instructions: themisInstructions("clarification"),
    input: messages.map(({ role, content }) => ({ role, content })),
    text: { format: { type: "json_schema", name: "referral_clarification", strict: true, schema: {
      type: "object", additionalProperties: false,
      properties: { clarification: { type: "string", enum: ["legal_area", "location", "none"] } },
      required: ["clarification"],
    } } },
  }, config, fetchImpl, signal)
  let decision: unknown
  try { decision = JSON.parse(outputText(output).reply) }
  catch { throw new ProviderError(502, "invalid_clarification_decision") }
  if (!record(decision) || Object.keys(decision).length !== 1 ||
    typeof decision.clarification !== "string" || !["legal_area", "location", "none"].includes(decision.clarification)) {
    throw new ProviderError(502, "invalid_clarification_decision")
  }
  if (decision.clarification === "none") return undefined
  const greek = /\p{Script=Greek}/u.test(messages.at(-1)!.content)
  const reply = decision.clarification === "legal_area"
    ? greek ? "Για ποιον τομέα δικαίου χρειάζεστε δικηγόρο;" : "What area of law do you need a lawyer for?"
    : greek ? "Σε ποια πόλη ή περιοχή χρειάζεστε δικηγόρο;" : "In which city or region do you need a lawyer?"
  return { reply, source: "general", sources: [], citations: [] }
}

export async function answerQuestion(messages: ThemisMessage[], config: AnswerConfig, fetchImpl: typeof fetch, signal: AbortSignal): Promise<ThemisAnswer> {
  signal.throwIfAborted()
  const question = messages.at(-1)!.content
  const conversation = conversationAnswer(question)
  if (conversation) return conversation
  const previousQuestion = messages.slice(0, -1).reverse().find((message) => message.role === "user")?.content ?? ""
  const searchQuestion = queryTerms(question).length <= 1 ? `${question}\n${previousQuestion}` : question
  let excerpts
  try {
    excerpts = await config.knowledge.search(searchQuestion, signal)
    signal.throwIfAborted()
    await config.knowledge.verify?.(excerpts, signal)
    signal.throwIfAborted()
  }
  catch { signal.throwIfAborted(); throw new ProviderError(503, "knowledge_unavailable") }
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
    try { await config.knowledge.verify?.(excerpts, signal); signal.throwIfAborted() }
    catch { signal.throwIfAborted(); throw new ProviderError(503, "knowledge_unavailable") }
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
    const domains = config.webAllowedDomains ?? ["gov.gr", "et.gr", "europa.eu", "dsa.gr"]
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
    // Only these fact-free questions may omit citations. Arbitrary model text
    // still requires verified evidence, including replies containing a question.
    const clarification = factFreeClarification(reply)
    if (clarification && !sources.length && !invalidCitation && !overlap) {
      return { reply: clarification, source: "general", sources: [], citations: [] }
    }
    if (!sources.length && !invalidCitation && !overlap && hasReferralIntent(messages)) {
      const clarification = await referralClarification(messages, config, fetchImpl, signal)
      if (clarification) return clarification
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
