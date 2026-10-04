import assert from "node:assert/strict"
import { test } from "node:test"
import { trackThemisViewport } from "../../lib/themis-viewport"

function fixture(withViewport = true) {
  const values = new Map<string, string>()
  const panel = { style: {
    setProperty: (key: string, value: string) => values.set(key, value),
    removeProperty: (key: string) => values.delete(key),
  } } as unknown as HTMLElement
  const viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0 })
  const browser = Object.assign(new EventTarget(), {
    innerHeight: 844,
    visualViewport: withViewport ? viewport : null,
  }) as unknown as EventTarget & NonNullable<Parameters<typeof trackThemisViewport>[2]>
  const conversation = { scrollHeight: 1200, clientHeight: 440, scrollTop: 760 } as HTMLElement
  return { values, panel, viewport, browser, conversation }
}

test("iPhone keyboard resize follows the visible area while the page remains full height", () => {
  const { values, panel, viewport, browser, conversation } = fixture()
  const stop = trackThemisViewport(panel, conversation, browser)
  viewport.height = 363
  viewport.offsetTop = 180
  viewport.dispatchEvent(new Event("resize"))
  assert.equal(browser.innerHeight, 844)
  assert.equal(values.get("--themis-viewport-height"), "363px")
  assert.equal(values.get("--themis-viewport-top"), "180px")
  assert.equal(conversation.scrollTop, 1200)

  viewport.offsetTop = 210
  viewport.dispatchEvent(new Event("scroll"))
  assert.equal(values.get("--themis-viewport-top"), "210px")
  viewport.height = 844
  viewport.offsetTop = 0
  viewport.dispatchEvent(new Event("resize"))
  assert.equal(values.get("--themis-viewport-height"), "844px")
  assert.equal(values.get("--themis-viewport-top"), "0px")
  stop()
  viewport.height = 300
  viewport.dispatchEvent(new Event("resize"))
  assert.equal(values.size, 0, "closing chat must remove its viewport subscription")
})

test("keyboard changes preserve the reading position for visitors viewing earlier replies", () => {
  const { panel, viewport, browser, conversation } = fixture()
  conversation.scrollTop = 180
  const stop = trackThemisViewport(panel, conversation, browser)
  viewport.height = 363
  viewport.dispatchEvent(new Event("resize"))
  assert.equal(conversation.scrollTop, 180)
  stop()
})

test("browsers without VisualViewport still resize using their window height", () => {
  const { values, panel, browser } = fixture(false)
  const stop = trackThemisViewport(panel, null, browser)
  Object.assign(browser, { innerHeight: 320 })
  browser.dispatchEvent(new Event("resize"))
  assert.equal(values.get("--themis-viewport-height"), "320px")
  assert.equal(values.get("--themis-viewport-top"), "0px")
  stop()
  browser.dispatchEvent(new Event("resize"))
  assert.equal(values.size, 0)
})
