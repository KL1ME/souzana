import type { ThemisAnswer } from "@/lib/themis"

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/ς/g, "σ").replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/gu, " ").trim()
}

const greekIntroduction = "Είμαι η THEMIS, η ψηφιακή βοηθός της εταιρείας. Μπορώ να σας βοηθήσω με πληροφορίες για την εταιρεία και γενική νομική ενημέρωση από τεκμηριωμένες πηγές. Τι θα θέλατε να ρωτήσετε;"
const englishIntroduction = "I’m THEMIS, the firm’s digital assistant. I can help with information about the firm and general legal information from verified sources. What would you like to ask?"

const replies = new Map<string, string>()
function add(phrases: string[], reply: string) {
  for (const phrase of phrases) replies.set(normalize(phrase), reply)
}

add(["καλημέρα", "kalimera"], "Καλημέρα! Είμαι η THEMIS. Πώς μπορώ να σας βοηθήσω;")
add(["καλησπέρα", "kalispera"], "Καλησπέρα! Είμαι η THEMIS. Πώς μπορώ να σας βοηθήσω;")
add(["γεια", "γεια σου", "γεια σας", "χαίρετε", "geia", "geia sou", "geia sas"], "Γεια σας! Είμαι η THEMIS. Πώς μπορώ να σας βοηθήσω;")
add(["ευχαριστώ", "ευχαριστώ πολύ", "σε ευχαριστώ", "σας ευχαριστώ", "ευχαριστώ για τη βοήθεια"], "Παρακαλώ! Είμαι εδώ αν θέλετε να ρωτήσετε κάτι άλλο.")
add(["ποια είσαι", "ποιος είσαι", "τι είσαι", "τι μπορείς να κάνεις", "πώς μπορείς να με βοηθήσεις", "μπορείς να με βοηθήσεις", "βοήθεια"], greekIntroduction)
add(["τι κάνεις", "πώς είσαι", "καλησπέρα τι κάνεις", "καλημέρα τι κάνεις", "γεια σου τι κάνεις"], "Είμαι εδώ και έτοιμη να σας βοηθήσω. Τι θα θέλατε να ρωτήσετε;")
add(["αντίο", "καληνύχτα", "τα λέμε"], "Να είστε καλά! Είμαι εδώ όταν χρειαστείτε βοήθεια.")

add(["hello", "hi", "hey", "good morning", "good evening"], "Hello! I’m THEMIS. How can I help you?")
add(["thanks", "thank you", "thank you very much", "thanks for your help"], "You’re welcome! I’m here if you have another question.")
add(["who are you", "what are you", "what can you do", "how can you help me", "can you help me", "help"], englishIntroduction)
add(["how are you", "hello how are you", "hi how are you"], "I’m here and ready to help. What would you like to ask?")
add(["bye", "goodbye", "good night"], "Take care! I’m here whenever you need help.")

// Only complete conversational messages qualify; a greeting plus a factual question still needs evidence.
export function conversationAnswer(question: string): ThemisAnswer | null {
  const text = normalize(question).replace(/ (?:themis|θεμισ)$/u, "")
  const reply = replies.get(text)
  return reply ? { reply, source: "general", sources: [], citations: [] } : null
}
