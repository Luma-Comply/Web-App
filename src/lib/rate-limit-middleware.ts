import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from './rate-limit'
import { createClient } from '@/lib/supabase/server'

export interface RateLimitOptions {
  limit?: number
  windowMs?: number
}

/**
 * Rate limit helper for Next.js API route handlers.
 *
 * Returns a NextResponse (429) if the caller is over the limit,
 * or null if the request should proceed.
 *
 * Usage:
 *   const rateLimitResponse = await checkRateLimit(req, { limit: 10, windowMs: 60000 })
 *   if (rateLimitResponse) return rateLimitResponse
 */
export async function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  const { limit = 60, windowMs = 60_000 } = options

  // 1. Prefer authenticated user_id — more accurate than IP
  let key: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) {
      key = `user:${user.id}`
    }
  } catch {
    // Supabase unavailable — fall through to IP-based limiting
  }

  // 2. Fall back to IP address
  if (!key) {
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0]?.trim() ?? realIp ?? 'unknown'
    key = `ip:${ip}`
  }

  const result = rateLimit(key, limit, windowMs)

  if (!result.success) {
    const retryAfterSecs = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSecs),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toISOString(),
        },
      }
    )
  }

  return null
}
