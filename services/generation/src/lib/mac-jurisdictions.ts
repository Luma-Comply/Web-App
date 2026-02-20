/**
 * Medicare Administrative Contractor (MAC) Jurisdictions
 * and WISeR Pilot Program Information for CTP/Skin Substitutes
 *
 * IMPORTANT UPDATE (December 24, 2025):
 * CMS WITHDREW the new skin substitute LCDs that were scheduled for January 1, 2026.
 * Existing LCDs remain in place. WISeR prior authorization only applies in states
 * with an ACTIVE skin substitute LCD.
 *
 * As of January 2026, the WISeR (Wasteful and Inappropriate Service Reduction)
 * model for SKIN SUBSTITUTES is active in only 4 states:
 * - Texas, Oklahoma (Novitas JH)
 * - New Jersey (Novitas JL)
 * - Ohio (CGS J15)
 *
 * Arizona and Washington are in the WISeR pilot but NOT for skin substitutes
 * because Noridian does not have an active skin substitute LCD.
 */

export interface MACInfo {
  jurisdiction: string
  macName: string
  lcdPolicyNumber: string | null // null = no active LCD
  isWiserPilot: boolean
  isWiserActiveForSkinSubs: boolean // Whether WISeR applies to skin substitutes
  aiVendor?: string
  priorAuthRequired: boolean
  hasActiveLCD: boolean
  notes?: string
}

// WISeR Pilot States with AI Prior Authorization for Skin Substitutes
// Only 4 states have ACTIVE WISeR for skin substitutes (those with active LCDs)
export const WISER_PILOT_STATES: Record<string, MACInfo> = {
  TX: {
    jurisdiction: "JH",
    macName: "Novitas Solutions",
    lcdPolicyNumber: "L35041",
    isWiserPilot: true,
    isWiserActiveForSkinSubs: true,
    aiVendor: "Cohere Health, Inc.",
    priorAuthRequired: true,
    hasActiveLCD: true,
  },
  OK: {
    jurisdiction: "JH",
    macName: "Novitas Solutions",
    lcdPolicyNumber: "L35041",
    isWiserPilot: true,
    isWiserActiveForSkinSubs: true,
    aiVendor: "Humata Health, Inc.",
    priorAuthRequired: true,
    hasActiveLCD: true,
  },
  NJ: {
    jurisdiction: "JL",
    macName: "Novitas Solutions",
    lcdPolicyNumber: "L35041",
    isWiserPilot: true,
    isWiserActiveForSkinSubs: true,
    aiVendor: "Genzeon Corporation",
    priorAuthRequired: true,
    hasActiveLCD: true,
  },
  OH: {
    jurisdiction: "J15",
    macName: "CGS Administrators",
    lcdPolicyNumber: "L35125",
    isWiserPilot: true,
    isWiserActiveForSkinSubs: true,
    aiVendor: "Innovaccer Inc.",
    priorAuthRequired: true,
    hasActiveLCD: true,
  },
  // AZ and WA are in WISeR pilot - confirmed active for skin substitutes as of Jan 2026
  AZ: {
    jurisdiction: "JF",
    macName: "Noridian Healthcare Solutions",
    lcdPolicyNumber: "L36690",
    isWiserPilot: true,
    isWiserActiveForSkinSubs: true,
    aiVendor: "Zyter Inc.",
    priorAuthRequired: true,
    hasActiveLCD: true,
    notes: "WISeR pilot active - verify Noridian LCD requirements may differ from Novitas",
  },
  WA: {
    jurisdiction: "JF",
    macName: "Noridian Healthcare Solutions",
    lcdPolicyNumber: "L36690",
    isWiserPilot: true,
    isWiserActiveForSkinSubs: true,
    aiVendor: "Virtix Health LLC",
    priorAuthRequired: true,
    hasActiveLCD: true,
    notes: "WISeR pilot active - verify Noridian LCD requirements may differ from Novitas",
  },
}

// Helper to create non-WISeR state entries
function createMACInfo(
  jurisdiction: string,
  macName: string,
  lcdPolicyNumber: string | null,
  hasActiveLCD: boolean = true
): MACInfo {
  return {
    jurisdiction,
    macName,
    lcdPolicyNumber,
    isWiserPilot: false,
    isWiserActiveForSkinSubs: false,
    priorAuthRequired: false,
    hasActiveLCD,
  }
}

