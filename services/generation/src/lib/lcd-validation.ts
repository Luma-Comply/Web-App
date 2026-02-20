/**
 * LCD L35041 Validation for CTP/Skin Substitutes
 * Validates clinical notes against Medicare LCD requirements
 * Returns audit risk assessment and actionable recommendations
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  LCD_L35041_REQUIREMENTS,
  LCDRequirement,
  AuditRiskLevel,
  WoundType,
  getRequirementsForWoundType,
  AUDIT_RISK_LEVELS,
} from "./lcd-requirements"
import { isProductCovered, CTPSearchResult } from "./novitas-ctp-products"
import { detectPolicyChanges, PolicyChangeAlert, MAC_DATA_VERSION } from "./mac-jurisdictions"

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export type RequirementStatus =
  | "FOUND"
  | "MISSING"
  | "PARTIAL"
  | "NOT_APPLICABLE"
  | "VIOLATION" // For instant denial triggers

export interface ChecklistItem {
  id: string
  label: string
  status: RequirementStatus
  auditRisk?: AuditRiskLevel
  evidence?: string // Quote from notes if found
  suggestion?: string // Specific language to add if missing
  guidance?: string // Why this matters for audits
}

// Editable checklist types for user annotations
export interface ChecklistEdit {
  item_id: string
  user_notes: string
  marked_addressed: boolean
  addressed_at?: string
  updated_at: string
}

export interface ChecklistEditsData {
  version: number
  last_validation_run: string
  edits: Record<string, ChecklistEdit>
}

export interface ChecklistItemWithEdits extends ChecklistItem {
  userNotes?: string
  markedAddressed?: boolean
}

export interface ChecklistCategory {
  category: string
  description: string
  categoryRisk: AuditRiskLevel
  items: ChecklistItem[]
  foundCount: number
  missingCount: number
}

export interface PerplexityFindings {
  lcdEffectiveDate: string
  productCoverageStatus: "COVERED" | "NOT_COVERED" | "VERIFY_MANUALLY"
  applicationLimit: number
  kxModifierRequired: boolean
  recentLcdChanges: string[]
  currentAuditFocusAreas: string[]
  oigWorkPlanItems: string[]
  rawResearch?: string
}

export interface ValidationRecommendation {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  action: string
  reason: string
  suggestedLanguage?: string
}

export interface LCDValidationResult {
  // Audit Risk Assessment
  auditRisk: {
    overallScore: AuditRiskLevel
    instantDenialTriggers: string[]
    veryHighRiskItems: string[]
    highRiskItems: string[]
    estimatedDenialProbability: number // 0-100
  }

  // CTP Product Check
  ctpProductCheck: CTPSearchResult

  // Perplexity Research Findings
  perplexityFindings: PerplexityFindings

  // Detailed Checklist by Category
  checklist: ChecklistCategory[]

  // Actionable Recommendations (prioritized by audit risk)
  recommendations: ValidationRecommendation[]

  // Summary Stats
  summary: {
    totalRequirements: number
    foundCount: number
    missingCount: number
    partialCount: number
    violationCount: number
  }

  // Detected wound type (if auto-detected)
  detectedWoundType?: WoundType

  // Policy change alerts detected from research
  policyAlerts?: PolicyChangeAlert[]

  // Data version info
  dataVersion?: {
    lastUpdated: string
    wiserStates: string[]
  }
}

// ══════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ══════════════════════════════════════════════════════════════

/**
 * Validate clinical notes against LCD L35041 requirements
 * Uses GPT-4o to intelligently parse and match requirements
 */
