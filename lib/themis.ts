export const THEMIS_MAX_MESSAGE_LENGTH = 2000
export const THEMIS_MAX_HISTORY = 19
export const THEMIS_MAX_CONVERSATION_LENGTH = 24_000

export type ThemisMessage = {
  role: "user" | "assistant"
  content: string
  sources?: ThemisSource[]
  citations?: ThemisCitation[]
}

export type ThemisSource = { id: string; title: string; url: string }
export type ThemisCitation = { start: number; end: number; sourceIndex: number }
export type ThemisAnswer = { reply: string; source: "database" | "web" | "general" | "clock" | "unavailable"; sources: ThemisSource[]; citations: ThemisCitation[] }

export function parseThemisAnswer(value: unknown): ThemisAnswer | null {
  if (!value || typeof value !== "object") return null
  const answer = value as Partial<ThemisAnswer>
  if (typeof answer.reply !== "string" || !answer.reply.trim() || answer.reply.length > 6000 ||
    !["database", "web", "general", "clock", "unavailable"].includes(answer.source ?? "") ||
    !Array.isArray(answer.sources) || answer.sources.length > 16 || !Array.isArray(answer.citations)) return null
  for (const source of answer.sources) {
    if (!source || typeof source.id !== "string" || typeof source.title !== "string" || source.title.length > 300 || typeof source.url !== "string" || source.url.length > 2000) return null
    try {
      const url = new URL(source.url)
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null
    } catch { return null }
  }
  let end = 0
  for (const citation of answer.citations) {
    if (!citation || !Number.isInteger(citation.start) || !Number.isInteger(citation.end) || !Number.isInteger(citation.sourceIndex) ||
      citation.start < end || citation.end <= citation.start || citation.end > answer.reply.length ||
      citation.sourceIndex < 0 || citation.sourceIndex >= answer.sources.length) return null
    end = citation.end
  }
  if (["database", "web"].includes(answer.source!) && (!answer.sources.length || !answer.citations.length)) return null
  return answer as ThemisAnswer
}

export const themis = {
  name: "THEMIS",
  subtitle: "Η ψηφιακή βοηθός σας",
  invitation: {
    title: "Έχετε μια ερώτηση;",
    description: "Γνωρίστε την εταιρεία και τις υπηρεσίες μας με τη THEMIS.",
    action: "Ας μιλήσουμε",
  },
  starters: [
    {
      label: "Τομείς εξειδίκευσης",
      question: "Σε ποιους τομείς δικαίου δραστηριοποιείται η εταιρεία;",
    },
    {
      label: "Γνωρίστε την ομάδα",
      question: "Ποιοι απαρτίζουν την ομάδα της εταιρείας;",
    },
    {
      label: "Η προσέγγισή μας",
      question: "Πώς προσεγγίζει η εταιρεία μια νέα υπόθεση;",
    },
  ],
}
