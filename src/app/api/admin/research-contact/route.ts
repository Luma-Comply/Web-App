import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit-middleware"

async function perplexity(systemPrompt: string, userPrompt: string) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Perplexity API error: ${res.status}`)
  const json = await res.json()
  return json.choices?.[0]?.message?.content || ""
}

function parseJSON(raw: string) {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  return JSON.parse(cleaned)
}

// Common medical/professional suffixes that get mashed into LinkedIn slugs
const SUFFIXES = ["rn", "bsn", "msn", "md", "do", "np", "pa", "pharmd", "phd", "mba", "fache", "mha", "mph", "dnp", "crna", "cpa", "esq", "jd"]

function nameFromLinkedInSlug(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i)
  if (!match?.[1]) return null
  let slug = match[1].replace(/-+/g, " ").trim()

  // Try to split trailing suffixes: "aguilarrn" → "aguilar rn", "smithmd" → "smith md"
  const words = slug.split(" ")
  const last = words[words.length - 1].toLowerCase()
  for (const suf of SUFFIXES) {
    if (last.endsWith(suf) && last.length > suf.length) {
      words[words.length - 1] = last.slice(0, -suf.length)
      // Don't append suffix to the display name
      break
    }
  }

  return words
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ") || null
}

function extractLinkedInData(html: string): {
  name: string | null
  title: string | null
  location: string | null
  summary: string | null
  image: string | null
} {
  const result = { name: null as string | null, title: null as string | null, location: null as string | null, summary: null as string | null, image: null as string | null }

  // 1. JSON-LD structured data (most reliable)
  const ldMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const m of ldMatches) {
    try {
      const ld = JSON.parse(m[1])
      const items = Array.isArray(ld) ? ld : [ld]
      for (const item of items) {
        if (item["@type"] === "Person" || item["@type"] === "ProfilePage") {
          const person = item["@type"] === "ProfilePage" ? item.mainEntity : item
          if (person) {
            result.name = result.name || person.name || null
            result.title = result.title || person.jobTitle || null
            result.location = result.location || (person.address?.addressLocality ? `${person.address.addressLocality}, ${person.address.addressRegion || ""}`.trim().replace(/,\s*$/, "") : null)
            result.summary = result.summary || person.description || null
            result.image = result.image || person.image?.contentUrl || person.image || null
          }
        }
      }
    } catch { /* skip bad JSON */ }
  }

  // 2. OpenGraph meta tags
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1]
  if (ogTitle && !result.name) {
    // og:title is usually "Name - Title - Organization | LinkedIn"
    const parts = ogTitle.split(/\s*[-–|]\s*/)
    if (parts[0]) result.name = parts[0].trim()
    if (parts[1]) result.title = parts[1].trim()
  }

  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i)?.[1]
  if (ogDesc && !result.summary) {
    result.summary = ogDesc
  }

  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1]
  if (ogImage && !result.image) {
    result.image = ogImage
  }

  // 3. Twitter card tags as fallback
  const twImage = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i)?.[1]
  if (twImage && !result.image) {
    result.image = twImage
  }

  return result
}

function extractMetaImage(html: string): string | null {
  // Try og:image first, then twitter:image
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  if (ogMatch?.[1]) return ogMatch[1]

  const twMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i)
  if (twMatch?.[1]) return twMatch[1]

  return null
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await checkRateLimit(req, { limit: 5, windowMs: 60_000 })
  if (rateLimitResponse) return rateLimitResponse

  // Auth: super admin only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from("users")
    .select("is_super_admin")
    .eq("id", user.id)
    .single()

  if (!userData?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { url } = await req.json()
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  try {
    const isLinkedIn = /linkedin\.com/i.test(url)
    let profileImageUrl: string | null = null
    let person

    if (isLinkedIn) {
      // --- LinkedIn path: try direct fetch first, fall back to Perplexity-only ---
      const slugName = nameFromLinkedInSlug(url)
      let linkedInData: { name: string | null; title: string | null; location: string | null; summary: string | null; image: string | null } | null = null
      let pageText = ""

      try {
        const liResponse = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
          },
          redirect: "follow",
        })

        if (liResponse.ok || liResponse.status === 999) {
          // LinkedIn sometimes returns 999 but still sends HTML
          const html = await liResponse.text()
          if (html.length > 500) {
            linkedInData = extractLinkedInData(html)
            profileImageUrl = linkedInData.image
            // Also grab visible text for Perplexity context
            pageText = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 6000)
          }
        }
      } catch {
        // Fetch failed entirely — we'll rely on Perplexity below
      }

      const hasLinkedInData = linkedInData?.name && linkedInData?.title

      if (hasLinkedInData) {
        // We got real data from LinkedIn HTML — send it to Perplexity for enrichment
        const extractRaw = await perplexity(
          `You are a professional research assistant. I've extracted profile data from a LinkedIn page. Use this data plus your own research to provide complete information.
