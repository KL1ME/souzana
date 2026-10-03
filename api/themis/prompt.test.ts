import assert from "node:assert/strict"
import { test } from "node:test"
import { themisInstructions } from "./prompt"

test("clock context uses Greece's local date across UTC midnight and daylight saving", () => {
  const summer = themisInstructions("general", [], new Date("2026-07-01T22:30:00Z"))
  assert.match(summer, /local date 2026-07-02, local time 01:30, timezone Europe\/Athens/)
  const winter = themisInstructions("general", [], new Date("2026-01-01T22:30:00Z"))
  assert.match(winter, /local date 2026-01-02, local time 00:30, timezone Europe\/Athens/)
  assert.match(winter, /do not claim that the clock is unavailable/)
})

test("each answer receives a fresh clock while evidence and legal deadline boundaries remain", () => {
  const earlier = themisInstructions("general", [], new Date("2026-10-03T09:10:00Z"))
  const later = themisInstructions("general", [], new Date("2026-10-03T09:11:00Z"))
  assert.match(earlier, /local time 12:10/)
  assert.match(later, /local time 12:11/)
  assert.match(later, /Do not use conversation text as a replacement clock or infer legal deadlines/)
  assert.match(themisInstructions("database"), /full substantive answer is supported by the supplied excerpts/)
})
