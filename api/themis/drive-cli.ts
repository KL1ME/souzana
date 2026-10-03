import { readFile, stat, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { FileCatalogueStore } from "./catalogue"
import { driveAccessToken } from "./drive-auth"
import { GoogleDriveSource } from "./drive"
import { approveDrive, reviewDrive, syncDrive, withdrawDrive } from "./drive-sync"
import { createKnowledgeStore, OpenAIKnowledgeIndex } from "./vector-index"

const [command, argument] = process.argv.slice(2)

async function main() {
  const folderId = process.env.THEMIS_DRIVE_FOLDER_ID?.trim() ?? ""
  if (!folderId) {
    if (command === "status") { console.log(JSON.stringify({ configured: false, next: "Provide an approved Drive folder and authorize backend access." }, null, 2)); return }
    throw new Error("Set THEMIS_DRIVE_FOLDER_ID to the Approved folder ID.")
  }
  const catalogue = new FileCatalogueStore(process.env.THEMIS_DRIVE_CATALOGUE_PATH ?? "data/themis-drive.json", folderId)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20 * 60_000)
  const stop = () => controller.abort()
  process.once("SIGINT", stop); process.once("SIGTERM", stop)
  try {
    if (command === "status") { console.log(JSON.stringify(await catalogue.read(), null, 2)); return }
    if (command === "withdraw") {
      if (!argument) throw new Error("Supply a Drive document ID.")
      await withdrawDrive(catalogue, argument)
      console.log("Document withdrawn from chatbot knowledge; the next sync will clean up its index file.")
      return
    }
    const apiKey = process.env.OPENAI_API_KEY?.trim() ?? ""
    if (command === "init") {
      if (!apiKey) throw new Error("Set the private OPENAI_API_KEY before creating the managed index.")
      await catalogue.exclusive(async () => {
        const current = await catalogue.read()
        if (current.vectorStoreId) { console.log("Managed index is already recorded in the catalogue."); return }
        const configured = process.env.THEMIS_VECTOR_STORE_ID?.trim()
        const id = configured || await createKnowledgeStore({ apiKey, folderId }, controller.signal)
        await catalogue.write({ ...current, vectorStoreId: id }, current.revision)
        console.log(`Managed index recorded: ${id}`)
      })
      return
    }
    if (!["review", "approve", "sync"].includes(command)) throw new Error("Use: themis:drive status | init | review output.json | approve reviewed.json | sync | withdraw drive-file-id")
    const source = new GoogleDriveSource({ folderId, accessToken: driveAccessToken(process.env.THEMIS_GOOGLE_CREDENTIALS_FILE ?? "") })
    if (command === "review") {
      if (!argument) throw new Error("Supply an output JSON path outside public/out.")
      const output = resolve(argument)
      if (await stat(output).then(() => true, (error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return false; throw error })) {
        throw new Error("The review output already exists; choose a new path to preserve previous reviews.")
      }
      // Apply the same public-directory guard as the catalogue.
      new FileCatalogueStore(output, folderId)
      const draft = await reviewDrive(source, catalogue, controller.signal)
      await writeFile(output, JSON.stringify(draft, null, 2) + "\n", { flag: "wx", mode: 0o600 })
      console.log(`Review draft written to ${output}. Check the content and public citations before approving.`)
      return
    }
    if (command === "approve") {
      if (!argument) throw new Error("Supply the reviewed approval JSON file.")
      if ((await stat(argument)).size > 4 * 1024 * 1024) throw new Error("Approval file exceeds 4 MiB.")
      let approvals: unknown
      try { approvals = JSON.parse(await readFile(argument, "utf8")) } catch { throw new Error("Invalid approval JSON.") }
      await approveDrive(source, catalogue, approvals, controller.signal)
      console.log("Exact document versions approved. Run sync to index them.")
      return
    }
    const current = await catalogue.read()
    const vectorStoreId = process.env.THEMIS_VECTOR_STORE_ID?.trim() || current.vectorStoreId
    if (!apiKey || !vectorStoreId) throw new Error("Configure OPENAI_API_KEY and run themis:drive init before sync.")
    console.log(JSON.stringify(await syncDrive(source, catalogue, new OpenAIKnowledgeIndex({ apiKey, vectorStoreId }), vectorStoreId, controller.signal), null, 2))
  } finally {
    clearTimeout(timer)
    process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Drive command failed.")
  process.exitCode = 1
})