Respond ONLY with valid JSON, no markdown wrapping:
{
  "name": "Full Name",
  "title": "Current Title/Role",
  "organization": "Current Organization Name",
  "location": "City, State or best guess",
  "background_summary": "2-3 sentence career summary"
}
If you cannot determine a field, use null.`,
          `LinkedIn URL: ${url}
Extracted from page:
- Name: ${linkedInData!.name}
- Title/Headline: ${linkedInData!.title}
- Location: ${linkedInData!.location || "unknown"}
- Summary: ${linkedInData!.summary || "none"}

Additional page text:
${pageText.slice(0, 3000)}`
        )

        try {
          person = parseJSON(extractRaw)
          // Prefer LinkedIn-extracted data for name (more accurate than Perplexity guess)
          if (linkedInData!.name && (!person.name || person.name === "null")) {
            person.name = linkedInData!.name
          }
        } catch {
          // Fall through to use raw LinkedIn data directly
          person = {
            name: linkedInData!.name,
            title: linkedInData!.title,
            organization: null,
            location: linkedInData!.location,
            background_summary: linkedInData!.summary,
          }
        }
      } else {
        // No usable data from LinkedIn HTML — Perplexity researches from scratch
        const contextHint = pageText
          ? `\n\nI also fetched some page text (may be partial):\n${pageText.slice(0, 2000)}`
          : ""

        const extractRaw = await perplexity(
          `You are a professional research assistant. Look up this LinkedIn profile and extract the person's information.