// MACs with ACTIVE skin substitute LCDs (as of Jan 2026):
// - Novitas Solutions (L35041) - ACTIVE
// - CGS Administrators (L35125) - ACTIVE
// - First Coast Service Options (L35119) - ACTIVE
//
// MACs WITHOUT active skin substitute LCDs:
// - Noridian Healthcare Solutions - NO LCD (withdrawn)
// - National Government Services - NO LCD
// - WPS Government Health Administrators - NO LCD
// - Palmetto GBA - NO LCD

// All states mapped to their MAC jurisdiction
export const STATE_TO_MAC: Record<string, MACInfo> = {
  // Jurisdiction JH - Novitas Solutions (ACTIVE LCD L35041) - includes WISeR pilots TX, OK
  TX: WISER_PILOT_STATES.TX,
  OK: WISER_PILOT_STATES.OK,
  NM: createMACInfo("JH", "Novitas Solutions", "L35041", true),
  CO: createMACInfo("JH", "Novitas Solutions", "L35041", true),
  AR: createMACInfo("JH", "Novitas Solutions", "L35041", true),
  LA: createMACInfo("JH", "Novitas Solutions", "L35041", true),
  MS: createMACInfo("JH", "Novitas Solutions", "L35041", true),

  // Jurisdiction JL - Novitas Solutions (ACTIVE LCD L35041) - includes WISeR pilot NJ
  NJ: WISER_PILOT_STATES.NJ,
  PA: createMACInfo("JL", "Novitas Solutions", "L35041", true),
  DE: createMACInfo("JL", "Novitas Solutions", "L35041", true),
  MD: createMACInfo("JL", "Novitas Solutions", "L35041", true),
  DC: createMACInfo("JL", "Novitas Solutions", "L35041", true),

  // Jurisdiction J15 - CGS Administrators (ACTIVE LCD L35125) - includes WISeR pilot OH
  OH: WISER_PILOT_STATES.OH,
  KY: createMACInfo("J15", "CGS Administrators", "L35125", true),

  // Jurisdiction JN - First Coast Service Options (ACTIVE LCD L35119)
  FL: createMACInfo("JN", "First Coast Service Options", "L35119", true),
  PR: createMACInfo("JN", "First Coast Service Options", "L35119", true),
  VI: createMACInfo("JN", "First Coast Service Options", "L35119", true),

  // Jurisdiction JF - Noridian Healthcare Solutions (NO ACTIVE LCD) - includes WISeR pilots AZ, WA
  AZ: WISER_PILOT_STATES.AZ,
  WA: WISER_PILOT_STATES.WA,
  OR: createMACInfo("JF", "Noridian Healthcare Solutions", null, false),
  ID: createMACInfo("JF", "Noridian Healthcare Solutions", null, false),
  MT: createMACInfo("JF", "Noridian Healthcare Solutions", null, false),
  WY: createMACInfo("JF", "Noridian Healthcare Solutions", null, false),
  ND: createMACInfo("JF", "Noridian Healthcare Solutions", null, false),
  SD: createMACInfo("JF", "Noridian Healthcare Solutions", null, false),
  UT: createMACInfo("JF", "Noridian Healthcare Solutions", null, false),
  AK: createMACInfo("JF", "Noridian Healthcare Solutions", null, false),

  // Jurisdiction JE - Noridian Healthcare Solutions (NO ACTIVE LCD)
  CA: createMACInfo("JE", "Noridian Healthcare Solutions", null, false),
  NV: createMACInfo("JE", "Noridian Healthcare Solutions", null, false),
  HI: createMACInfo("JE", "Noridian Healthcare Solutions", null, false),
  GU: createMACInfo("JE", "Noridian Healthcare Solutions", null, false),
  AS: createMACInfo("JE", "Noridian Healthcare Solutions", null, false),

  // Jurisdiction J6 - NGS (NO ACTIVE LCD)
  IL: createMACInfo("J6", "National Government Services", null, false),
  MN: createMACInfo("J6", "National Government Services", null, false),
  WI: createMACInfo("J6", "National Government Services", null, false),

  // Jurisdiction J8 - WPS (NO ACTIVE LCD)
  IN: createMACInfo("J8", "WPS Government Health Administrators", null, false),
  MI: createMACInfo("J8", "WPS Government Health Administrators", null, false),

  // Jurisdiction JM - Palmetto GBA (NO ACTIVE LCD)
  NC: createMACInfo("JM", "Palmetto GBA", null, false),
  SC: createMACInfo("JM", "Palmetto GBA", null, false),
  VA: createMACInfo("JM", "Palmetto GBA", null, false),
  WV: createMACInfo("JM", "Palmetto GBA", null, false),

  // Jurisdiction JJ - Palmetto GBA (NO ACTIVE LCD)
  AL: createMACInfo("JJ", "Palmetto GBA", null, false),
  GA: createMACInfo("JJ", "Palmetto GBA", null, false),
  TN: createMACInfo("JJ", "Palmetto GBA", null, false),

  // Jurisdiction JK - NGS (NO ACTIVE LCD)
  CT: createMACInfo("JK", "National Government Services", null, false),
  NY: createMACInfo("JK", "National Government Services", null, false),
  MA: createMACInfo("JK", "National Government Services", null, false),
  ME: createMACInfo("JK", "National Government Services", null, false),
  NH: createMACInfo("JK", "National Government Services", null, false),
  RI: createMACInfo("JK", "National Government Services", null, false),
  VT: createMACInfo("JK", "National Government Services", null, false),

  // Jurisdiction J5 - WPS (NO ACTIVE LCD)
  IA: createMACInfo("J5", "WPS Government Health Administrators", null, false),
  KS: createMACInfo("J5", "WPS Government Health Administrators", null, false),
  MO: createMACInfo("J5", "WPS Government Health Administrators", null, false),
  NE: createMACInfo("J5", "WPS Government Health Administrators", null, false),
}

