/**
 * Appeal Letter Requirements
 * Documentation requirements for successful prior authorization appeals
 *
 * Appeals require demonstrating that the original denial was incorrect,
 * providing new evidence, and meeting all regulatory filing requirements.
 */

export type AuditRiskLevel =
  | "INSTANT_DENIAL"
  | "VERY_HIGH"
  | "HIGH"
  | "MEDIUM"
  | "LOW"

export interface AppealRequirement {
  id: string
  label: string
  required: boolean
  critical?: boolean
  auditRisk?: AuditRiskLevel
  guidance?: string
}

export interface AppealRequirementCategory {
  category: string
  description: string
  items: AppealRequirement[]
}

// Audit risk levels for UI display
export const AUDIT_RISK_LEVELS: Record<
  AuditRiskLevel,
  { color: string; bgColor: string; label: string; priority: number }
> = {
  INSTANT_DENIAL: {
    color: "text-red-800",
    bgColor: "bg-red-100",
    label: "Instant Denial",
    priority: 1,
  },
  VERY_HIGH: {
    color: "text-red-700",
    bgColor: "bg-red-50",
    label: "Very High Risk",
    priority: 2,
  },
  HIGH: {
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    label: "High Risk",
    priority: 3,
  },
  MEDIUM: {
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    label: "Medium Risk",
    priority: 4,
  },
  LOW: {
    color: "text-green-700",
    bgColor: "bg-green-50",
    label: "Low Risk",
    priority: 5,
  },
}

