// Local UI preview only. This provider never sends requests to OpenAI.
import { spawn } from "node:child_process"
import { once } from "node:events"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { pages, practiceAreas, site, teamMembers } from "@/lib/content"
import { createThemisServer } from "./http"

const require = createRequire(resolve("package.json"))

function sampleReply(question: string) {
  const text = question.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  if (/τομ|υπηρεσ|υποστηρ/.test(text)) {
    return `Η εταιρεία μας παρέχει νομική υποστήριξη στους ακόλουθους τομείς:\n\n${practiceAreas.map((area) => `• ${area.title}`).join("\n")}\n\nΜπορείτε να δείτε αναλυτικά τις υπηρεσίες μας στη σελίδα «Τομείς».`
  }
  if (/ομαδ|ποιοι|δικηγορο/.test(text)) {
    return `Η ${pages.team.profile.title} είναι ${pages.team.profile.role}.\n\nΣτη σελίδα της ομάδας παρουσιάζονται επίσης:\n${teamMembers.map((member) => `• ${member.name} — ${member.title}`).join("\n")}\n\nΓνωρίστε τα πρόσωπα και την εμπειρία τους στη σελίδα «Η ομάδα μας».`
  }
  if (/που|γραφει|καλαματ|αθην/.test(text)) {
    return `Η εταιρεία δραστηριοποιείται στην Καλαμάτα και την Αθήνα.\n\n${pages.team.profile.summary[0]}\n\nΠαρέχουμε νομική υποστήριξη σε φυσικά και νομικά πρόσωπα, επιχειρήσεις και οργανισμούς.`
  }
  if (/επικοιν|ραντεβου|τηλεφων/.test(text)) {
    return "Τα στοιχεία τηλεφωνικής επικοινωνίας, email και κρατήσεων δεν έχουν ακόμη δημοσιευθεί στον ιστότοπο. Μπορείτε να γνωρίσετε την ομάδα και το δημοσιευμένο επαγγελματικό προφίλ στη σελίδα «Η ομάδα μας»."
  }
  return "Αυτή είναι μια ενδεικτική συνομιλία με τη THEMIS. Δοκιμάστε μια ερώτηση για τους τομείς εξειδίκευσης, την ομάδα ή την παρουσία μας στην Καλαμάτα και την Αθήνα. Οι απαντήσεις εδώ είναι έτοιμα παραδείγματα."
}

async function main() {
  const apiPort = 8788
  const webPort = 3001
  const provider: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body))
    const question = body.input.at(-1).content as string
    await new Promise((resolve) => setTimeout(resolve, 400))
    return Response.json({ status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: sampleReply(question) }] }] })
  }
  const server = createThemisServer({ apiKey: "local-preview", model: "sample-replies", allowedOrigins: [`http://localhost:${webPort}`, `http://127.0.0.1:${webPort}`], requestsPerMinute: 120 }, provider)
  server.listen(apiPort, "127.0.0.1")
  await once(server, "listening")
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(webPort)], {
    stdio: "inherit",
    env: {
      ...process.env,
      GITHUB_PAGES: "false",
      NEXT_PUBLIC_THEMIS_PREVIEW: "true",
      NEXT_PUBLIC_THEMIS_API_URL: `http://127.0.0.1:${apiPort}/api/themis`,
    },
  })
  console.log(`THEMIS sample preview: http://localhost:${webPort} — no API key or live provider. Firm: ${site.shortName}.`)
  child.on("error", (error) => { console.error(error.message); server.close(); process.exitCode = 1 })
  child.on("exit", (code) => { server.close(); process.exitCode = code ?? 0 })
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => {
    child.kill(signal)
    server.closeAllConnections()
    server.close()
  })
}

main().catch((error: Error) => { console.error(error.message); process.exitCode = 1 })
