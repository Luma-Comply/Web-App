/**
 * Pre-Audit Documentation Review Validation
 * Validates clinical documentation against combined requirements:
 * - Base requirements (medical necessity or LCD depending on doc_type)
 * - Audit-specific requirements (physician orders, MAR, copy-paste detection, temporal compliance, photo docs)
 *
 * Returns a unified ValidationResult compatible with LCDValidationPanel.
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  MEDICAL_NECESSITY_REQUIREMENTS,
  type MedicalNecessityRequirement,
} from "@/lib/requirements/medical-necessity-requirements"
import {
  PRE_AUDIT_REQUIREMENTS,
  type AuditRequirement,
} from "@/lib/requirements/audit-requirements"
import { AUDIT_RISK_LEVELS } from "./validation-types"
import type {
  AuditRiskLevel,
  RequirementStatus,
  ChecklistItem,
  ChecklistCategory,
  ValidationRecommendation,
  ResearchFindings,
  ValidationResult,
} from "./validation-types"

interface ValidationResponse {
  requirements: {
    [id: string]: {
      status: RequirementStatus
      evidence?: string
      suggestion?: string
    }
  }
}

// Combined requirement type for prompt building
type CombinedRequirement = {
  id: string
  label: string
  required: boolean
  critical?: boolean
  auditRisk?: AuditRiskLevel
  guidance?: string
  category: string
  categoryDescription: string
}

/**
 * Get all requirements for the audit based on doc_type.
 * Combines base medical necessity requirements with audit-specific requirements.
 */
function getCombinedRequirements(_docType?: string): CombinedRequirement[] {
  const combined: CombinedRequirement[] = []

  // Always include medical necessity base requirements
  // (LCD-specific requirements are only added via the existing LCD validation pipeline)
  for (const cat of MEDICAL_NECESSITY_REQUIREMENTS) {
    for (const item of cat.items) {
      combined.push({
        ...item,
        category: cat.category,
        categoryDescription: cat.description,
      })
    }
  }

  // Always include audit-specific requirements
  for (const cat of PRE_AUDIT_REQUIREMENTS) {
    for (const item of cat.items) {
      combined.push({
        ...item,
        category: cat.category,
        categoryDescription: cat.description,
      })
    }
  }

  return combined
}

/**
 * Build category definitions for checklist assembly
 */
function getCategoryDefinitions(_docType?: string): Array<{
  category: string
  description: string
  items: Array<MedicalNecessityRequirement | AuditRequirement>
}> {
  return [
    ...MEDICAL_NECESSITY_REQUIREMENTS,
    ...PRE_AUDIT_REQUIREMENTS,
  ]
}

/**
 * Run pre-audit documentation review
 */
