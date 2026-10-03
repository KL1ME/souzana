import assert from "node:assert/strict"
import { test } from "node:test"
import { DriveError, GoogleDriveSource, type DriveFile, type GoogleDriveConfig } from "./drive"

const folderId = "approved_folder"
const documentMime = "application/vnd.google-apps.document"
const folder = { id: folderId, name: "Approved", mimeType: "application/vnd.google-apps.folder", version: "1", modifiedTime: "2026-01-01T00:00:00Z", trashed: false }
const file = { id: "document_1", name: "Εγκεκριμένες ερωτήσεις.txt", mimeType: "text/plain", version: "12", modifiedTime: "2026-01-02T00:00:00Z", parents: [folderId], trashed: false }

function metadata(overrides: Record<string, unknown> = {}) { return { ...file, ...overrides } }
function descriptor(overrides: Record<string, unknown> = {}): DriveFile {
  const { trashed: _trashed, ...value } = metadata(overrides)
  void _trashed
  return value as DriveFile
}
type Step = Response | ((url: URL, init: RequestInit | undefined) => Response)

function source(steps: Step[], overrides: Partial<GoogleDriveConfig> = {}) {
  const calls: { url: URL; init?: RequestInit }[] = []
  const adapter = new GoogleDriveSource({ folderId, accessToken: async () => "fixture-only-token", ...overrides,
    fetchImpl: async (input, init) => {
      const url = new URL(String(input))
      calls.push({ url, init })
      assert.equal(url.origin, "https://www.googleapis.com")
      assert.equal(init?.method, "GET")
      assert.equal(init?.redirect, "error")
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer fixture-only-token")
      const step = steps.shift()
      assert.ok(step, "unexpected mocked Google Drive request")
      return typeof step === "function" ? step(url, init) : step
    },
  })
  return { adapter, calls, remaining: () => steps.length }
}

function code(expected: string) {
  return (error: unknown) => error instanceof DriveError && error.code === expected
}

test("lists only direct approved-folder children, completing pagination without following shortcuts", async () => {
  const { adapter, calls, remaining } = source([
    Response.json(folder),
    Response.json({ files: [file], nextPageToken: "second-page", incompleteSearch: false }),
    Response.json({ files: [metadata({ id: "shortcut_1", mimeType: "application/vnd.google-apps.shortcut" }), metadata({ id: "nested_folder", mimeType: "application/vnd.google-apps.folder" })] }),
  ])
  const files = await adapter.list()
  assert.deepEqual(files.map((item) => item.id), [file.id, "shortcut_1", "nested_folder"])
  assert.deepEqual(files[0], descriptor())
  assert.equal(remaining(), 0)
  assert.equal(calls.length, 3)
  assert.equal(calls[0].url.pathname, `/drive/v3/files/${folderId}`)
  for (const call of calls.slice(1)) {
    assert.equal(call.url.searchParams.get("q"), `'${folderId}' in parents and trashed = false`)
    assert.equal(call.url.searchParams.get("supportsAllDrives"), "true")
    assert.equal(call.url.searchParams.get("includeItemsFromAllDrives"), "true")
  }
  assert.equal(calls[2].url.searchParams.get("pageToken"), "second-page")
})

test("rejects unconfigured or unsafe folder IDs before requesting authentication", () => {
  for (const value of ["", "https://drive.google.com/folders/abc", "' or true", "with spaces", "../../private", "a".repeat(201)]) {
    assert.throws(() => new GoogleDriveSource({ folderId: value, accessToken: async () => "unused" }), code("drive_invalid_folder"))
  }
  assert.throws(() => new GoogleDriveSource({ folderId, accessToken: async () => "unused", maxFileBytes: 0 }), code("drive_invalid_limit"))
})