The LinkedIn URL slug suggests the person's name may be: "${slugName || "unknown"}".
Use ANY available data — LinkedIn, Google, hospital directories, news articles, press releases — to identify this person.
Search for them specifically as a healthcare professional.
Respond ONLY with valid JSON, no markdown wrapping:
{
  "name": "Full Name",
  "title": "Current Title/Role",
  "organization": "Current Organization Name",
  "location": "City, State or best guess",
  "background_summary": "2-3 sentence career summary",
  "profile_image_url": "Direct URL to their profile photo if available, or null"
}
If you cannot determine a field, use null. You MUST provide a name — at minimum, derive it from the URL slug.`,
          `Research this LinkedIn profile: ${url}${contextHint}`
        )

        try {
          person = parseJSON(extractRaw)
          if (person.profile_image_url && !profileImageUrl) {
            profileImageUrl = person.profile_image_url
          }
          if (!person.name && slugName) {
            person.name = slugName
          }
        } catch {
          return NextResponse.json(
            { error: "Could not extract profile data from LinkedIn. The profile may be private." },
            { status: 422 }
          )
        }
      }
    } else {
      // --- Non-LinkedIn path: direct fetch + extract ---
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
      })

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL (${response.status}). The profile may require login.` },
          { status: 422 }
        )
      }

      const html = await response.text()
      profileImageUrl = extractMetaImage(html)

      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 6000)

      const extractRaw = await perplexity(
        `Extract contact information from a web page. Respond ONLY with valid JSON, no markdown wrapping:
{
  "name": "Full Name",
  "title": "Current Title/Role",
  "organization": "Current Organization Name",
  "location": "City, State or best guess",
  "background_summary": "2-3 sentence career summary from what's visible"
}
If you cannot determine a field, use null.`,
        `URL: ${url}\n\nPage content:\n${textContent}`
      )

      try {
        person = parseJSON(extractRaw)
      } catch {
        return NextResponse.json(
          { error: "Could not extract profile data. The page may not have enough public information." },
          { status: 422 }
        )
      }
    }

    if (!person.name) {
      return NextResponse.json(
        { error: "Could not determine name from this page. Try a different URL." },
        { status: 422 }
      )
    }

    // --- Step 3: Perplexity researches the hospital/org ---
    let hospitalData = null
    if (person.organization) {
      try {
        const hospitalRaw = await perplexity(
          "You are a hospital and health system research analyst. Provide factual, specific data. Respond ONLY with valid JSON, no markdown wrapping.",
          `Research "${person.organization}" where "${person.name}" works as "${person.title || "executive"}".

I need:
1. Hospital/health system details: total licensed beds, number of facilities, parent system (e.g. Tenet, HCA, CommonSpirit), key services
2. Location: city, state, region served
3. Recent expansion plans, mergers, acquisitions
4. Whether this organization deals with biologics, specialty pharmacy, prior authorizations, or revenue cycle

IMPORTANT: Keep values SHORT. These go into compact UI cards.

Respond as JSON:
{
  "hospital_beds": "SHORT bed count only (e.g. '~238 beds', '450+ beds', '16 hospitals'). Max 30 chars.",
  "hospital_system": "Parent system name only (e.g. 'Tenet Healthcare', 'HCA', 'Independent')",
  "hospital_location": "City, State ONLY (e.g. 'Dallas, TX', 'Tucson, AZ'). No extra detail.",
  "hospital_details": "2-3 sentence description of the hospital/system, including expansion or notable services",
  "deals_with_biologics_or_pa": true or false,
  "notable_info": "Any other relevant details for a B2B healthcare sales team"
}`
        )
        hospitalData = parseJSON(hospitalRaw)
      } catch {
        // Non-fatal
      }
    }

    // --- Step 4: Perplexity does fit assessment ---
    let assessment
    try {
      const assessRaw = await perplexity(
        `You are an enterprise sales analyst for Luma, a HIPAA-compliant AI platform for medical necessity documentation and biologics prior authorizations.

Assess this person's fit for Luma's enterprise pipeline.

ICP:
- Hospital/health system decision-makers: CEO, COO, CNO, CMO, CFO, CIO
- VP/Director of Revenue Cycle, Prior Authorization, Utilization Management, Care Management
- System-level executives at hospital networks
- Clinical champions: NPs, PAs, pharmacists involved in biologics/specialty therapies
- United States

SCORING:
- "strong_fit" = Title AND organization clearly match ICP
- "possible_fit" = Some alignment but not direct
- "not_a_fit" = Doesn't match

STRATEGY TYPES:
- "founding_partner" = Small/mid hospital, simple decision-making, good for first pilot
- "flagship" = Large hospital, lead site in a market
- "expansion" = Opens a new health system where we can build credibility
- "corporate_bundle" = System exec who can sponsor multi-site rollout
- "design_partner" = Clinical champion, not a buyer but validates workflows

PRICING GUIDELINES (per hospital):
- Small (<150 beds): $8k-12k/mo, $20k-30k implementation
- Mid (150-300 beds): $12k-15k/mo, $30k-40k implementation
- Large (300+ beds): $15k-20k/mo, $40k-60k implementation
- Multi-site bundle: 20-30% volume discount

Respond ONLY with valid JSON:
{
  "fit_score": "strong_fit" | "possible_fit" | "not_a_fit",
  "fit_reasoning": "2-3 sentences",
  "suggested_strategy_type": "founding_partner" | "flagship" | "expansion" | "corporate_bundle" | "design_partner" | null,
  "why_they_matter": "2-3 bullet points on strategic value, or null",
  "suggested_target_offer": "Positioning and price guidance, or null",
  "monthly_price_low": number or null (WHOLE DOLLARS, e.g. 15000 not 15),
  "monthly_price_high": number or null (WHOLE DOLLARS, e.g. 20000 not 20),
  "implementation_low": number or null (WHOLE DOLLARS, e.g. 40000 not 40),
  "implementation_high": number or null (WHOLE DOLLARS, e.g. 60000 not 60)
}`,
        `Person: ${person.name}
Title: ${person.title || "Unknown"}
Organization: ${person.organization || "Unknown"}
Location: ${person.location || hospitalData?.hospital_location || "Unknown"}
Background: ${person.background_summary || "Unknown"}

Hospital research:
${hospitalData ? JSON.stringify(hospitalData, null, 2) : "No hospital data available"}`
      )
      assessment = parseJSON(assessRaw)
    } catch {
      assessment = { fit_score: "possible_fit", fit_reasoning: "Could not complete full assessment." }
    }

    return NextResponse.json({
      profile: {
        name: person.name,
        title: person.title,
        organization: person.organization,
        location: person.location || hospitalData?.hospital_location || null,
        background: person.background_summary,
        profile_image_url: profileImageUrl,
        hospital_beds: hospitalData?.hospital_beds || null,
        hospital_system: hospitalData?.hospital_system || null,
        hospital_location: hospitalData?.hospital_location || person.location || null,
        hospital_details: hospitalData?.hospital_details || null,
        fit_score: assessment.fit_score,
        fit_reasoning: assessment.fit_reasoning,
        strategy_type: assessment.suggested_strategy_type || null,
        why_they_matter: assessment.why_they_matter || null,
        target_offer: assessment.suggested_target_offer || null,
        monthly_price_low: assessment.monthly_price_low || null,
        monthly_price_high: assessment.monthly_price_high || null,
        implementation_low: assessment.implementation_low || null,
        implementation_high: assessment.implementation_high || null,
        notable_info: hospitalData?.notable_info || null,
        deals_with_biologics_or_pa: hospitalData?.deals_with_biologics_or_pa ?? null,
      },
    })
  } catch (error) {
    console.error("Research contact error:", error)
    return NextResponse.json(
      { error: "Failed to research contact. Please try again." },
      { status: 500 }
    )
  }
}
