import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

const getServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

interface AuditLogParams {
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  userId?: string
}

/**
 * Log an audit event. Designed to be fire-and-forget:
 *   logAudit({ action: 'document_generated', resourceType: 'case', resourceId: caseId }).catch(() => {})
 */
export async function logAudit({
  action,
  resourceType,
  resourceId,
  metadata,
  userId,
}: AuditLogParams): Promise<void> {
  try {
    // Resolve user ID if not provided
    let resolvedUserId = userId
    if (!resolvedUserId) {
      try {
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        resolvedUserId = user?.id
      } catch {
        // May fail in contexts without cookies (e.g., webhooks) — proceed without user
      }
    }

    // Extract IP and user-agent from request headers
    let ipAddress: string | undefined
    let userAgent: string | undefined
    try {
      const headersList = await headers()
      ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headersList.get('x-real-ip') || undefined
      userAgent = headersList.get('user-agent') || undefined
    } catch {
      // headers() may not be available in all contexts
    }

    const serviceClient = getServiceClient()
    await serviceClient.from('audit_logs').insert({
      user_id: resolvedUserId || null,
      action,
      resource_type: resourceType || null,
      resource_id: resourceId || null,
      metadata: metadata || {},
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    })
  } catch (error) {
    console.error('[AuditLog] Failed to write audit log:', error)
  }
}
