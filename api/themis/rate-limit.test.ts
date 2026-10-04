import assert from "node:assert/strict"
import { test } from "node:test"
import { integerEnvironment, rateLimitEnvironment, ThemisRateLimiter, type RateLimitConfig } from "./rate-limit"

test("client burst and minute quotas use independent windows and truthful retry delays", () => {
  const limiter = new ThemisRateLimiter({ requestBurst: 2, requestsPerMinute: 3 })
  assert.equal(limiter.admit("client", 1000), 0)
  assert.equal(limiter.admit("client", 1001), 0)
  assert.equal(limiter.admit("client", 2000), 9)
  assert.equal(limiter.admit("client", 11_000), 0)
  assert.equal(limiter.admit("client", 11_001), 50)
  assert.equal(limiter.admit("client", 61_000), 0)
})

test("changing clients cannot bypass the global request ceiling", () => {
  const limiter = new ThemisRateLimiter({ globalRequestsPerMinute: 2 })
  assert.equal(limiter.admit("one", 1000), 0)
  assert.equal(limiter.admit("two", 1001), 0)
  assert.equal(limiter.admit("three", 2000), 59)
  assert.equal(limiter.admit("three", 61_000), 0)
})

test("provider attempts have independent hourly and daily ceilings", () => {
  const limiter = new ThemisRateLimiter({ providerCallsPerHour: 2, providerCallsPerDay: 3 })
  assert.equal(limiter.reserveProviderCall(1000), 0)
  assert.equal(limiter.reserveProviderCall(1001), 0)
  assert.equal(limiter.reserveProviderCall(2000), 3599)
  assert.equal(limiter.reserveProviderCall(3_601_000), 0)
  assert.equal(limiter.reserveProviderCall(3_601_001), 82_800)
  assert.equal(limiter.reserveProviderCall(86_401_000), 0)
})

test("rejected attempts do not consume other windows or create a caller budget", () => {
  const limiter = new ThemisRateLimiter({ globalRequestsPerMinute: 2, requestsPerMinute: 1, requestBurst: 1 })
  assert.equal(limiter.admit("one", 1000), 0)
  for (let index = 0; index < 10; index++) assert.equal(limiter.admit("one", 1001), 60)
  assert.equal(limiter.admit("two", 1002), 0)
})

test("client bookkeeping is bounded and expired callers release room", () => {
  const limiter = new ThemisRateLimiter({ globalRequestsPerMinute: 20_000 })
  for (let index = 0; index < 10_000; index++) assert.equal(limiter.admit(`client${index}`, 1000), 0)
  assert.equal(limiter.admit("new", 1001), 60)
  assert.equal(limiter.admit("new", 61_000), 0)
})

test("configuration rejects disabling or overflowing quotas and parses named environment settings", () => {
  for (const name of ["requestsPerMinute", "requestBurst", "globalRequestsPerMinute", "providerCallsPerHour", "providerCallsPerDay"] as (keyof RateLimitConfig)[]) {
    for (const value of [0, -1, NaN, Infinity, 0.5, 1_000_001]) assert.throws(() => new ThemisRateLimiter({ [name]: value }), /positive integer/)
  }
  for (const value of ["", " ", "0", "-1", "NaN", "Infinity", "1.5", "1e3", "0x10", "1000001"]) {
    assert.throws(() => rateLimitEnvironment({ THEMIS_PROVIDER_CALLS_PER_DAY: value }), /positive integer/)
  }
  assert.equal(rateLimitEnvironment({ THEMIS_PROVIDER_CALLS_PER_DAY: " 25 " }).providerCallsPerDay, 25)
  assert.equal(integerEnvironment({}, "THEMIS_TIMEOUT_MS", 60_000, 120_000), 60_000)
  assert.throws(() => integerEnvironment({ THEMIS_TIMEOUT_MS: "120001" }, "THEMIS_TIMEOUT_MS", 60_000, 120_000), /120000/)
})
