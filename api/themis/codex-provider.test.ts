import assert from "node:assert/strict"
import { readFile, stat } from "node:fs/promises"
import { test } from "node:test"
import { createCodexGenerator, codexEnvironment, readCodexReply, runCodexProcess, type CodexRun } from "./codex-provider"
import { ProviderError } from "./answers"
import { answerQuestion } from "./answers"

const signal = () => new AbortController().signal
const body = { instructions: "THEMIS instructions", input: [{ role: "user", content: "Γεια σου $(secret) `command`" }] }
const events = (text: string) => [
  { type: "thread.started", thread_id: "local-test" }, { type: "turn.started" },
  { type: "item.completed", item: { type: "agent_message", text } }, { type: "turn.completed", usage: {} },
].map((event) => JSON.stringify(event)).join("\n")
const login = { exitCode: 0, stdout: "", stderr: "Logged in using ChatGPT" }
const webBody = { ...body, tools: [{ type: "web_search", filters: { allowed_domains: ["gov.gr"] } }], tool_choice: "required" }
const webEvents = (reply: unknown, url = "https://www.gov.gr/example") => [
  { type: "thread.started" }, { type: "turn.started" },
  { type: "item.completed", item: { type: "web_search", action: { type: "search", query: "public general question" } } },
  { type: "item.completed", item: { type: "web_search", action: { type: "open_page", url } } },
  { type: "item.completed", item: { type: "agent_message", text: JSON.stringify(reply) } }, { type: "turn.completed" },
].map((event) => JSON.stringify(event)).join("\n")

test("subscription adapter sends only stdin conversation and private schema to an isolated no-tool CLI run", async () => {
  let directory = "", calls = 0
  const run: CodexRun = async (_command, args, options) => {
    calls++
    directory = options.cwd
    if (args[0] === "login") return login
    assert.ok(args.includes("--ignore-user-config") && args.includes("--ephemeral"))
    assert.equal(args[args.indexOf("--sandbox") + 1], "read-only")
    assert.ok(args.includes("shell_tool") && args.includes("plugins") && args.includes("hooks"))
    assert.ok(args.includes("web_search=\"disabled\""))
    assert.equal(args[args.indexOf("--model") + 1], "gpt-5.5")
    assert.ok(!args.some((arg) => arg.includes("$(secret)")))
    assert.match(options.input!, /Γεια σου \$\(secret\)/)
    assert.equal(options.env.OPENAI_API_KEY, undefined)
    const schemaPath = args[args.indexOf("--output-schema") + 1]
    const schema = JSON.parse(await readFile(schemaPath, "utf8"))
    assert.deepEqual(schema.required, ["reply"])
    assert.equal((await stat(schemaPath)).mode & 0o777, 0o600)
    return { exitCode: 0, stderr: "", stdout: events(JSON.stringify({ reply: "Γεια σας! Είμαι η THEMIS." })) }
  }
  const output = await createCodexGenerator({ run })(body, signal())
  assert.equal(calls, 2)
  assert.equal((output[0] as { content: { text: string }[] }).content[0].text, "Γεια σας! Είμαι η THEMIS.")
  await assert.rejects(stat(directory), { code: "ENOENT" })
})

test("API-key login and missing login never start inference or expose authentication diagnostics", async () => {
  for (const status of [{ exitCode: 0, stdout: "Logged in using an API key", stderr: "private-key" }, { exitCode: 1, stdout: "", stderr: "private diagnostic" }]) {
    let calls = 0
    await assert.rejects(createCodexGenerator({ run: async () => { calls++; return status } })(body, signal()),
      (error: unknown) => error instanceof ProviderError && error.code === "codex_login_required" && !error.message.includes("private"))
    assert.equal(calls, 1)
  }
})

test("database structured output is preserved for the existing evidence and citation validator", async () => {
  const decision = { answer_found: true, answer: "Στην Καλαμάτα.", citation_ids: ["website:company"] }
  const output = await createCodexGenerator({ run: async (_command, args) => args[0] === "login" ? login : { exitCode: 0, stderr: "", stdout: events(JSON.stringify(decision)) } })({
    ...body, text: { format: { name: "database_answer", schema: { type: "object" } } },
  }, signal())
  assert.equal((output[0] as { content: { text: string }[] }).content[0].text, JSON.stringify(decision))
})

test("failed, incomplete, malformed, and tool-bearing Codex streams cannot become answers", () => {
  for (const stdout of ["not JSON", events("hello").replace(/.*turn.completed.*$/, ""), JSON.stringify({ type: "turn.failed", error: { message: "private" } }),
    `${JSON.stringify({ type: "item.started", item: { type: "command_execution" } })}\n${events("answer")}`]) {
    assert.throws(() => readCodexReply(stdout), ProviderError)
  }
})

test("nonfatal CLI startup warnings are hidden while successful turn completion is still required", () => {
  const warning = JSON.stringify({ type: "item.completed", item: { type: "error", message: "private startup warning" } })
  assert.equal(readCodexReply(`${warning}\n${events("answer")}`), "answer")
  assert.throws(() => readCodexReply(warning), ProviderError)
  assert.throws(() => readCodexReply(`${JSON.stringify({ type: "turn.started" })}\n${warning}\n${events("answer")}`), ProviderError)
})

test("malformed generation is sanitized and its temporary files are removed", async () => {
  let directory = ""
  await assert.rejects(createCodexGenerator({ run: async (_command, args, options) => {
    directory = options.cwd
    return args[0] === "login" ? login : { exitCode: 1, stderr: "private diagnostic", stdout: "private token" }
  } })(body, signal()), (error: unknown) => error instanceof ProviderError && error.code === "codex_unavailable")
  await assert.rejects(stat(directory), { code: "ENOENT" })
})

