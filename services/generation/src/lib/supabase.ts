import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Auth client: uses the user's JWT to validate identity and perform RLS-scoped reads.
 * Pass the access_token from the Authorization header.
 */
export function createAuthClient(accessToken: string) {
  return createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    }
  )
}

/**
 * Service client: uses the service role key for writes that need to bypass RLS.
 * Used for updating case status, inserting suggested forms, and error cleanup.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