test("requires a readable active folder and rejects permission or missing-folder failures", async () => {
  for (const mimeType of ["text/plain", "application/vnd.google-apps.shortcut"]) {
    await assert.rejects(source([Response.json({ ...folder, mimeType })]).adapter.list(), code("drive_invalid_folder"))
  }
  await assert.rejects(source([Response.json({ ...folder, trashed: true })]).adapter.list(), code("drive_invalid_folder"))
  for (const status of [401, 403, 404, 500]) {
    await assert.rejects(source([new Response("private upstream diagnostic", { status })]).adapter.list(), (error: unknown) =>
      error instanceof DriveError && error.status === status && !error.message.includes("private upstream diagnostic"))
  }
})

test("fails incomplete, duplicate, cyclic, and oversized listings instead of publishing a partial set", async () => {
  const cases: [Step[], string, Partial<GoogleDriveConfig>?][] = [
    [[Response.json({ files: [], incompleteSearch: true })], "drive_incomplete_search"],
    [[Response.json({ files: [file], nextPageToken: "next" }), Response.json({ files: [file] })], "drive_duplicate_file"],
    [[Response.json({ files: [], nextPageToken: "loop" }), Response.json({ files: [], nextPageToken: "loop" })], "drive_pagination_failed"],
    [[Response.json({ files: [file, metadata({ id: "second_file" })] })], "drive_too_many_files", { maxFiles: 1 }],
  ]
  for (const [steps, expected, options] of cases) {
    await assert.rejects(source([Response.json(folder), ...steps], options).adapter.list(), code(expected))
  }
})

test("validates returned parent membership, trash status, and version metadata", async () => {
  for (const overrides of [{ parents: ["private_folder"] }, { trashed: true }]) {
    await assert.rejects(source([Response.json(folder), Response.json({ files: [metadata(overrides)] })]).adapter.list(), code("drive_file_outside_folder"))
  }
  for (const overrides of [{ version: undefined }, { version: "not-a-version" }, { modifiedTime: "not-a-date" }, { parents: [folderId, folderId] }, { size: "-1" }]) {
    await assert.rejects(source([Response.json(folder), Response.json({ files: [metadata(overrides)] })]).adapter.list(), code("drive_invalid_metadata"))
  }
})

test("exports native Google Docs as text with stable before-and-after metadata and a safe filename", async () => {
  const native = metadata({ name: "../Greek\\FAQ?.docx", mimeType: documentMime })
  const { adapter, calls } = source([
    Response.json(native),
    (url) => {
      assert.equal(url.pathname, `/drive/v3/files/${file.id}/export`)
      assert.equal(url.searchParams.get("mimeType"), "text/plain")
      assert.equal(url.searchParams.has("alt"), false)
      return new Response("Εγκεκριμένες δημόσιες πληροφορίες")
    },
    Response.json(native),
  ])
  const result = await adapter.read(descriptor({ name: native.name, mimeType: documentMime }))
  assert.equal(new TextDecoder().decode(result.bytes), "Εγκεκριμένες δημόσιες πληροφορίες")
  assert.equal(result.mimeType, "text/plain")
  assert.equal(result.filename, "_Greek_FAQ_.txt")
  assert.equal(calls.length, 3)
  assert.ok(!result.filename.includes("/") && !result.filename.includes("\\"))
})

test("reads binary PDF and DOCX bytes without interpreting their content", async () => {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0, 255])
  for (const [mimeType, filename] of [["application/pdf", "document.pdf"], ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "document.docx"]]) {
    const value = metadata({ name: "document.exe", mimeType, size: String(bytes.length) })
    const { adapter } = source([Response.json(value), (url) => {
      assert.equal(url.pathname, `/drive/v3/files/${file.id}`)
      assert.equal(url.searchParams.get("alt"), "media")
      assert.equal(url.searchParams.get("supportsAllDrives"), "true")
      return new Response(bytes)
    }, Response.json(value)])
    const result = await adapter.read(descriptor({ name: value.name, mimeType, size: bytes.length }))
    assert.deepEqual(result.bytes, bytes)
    assert.equal(result.filename, filename)
    assert.equal(result.mimeType, mimeType)
  }
})

