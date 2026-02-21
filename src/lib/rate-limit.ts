/**
 * In-memory sliding window rate limiter.
 * Key: user_id or IP address.
 * No external dependencies required.
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 60 seconds to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    // Remove entries with no recent timestamps (older than 5 minutes)
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < 5 * 60 * 1000)
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  }
}, 60 * 1000)

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: Date
}

/**
 * Check whether a key is within its rate limit.
 *
 * @param key      Unique identifier (user_id or IP)
 * @param limit    Maximum number of requests allowed within windowMs
 * @param windowMs Sliding window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Evict timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart)

  const count = entry.timestamps.length
  const success = count < limit

  if (success) {
    entry.timestamps.push(now)
  }

  const remaining = Math.max(0, limit - entry.timestamps.length)

  // Reset time = when the oldest timestamp in the window expires
  const oldestInWindow = entry.timestamps[0] ?? now
  const resetAt = new Date(oldestInWindow + windowMs)

  return { success, remaining, resetAt }
}