export async function validateForAudit(
  clinicalNotes: string,
  requestedMedication: string,
  perplexityContext: string,
  docType?: string,
  uploadedDocText?: string,
  payerName?: string
): Promise<ValidationResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

  // Get combined requirements
  const allRequirements = getCombinedRequirements(docType)

  // Parse Perplexity context for findings
  const researchFindings = parseResearchFindings(perplexityContext)

  // Combine clinical notes with uploaded document text
  const combinedNotes = [
    clinicalNotes,
    uploadedDocText ? `\n\n--- UPLOADED CLINICAL DOCUMENTATION ---\n${uploadedDocText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  // Build validation prompt
  const validationPrompt = buildAuditPrompt(
    combinedNotes,
    allRequirements,
    requestedMedication,
    payerName
  )

  const systemPrompt = `You are a healthcare compliance specialist conducting a pre-audit review of clinical documentation for a biologic treatment claim.

Your task is to check clinical documentation against required elements for audit compliance. Be thorough but fair — if information is present in any form, mark it as FOUND. Only mark MISSING if the information is truly absent. Mark PARTIAL if the information exists but is vague, incomplete, or insufficient.

For each requirement, provide:
1. status: FOUND, MISSING, PARTIAL, VIOLATION, or NOT_APPLICABLE
2. evidence: Direct quote or description from notes if found (keep brief, max 120 chars)
3. suggestion: Specific, actionable language the provider can add if missing or partial. Write in plain clinical language a billing coordinator can understand.

SPECIAL INSTRUCTIONS FOR DOCUMENTATION QUALITY CHECKS:
- For copy_paste_check: Look for generic boilerplate language, identical phrasing patterns, template markers, or text that could apply to any patient. Mark FOUND if documentation is clearly individualized, PARTIAL if some sections are templated but others are specific, MISSING if notes appear largely generic.
- For patient_specific_details: Look for specific lab values, measurements, dates, and exam findings unique to this patient.

SPECIAL INSTRUCTIONS FOR TEMPORAL COMPLIANCE:
- For lab_results_recency: Check if any lab dates are mentioned. If dates appear more than 90 days from today, mark MISSING. If no dates are referenced, mark PARTIAL with suggestion to add dates.
- For prior_treatment_duration: Check if treatment duration is documented. Must show at least 4 weeks (28 days). If duration is unclear, mark PARTIAL.

SPECIAL INSTRUCTIONS FOR JW/JZ MODIFIERS:
- For jw_jz_modifier: Only applicable to injectable/infusible single-dose container products. Mark NOT_APPLICABLE if the medication is oral or not from a single-dose container.

Return your response as valid JSON only.`

  const validationModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  })

  const completion = await validationModel.generateContent(validationPrompt)
  const responseText = completion.response.text() || "{}"

  let validationResponse: ValidationResponse
  try {
    validationResponse = JSON.parse(responseText) as ValidationResponse
  } catch {
    console.error("[AuditValidation] Failed to parse Gemini response:", responseText.substring(0, 200))
    validationResponse = { requirements: {} }
  }

  // Build checklist from validation response
  const checklist = buildChecklist(validationResponse, docType)

  // Calculate audit risk
  const auditRisk = calculateAuditRisk(checklist)

  // Generate recommendations
  const recommendations = generateRecommendations(checklist, researchFindings)

  // Calculate summary stats
  const summary = calculateSummary(checklist)

  return {
    docType: (docType as ValidationResult["docType"]) || "medical_necessity",
    auditRisk,
    checklist,
    recommendations,
    researchFindings,
    summary,
  }
}

/**
 * Build the validation prompt for Gemini
 */
function buildAuditPrompt(
  clinicalNotes: string,
  requirements: CombinedRequirement[],
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

  return `CLINICAL DOCUMENTATION TO AUDIT:
"""
${clinicalNotes.substring(0, 8000)}
"""

REQUESTED MEDICATION: ${requestedMedication || "Not specified"}
PAYER: ${payerName || "Unknown"}

REQUIREMENTS TO CHECK:
${requirementsList}

Analyze the clinical documentation above and check for EACH requirement listed. Return a JSON object:
{
  "requirements": {
    "[requirement_id]": {
      "status": "FOUND" | "MISSING" | "PARTIAL" | "VIOLATION" | "NOT_APPLICABLE",
      "evidence": "brief quote or description from notes if found (max 120 chars)",
      "suggestion": "specific language to add if missing or partial — write in plain clinical language"
    }
  }
}

Be thorough — check the entire document for each requirement. For audit-specific items (physician orders, MAR, JW/JZ modifiers, photo documentation), examine the documentation carefully for any references to these elements.`
}

/**
 * Build checklist from validation response using combined category definitions
 */
function buildChecklist(
  response: ValidationResponse,
  docType?: string
): ChecklistCategory[] {
  const categories = getCategoryDefinitions(docType)

  return categories.map((category) => {
    const items: ChecklistItem[] = category.items.map((req) => {
      const validation = response.requirements?.[req.id]
      return {
        id: req.id,
        label: req.label,
        status: validation?.status || "MISSING",
        auditRisk: req.auditRisk as AuditRiskLevel | undefined,
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

    // Calculate category risk based on worst missing item
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
): ValidationResult["auditRisk"] {
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

  const allItems = checklist.flatMap((c) => c.items)
  const missingItems = allItems.filter(
    (i) =>
      i.status === "MISSING" ||
      i.status === "VIOLATION" ||
      i.status === "PARTIAL"
  )

  // Sort by audit risk priority
  missingItems.sort((a, b) => {
    const aPriority = a.auditRisk ? AUDIT_RISK_LEVELS[a.auditRisk].priority : 5
    const bPriority = b.auditRisk ? AUDIT_RISK_LEVELS[b.auditRisk].priority : 5
    return aPriority - bPriority
  })

  for (const item of missingItems.slice(0, 12)) {
    let priority: ValidationRecommendation["priority"] = "LOW"
    if (item.auditRisk === "INSTANT_DENIAL" || item.status === "VIOLATION") {
      priority = "CRITICAL"
    } else if (item.auditRisk === "VERY_HIGH") {
      priority = "CRITICAL"
    } else if (item.auditRisk === "HIGH") {
      priority = "HIGH"
    } else if (item.auditRisk === "MEDIUM") {
      priority = "MEDIUM"
    }

    recommendations.push({
      id: `rec_${item.id}`,
      sourceItemId: item.id,
      priority,
      action: `Add documentation for: ${item.label}`,
      reason: item.guidance || "Required for audit compliance",
      suggestedLanguage: item.suggestion,
    })
  }

  // Add research-based recommendations
  if (researchFindings.auditFocusAreas.length > 0) {
    recommendations.push({
      id: "rec_payer_focus",
      priority: "MEDIUM",
      action: "Review payer-specific audit focus areas",
      reason: `Current payer focus areas: ${researchFindings.auditFocusAreas.join(", ")}`,
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
  if (lowerContext.includes("jw modifier") || lowerContext.includes("jz modifier") || lowerContext.includes("wastage")) {
    findings.auditFocusAreas.push("JW/JZ modifier compliance")
  }
  if (lowerContext.includes("documentation quality") || lowerContext.includes("copy-paste") || lowerContext.includes("clone")) {
    findings.auditFocusAreas.push("Documentation individualization")
  }

  return findings
}

/**
 * Calculate summary statistics
 */
function calculateSummary(
  checklist: ChecklistCategory[]
): ValidationResult["summary"] {
  const allItems = checklist.flatMap((c) => c.items)

  return {
    totalRequirements: allItems.length,
    foundCount: allItems.filter((i) => i.status === "FOUND").length,
    missingCount: allItems.filter((i) => i.status === "MISSING").length,
    partialCount: allItems.filter((i) => i.status === "PARTIAL").length,
    violationCount: allItems.filter((i) => i.status === "VIOLATION").length,
  }
}
