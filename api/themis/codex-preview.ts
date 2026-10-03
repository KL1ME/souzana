// Live subscription preview on loopback only; never loaded by the production API.
import { spawn } from "node:child_process"
import { once } from "node:events"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { createThemisServer } from "./http"
import { createCodexGenerator, codexEnvironment, runCodexProcess } from "./codex-provider"
import { KnowledgeDatabase } from "./knowledge"
import { websiteKnowledge } from "./seed"

async function main() {
  const apiPort = 8788, webPort = 3001
  const origins = [`http://localhost:${webPort}`, `http://127.0.0.1:${webPort}`]
  const status = await runCodexProcess(process.env.THEMIS_CODEX_COMMAND ?? "codex", ["login", "status"], {
    cwd: process.cwd(), env: codexEnvironment(), signal: AbortSignal.timeout(10_000),
  })
  if (status.exitCode !== 0 || !/Logged in using ChatGPT/i.test(`${status.stdout}\n${status.stderr}`)) throw new Error("Sign in to Codex with ChatGPT using codex login, then restart this preview.")
  const knowledge = new KnowledgeDatabase(":memory:")
  knowledge.importDocuments(websiteKnowledge(), true)
  const server = createThemisServer({ apiKey: "", model: "", knowledge, localOnly: true, allowedOrigins: origins,
    generateResponse: createCodexGenerator({ command: process.env.THEMIS_CODEX_COMMAND }), webSearchEnabled: true, webAllowedDomains: [],
    allowGeneralFallback: true, maxConcurrentRequests: 1, requestsPerMinute: 20, timeoutMs: 60_000 })
  server.once("close", () => knowledge.close())
  server.listen(apiPort, "127.0.0.1")
  await once(server, "listening")
  const require = createRequire(resolve("package.json"))
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(webPort)], {
    stdio: "inherit", env: { ...codexEnvironment(), GITHUB_PAGES: "false", NEXT_PUBLIC_THEMIS_PREVIEW: "codex", NEXT_PUBLIC_THEMIS_API_URL: `http://127.0.0.1:${apiPort}/api/themis` },
  })
  const stop = () => { child.kill("SIGTERM"); server.closeAllConnections(); server.close() }
  child.once("error", () => { console.error("THEMIS website preview could not start."); stop(); process.exitCode = 1 })
  child.once("exit", (code) => { server.closeAllConnections(); server.close(); process.exitCode = code ?? 0 })
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, stop)
  console.log(`THEMIS live Codex preview: http://localhost:${webPort} — subscription, database first, live web search; no Drive files.`)
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "THEMIS Codex preview failed."); process.exitCode = 1 })