/**
 * Get MAC information for a state
 */
export function getMACInfo(stateCode: string): MACInfo | null {
  const upperState = stateCode?.toUpperCase()?.trim()
  return STATE_TO_MAC[upperState] || null
}

/**
 * Check if state is in WISeR pilot program (any service)
 */
export function isWiserPilotState(stateCode: string): boolean {
  const macInfo = getMACInfo(stateCode)
  return macInfo?.isWiserPilot ?? false
}

/**
 * Check if state has ACTIVE WISeR for skin substitutes specifically
 * Only TX, OK, NJ, OH have active WISeR for skin substitutes
 */
export function isWiserActiveForSkinSubs(stateCode: string): boolean {
  const macInfo = getMACInfo(stateCode)
  return macInfo?.isWiserActiveForSkinSubs ?? false
}

/**
 * Check if state has an active skin substitute LCD
 */
export function hasActiveSkinSubLCD(stateCode: string): boolean {
  const macInfo = getMACInfo(stateCode)
  return macInfo?.hasActiveLCD ?? false
}

/**
 * Get all WISeR pilot states (all 6)
 */
export function getWiserPilotStates(): string[] {
  return Object.keys(WISER_PILOT_STATES)
}

/**
 * Get states with ACTIVE WISeR for skin substitutes (only 4)
 */
export function getActiveWiserSkinSubStates(): string[] {
  return Object.entries(WISER_PILOT_STATES)
    .filter(([, info]) => info.isWiserActiveForSkinSubs)
    .map(([state]) => state)
}

/**
 * Get states with active skin substitute LCDs
 */
export function getStatesWithActiveLCD(): string[] {
  return Object.entries(STATE_TO_MAC)
    .filter(([, info]) => info.hasActiveLCD)
    .map(([state]) => state)
}

/**
 * Build state-specific context for Perplexity research
 */
