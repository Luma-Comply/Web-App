/**
 * Pre-Audit Documentation Review Requirements
 * Additional audit-specific checklist items that go beyond LCD and medical necessity requirements.
 * These check for documentation completeness elements commonly flagged during payer audits.
 */

import type { AuditRiskLevel } from "./medical-necessity-requirements"

export interface AuditRequirement {
  id: string
  label: string
  required: boolean
  critical?: boolean
  auditRisk?: AuditRiskLevel
  guidance?: string
}

export interface AuditRequirementCategory {
  category: string
  description: string
  items: AuditRequirement[]
}

export const PRE_AUDIT_REQUIREMENTS: AuditRequirementCategory[] = [
  // ══════════════════════════════════════════════════════════════
  // PHYSICIAN ORDER DOCUMENTATION
  // ══════════════════════════════════════════════════════════════
  {
    category: "Physician Order Documentation",
    description:
      "Completeness of the physician order — a signed, dated order with drug name, dose, and indication is required for audit compliance.",
    items: [
      {
        id: "physician_order_signed",
        label: "Physician order includes signature",
        required: true,
        critical: true,
        auditRisk: "HIGH",
        guidance:
          "The physician order must be signed by the ordering/treating provider. Electronic signatures are acceptable if they meet CMS e-signature requirements.",
      },
      {
        id: "physician_order_dated",
        label: "Physician order includes date",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "The order must be dated on or before the date of service. Orders dated after service are a common audit flag.",
      },
      {
        id: "physician_order_drug_name",
        label: "Drug name specified on order",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "The order must specify the exact drug name (brand or generic). Generic orders like 'biologic agent' are insufficient.",
      },
      {
        id: "physician_order_dose",
        label: "Dose and frequency on order",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Include dose amount, unit, route of administration, and frequency. Example: 'Humira 40mg subcutaneous every 2 weeks'.",
      },
      {
        id: "physician_order_indication",
        label: "Clinical indication on order",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "The order must state the clinical indication (diagnosis or condition being treated). This links the order to medical necessity.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // MEDICATION ADMINISTRATION
  // ══════════════════════════════════════════════════════════════
  {
    category: "Medication Administration",
    description:
      "Medication Administration Record (MAR) documentation and drug wastage requirements for infused/injected biologics.",
    items: [
      {
        id: "mar_start_time",
        label: "Administration start time documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "The MAR must document the actual start time of medication administration. This is required for billing time-based infusion codes.",
      },
      {
        id: "mar_stop_time",
        label: "Administration stop time documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "The MAR must document the stop time. Start-to-stop time must support the number of infusion units billed.",
      },
      {
        id: "jw_jz_modifier",
        label: "JW/JZ modifier documentation for single-dose containers",
        required: true,
        critical: true,
        auditRisk: "HIGH",
        guidance:
          "For single-dose vial products: JW modifier required when drug is discarded, JZ modifier required when NO drug is discarded. CMS mandates JW/JZ reporting effective January 2025.",
      },
      {
        id: "wastage_documentation",
        label: "Drug wastage documented with witness if applicable",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "When drug from a single-dose container is discarded, document the amount wasted and have a witness co-sign. Required for JW modifier claims.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // DOCUMENTATION QUALITY
  // ══════════════════════════════════════════════════════════════
  {
    category: "Documentation Quality",
    description:
      "Checks for individualized, patient-specific documentation. Copy-pasted or templated notes are a common audit flag.",
    items: [
      {
        id: "copy_paste_check",
        label: "Documentation is individualized (no copy-paste patterns)",
        required: true,
        critical: true,
        auditRisk: "HIGH",
        guidance:
          "Documentation must be specific to this patient and this encounter. Look for generic boilerplate language, identical phrasing across notes, or template markers. Auditors specifically flag notes that appear copied from previous encounters or other patients.",
      },
      {
        id: "patient_specific_details",
        label: "Patient-specific clinical details present",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Notes should reference specific lab values, measurements, exam findings, and patient responses unique to this individual. Generic statements like 'patient is doing well' without supporting specifics are insufficient.",
      },
      {
        id: "treatment_plan_goals",
        label: "Treatment plan with defined measurable goals",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "The treatment plan must include specific, measurable goals (e.g., 'reduce DAS28 score to <3.2 within 12 weeks' or 'achieve 50% wound area reduction by week 4'). Vague goals like 'improve symptoms' are audit flags.",
      },
      {
        id: "treatment_plan_timeline",
        label: "Treatment timeline and reassessment plan",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Document when treatment response will be reassessed and criteria for continuing, modifying, or discontinuing treatment.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // TEMPORAL COMPLIANCE
  // ══════════════════════════════════════════════════════════════
  {
    category: "Temporal Compliance",
    description:
      "Timeliness checks: lab results, prior treatment duration, and documentation currency.",
    items: [
      {
        id: "lab_results_recency",
        label: "Lab results within 3 months of service date",
        required: true,
        critical: true,
        auditRisk: "HIGH",
        guidance:
          "Lab results cited for medical necessity should be within 3 months (90 days) of the date of service unless the condition is chronic and stable. Outdated labs are a common denial trigger.",
      },
      {
        id: "prior_treatment_duration",
        label: "At least 4 weeks of documented failed prior treatment",
        required: true,
        critical: true,
        auditRisk: "VERY_HIGH",
        guidance:
          "Most payers require documentation of at least 4 weeks (28 days) of failed conservative or first-line treatment before approving biologics. Document exact start/end dates and reason for failure (inadequate response, adverse event, contraindication).",
      },
      {
        id: "documentation_contemporaneous",
        label: "Documentation created at or near time of service",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Clinical notes should be authored at or near the date of service. Late entries or amendments should be clearly marked with the original date and the amendment date.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // PHOTO & SUPPORTING DOCUMENTATION
  // ══════════════════════════════════════════════════════════════
  {
    category: "Photo & Supporting Documentation",
    description:
      "Visual and supporting documentation for wound care, dermatological, or other conditions where photo evidence strengthens the record.",
    items: [
      {
        id: "photo_doc_referenced",
        label: "Photo documentation referenced (wound/dermatological cases)",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "For wound care or dermatological conditions, clinical photos should be referenced in the medical record. Photos provide objective evidence of condition severity and treatment response.",
      },
      {
        id: "photo_doc_dated",
        label: "Photo documentation dated and labeled",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Photos must include the date taken, patient identifier, and anatomical location. Undated or unlabeled photos have limited audit value.",
      },
      {
        id: "photo_doc_measurement",
        label: "Photos include measurement reference (ruler/grid)",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Wound photos should include a measurement reference (ruler or wound measurement grid) to document dimensions objectively. This supports claims of wound progression or healing.",
      },
    ],
  },
]

/**
 * Get all audit-specific requirements flattened
 */
export function getAllAuditRequirements(): AuditRequirement[] {
  return PRE_AUDIT_REQUIREMENTS.flatMap((category) => category.items)
}

/**
 * Get critical audit requirements
 */
export function getCriticalAuditRequirements(): AuditRequirement[] {
  return getAllAuditRequirements().filter((req) => req.critical === true)
}
