import { createClient } from '@supabase/supabase-js'

const CACHE_TTL_HOURS = 24

const getServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

/**
 * Generate a deterministic cache key from payer, medication, state, and doc type.
 * Including doc_type ensures biologics_pa research (CTP/LCD-specific) is not served
 * for medical_necessity or appeal cases, which use different Perplexity queries.
 */
function generateCacheKey(payer: string, medication: string, state: string, docType: string): string {
  return `${payer.toLowerCase().trim()}|${medication.toLowerCase().trim()}|${state.toLowerCase().trim()}|${docType.toLowerCase().trim()}`
}

/**
 * Check cache for a valid (non-expired) research result.
 * Returns { research_result, citations } if found, null otherwise.
 */
export async function getCachedResearch(
  payer: string,
  medication: string,
  state: string,
  docType: string
): Promise<{ research_result: string; citations: any[] } | null> {
  try {
    const cacheKey = generateCacheKey(payer, medication, state, docType)
    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('research_cache')
      .select('research_result, citations')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) return null

    console.log(`[ResearchCache] HIT for ${cacheKey}`)
    return {
      research_result: data.research_result as string,
      citations: (data.citations as any[]) || [],
    }
  } catch {
    // Cache miss or error -- caller should proceed with fresh Perplexity call
    return null
  }
}

/**
 * Store a research result in the cache with a 24-hour TTL.
 * Uses upsert (ON CONFLICT) so re-running the same query refreshes the entry.
 * Designed to be fire-and-forget: cacheResearch(...).catch(() => {})
 */
export async function cacheResearch(
  payer: string,
  medication: string,
  state: string,
  docType: string,
  researchResult: string,
  citations: any[]
): Promise<void> {
  const cacheKey = generateCacheKey(payer, medication, state, docType)
  const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString()
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('research_cache')
    .upsert(
      {
        cache_key: cacheKey,
        research_result: researchResult,
        citations,
        expires_at: expiresAt,
      },
      { onConflict: 'cache_key' }
    )

  if (error) {
    console.error('[ResearchCache] Failed to write cache:', error.message)
  } else {
    console.log(`[ResearchCache] STORED ${cacheKey} (expires ${expiresAt})`)
  }
}

// TODO: Periodic cleanup of expired cache entries.
// For now, expired entries are filtered out on read via the WHERE clause.
// A cron job or Supabase pg_cron extension could run:
//   DELETE FROM research_cache WHERE expires_at < NOW();