export function buildStateSpecificContext(stateCode: string): string {
  const macInfo = getMACInfo(stateCode)

  if (!macInfo) {
    return `State ${stateCode} - MAC jurisdiction information not found. Research general Medicare LCD requirements.`
  }

  let context = `STATE-SPECIFIC MAC INFORMATION:
- State: ${stateCode}
- MAC Jurisdiction: ${macInfo.jurisdiction}
- MAC Name: ${macInfo.macName}
- Has Active Skin Substitute LCD: ${macInfo.hasActiveLCD ? "YES" : "NO"}
- LCD Policy Number: ${macInfo.lcdPolicyNumber || "None - coverage based on reasonable/necessary"}
- Prior Authorization Required: ${macInfo.priorAuthRequired ? "YES" : "NO"}`

  if (macInfo.isWiserActiveForSkinSubs) {
    context += `

WISER PILOT PROGRAM - SKIN SUBSTITUTES (CRITICAL):
This state has ACTIVE WISeR prior authorization for skin substitutes.
- AI Vendor Processing PA: ${macInfo.aiVendor}
- Prior Authorization is MANDATORY for skin substitute/CTP claims
- If PA not obtained via AI tool, claim is flagged for 100% Pre-payment Review
- Gold Carding: Providers with 94%+ affirmation rate may be exempt mid-2026`
  } else if (macInfo.isWiserPilot) {
    context += `

NOTE: This state is in the WISeR pilot program but skin substitutes are NOT included
because ${macInfo.macName} does not have an active skin substitute LCD.`
  }

  if (!macInfo.hasActiveLCD) {
    context += `

IMPORTANT: ${macInfo.macName} does not have an active skin substitute LCD.
Coverage is determined on a case-by-case "reasonable and necessary" basis.
Documentation should still follow best practices for medical necessity.`
  }

  if (macInfo.notes) {
    context += `
- Special Notes: ${macInfo.notes}`
  }

  return context
}

/**
 * Policy Change Alert Interface
 */
export interface PolicyChangeAlert {
  type: "NEW_WISER_STATE" | "REMOVED_WISER_STATE" | "LCD_CHANGE" | "NEW_LCD" | "REMOVED_LCD" | "AI_VENDOR_CHANGE" | "UNKNOWN_CHANGE"
  severity: "HIGH" | "MEDIUM" | "LOW"
  message: string
  detectedState?: string
  details?: string
}

/**
 * Data version tracking
 */
export const MAC_DATA_VERSION = {
  lastUpdated: "2026-01-29",
  wiserPilotStates: ["TX", "OK", "NJ", "OH", "AZ", "WA"], // All 6 states with ACTIVE WISeR for skin subs
  wiserPilotOnlyStates: [] as string[], // None - all 6 states are active for skin subs
  activeLCDMACs: ["Novitas Solutions", "CGS Administrators", "First Coast Service Options", "Noridian Healthcare Solutions"],
}

/**
 * Detect potential policy changes from Perplexity research context
 * This parses the research response and flags any discrepancies with our stored data
 */
