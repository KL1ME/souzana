import { themis, type ThemisAnswer, type ThemisMessage, type ThemisSource } from "@/lib/themis"
import type { KnowledgeExcerpt } from "./knowledge"
import { websiteKnowledge } from "./seed"
import { clockAnswer } from "./clock"

export const scopeRoutes = ["firm", "legal", "recommendation", "decline"] as const
export type ScopeRoute = typeof scopeRoutes[number]

export function normalizePolicyText(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu, "")
    .toLowerCase().replace(/ς/g, "σ").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/gu, " ").trim()
}

export function responseInGreek(messages: ThemisMessage[]): boolean {
  const last = messages.filter(({ role }) => role === "user").reverse().find(({ content }) => /\p{L}/u.test(content))
  return last ? /\p{Script=Greek}/u.test(last.content) : true
}

function blockedTask(content: string): boolean {
  const text = normalizePolicyText(content)
  const override = /(?:ignore|disregard|forget|override|bypass|αγνοησ\p{L}*|ξεχασ\p{L}*|παρακαμψ\p{L}*) .{0,100}(?:instructions?|rules?|polic\p{L}*|previous|οδηγι\p{L}*|κανον\p{L}*|περιορισ\p{L}*|προηγουμεν\p{L}*)/u
  const secrets = /(?:show|reveal|print|give|dump|expose|δειξ\p{L}*|δωσε|εμφανισ\p{L}*|αποκαλυψ\p{L}*|τυπωσ\p{L}*) .{0,100}(?:system prompt|developer prompt|api key|api κλειδ\p{L}*|κλειδ\p{L}* api|secret|token|password|env\b|environment|κρυφ\p{L}* οδηγι\p{L}*|εσωτερικ\p{L}* οδηγι\p{L}*)/u
  const roleChange = /(?:act as|pretend to be|now you are|unrestricted assistant|jailbreak|απο εδω και περα εισαι|κανε πως εισαι|υποκρισ\p{L}* οτι εισαι)/u
  if (override.test(text) || secrets.test(text) || roleChange.test(text) || /(?:\[(?:system|developer)\]|<\/?(?:system|developer)>|(?:system|developer)\s*:)/iu.test(content)) return true
  const action = /(?:\bwrite\b|\bbuild\b|\bcreate\b|\bgenerate\b|\bdebug\b|\bfix\b|\bsolve\b|\btell\b|\bsing\b|\bcompose\b|γραψ\p{L}*|φτιαξ\p{L}*|δημιουργ\p{L}*|υλοποι\p{L}*|διορθωσ\p{L}*|λυσ\p{L}*|πες|τραγουδησ\p{L}*)/u.test(text)
  const coding = /\b(?:python|javascript|typescript|react|html|css|sql|bash)\b/u.test(text) ||
    /(?:write|build|create|generate|debug|fix) (?:a |some |the )?(?:code|script|app)(?: |$)/u.test(text)
  const entertainment = /(?:\b(?:poem|joke|story|song|lyrics)\b|ποιημ\p{L}*|ανεκδοτ\p{L}*|τραγουδ\p{L}*)/u.test(text)
  const math = /(?:\b(?:math|equation|integral)\b|μαθηματικ\p{L}*|εξισωσ\p{L}*)/u.test(text) || /(?:solve|λυσ\p{L}*) \d/u.test(text)
  return action && (coding || entertainment || math)
}

function recommendationRequest(content: string): boolean {
  const words = normalizePolicyText(content).split(" ")
  const request = words.some((word) => /^(?:προτειν|προτασ|συστ|βρεσ|βρει|ψαχν|αναζητ|χρειαζ|θελω|recommend|suggest|find|looking|need|want|compare|rank|συγκριν|καταταξ)/u.test(word))
  const lawyer = words.some((word) => /^(?:δικηγορ|lawyers?$|attorneys?$)/u.test(word))
  const firm = words.some((word) => /^(?:γραφει|εταιρει|firms?$)/u.test(word))
  const other = words.some((word) => /^(?:αλλ|another$|other$|competitors?$)/u.test(word))
  const directory = /(?:\b(?:directory|register|registry|ranking)\b|καταλογ\p{L}*|μητρω\p{L}*|καλυτερ\p{L}*|\bbest\b)/u.test(normalizePolicyText(content))
  return (request && (lawyer || firm && other || firm && words.includes("law"))) || directory && lawyer || firm && other
}

