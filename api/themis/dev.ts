// Local development with the real API. The private environment is loaded only by the backend.
import { spawn, type ChildProcess } from "node:child_process"
import { unwatchFile, watchFile } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"

const require = createRequire(resolve("package.json"))
const privateEnvironment = resolve(".env.themis")
const expectedExits = new WeakSet<ChildProcess>()
let stopping = false
let reloading = false
let reloadPending = false
function startApi() {
  const child = spawn(process.execPath, [require.resolve("tsx/cli"), "watch", "--clear-screen=false", `--env-file-if-exists=${privateEnvironment}`, "api/themis/server.ts"], {
    stdio: "inherit", env: process.env, shell: false,
  })
  observe(child, "API")
  return child
}
let api = startApi()
const websiteEnv = { ...process.env, GITHUB_PAGES: "false" }
// Credentials never enter the website process; Next loads only the public .env.local file.
for (const key of Object.keys(websiteEnv)) if (key.startsWith("OPENAI_") || key.startsWith("THEMIS_GOOGLE_")) delete websiteEnv[key as keyof typeof websiteEnv]
const website = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3000"], {
  stdio: "inherit", env: websiteEnv, shell: false,
})
function terminate(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve()
  return new Promise((done) => {
    const timer = setTimeout(() => child.kill("SIGKILL"), 1500)
    timer.unref()
    child.once("close", () => { clearTimeout(timer); done() })
    child.kill("SIGTERM")
  })
}
function stop(code = 0) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  unwatchFile(privateEnvironment)
  for (const child of [api, website]) void terminate(child)
}
function observe(child: ChildProcess, label: string) {
  child.once("error", () => { console.error(`THEMIS ${label} could not start.`); stop(1) })
  child.once("exit", (code) => { if (!expectedExits.has(child)) stop(code ?? 0) })
}
async function reloadApi() {
  if (stopping) return
  if (reloading) { reloadPending = true; return }
  reloading = true
  try {
    do {
      reloadPending = false
      expectedExits.add(api)
      await terminate(api)
      if (stopping) return
      api = startApi()
    } while (reloadPending)
  } finally { reloading = false }
}
// Poll the file path so editors that replace the file atomically also trigger a reload.
watchFile(privateEnvironment, { interval: 500 }, (current, previous) => {
  if (current.mtimeMs !== previous.mtimeMs || current.size !== previous.size || current.ino !== previous.ino) void reloadApi()
})
observe(website, "website")
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => stop())
console.log("THEMIS local app: http://localhost:3000\nPut your API key in .env.themis. Saving that file reloads the backend.")
