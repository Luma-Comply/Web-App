/**
 * Appeal Letter Validation
 * Validates clinical notes against appeal documentation requirements
 * Returns audit risk assessment and actionable recommendations
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  APPEAL_REQUIREMENTS,
  AppealRequirement,
  AUDIT_RISK_LEVELS,
  type AuditRiskLevel,
} from "@/lib/requirements/appeal-requirements"
import type {
  RequirementStatus,
  ChecklistItem,
  ChecklistCategory,
  ValidationRecommendation,
  ResearchFindings,
} from "./validation-types"

// Re-export types that the UI needs
export type { ChecklistEdit, ChecklistEditsData, ChecklistItemWithEdits } from "./validation-types"

export interface AppealValidationResult {
  // Audit Risk Assessment
  auditRisk: {
    overallScore: AuditRiskLevel
    instantDenialTriggers: string[]
    veryHighRiskItems: string[]
    highRiskItems: string[]
    estimatedDenialProbability: number
  }

  // Detailed Checklist by Category
  checklist: ChecklistCategory[]

  // Actionable Recommendations
  recommendations: ValidationRecommendation[]

  // Research Findings (from Perplexity)
  perplexityFindings: ResearchFindings

  // Summary Stats
  summary: {
    totalRequirements: number
    foundCount: number
    missingCount: number
    partialCount: number
    violationCount: number
  }
}

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
 * Validate clinical notes against appeal requirements
 * Uses Gemini to intelligently parse and match requirements
 */
export async function validateAppeal(
  clinicalNotes: string,
  requestedMedication: string,
  perplexityContext: string,
  denialContext?: string,
  payerName?: string
): Promise<AppealValidationResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

  // Get all requirements
  const requirements = APPEAL_REQUIREMENTS.flatMap((cat) => cat.items)

  // Parse Perplexity context for findings
  const perplexityFindings = parseResearchFindings(perplexityContext)

  // Build validation prompt
  const validationPrompt = buildValidationPrompt(
    clinicalNotes,
    requirements,
    requestedMedication,
    denialContext,
    payerName
  )

  const systemPrompt = `You are an insurance appeal documentation expert analyzing prior authorization appeal letters.

Your task is to check if the documentation contains required elements for a successful appeal. Be thorough but fair - if information is present in any form, mark it as FOUND. Only mark MISSING if the information is truly absent.

For each requirement, provide:
1. status: FOUND, MISSING, PARTIAL, NOT_APPLICABLE, or VIOLATION
2. evidence: Direct quote from notes if found (keep brief, max 100 chars)
3. suggestion: Specific language to add if missing

CRITICAL APPEAL REQUIREMENTS:
- Appeal deadline compliance is essential (late appeals = automatic rejection)
- The original denial reason must be quoted and addressed point-by-point
- New evidence or updated clinical status strengthens appeals
- Provider attestation and signature are required

For appeal_deadline_met:
- If notes indicate the appeal is being filed within the deadline, mark as FOUND
- If notes indicate the deadline has passed, mark as VIOLATION
- If no deadline information is present, mark as MISSING

Return your response as valid JSON only.`

  const validationModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  })

  const completion = await validationModel.generateContent(validationPrompt)
  const responseText = completion.response.text() || "{}"

  const validationResponse = JSON.parse(responseText) as ValidationResponse

  // Build checklist from validation response
  const checklist = buildChecklist(validationResponse)

  // Calculate audit risk
  const auditRisk = calculateAuditRisk(checklist)

  // Generate recommendations
  const recommendations = generateRecommendations(checklist, perplexityFindings)

  // Calculate summary stats
  const summary = calculateSummary(checklist)

  return {
    auditRisk,
    checklist,
    recommendations,
    perplexityFindings,
    summary,
  }
}

/**
 * Build the validation prompt for Gemini
 */
