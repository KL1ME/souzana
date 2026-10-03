import type { ThemisAnswer } from "@/lib/themis"

// Match complete clock requests so office hours and legal deadlines stay in the evidence pipeline.
export function clockAnswer(question: string, now = new Date()): ThemisAnswer | null {
  const text = question.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/[;?!\.]+$/u, "").replace(/\s+/gu, " ").trim()
  const greekTime = /^(?:τι|ποση) ωρα ειναι(?: τωρα)?(?: (?:στην ελλαδα|στην αθηνα))?$/.test(text)
  const englishTime = /^(?:what time is it|what is the (?:current )?time|what's the (?:current )?time)(?: now)?(?: in (?:greece|athens))?$/.test(text)
  const greekDate = /^(?:τι ημερομηνια (?:εχουμε|ειναι)(?: σημερα)?|ποια ειναι η (?:σημερινη )?ημερομηνια(?: σημερα)?)$/.test(text)
  const englishDate = /^(?:what is (?:today's|the current|the) date|what's (?:today's|the current|the) date|what date is it)(?: today)?$/.test(text)
  if (!greekTime && !englishTime && !greekDate && !englishDate) return null
  const greek = greekTime || greekDate
  const locale = greek ? "el-GR" : "en-GB"
  let reply: string
  if (greekTime || englishTime) {
    const time = new Intl.DateTimeFormat(locale, { timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now)
    reply = greek ? `Η ώρα είναι ${time} στην Ελλάδα (Europe/Athens).` : `It is ${time} in Greece (Europe/Athens).`
  } else {
    const date = new Intl.DateTimeFormat(locale, { timeZone: "Europe/Athens", weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(now)
    reply = greek ? `Σήμερα είναι ${date}, με βάση την ώρα Ελλάδας (Europe/Athens).` : `Today is ${date}, using Greece time (Europe/Athens).`
  }
  return { reply, source: "clock", sources: [], citations: [] }
}