test("unsupported web requests and cancelled calls stop before any subprocess", async () => {
  let calls = 0
  const generate = createCodexGenerator({ run: async () => { calls++; return login } })
  await assert.rejects(generate({ ...body, tools: [{ type: "web_search" }] }, signal()), ProviderError)
  await assert.rejects(generate(body, AbortSignal.abort()))
  assert.equal(calls, 0)
})

test("web requests enable live search, apply domain filters and produce browser-valid source links", async () => {
  const value = { reply: "Πληροφορία από επίσημη πηγή.", sources: [{ title: "Επίσημη πηγή", url: "https://www.gov.gr/example" }] }
  const generate = createCodexGenerator({ run: async (_command, args) => {
    if (args[0] === "login") return login
    assert.ok(args.includes('web_search="live"'))
    assert.ok(args.some((arg) => arg.includes('allowed_domains=["gov.gr"]')))
    const instructionsArg = args.find((arg) => arg.startsWith("model_instructions_file="))!
    const instructions = await readFile(JSON.parse(instructionsArg.slice("model_instructions_file=".length)), "utf8")
    assert.match(instructions, /EXACTLY the URL argument/)
    return { exitCode: 0, stderr: "", stdout: webEvents(value) }
  } })
  const result = await answerQuestion([{ role: "user", content: "Public question" }], {
    apiKey: "", model: "", knowledge: { search: () => [] }, generateResponse: generate, webAllowedDomains: ["gov.gr"],
  }, async () => { throw new Error("must not use API billing") }, signal())
  assert.equal(result.source, "web")
  assert.equal(result.sources[0].url, value.sources[0].url)
  assert.equal(result.reply.slice(result.citations[0].start, result.citations[0].end), "[1]")
})

test("invented, unsearched, unopened, unsafe and out-of-domain sources cannot become web evidence", async () => {
  const source = { title: "Source", url: "https://www.gov.gr/example" }
  for (const stdout of [
    events(JSON.stringify({ reply: "Claim", sources: [source] })),
    webEvents({ reply: "Claim", sources: [{ ...source, url: "https://www.gov.gr/invented" }] }),
    webEvents({ reply: "Claim", sources: [{ ...source, url: "https://example.test/" }] }, "https://example.test/"),
    webEvents({ reply: "Claim", sources: [{ ...source, url: "javascript:alert(1)" }] }, "javascript:alert(1)"),
    webEvents({ reply: "Claim", sources: [source] }).replace(/.*"type":"search".*\n/, ""),
    webEvents({ reply: "Claim", sources: [source] }).replace(/.*"type":"open_page".*\n/, ""),
  ]) {
    const generate = createCodexGenerator({ run: async (_command, args) => args[0] === "login" ? login : { exitCode: 0, stderr: "", stdout } })
    const output = await generate(webBody, signal())
    const message = output.find((item) => (item as { type: string }).type === "message") as { content: { annotations: unknown[] }[] }
    assert.deepEqual(message.content[0].annotations, [])
  }
})

test("an extra unopened search-result link is omitted while an opened source remains usable", async () => {
  const sources = [{ title: "Opened", url: "https://www.gov.gr/example" }, { title: "Not opened", url: "https://www.gov.gr/extra" }]
  const generate = createCodexGenerator({ run: async (_command, args) => args[0] === "login" ? login : { exitCode: 0, stderr: "", stdout: webEvents({ reply: "Answer", sources }) } })
  const output = await generate(webBody, signal())
  const annotations = (output[1] as { content: { annotations: { url: string }[] }[] }).content[0].annotations
  assert.deepEqual(annotations.map(({ url }) => url), [sources[0].url])
})

test("web tool permission never authorizes shell or other tools and no-source searches stay uncited", async () => {
  const stdout = webEvents({ reply: "No reliable source", sources: [] })
  const generate = createCodexGenerator({ run: async (_command, args) => args[0] === "login" ? login : { exitCode: 0, stderr: "", stdout } })
  const output = await generate(webBody, signal())
  assert.deepEqual((output[1] as { content: { annotations: unknown[] }[] }).content[0].annotations, [])
  const forbidden = `${JSON.stringify({ type: "item.completed", item: { type: "command_execution" } })}\n${stdout}`
  await assert.rejects(createCodexGenerator({ run: async (_command, args) => args[0] === "login" ? login : { exitCode: 0, stderr: "", stdout: forbidden } })(webBody, signal()),
    (error: unknown) => error instanceof ProviderError && error.code === "codex_tools_disabled")
})

test("Codex child environment excludes API keys, Google credentials, and unrelated secrets", () => {
  const env = codexEnvironment({ NODE_ENV: "test", HOME: "/test/home", PATH: "/test/bin", OPENAI_API_KEY: "private", THEMIS_GOOGLE_CREDENTIALS_FILE: "private", SECRET: "private" })
  assert.deepEqual(env, { NODE_ENV: "test", HOME: "/test/home", PATH: "/test/bin" })
})

test("subprocess cancellation terminates a running request and bounds oversized process output", async () => {
  const options = { cwd: process.cwd(), env: codexEnvironment(), signal: AbortSignal.timeout(80) }
  await assert.rejects(runCodexProcess(process.execPath, ["-e", "setInterval(()=>{},1000)"], options),
    (error: unknown) => error instanceof ProviderError && error.code === "request_timeout")
  await assert.rejects(runCodexProcess(process.execPath, ["-e", "process.stdout.write('x'.repeat(300000))"], { ...options, signal: AbortSignal.timeout(5000) }),
    (error: unknown) => error instanceof ProviderError && error.code === "invalid_provider_response")
})
