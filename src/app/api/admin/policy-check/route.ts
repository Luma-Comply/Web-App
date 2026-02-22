import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  MAC_DATA_VERSION,
  getActiveWiserSkinSubStates,
  getStatesWithActiveLCD,
  detectPolicyChanges,
  PolicyChangeAlert,
  getMACInfo,
} from "@/lib/mac-jurisdictions"

export interface PolicyCheckResult {
  timestamp: string
  dataVersion: typeof MAC_DATA_VERSION
  currentWiserStates: string[]
  statesWithActiveLCD: string[]
  perplexityFindings: {
    state: string
    research: string
    alerts: PolicyChangeAlert[]
  }[]
  summary: {
    totalAlerts: number
    highSeverity: number
    mediumSeverity: number
    lowSeverity: number
    statesChecked: number
  }
  allAlerts: PolicyChangeAlert[]
}

export async function POST(_request: NextRequest) {
  try {
    // Verify user is authenticated (basic protection)
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pp_apiKey = process.env.PERPLEXITY_API_KEY
    if (!pp_apiKey) {
      return NextResponse.json({ error: "Perplexity API key not configured" }, { status: 500 })
    }

    const results: PolicyCheckResult = {
      timestamp: new Date().toISOString(),
      dataVersion: MAC_DATA_VERSION,
      currentWiserStates: getActiveWiserSkinSubStates(),
      statesWithActiveLCD: getStatesWithActiveLCD(),
      perplexityFindings: [],
      summary: {
        totalAlerts: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        statesChecked: 0,
      },
      allAlerts: [],
    }

    // States to check - focus on WISeR pilot states + key MACs
    const statesToCheck = [
      "TX", "OK", "NJ", "OH", // Active WISeR for skin subs
      "AZ", "WA", // WISeR pilot but not for skin subs (check if this changed)
      "FL", // First Coast (has active LCD)
      "CA", // Noridian (no LCD - check if this changed)
      "NY", // NGS (no LCD - check if this changed)
    ]

    // Research query for policy updates
    const researchQuery = `Research current 2026 Medicare skin substitute/CTP (Cellular Tissue Products) policy status:

CRITICAL QUESTIONS:
1. Which states are currently in the WISeR pilot program for skin substitutes as of ${new Date().toLocaleDateString()}?
2. Has the WISeR pilot expanded to any new states since January 2026?
3. Have any states been removed from the WISeR skin substitute pilot?
4. Which MACs currently have ACTIVE skin substitute LCDs?
5. Has Noridian Healthcare Solutions implemented a skin substitute LCD?
6. Has National Government Services (NGS) implemented a skin substitute LCD?
7. Any recent CMS announcements about skin substitute coverage changes?
8. Any changes to the AI vendors processing prior authorizations (Cohere Health, Humata Health, Genzeon, Innovaccer)?

Current known WISeR states for skin substitutes: Texas, Oklahoma, New Jersey, Ohio
Current MACs with active LCDs: Novitas Solutions, CGS Administrators, First Coast Service Options

Report any discrepancies or changes from this baseline.`

    const systemPrompt = `You are a Medicare policy researcher. Search for the most current information about skin substitute/CTP coverage policies, WISeR pilot program status, and LCD changes. Be specific about which states are included/excluded and any recent policy changes. Include dates when policies changed.`

    try {
      const researchResponse = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${pp_apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: researchQuery },
          ],
          temperature: 0.1,
        }),
      })

      if (researchResponse.ok) {
        const researchData = await researchResponse.json()
        const generalResearch = researchData.choices[0]?.message?.content || ""

        // Detect policy changes from general research
        for (const state of statesToCheck) {
          const alerts = detectPolicyChanges(generalResearch, state)
          results.perplexityFindings.push({
            state,
            research: generalResearch,
            alerts,
          })
          results.allAlerts.push(...alerts)
        }
      }
    } catch (error) {
      console.error("Perplexity research failed:", error)
    }

    // Now do state-specific checks for the WISeR states
    for (const state of ["TX", "OK", "NJ", "OH", "AZ", "WA"]) {
      const macInfo = getMACInfo(state)
      const stateQuery = `Research current Medicare skin substitute prior authorization requirements for ${state} (${macInfo?.macName}) as of ${new Date().toLocaleDateString()}:

1. Is ${state} currently in the WISeR pilot for skin substitutes?
2. Which AI vendor processes prior authorizations for ${state}?
3. Is prior authorization required for skin substitutes in ${state}?
4. What LCD policy number applies to ${state} for skin substitutes?
5. Any recent changes to ${state}'s skin substitute coverage policy?`

      try {
        const stateResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${pp_apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar-pro",
            messages: [
              { role: "system", content: `You are a Medicare policy researcher focused on ${state} state-specific coverage requirements.` },
              { role: "user", content: stateQuery },
            ],
            temperature: 0.1,
          }),
        })

        if (stateResponse.ok) {
          const stateData = await stateResponse.json()
          const stateResearch = stateData.choices[0]?.message?.content || ""

          const alerts = detectPolicyChanges(stateResearch, state)

          // Check if existing finding for this state, if so append alerts
          const existingFinding = results.perplexityFindings.find(f => f.state === state)
          if (existingFinding) {
            existingFinding.research += "\n\n--- State-Specific Research ---\n" + stateResearch
            existingFinding.alerts.push(...alerts)
          } else {
            results.perplexityFindings.push({
              state,
              research: stateResearch,
              alerts,
            })
          }
          results.allAlerts.push(...alerts)
        }

        results.summary.statesChecked++

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`State research failed for ${state}:`, error)
      }
    }

    // Deduplicate alerts
    const uniqueAlerts = results.allAlerts.reduce((acc, alert) => {
      const key = `${alert.type}-${alert.message}`
      if (!acc.find(a => `${a.type}-${a.message}` === key)) {
        acc.push(alert)
      }
      return acc
    }, [] as PolicyChangeAlert[])

    results.allAlerts = uniqueAlerts

    // Calculate summary
    results.summary.totalAlerts = uniqueAlerts.length
    results.summary.highSeverity = uniqueAlerts.filter(a => a.severity === "HIGH").length
    results.summary.mediumSeverity = uniqueAlerts.filter(a => a.severity === "MEDIUM").length
    results.summary.lowSeverity = uniqueAlerts.filter(a => a.severity === "LOW").length

    return NextResponse.json(results)
  } catch (error) {
    console.error("Policy check failed:", error)
    return NextResponse.json(
      { error: "Policy check failed" },
      { status: 500 }
    )
  }
}
