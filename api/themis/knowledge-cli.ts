import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { KnowledgeDatabase } from "./knowledge"
import { websiteKnowledge } from "./seed"

const [command, argument] = process.argv.slice(2)
const database = new KnowledgeDatabase(resolve(process.env.THEMIS_DATABASE_PATH ?? "data/themis.sqlite"))
try {
  switch (command) {
    case "seed": database.importDocuments(websiteKnowledge(), true); console.log("Website knowledge refreshed."); break
    case "list": console.log(JSON.stringify(database.list(), null, 2)); break
    case "search": if (!argument) throw new Error("Supply a search question."); console.log(JSON.stringify(database.search(argument), null, 2)); break
    case "import": {
      if (!argument) throw new Error("Supply the path to an approved knowledge JSON file.")
      const content = readFileSync(argument, "utf8")
      if (Buffer.byteLength(content) > 5 * 1024 * 1024) throw new Error("Import files must be under 5 MiB.")
      database.importDocuments(JSON.parse(content))
      console.log("Knowledge documents imported.")
      break
    }
    case "remove": if (!argument || argument.startsWith("website:")) throw new Error("Supply a manual document ID."); database.remove(argument); console.log("Document removed."); break
    default: throw new Error("Use: themis:knowledge seed | list | search 'question' | import file.json | remove document-id")
  }
} finally { database.close() }