export function detectPolicyChanges(
  perplexityContext: string,
  patientState: string
): PolicyChangeAlert[] {
  const alerts: PolicyChangeAlert[] = []
  const lowerContext = perplexityContext.toLowerCase()
  const macInfo = getMACInfo(patientState)

  // Check for new WISeR states mentioned
  const stateAbbreviations = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
  ]

  // Pattern to detect WISeR pilot state mentions
  const wiserPatterns = [
    /wiser.*pilot.*(?:states?|includes?)\s*[:\-]?\s*([A-Z, ]+)/gi,
    /prior\s+auth(?:orization)?.*(?:states?|required\s+in)\s*[:\-]?\s*([A-Z, ]+)/gi,
    /(\w+)\s+(?:is|was|has been)\s+added\s+to\s+(?:the\s+)?wiser/gi,
    /(\w+)\s+(?:is|was)\s+removed\s+from\s+(?:the\s+)?wiser/gi,
  ]

  // Check for new states added to WISeR
  for (const pattern of wiserPatterns) {
    const matches = perplexityContext.matchAll(pattern)
    for (const match of matches) {
      const mentionedStates = match[1]?.toUpperCase().split(/[,\s]+/).filter(s =>
        stateAbbreviations.includes(s) && s.length === 2
      ) || []

      for (const state of mentionedStates) {
        if (!MAC_DATA_VERSION.wiserPilotStates.includes(state) &&
            !MAC_DATA_VERSION.wiserPilotOnlyStates.includes(state)) {
          alerts.push({
            type: "NEW_WISER_STATE",
            severity: "HIGH",
            message: `Potential new WISeR state detected: ${state}`,
            detectedState: state,
            details: `Research mentions ${state} in WISeR context but it's not in our current data.`,
          })
        }
      }
    }
  }

  // Check for LCD changes
  if (lowerContext.includes("new lcd") || lowerContext.includes("lcd updated") ||
      lowerContext.includes("lcd effective") || lowerContext.includes("lcd changed")) {

    // Check if there's a date that doesn't match our known dates
    const datePatterns = [
      /lcd.*effective.*?(\w+\s+\d{1,2},?\s+\d{4})/gi,
      /effective\s+(?:date\s+)?(?:of\s+)?(\w+\s+\d{1,2},?\s+\d{4})/gi,
    ]

    for (const pattern of datePatterns) {
      const matches = perplexityContext.matchAll(pattern)
      for (const match of matches) {
        const date = match[1]
        if (date && !date.toLowerCase().includes("april 2025") &&
            !date.toLowerCase().includes("january 2026")) {
          alerts.push({
            type: "LCD_CHANGE",
            severity: "MEDIUM",
            message: `Potential LCD date change detected: ${date}`,
            details: `Research mentions LCD effective date "${date}" which may differ from our records.`,
          })
        }
      }
    }
  }

  // Note: AZ and WA are now confirmed active for skin substitutes as of Jan 2026
  // No need to check for them gaining LCD coverage

  // Check for mentions of states being removed
  if (lowerContext.includes("removed") || lowerContext.includes("withdrawn") ||
      lowerContext.includes("no longer")) {
    for (const state of MAC_DATA_VERSION.wiserPilotStates) {
      const statePattern = new RegExp(`${state}.*(?:removed|withdrawn|no longer)`, "i")
      if (statePattern.test(perplexityContext)) {
        alerts.push({
          type: "REMOVED_WISER_STATE",
          severity: "HIGH",
          message: `${state} may have been removed from WISeR pilot`,
          detectedState: state,
          details: `Research suggests ${state} may no longer be in the WISeR pilot program.`,
        })
      }
    }
  }

  // Check for AI vendor changes - look for specific company name patterns
  const knownVendors = ["cohere health", "humata health", "genzeon", "innovaccer", "zyter", "virtix"]

  // More specific pattern: Look for company names (capitalized words followed by Inc/LLC/Corp/Health)
  // This avoids matching generic phrases
  const vendorMentionPattern = /(?:ai\s+vendor|processed\s+by|partnered?\s+with)\s*[:\-]?\s*\*?\*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|LLC|Corp|Health|Corporation|Technologies))?\.?)\*?\*?/g
  const vendorMatches = perplexityContext.matchAll(vendorMentionPattern)
  for (const match of vendorMatches) {
    const vendor = match[1]?.trim()
    // Validate: must be at least 2 chars, start with capital, not be generic words
    const genericWords = ["information", "the", "for", "and", "that", "which", "named", "processing", "prior", "authorizations"]
    const vendorLower = vendor?.toLowerCase() || ""

    if (vendor &&
        vendor.length >= 4 &&
        /^[A-Z]/.test(vendor) &&
        !genericWords.some(gw => vendorLower.startsWith(gw)) &&
        !knownVendors.some(kv => vendorLower.includes(kv))) {
      alerts.push({
        type: "AI_VENDOR_CHANGE",
        severity: "MEDIUM",
        message: `Potential new AI vendor detected: ${vendor}`,
        details: `Research mentions "${vendor}" as an AI vendor which isn't in our current data.`,
      })
    }
  }

  // Generic check for significant policy mentions we might have missed
  const significantTerms = [
    "effective immediately", "new requirement", "policy change", "updated guidance",
    "cms announced", "mac announced", "novitas announced", "cgs announced"
  ]

  for (const term of significantTerms) {
    if (lowerContext.includes(term) && alerts.length === 0) {
      alerts.push({
        type: "UNKNOWN_CHANGE",
        severity: "LOW",
        message: `Research contains potential policy update language: "${term}"`,
        details: `Consider reviewing the full research context for policy changes.`,
      })
      break // Only add one generic alert
    }
  }

  return alerts
}

/**
 * Format alerts for display in UI
 */
export function formatPolicyAlerts(alerts: PolicyChangeAlert[]): string {
  if (alerts.length === 0) return ""

  const highAlerts = alerts.filter(a => a.severity === "HIGH")
  const mediumAlerts = alerts.filter(a => a.severity === "MEDIUM")

  let message = ""

  if (highAlerts.length > 0) {
    message += "⚠️ POLICY UPDATE DETECTED:\n"
    highAlerts.forEach(a => {
      message += `• ${a.message}\n`
    })
  }

  if (mediumAlerts.length > 0) {
    message += "\n📋 Potential policy changes:\n"
    mediumAlerts.forEach(a => {
      message += `• ${a.message}\n`
    })
  }

  return message
}