export const APPEAL_REQUIREMENTS: AppealRequirementCategory[] = [
  // ══════════════════════════════════════════════════════════════
  // DENIAL REFERENCE
  // ══════════════════════════════════════════════════════════════
  {
    category: "Denial Reference",
    description:
      "Essential information identifying the original denial being appealed.",
    items: [
      {
        id: "denial_letter_date",
        label: "Original denial letter date referenced",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Include exact date from denial letter to establish timeline and deadline compliance.",
      },
      {
        id: "denial_reference_number",
        label: "Denial reference/case number",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Include payer's reference number, case ID, or tracking number from denial letter.",
      },
      {
        id: "denial_reason_quoted",
        label: "Original denial reason quoted",
        required: true,
        critical: true,
        auditRisk: "VERY_HIGH",
        guidance:
          "Quote the exact denial reason from the letter. This anchors the entire appeal argument.",
      },
      {
        id: "claim_identifier",
        label: "Original claim/authorization identifier",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Include claim number, prior auth number, or other identifier from original submission.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // DENIAL REASON RESPONSE
  // ══════════════════════════════════════════════════════════════
  {
    category: "Denial Reason Response",
    description:
      "Direct response addressing each reason given for the denial.",
    items: [
      {
        id: "point_by_point_rebuttal",
        label: "Point-by-point response to denial reasons",
        required: true,
        critical: true,
        auditRisk: "VERY_HIGH",
        guidance:
          "Address each denial reason individually with specific evidence and counter-arguments.",
      },
      {
        id: "factual_corrections",
        label: "Factual corrections to denial rationale",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Identify and correct any factual errors in the denial rationale with documentation.",
      },
      {
        id: "policy_interpretation",
        label: "Correct policy interpretation cited",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Quote relevant policy language and explain correct interpretation with references.",
      },
      {
        id: "coverage_criteria_met",
        label: "How coverage criteria are met",
        required: true,
        auditRisk: "VERY_HIGH",
        guidance:
          "Explicitly map patient's clinical situation to each coverage criterion requirement.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // NEW EVIDENCE
  // ══════════════════════════════════════════════════════════════
  {
    category: "New Evidence",
    description:
      "Additional documentation and evidence not included in original submission.",
    items: [
      {
        id: "new_documentation",
        label: "New supporting documentation since denial",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Include any new clinical notes, test results, or documentation obtained after denial.",
      },
      {
        id: "additional_test_results",
        label: "Additional test/lab results",
        required: false,
        auditRisk: "MEDIUM",
        guidance:
          "Include recent labs, imaging, or diagnostic tests that support medical necessity.",
      },
      {
        id: "specialist_consultation",
        label: "Specialist consultation notes",
        required: false,
        auditRisk: "HIGH",
        guidance:
          "Include specialist opinions supporting treatment necessity, especially from relevant subspecialties.",
      },
      {
        id: "literature_support",
        label: "Peer-reviewed literature support",
        required: false,
        auditRisk: "MEDIUM",
        guidance:
          "Cite peer-reviewed studies, clinical guidelines, or consensus statements supporting treatment.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // CLINICAL UPDATE
  // ══════════════════════════════════════════════════════════════
  {
    category: "Clinical Update",
    description:
      "Current patient status and any changes since original denial.",
    items: [
      {
        id: "current_patient_status",
        label: "Updated patient clinical status",
        required: true,
        critical: true,
        auditRisk: "VERY_HIGH",
        guidance:
          "Document current symptoms, functional status, and clinical findings since denial.",
      },
      {
        id: "condition_progression",
        label: "Disease progression since denial",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Document any worsening, complications, or clinical changes since the denial date.",
      },
      {
        id: "treatment_urgency",
        label: "Urgency of treatment need",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Explain consequences of continued treatment delay and urgency of approval.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // REGULATORY COMPLIANCE
  // ══════════════════════════════════════════════════════════════
  {
    category: "Regulatory Compliance",
    description:
      "Meeting all procedural and timeline requirements for valid appeal.",
    items: [
      {
        id: "appeal_deadline_met",
        label: "Filed within appeal deadline",
        required: true,
        critical: true,
        auditRisk: "INSTANT_DENIAL",
        guidance:
          "Verify appeal is filed within deadline (typically 60-180 days). Late appeals are auto-rejected.",
      },
      {
        id: "proper_appeal_level",
        label: "Correct appeal level/channel",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Submit to correct appeal level (1st level, 2nd level, external review) per payer process.",
      },
      {
        id: "required_forms",
        label: "Required appeal forms completed",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Include all payer-required appeal forms, cover sheets, and submission documents.",
      },
      {
        id: "authorized_representative",
        label: "Authorized representative documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Include authorization if appealing on patient's behalf (AOR form if required).",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // SUPPORTING DOCUMENTATION
  // ══════════════════════════════════════════════════════════════
  {
    category: "Supporting Documentation",
    description:
      "Clinical evidence and guidelines supporting treatment necessity.",
    items: [
      {
        id: "clinical_guidelines",
        label: "Clinical practice guidelines cited",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Reference relevant clinical guidelines (ACR, AAN, specialty society) supporting treatment.",
      },
      {
        id: "fda_approval",
        label: "FDA approval/indication documented",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Document FDA-approved indication and how patient's use aligns with labeled use.",
      },
      {
        id: "comparative_effectiveness",
        label: "Comparative effectiveness evidence",
        required: false,
        auditRisk: "MEDIUM",
        guidance:
          "Include evidence showing requested treatment superiority or necessity vs. alternatives.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // PROVIDER ATTESTATION
  // ══════════════════════════════════════════════════════════════
  {
    category: "Provider Attestation",
    description:
      "Required provider signatures and attestation statements.",
    items: [
      {
        id: "physician_signature",
        label: "Treating physician signature",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Appeal must be signed by treating physician with date.",
      },
      {
        id: "credentials_listed",
        label: "Provider credentials documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Include physician credentials (MD, DO, NP, specialty) and NPI number.",
      },
      {
        id: "attestation_statement",
        label: "Medical necessity attestation",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Include explicit statement attesting to medical necessity of requested treatment.",
      },
    ],
  },
]

/**
 * Get all requirements flattened into a single array
 */
export function getAllRequirements(): AppealRequirement[] {
  return APPEAL_REQUIREMENTS.flatMap((category) => category.items)
}

/**
 * Get instant denial triggers only
 */
export function getInstantDenialTriggers(): AppealRequirement[] {
  return getAllRequirements().filter((req) => req.auditRisk === "INSTANT_DENIAL")
}

/**
 * Get high-risk requirements (VERY_HIGH and HIGH)
 */
export function getHighRiskRequirements(): AppealRequirement[] {
  return getAllRequirements().filter(
    (req) => req.auditRisk === "VERY_HIGH" || req.auditRisk === "HIGH"
  )
}

/**
 * Get critical requirements only
 */
export function getCriticalRequirements(): AppealRequirement[] {
  return getAllRequirements().filter((req) => req.critical === true)
}

/**
 * Count requirements by risk level
 */
export function countRequirementsByRisk(): Record<AuditRiskLevel, number> {
  const counts: Record<AuditRiskLevel, number> = {
    INSTANT_DENIAL: 0,
    VERY_HIGH: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  }

  getAllRequirements().forEach((req) => {
    if (req.auditRisk) {
      counts[req.auditRisk]++
    }
  })

  return counts
}

/**
 * Get requirements by category name
 */
export function getRequirementsByCategory(categoryName: string): AppealRequirement[] {
  const category = APPEAL_REQUIREMENTS.find((c) => c.category === categoryName)
  return category?.items || []
}
