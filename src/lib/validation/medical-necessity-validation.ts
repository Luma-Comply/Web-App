/**
 * Prior Authorization Letter Validation
 * Validates clinical notes against medical necessity documentation requirements
 * Returns audit risk assessment and actionable recommendations
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  MEDICAL_NECESSITY_REQUIREMENTS,
  MedicalNecessityRequirement,
  AUDIT_RISK_LEVELS,
  type AuditRiskLevel,
} from "@/lib/requirements/medical-necessity-requirements"
import type {
  RequirementStatus,
  ChecklistItem,
  ChecklistCategory,
  ValidationRecommendation,
  ResearchFindings,
} from "./validation-types"

// Re-export types that the UI needs
export type { ChecklistEdit, ChecklistEditsData, ChecklistItemWithEdits } from "./validation-types"

export interface MedicalNecessityValidationResult {
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
 * Validate clinical notes against medical necessity requirements
 * Uses Gemini to intelligently parse and match requirements
 */
export async function validateMedicalNecessity(
  clinicalNotes: string,
  requestedMedication: string,
  perplexityContext: string,
  payerName?: string
): Promise<MedicalNecessityValidationResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

  // Get all requirements
  const requirements = MEDICAL_NECESSITY_REQUIREMENTS.flatMap((cat) => cat.items)

  // Parse Perplexity context for findings
  const perplexityFindings = parseResearchFindings(perplexityContext)

  // Build validation prompt
  const validationPrompt = buildValidationPrompt(
    clinicalNotes,
    requirements,
    requestedMedication,
    payerName
  )

  const systemPrompt = `You are a medical necessity documentation expert analyzing prior authorization requests.

Your task is to check if clinical notes contain required documentation elements for a medical necessity letter. Be thorough but fair - if information is present in any form, mark it as FOUND. Only mark MISSING if the information is truly absent.

For each requirement, provide:
1. status: FOUND, MISSING, PARTIAL, or NOT_APPLICABLE
2. evidence: Direct quote from notes if found (keep brief, max 100 chars)
3. suggestion: Specific language to add if missing

IMPORTANT: Medical necessity letters require documenting:
- Complete diagnosis information with ICD-10 codes
- Prior treatment history with outcomes (step therapy compliance)
- Current clinical status and functional impact
- Clear clinical rationale for the requested treatment

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
  requirements: MedicalNecessityRequirement[],
  requestedMedication: string,
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

  return `CLINICAL NOTES:
"""
${clinicalNotes}
"""

REQUESTED MEDICATION: ${requestedMedication}
PAYER: ${payerName || "Unknown"}

REQUIREMENTS TO CHECK:
${requirementsList}

Analyze the clinical notes and return a JSON object with the following structure:
{
  "requirements": {
    "[requirement_id]": {
      "status": "FOUND" | "MISSING" | "PARTIAL" | "NOT_APPLICABLE",
      "evidence": "brief quote from notes if found",
      "suggestion": "specific language to add if missing"
    }
  }
}

Be thorough - check the entire document for each requirement.`
}

/**
 * Build checklist from validation response
 */
function buildChecklist(response: ValidationResponse): ChecklistCategory[] {
  return MEDICAL_NECESSITY_REQUIREMENTS.map((category) => {
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
): MedicalNecessityValidationResult["auditRisk"] {
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
      reason: item.guidance || "Required for medical necessity documentation",
      suggestedLanguage: item.suggestion,
    })
  }

  // Add research-based recommendations
  if (researchFindings.auditFocusAreas.length > 0) {
    recommendations.push({
      priority: "MEDIUM",
      action: "Review payer-specific focus areas",
      reason: `Payer currently focusing on: ${researchFindings.auditFocusAreas.join(", ")}`,
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

  // Look for audit focus areas
  if (lowerContext.includes("step therapy") || lowerContext.includes("step-therapy")) {
    findings.auditFocusAreas.push("Step therapy compliance")
  }
  if (lowerContext.includes("prior treatment") || lowerContext.includes("failed")) {
    findings.auditFocusAreas.push("Prior treatment documentation")
  }
  if (lowerContext.includes("icd-10") || lowerContext.includes("diagnosis code")) {
    findings.auditFocusAreas.push("Diagnosis code accuracy")
  }
  if (lowerContext.includes("medical necessity") || lowerContext.includes("rationale")) {
    findings.auditFocusAreas.push("Medical necessity rationale")
  }

  return findings
}

/**
 * Calculate summary statistics
 */
function calculateSummary(
  checklist: ChecklistCategory[]
): MedicalNecessityValidationResult["summary"] {
  const allItems = checklist.flatMap((c) => c.items)

  return {
    totalRequirements: allItems.length,
    foundCount: allItems.filter((i) => i.status === "FOUND").length,
    missingCount: allItems.filter((i) => i.status === "MISSING").length,
    partialCount: allItems.filter((i) => i.status === "PARTIAL").length,
    violationCount: allItems.filter((i) => i.status === "VIOLATION").length,
  }
}
