import { createThemisServer } from "./http"

const allowedOrigins = (process.env.THEMIS_ALLOWED_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000")
  .split(",").map((origin) => origin.trim()).filter(Boolean)
for (const origin of allowedOrigins) {
  const url = new URL(origin)
  if (!["https:", "http:"].includes(url.protocol) || url.origin !== origin) {
    throw new Error("THEMIS_ALLOWED_ORIGINS must contain exact HTTP(S) origins without paths or trailing slashes.")
  }
}

const port = Number(process.env.THEMIS_PORT ?? 8787)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid THEMIS_PORT.")

const server = createThemisServer({
  apiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
  model: process.env.OPENAI_MODEL?.trim() ?? "",
  allowedOrigins,
})
server.listen(port, process.env.THEMIS_HOST ?? "127.0.0.1", () => {
  console.log(`THEMIS API listening on port ${port}.`)
})
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
