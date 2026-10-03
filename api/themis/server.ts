import { createThemisServer } from "./http"
import { resolve } from "node:path"
import { KnowledgeDatabase, type KnowledgeSearch } from "./knowledge"
import { websiteKnowledge } from "./seed"
import { FileCatalogueStore } from "./catalogue"
import { CombinedKnowledge, ManagedDriveKnowledge } from "./managed-knowledge"
import { OpenAIKnowledgeIndex } from "./vector-index"

function flag(name: string, fallback: boolean) {
  const value = process.env[name]?.toLowerCase()
  if (value === undefined) return fallback
  if (!["true", "false"].includes(value)) throw new Error(`${name} must be true or false.`)
  return value === "true"
}

async function main() {
  const allowedOrigins = (process.env.THEMIS_ALLOWED_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000")
    .split(",").map((origin) => origin.trim()).filter(Boolean)
  for (const origin of allowedOrigins) {
    const url = new URL(origin)
    if (!["https:", "http:"].includes(url.protocol) || url.origin !== origin) {
      throw new Error("THEMIS_ALLOWED_ORIGINS must contain exact HTTP(S) origins without paths or trailing slashes.")
    }
  }
  const port = Number(process.env.THEMIS_PORT ?? process.env.PORT ?? 8787)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid THEMIS_PORT.")
  const webAllowedDomains = (process.env.THEMIS_WEB_ALLOWED_DOMAINS ?? "gov.gr,et.gr,europa.eu").split(",").map((domain) => domain.trim().toLowerCase())
  if (!webAllowedDomains.length || webAllowedDomains.length > 100 || webAllowedDomains.some((domain) => !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain))) {
    throw new Error("THEMIS_WEB_ALLOWED_DOMAINS must contain domain names without schemes, paths, or wildcards.")
  }
  const webSearchEnabled = flag("THEMIS_WEB_SEARCH_ENABLED", true)
  const allowGeneralFallback = flag("THEMIS_ALLOW_GENERAL_FALLBACK", false)
  const driveEnabled = flag("THEMIS_DRIVE_ENABLED", false)
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? ""
  const local = new KnowledgeDatabase(resolve(process.env.THEMIS_DATABASE_PATH ?? "data/themis.sqlite"))
  try {
    local.importDocuments(websiteKnowledge(), true)
    let knowledge: KnowledgeSearch = local
    if (driveEnabled) {
      const catalogue = new FileCatalogueStore(process.env.THEMIS_DRIVE_CATALOGUE_PATH ?? "data/themis-drive.json", process.env.THEMIS_DRIVE_FOLDER_ID?.trim() ?? "")
      const current = await catalogue.read()
      const vectorStoreId = process.env.THEMIS_VECTOR_STORE_ID?.trim() || current.vectorStoreId
      if (!apiKey || !vectorStoreId) throw new Error("Drive knowledge requires OPENAI_API_KEY and a managed index. Complete themis:drive init first.")
      const hours = Number(process.env.THEMIS_DRIVE_MAX_AGE_HOURS ?? 24)
      if (!Number.isFinite(hours) || hours <= 0 || hours > 168) throw new Error("THEMIS_DRIVE_MAX_AGE_HOURS must be between 0 and 168.")
      knowledge = new CombinedKnowledge(local, new ManagedDriveKnowledge({ catalogue,
        index: new OpenAIKnowledgeIndex({ apiKey, vectorStoreId }), vectorStoreId, maxAgeMs: Math.round(hours * 60 * 60 * 1000) }))
    }
    const server = createThemisServer({ apiKey, model: process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini", allowedOrigins,
      knowledge, webSearchEnabled, webAllowedDomains, allowGeneralFallback })
    server.once("close", () => local.close())
    server.once("error", () => { local.close(); console.error("THEMIS API could not listen on its configured address."); process.exitCode = 1 })
    server.listen(port, process.env.THEMIS_HOST ?? "127.0.0.1", () => { console.log(`THEMIS API listening on port ${port}.`) })
    for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => server.close(() => process.exit(0)))
  } catch (error) { local.close(); throw error }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "THEMIS configuration failed."); process.exitCode = 1 })