function buildValidationPrompt(
  clinicalNotes: string,
  requirements: AppealRequirement[],
  requestedMedication: string,
  denialContext?: string,
  payerName?: string
): string {
  const requirementsList = requirements
    .map(
      (req) =>
        `- ${req.id}: ${req.label}${req.critical ? " (CRITICAL)" : ""}${
          req.guidance ? ` | Guidance: ${req.guidance}` : ""
        }`
    )
    .join("\n")

  let prompt = `CLINICAL NOTES AND APPEAL DOCUMENTATION:
"""
${clinicalNotes}
"""`

  if (denialContext) {
    prompt += `

DENIAL CONTEXT:
"""
${denialContext}
"""`
  }

  prompt += `

REQUESTED MEDICATION: ${requestedMedication}
PAYER: ${payerName || "Unknown"}

REQUIREMENTS TO CHECK:
${requirementsList}

Analyze the documentation and return a JSON object with the following structure:
{
  "requirements": {
    "[requirement_id]": {
      "status": "FOUND" | "MISSING" | "PARTIAL" | "NOT_APPLICABLE" | "VIOLATION",
      "evidence": "brief quote from notes if found",
      "suggestion": "specific language to add if missing"
    }
  }
}

For appeals, pay special attention to:
1. Whether the original denial is referenced
2. Whether denial reasons are addressed point-by-point
3. Whether new evidence is provided
4. Whether appeal is within deadline

Be thorough - check the entire document for each requirement.`

  return prompt
}

/**
 * Build checklist from validation response
 */
function buildChecklist(response: ValidationResponse): ChecklistCategory[] {
  return APPEAL_REQUIREMENTS.map((category) => {
    const items: ChecklistItem[] = category.items.map((req) => {
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
  checklist: ChecklistCategory[]
): AppealValidationResult["auditRisk"] {
  const allItems = checklist.flatMap((c) => c.items)

  const instantDenialTriggers: string[] = []
  const veryHighRiskItems: string[] = []
  const highRiskItems: string[] = []

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
  researchFindings: ResearchFindings
): ValidationRecommendation[] {
  const recommendations: ValidationRecommendation[] = []

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
      reason: item.guidance || "Required for appeal documentation",
      suggestedLanguage: item.suggestion,
    })
  }

  // Add appeal-specific recommendations
  const deadlineItem = allItems.find((i) => i.id === "appeal_deadline_met")
  if (deadlineItem?.status === "MISSING") {
    recommendations.unshift({
      priority: "CRITICAL",
      action: "Verify appeal deadline compliance",
      reason: "Appeals filed after deadline are automatically rejected. Verify and document that appeal is timely.",
      suggestedLanguage: "This appeal is being filed within [X] days of the denial date of [DATE], which is within the required appeal filing period.",
    })
  }

  // Add research-based recommendations
  if (researchFindings.auditFocusAreas.length > 0) {
    recommendations.push({
      priority: "MEDIUM",
      action: "Review payer appeal requirements",
      reason: `Payer requirements include: ${researchFindings.auditFocusAreas.join(", ")}`,
    })
  }

  return recommendations
}

/**
 * Parse Perplexity research context for structured findings
 */
function parseResearchFindings(perplexityContext: string): ResearchFindings {
  const findings: ResearchFindings = {
    recentChanges: [],
    auditFocusAreas: [],
    rawResearch: perplexityContext,
  }

  const lowerContext = perplexityContext.toLowerCase()

  // Look for appeal-specific focus areas
  if (lowerContext.includes("deadline") || lowerContext.includes("time limit")) {
    findings.auditFocusAreas.push("Appeal deadline compliance")
  }
  if (lowerContext.includes("external review") || lowerContext.includes("ird")) {
    findings.auditFocusAreas.push("External review options")
  }
  if (lowerContext.includes("peer-to-peer") || lowerContext.includes("p2p")) {
    findings.auditFocusAreas.push("Peer-to-peer review available")
  }
  if (lowerContext.includes("expedited") || lowerContext.includes("urgent")) {
    findings.auditFocusAreas.push("Expedited appeal process")
  }

  return findings
}

/**
 * Calculate summary statistics
 */
function calculateSummary(
  checklist: ChecklistCategory[]
): AppealValidationResult["summary"] {
  const allItems = checklist.flatMap((c) => c.items)

  return {
    totalRequirements: allItems.length,
    foundCount: allItems.filter((i) => i.status === "FOUND").length,
    missingCount: allItems.filter((i) => i.status === "MISSING").length,
    partialCount: allItems.filter((i) => i.status === "PARTIAL").length,
    violationCount: allItems.filter((i) => i.status === "VIOLATION").length,
  }
}