export async function validateAgainstLCD(
  clinicalNotes: string,
  ctpProduct: string,
  perplexityContext: string,
  woundType?: WoundType, // Optional - will auto-detect if not provided
  patientState?: string // Optional - used for policy change detection
): Promise<LCDValidationResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

  // Step 0: Detect policy changes from Perplexity research
  const policyAlerts = patientState
    ? detectPolicyChanges(perplexityContext, patientState)
    : []

  // Step 1: Check CTP product coverage locally
  const ctpProductCheck = isProductCovered(ctpProduct)

  // Step 2: Auto-detect wound type if not provided
  const detectedWoundType = woundType || (await detectWoundType(genAI, clinicalNotes))

  // Step 3: Get requirements for this wound type
  const requirements = getRequirementsForWoundType(detectedWoundType)

  // Step 4: Parse Perplexity context for findings
  const perplexityFindings = parsePerplexityFindings(perplexityContext, ctpProduct)

  // Step 5: Validate clinical notes against each requirement using GPT-4o
  const validationPrompt = buildValidationPrompt(
    clinicalNotes,
    requirements,
    detectedWoundType,
    ctpProduct
  )

  const systemPrompt = `You are a Medicare LCD L35041 compliance expert analyzing wound care documentation for CTP/skin substitute prior authorizations.

Your task is to check if clinical notes contain required documentation elements. Be thorough but fair - if information is present in any form, mark it as FOUND. Only mark MISSING if the information is truly absent.

For each requirement, provide:
1. status: FOUND, MISSING, PARTIAL, NOT_APPLICABLE, or VIOLATION
2. evidence: Direct quote from notes if found (keep brief, max 100 chars)
3. suggestion: Specific language to add if missing

IMPORTANT: This is for Medicare Part B CTP claims. SOC failure documentation is CRITICAL - it's the #1 audit failure reason.

Return your response as valid JSON only.`

  const validationModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  })

  const completion = await validationModel.generateContent(validationPrompt)
  const responseText = completion.response.text() || "{}"

  const validationResponse = JSON.parse(responseText) as ValidationResponse

  // Step 6: Build checklist from validation response
  const checklist = buildChecklist(validationResponse, detectedWoundType)

  // Step 7: Calculate audit risk
  const auditRisk = calculateAuditRisk(checklist, ctpProductCheck)

  // Step 8: Generate recommendations
  const recommendations = generateRecommendations(
    checklist,
    ctpProductCheck,
    perplexityFindings
  )

  // Step 9: Calculate summary stats
  const summary = calculateSummary(checklist)

  return {
    auditRisk,
    ctpProductCheck,
    perplexityFindings,
    checklist,
    recommendations,
    summary,
    detectedWoundType,
    policyAlerts: policyAlerts.length > 0 ? policyAlerts : undefined,
    dataVersion: {
      lastUpdated: MAC_DATA_VERSION.lastUpdated,
      wiserStates: MAC_DATA_VERSION.wiserPilotStates,
    },
  }
}

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════

interface ValidationResponse {
  requirements: {
    [id: string]: {
      status: RequirementStatus
      evidence?: string
      suggestion?: string
    }
  }
}

/**
 * Auto-detect wound type from clinical notes
 */
async function detectWoundType(
  genAI: GoogleGenerativeAI,
  clinicalNotes: string
): Promise<WoundType> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Analyze the clinical notes and determine the wound type. Return ONLY one of: DFU, VLU, PRESSURE_ULCER

DFU = Diabetic Foot Ulcer (patient has diabetes, wound on foot)
VLU = Venous Leg Ulcer (venous insufficiency, typically lower leg)
PRESSURE_ULCER = Pressure injury/decubitus ulcer (from pressure/friction)

Return the single most likely wound type based on the notes.`,
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 20,
    }
  })

  const result = await model.generateContent(clinicalNotes.substring(0, 3000))
  const response = result.response.text()?.trim().toUpperCase() || "DFU"

  if (response.includes("VLU")) return "VLU"
  if (response.includes("PRESSURE")) return "PRESSURE_ULCER"
  return "DFU" // Default to DFU
}

/**
 * Build the validation prompt for GPT-4o
 */
function buildValidationPrompt(
  clinicalNotes: string,
  requirements: LCDRequirement[],
  woundType: WoundType,
  ctpProduct: string
): string {
  const requirementsList = requirements
    .map(
      (req) =>
        `- ${req.id}: ${req.label}${req.critical ? " (CRITICAL)" : ""}${
          req.guidance ? ` | Guidance: ${req.guidance}` : ""
        }`
    )
    .join("\n")

  return `CLINICAL NOTES:
"""
${clinicalNotes}
"""

WOUND TYPE: ${woundType}
CTP PRODUCT: ${ctpProduct}

REQUIREMENTS TO CHECK:
${requirementsList}

Analyze the clinical notes and return a JSON object with the following structure:
{
  "requirements": {
    "[requirement_id]": {
      "status": "FOUND" | "MISSING" | "PARTIAL" | "NOT_APPLICABLE" | "VIOLATION",
      "evidence": "brief quote from notes if found",
      "suggestion": "specific language to add if missing"
    }
  }
}