test("refuses files moved outside the folder or trashed before or during download", async () => {
  for (const override of [{ parents: ["private_folder"] }, { trashed: true }]) {
    const before = source([Response.json(metadata(override))])
    await assert.rejects(before.adapter.read(descriptor()), code("drive_file_outside_folder"))
    assert.equal(before.calls.length, 1)
    const during = source([Response.json(file), new Response("public text"), Response.json(metadata(override))])
    await assert.rejects(during.adapter.read(descriptor()), code("drive_file_outside_folder"))
    assert.equal(during.calls.length, 3)
  }
  const outside = source([])
  await assert.rejects(outside.adapter.read(descriptor({ parents: ["private_folder"] })), code("drive_file_outside_folder"))
  assert.equal(outside.calls.length, 0)
})

test("rejects stale approved versions and edits occurring during download", async () => {
  for (const change of [{ version: "13" }, { modifiedTime: "2026-01-03T00:00:00Z" }, { name: "new name" }, { mimeType: "application/pdf" }]) {
    const before = source([Response.json(metadata(change))])
    await assert.rejects(before.adapter.read(descriptor()), code("drive_file_changed"))
    assert.equal(before.calls.length, 1)
    await assert.rejects(source([Response.json(file), new Response("public text"), Response.json(metadata(change))]).adapter.read(descriptor()), code("drive_file_changed"))
  }
})

test("unsupported file types remain visible in listings but cannot be downloaded or followed", async () => {
  for (const mimeType of ["application/vnd.google-apps.shortcut", "application/vnd.google-apps.folder", "application/vnd.google-apps.spreadsheet", "image/jpeg"]) {
    const { adapter, calls } = source([])
    await assert.rejects(adapter.read(descriptor({ mimeType })), code("drive_unsupported_type"))
    assert.equal(calls.length, 0)
  }
})

test("enforces metadata and streamed download limits, including absent Content-Length", async () => {
  const declared = source([Response.json(metadata({ size: "11" }))], { maxFileBytes: 10 })
  await assert.rejects(declared.adapter.read(descriptor({ size: 11 })), code("drive_file_too_large"))
  assert.equal(declared.calls.length, 1)
  const header = source([Response.json(file), new Response("elevenbytes", { headers: { "Content-Length": "11" } })], { maxFileBytes: 10 })
  await assert.rejects(header.adapter.read(descriptor()), code("drive_file_too_large"))
  let canceled = false
  const streamed = new Response(new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(6)); controller.enqueue(new Uint8Array(6)) },
    cancel() { canceled = true },
  }))
  await assert.rejects(source([Response.json(file), streamed], { maxFileBytes: 10 }).adapter.read(descriptor()), code("drive_file_too_large"))
  assert.equal(canceled, true)
})

test("rejects incomplete blobs and redirects without contacting external download URLs", async () => {
  const sized = metadata({ size: "4" })
  await assert.rejects(source([Response.json(sized), new Response("abc"), Response.json(sized)]).adapter.read(descriptor({ size: 4 })), code("drive_content_incomplete"))
  const redirected = source([Response.json(file), new Response(null, { status: 302, headers: { Location: "https://private.example/content" } })])
  await assert.rejects(redirected.adapter.read(descriptor()), code("drive_redirect_rejected"))
  assert.equal(redirected.calls.length, 2)
})

test("passes cancellation through and never exposes failed authentication details", async () => {
  const controller = new AbortController()
  controller.abort()
  const { adapter, calls } = source([])
  await assert.rejects(adapter.list(controller.signal), (error: unknown) => error instanceof DOMException && error.name === "AbortError")
  assert.equal(calls.length, 0)
  const failure = new GoogleDriveSource({ folderId, accessToken: async () => { throw new Error("secret-token") }, fetchImpl: async () => { throw new Error("must not fetch") } })
  await assert.rejects(failure.list(), (error: unknown) => error instanceof DriveError && error.code === "drive_auth_unavailable" && !error.message.includes("secret-token"))
})
