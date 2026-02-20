import { createMiddleware } from 'hono/factory'
import { createClient } from '@supabase/supabase-js'

/**
 * Auth middleware: extracts Bearer token from Authorization header,
 * validates it against Supabase, and attaches user_id to context.
 */
export const authMiddleware = createMiddleware<{
  Variables: {
    userId: string
    accessToken: string
  }
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const token = authHeader.slice(7) // Remove 'Bearer '

  // Validate token against Supabase (uses getUser, not getSession, to prevent spoofing)
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Attach to context for downstream handlers
  c.set('userId', user.id)
  c.set('accessToken', token)

  await next()
})
