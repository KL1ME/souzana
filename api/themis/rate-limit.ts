export type RateLimitConfig = {
  requestsPerMinute?: number
  requestBurst?: number
  globalRequestsPerMinute?: number
  providerCallsPerHour?: number
  providerCallsPerDay?: number
}

const defaults = {
  requestsPerMinute: 12,
  requestBurst: 4,
  globalRequestsPerMinute: 60,
  providerCallsPerHour: 300,
  providerCallsPerDay: 1000,
}

export function positiveInteger(value: number, name: string, maximum = 1_000_000) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be a positive integer no greater than ${maximum}.`)
  }
  return value
}

export function integerEnvironment(environment: Readonly<Record<string, string | undefined>>, name: string, fallback: number, maximum = 1_000_000) {
  const value = environment[name]
  if (value === undefined) return fallback
  if (!/^\d+$/.test(value.trim())) throw new Error(`${name} must be a positive integer.`)
  return positiveInteger(Number(value), name, maximum)
}

export function rateLimitEnvironment(environment: Readonly<Record<string, string | undefined>>): RateLimitConfig {
  return {
    requestsPerMinute: integerEnvironment(environment, "THEMIS_REQUESTS_PER_MINUTE", defaults.requestsPerMinute),
    requestBurst: integerEnvironment(environment, "THEMIS_REQUEST_BURST", defaults.requestBurst),
    globalRequestsPerMinute: integerEnvironment(environment, "THEMIS_GLOBAL_REQUESTS_PER_MINUTE", defaults.globalRequestsPerMinute),
    providerCallsPerHour: integerEnvironment(environment, "THEMIS_PROVIDER_CALLS_PER_HOUR", defaults.providerCallsPerHour),
    providerCallsPerDay: integerEnvironment(environment, "THEMIS_PROVIDER_CALLS_PER_DAY", defaults.providerCallsPerDay),
  }
}

type Window = { count: number; resetAt: number; duration: number; limit: number }
function window(limit: number, duration: number): Window { return { count: 0, resetAt: 0, duration, limit } }
function remaining(bucket: Window, now: number) {
  if (now >= bucket.resetAt) { bucket.count = 0; bucket.resetAt = now + bucket.duration }
  return bucket.count >= bucket.limit ? Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) : 0
}

/** Process-local fixed windows. Restarts reset them; replicas do not share a budget. */
export class ThemisRateLimiter {
  private readonly limits: typeof defaults
  private readonly clients = new Map<string, Window[]>()
  private readonly requests: Window
  private readonly provider: Window[]

  constructor(config: RateLimitConfig = {}) {
    this.limits = { ...defaults }
    for (const name of Object.keys(defaults) as (keyof typeof defaults)[]) {
      this.limits[name] = positiveInteger(config[name] ?? defaults[name], name)
    }
    this.requests = window(this.limits.globalRequestsPerMinute, 60_000)
    this.provider = [window(this.limits.providerCallsPerHour, 60 * 60_000), window(this.limits.providerCallsPerDay, 24 * 60 * 60_000)]
  }

  /** Admitted POST attempts count, including rejected origins and malformed/slow bodies. */
  admit(address: string, now = Date.now()): number {
    let client = this.clients.get(address)
    if (!client && this.clients.size >= 10_000) {
      let earliest = Infinity
      for (const [key, buckets] of this.clients) {
        const resetAt = Math.max(...buckets.map((bucket) => bucket.resetAt))
        if (resetAt <= now) this.clients.delete(key)
        else earliest = Math.min(earliest, resetAt)
      }
      if (this.clients.size >= 10_000) return Math.max(1, Math.ceil((earliest - now) / 1000))
    }
    client ??= [window(this.limits.requestsPerMinute, 60_000), window(this.limits.requestBurst, 10_000)]
    const buckets = [this.requests, ...client]
    const delay = Math.max(...buckets.map((bucket) => remaining(bucket, now)))
    if (delay) return delay
    for (const bucket of buckets) bucket.count++
    this.clients.set(address, client)
    return 0
  }

  /** Reserve immediately before each upstream attempt. Failures and fallbacks consume calls. */
  reserveProviderCall(now = Date.now()): number {
    const delay = Math.max(...this.provider.map((bucket) => remaining(bucket, now)))
    if (delay) return delay
    for (const bucket of this.provider) bucket.count++
    return 0
  }
}