For instant denial triggers (infected_wound, ischemic_wound, necrotic_wound, combination_ctp):
- If the condition IS present in notes, mark as VIOLATION
- If the condition is NOT present or notes confirm the opposite (e.g., "no infection"), mark as FOUND

Be thorough - check the entire document for each requirement.`
}

/**
 * Build checklist from validation response
 */
function buildChecklist(
  response: ValidationResponse,
  woundType: WoundType
): ChecklistCategory[] {
  return LCD_L35041_REQUIREMENTS.map((category) => {
    const items: ChecklistItem[] = category.items
      .filter((req) => !req.woundType || req.woundType === woundType)
      .map((req) => {
        const validation = response.requirements?.[req.id]
        return {
          id: req.id,
          label: req.label,
          status: validation?.status || "MISSING",
          auditRisk: req.auditRisk,
          evidence: validation?.evidence,
          suggestion:
            validation?.suggestion ||
            (validation?.status === "MISSING" ? req.guidance : undefined),
          guidance: req.guidance,
        }
      })

    const foundCount = items.filter(
      (i) => i.status === "FOUND" || i.status === "NOT_APPLICABLE"
    ).length
    const missingCount = items.filter(
      (i) => i.status === "MISSING" || i.status === "VIOLATION"
    ).length

    // Calculate category risk based on worst item
    let categoryRisk: AuditRiskLevel = "LOW"
    for (const item of items) {
      if (
        (item.status === "MISSING" || item.status === "VIOLATION") &&
        item.auditRisk
      ) {
        const currentPriority = AUDIT_RISK_LEVELS[categoryRisk]?.priority || 5
        const itemPriority = AUDIT_RISK_LEVELS[item.auditRisk]?.priority || 5
        if (itemPriority < currentPriority) {
          categoryRisk = item.auditRisk
        }
      }
    }

    return {
      category: category.category,
      description: category.description,
      categoryRisk,
      items,
      foundCount,
      missingCount,
    }
  })
}

/**
 * Calculate overall audit risk
 */
function calculateAuditRisk(
  checklist: ChecklistCategory[],
  ctpProductCheck: CTPSearchResult
): LCDValidationResult["auditRisk"] {
  const allItems = checklist.flatMap((c) => c.items)

  const instantDenialTriggers: string[] = []
  const veryHighRiskItems: string[] = []
  const highRiskItems: string[] = []

  // Check CTP product coverage first
  if (!ctpProductCheck.covered && ctpProductCheck.confidence !== "partial") {
    instantDenialTriggers.push(
      `CTP product not found on Novitas covered list: Verify "${ctpProductCheck.product?.name || "product"}" is covered`
    )
  }

  // Check all items
  for (const item of allItems) {
    if (item.status === "VIOLATION") {
      instantDenialTriggers.push(item.label)
    } else if (item.status === "MISSING" || item.status === "PARTIAL") {
      if (item.auditRisk === "INSTANT_DENIAL") {
        instantDenialTriggers.push(item.label)
      } else if (item.auditRisk === "VERY_HIGH") {
        veryHighRiskItems.push(item.label)
      } else if (item.auditRisk === "HIGH") {
        highRiskItems.push(item.label)
      }
    }
  }

  // Calculate overall score
  let overallScore: AuditRiskLevel = "LOW"
  let estimatedDenialProbability = 10

  if (instantDenialTriggers.length > 0) {
    overallScore = "INSTANT_DENIAL"
    estimatedDenialProbability = 95
  } else if (veryHighRiskItems.length > 0) {
    overallScore = "VERY_HIGH"
    estimatedDenialProbability = 75 + veryHighRiskItems.length * 5
  } else if (highRiskItems.length >= 3) {
    overallScore = "HIGH"
    estimatedDenialProbability = 50 + highRiskItems.length * 5
  } else if (highRiskItems.length >= 1) {
    overallScore = "MEDIUM"
    estimatedDenialProbability = 25 + highRiskItems.length * 5
  }

  return {
    overallScore,
    instantDenialTriggers,
    veryHighRiskItems,
    highRiskItems,
    estimatedDenialProbability: Math.min(estimatedDenialProbability, 99),
  }
}

/**
 * Generate prioritized recommendations
 */
function generateRecommendations(
  checklist: ChecklistCategory[],
  ctpProductCheck: CTPSearchResult,
  perplexityFindings: PerplexityFindings
): ValidationRecommendation[] {
  const recommendations: ValidationRecommendation[] = []

  // CTP product recommendation
  if (!ctpProductCheck.covered) {
    recommendations.push({
      priority: "CRITICAL",
      action: "Verify CTP product is on Novitas covered list",
      reason:
        "Product not found in local database. Non-covered products result in automatic denial.",
      suggestedLanguage: ctpProductCheck.suggestions?.length
        ? `Consider using: ${ctpProductCheck.suggestions.map((s) => s.name).join(", ")}`
        : "Verify product against current LCD L35041 Attachment A",
    })
  }

  // Add recommendations for missing items, prioritized by audit risk
  const allItems = checklist.flatMap((c) => c.items)
  const missingItems = allItems.filter(
    (i) => i.status === "MISSING" || i.status === "VIOLATION" || i.status === "PARTIAL"
  )

  // Sort by audit risk priority
  missingItems.sort((a, b) => {
    const aPriority = a.auditRisk ? AUDIT_RISK_LEVELS[a.auditRisk].priority : 5
    const bPriority = b.auditRisk ? AUDIT_RISK_LEVELS[b.auditRisk].priority : 5
    return aPriority - bPriority
  })

  for (const item of missingItems.slice(0, 10)) {
    // Top 10 recommendations
    let priority: ValidationRecommendation["priority"] = "LOW"
    if (item.auditRisk === "INSTANT_DENIAL" || item.status === "VIOLATION") {
      priority = "CRITICAL"
    } else if (item.auditRisk === "VERY_HIGH") {
      priority = "HIGH"
    } else if (item.auditRisk === "HIGH") {
      priority = "MEDIUM"
    }

    recommendations.push({
      priority,
      action: `Add documentation for: ${item.label}`,
      reason: item.guidance || "Required by LCD L35041",
      suggestedLanguage: item.suggestion,
    })
  }

  // Add Perplexity-based recommendations
  if (perplexityFindings.currentAuditFocusAreas.length > 0) {
    recommendations.push({
      priority: "MEDIUM",
      action: "Review current audit focus areas",
      reason: `Novitas/Qlarant currently focusing on: ${perplexityFindings.currentAuditFocusAreas.join(", ")}`,
    })
  }

  return recommendations
}

/**
 * Parse Perplexity research context for structured findings
 */
function parsePerplexityFindings(
  perplexityContext: string,
  ctpProduct: string
): PerplexityFindings {
  // Extract key information from Perplexity response
  // This is a basic parser - the actual response format may vary

  const findings: PerplexityFindings = {
    lcdEffectiveDate: "April 13, 2025", // Default based on known LCD update
    productCoverageStatus: "VERIFY_MANUALLY",
    applicationLimit: 8, // Current LCD limit
    kxModifierRequired: true, // Required for apps 5-8
    recentLcdChanges: [],
    currentAuditFocusAreas: [],
    oigWorkPlanItems: [],
    rawResearch: perplexityContext,
  }

  const lowerContext = perplexityContext.toLowerCase()

  // Check for product coverage mentions
  const productLower = ctpProduct.toLowerCase()
  if (
    lowerContext.includes(`${productLower} is covered`) ||
    lowerContext.includes(`${productLower} on the list`)
  ) {
    findings.productCoverageStatus = "COVERED"
  } else if (
    lowerContext.includes(`${productLower} is not covered`) ||
    lowerContext.includes(`${productLower} not on the list`)
  ) {
    findings.productCoverageStatus = "NOT_COVERED"
  }

  // Extract LCD effective date if mentioned
  const dateMatch = perplexityContext.match(
    /effective[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i
  )
  if (dateMatch) {
    findings.lcdEffectiveDate = dateMatch[1]
  }

  // Look for audit focus areas
  if (lowerContext.includes("soc") || lowerContext.includes("standard of care")) {
    findings.currentAuditFocusAreas.push("SOC documentation compliance")
  }
  if (lowerContext.includes("measurement") || lowerContext.includes("wound size")) {
    findings.currentAuditFocusAreas.push("Wound measurement documentation")
  }
  if (lowerContext.includes("50%") || lowerContext.includes("fifty percent")) {
    findings.currentAuditFocusAreas.push("DFU 50% reduction failure documentation")
  }

  // Look for OIG mentions
  if (lowerContext.includes("oig") || lowerContext.includes("office of inspector")) {
    findings.oigWorkPlanItems.push(
      "OIG 2025 work plan includes skin substitute oversight"
    )
  }

  // Look for LCD changes
  if (
    lowerContext.includes("increased") ||
    lowerContext.includes("changed") ||
    lowerContext.includes("updated")
  ) {
    if (lowerContext.includes("application")) {
      findings.recentLcdChanges.push("Application limit changed from 4 to 8")
    }
    if (lowerContext.includes("kx")) {
      findings.recentLcdChanges.push("KX modifier required for applications 5-8")
    }
  }

  return findings
}

/**
 * Calculate summary statistics
 */
function calculateSummary(
  checklist: ChecklistCategory[]
): LCDValidationResult["summary"] {
  const allItems = checklist.flatMap((c) => c.items)

  return {
    totalRequirements: allItems.length,
    foundCount: allItems.filter((i) => i.status === "FOUND").length,
    missingCount: allItems.filter((i) => i.status === "MISSING").length,
    partialCount: allItems.filter((i) => i.status === "PARTIAL").length,
    violationCount: allItems.filter((i) => i.status === "VIOLATION").length,
  }
}

/**
 * Format validation result for embedding in generated documentation
 */
export function formatValidationSummary(result: LCDValidationResult): string {
  const riskLabel = AUDIT_RISK_LEVELS[result.auditRisk.overallScore].label
  const riskEmoji =
    result.auditRisk.overallScore === "LOW"
      ? "✅"
      : result.auditRisk.overallScore === "MEDIUM"
        ? "⚠️"
        : "🚨"

  let summary = `## LCD L35041 Validation Summary