const firmQuestions = new Set([
  ...themis.starters.map(({ question }) => question),
  "Πού είναι τα γραφεία σας;", "Ποιοι είναι οι τομείς σας;", "Ποιοι απαρτίζουν την ομάδα σας;",
  "Ποια είναι τα τηλέφωνά σας;", "Ποιο είναι το τηλέφωνό σας;", "Ποια είναι τα στοιχεία επικοινωνίας σας;",
  "Πώς μπορώ να επικοινωνήσω μαζί σας;", "Ποιο είναι το email σας;", "Ποια είναι η διεύθυνσή σας;",
  "Where are your offices?", "What are your practice areas?", "What is your phone number?", "How can I contact your firm?",
].map(normalizePolicyText))

/** Full-message fast routes; a legal keyword never overrides a blocked task. */
export function fastScopeRoute(messages: ThemisMessage[]): ScopeRoute | undefined {
  const user = messages.filter(({ role }) => role === "user")
  const current = user.at(-1)?.content ?? ""
  if (clockAnswer(current)) return "decline"
  if (blockedTask(current)) return "decline"
  if (recommendationRequest(current)) return "recommendation"
  if (firmQuestions.has(normalizePolicyText(current))) return "firm"
  return undefined
}

export function parseScopeDecision(value: unknown): ScopeRoute | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const decision = value as Record<string, unknown>
  return Object.keys(decision).length === 1 && typeof decision.route === "string" && scopeRoutes.includes(decision.route as ScopeRoute)
    ? decision.route as ScopeRoute : null
}

export function scopeRefusal(messages: ThemisMessage[]): ThemisAnswer {
  const reply = responseInGreek(messages)
    ? "Η THEMIS βοηθά με πληροφορίες για τη δική μας δικηγορική εταιρεία και τεκμηριωμένη νομική ενημέρωση. Μπορώ να σας βοηθήσω με μια σχετική ερώτηση."
    : "THEMIS helps with information about our law firm and sourced general legal information. I can help with a question in that scope."
  return { reply, source: "general", sources: [], citations: [] }
}

/** Canonical text uses only website facts present in the retrieved approved passages. */
export function ownFirmRecommendation(excerpts: KnowledgeExcerpt[], messages: ThemisMessage[]): { answer: string; sources: ThemisSource[] } | undefined {
  const approved = websiteKnowledge().filter(({ id, approved }) => approved && ["website:firm", "website:contact"].includes(id))
  const supported = (id: string, line: string) => excerpts.some((excerpt) => excerpt.id === id && excerpt.content.includes(line) &&
    approved.some((document) => document.id === id && document.sourceUrl === excerpt.sourceUrl && document.content.includes(line)))
  const contact = approved.find(({ id }) => id === "website:contact")!
  const brandLine = contact.content.split("\n")[0]
  if (!supported(contact.id, brandLine)) return undefined
  const brand = brandLine.replace(/^Για επικοινωνία με την /u, "").replace(/:$/u, "")
  const greek = responseInGreek(messages)
  const sections = [greek ? `Μπορώ να σας παρουσιάσω μόνο τη δική μας εταιρεία, ${brand}, και τα δημοσιευμένα στοιχεία επικοινωνίας της.`
    : `I can present only our firm, ${brand}, and its published contact information.`]
  for (const [prefix, title] of [
    ["Τηλέφωνα: ", greek ? "Τηλέφωνα" : "Telephone"],
    ["Email: ", "Email"],
    ["Διεύθυνση γραφείου στην Αθήνα: ", greek ? "Διεύθυνση στην Αθήνα" : "Address in Athens"],
  ]) {
    const line = contact.content.split("\n").find((line) => line.startsWith(prefix))
    if (!line || !supported(contact.id, line)) continue
    const values = line.slice(prefix.length).replace(/\.$/u, "")
    sections.push(`**${title}**\n${prefix === "Τηλέφωνα: " ? values.split(", ").join("\n") : values}`)
  }
  return { answer: sections.join("\n\n"), sources: [{ id: contact.id, title: contact.title, url: contact.sourceUrl }] }
}