${riskEmoji} **Denial Risk: ${riskLabel}** (${result.auditRisk.estimatedDenialProbability}% estimated)

**LCD Effective Date:** ${result.perplexityFindings.lcdEffectiveDate}
**Wound Type:** ${result.detectedWoundType || "Unknown"}
**CTP Product:** ${result.ctpProductCheck.covered ? "✓ Covered" : "⚠️ Verify Coverage"}

### Documentation Status
- ✓ Found: ${result.summary.foundCount}
- ✗ Missing: ${result.summary.missingCount}
- ◐ Partial: ${result.summary.partialCount}
${result.summary.violationCount > 0 ? `- 🚫 Violations: ${result.summary.violationCount}` : ""}

`

  // Add instant denial warnings
  if (result.auditRisk.instantDenialTriggers.length > 0) {
    summary += `### ⛔ INSTANT DENIAL TRIGGERS
${result.auditRisk.instantDenialTriggers.map((t) => `- ${t}`).join("\n")}

`
  }

  // Add critical missing items
  if (result.auditRisk.veryHighRiskItems.length > 0) {
    summary += `### ⚠️ Very High Risk Items (Missing)
${result.auditRisk.veryHighRiskItems.map((t) => `- ${t}`).join("\n")}

`
  }

  // Add top recommendations
  if (result.recommendations.length > 0) {
    const criticalRecs = result.recommendations.filter(
      (r) => r.priority === "CRITICAL" || r.priority === "HIGH"
    )
    if (criticalRecs.length > 0) {
      summary += `### Recommended Actions
${criticalRecs
  .slice(0, 5)
  .map((r) => `- **${r.priority}**: ${r.action}${r.suggestedLanguage ? `\n  *Add: "${r.suggestedLanguage}"*` : ""}`)
  .join("\n")}

`
    }
  }

  // Add Perplexity research notes
  if (
    result.perplexityFindings.currentAuditFocusAreas.length > 0 ||
    result.perplexityFindings.recentLcdChanges.length > 0
  ) {
    summary += `### Perplexity Research Notes
`
    if (result.perplexityFindings.recentLcdChanges.length > 0) {
      summary += `**Recent LCD Changes:**
${result.perplexityFindings.recentLcdChanges.map((c) => `- ${c}`).join("\n")}

`
    }
    if (result.perplexityFindings.currentAuditFocusAreas.length > 0) {
      summary += `**Current Audit Focus Areas:**
${result.perplexityFindings.currentAuditFocusAreas.map((a) => `- ${a}`).join("\n")}

`
    }
  }

  summary += `---

`

  return summary
}
