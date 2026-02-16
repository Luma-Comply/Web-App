/**
 * Prior Authorization Letter Requirements
 * Generic requirements for medical necessity documentation across payers
 *
 * These requirements are based on common payer criteria for demonstrating
 * medical necessity for medications, procedures, and treatments.
 */

export type AuditRiskLevel =
  | "INSTANT_DENIAL"
  | "VERY_HIGH"
  | "HIGH"
  | "MEDIUM"
  | "LOW"

export interface MedicalNecessityRequirement {
  id: string
  label: string
  required: boolean
  critical?: boolean
  auditRisk?: AuditRiskLevel
  guidance?: string
}

export interface MedicalNecessityRequirementCategory {
  category: string
  description: string
  items: MedicalNecessityRequirement[]
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

export const MEDICAL_NECESSITY_REQUIREMENTS: MedicalNecessityRequirementCategory[] = [
  // ══════════════════════════════════════════════════════════════
  // PATIENT DEMOGRAPHICS
  // ══════════════════════════════════════════════════════════════
  {
    category: "Patient Demographics",
    description:
      "Basic patient identification and coverage information required for all medical necessity letters.",
    items: [
      {
        id: "patient_name",
        label: "Patient name documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Include patient's full legal name as it appears on insurance records.",
      },
      {
        id: "patient_age",
        label: "Patient age documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Document patient age. Some treatments have age-specific criteria or restrictions.",
      },
      {
        id: "patient_state",
        label: "Patient state/location documented",
        required: true,
        auditRisk: "LOW",
        guidance:
          "State of residence affects coverage policies and regulatory requirements.",
      },
      {
        id: "coverage_type",
        label: "Insurance coverage type documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Specify payer type (Medicare, Medicaid, Commercial) and plan details.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // DIAGNOSIS DOCUMENTATION
  // ══════════════════════════════════════════════════════════════
  {
    category: "Diagnosis Documentation",
    description:
      "Complete diagnostic information establishing the medical condition requiring treatment.",
    items: [
      {
        id: "primary_diagnosis",
        label: "Primary diagnosis with ICD-10 code",
        required: true,
        critical: true,
        auditRisk: "VERY_HIGH",
        guidance:
          "Document primary diagnosis with specific ICD-10 code. This is the foundation of medical necessity.",
      },
      {
        id: "diagnosis_description",
        label: "Clinical description of condition",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Provide detailed clinical description beyond just the diagnosis code.",
      },
      {
        id: "diagnosis_date",
        label: "Date of diagnosis or onset",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Document when the condition was first diagnosed or when symptoms began.",
      },
      {
        id: "severity_level",
        label: "Disease severity/stage documented",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Document disease severity using standardized scales where applicable (e.g., DAS28, PASI, CDAI).",
      },
      {
        id: "comorbidities",
        label: "Relevant comorbidities listed",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "List comorbid conditions that affect treatment decisions or contraindicate alternatives.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // CLINICAL HISTORY
  // ══════════════════════════════════════════════════════════════
  {
    category: "Clinical History",
    description:
      "Documentation of the patient's clinical course and disease impact.",
    items: [
      {
        id: "onset_description",
        label: "Description of symptom onset",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Describe how and when symptoms first appeared and their initial presentation.",
      },
      {
        id: "duration_documented",
        label: "Duration of condition documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Document how long the patient has had the condition. Chronicity affects treatment options.",
      },
      {
        id: "progression_notes",
        label: "Disease progression documented",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Document how the condition has progressed over time, including any worsening or complications.",
      },
      {
        id: "functional_impact",
        label: "Impact on daily functioning",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Document how the condition affects the patient's ability to perform daily activities, work, or quality of life.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // TREATMENT HISTORY
  // ══════════════════════════════════════════════════════════════
  {
    category: "Treatment History",
    description:
      "Documentation of prior treatments, their outcomes, and step therapy compliance. This is critical for approval.",
    items: [
      {
        id: "prior_treatments",
        label: "Prior treatments attempted",
        required: true,
        critical: true,
        auditRisk: "VERY_HIGH",
        guidance:
          "List all prior treatments tried for this condition. Include drug names, doses, and duration of use.",
      },
      {
        id: "treatment_dates",
        label: "Treatment dates documented",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Document start and end dates for each prior treatment to demonstrate adequate trial periods.",
      },
      {
        id: "treatment_outcomes",
        label: "Outcomes of prior treatments",
        required: true,
        critical: true,
        auditRisk: "HIGH",
        guidance:
          "Document why each prior treatment failed: lack of efficacy, adverse events, intolerance, or contraindication.",
      },
      {
        id: "contraindications",
        label: "Contraindications to alternatives documented",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "If alternatives exist but are contraindicated, document specific reasons (allergies, drug interactions, comorbidities).",
      },
      {
        id: "step_therapy_met",
        label: "Step therapy requirements addressed",
        required: true,
        critical: true,
        auditRisk: "VERY_HIGH",
        guidance:
          "Explicitly address payer's step therapy requirements. Document each required step and its outcome.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // CURRENT CLINICAL STATUS
  // ══════════════════════════════════════════════════════════════
  {
    category: "Current Clinical Status",
    description:
      "Documentation of the patient's current clinical presentation and objective findings.",
    items: [
      {
        id: "current_symptoms",
        label: "Current symptoms documented",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Document current active symptoms and their severity. Use standardized assessment tools where applicable.",
      },
      {
        id: "physical_exam",
        label: "Physical examination findings",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Include relevant physical exam findings that support the diagnosis and need for treatment.",
      },
      {
        id: "lab_results",
        label: "Relevant lab/test results",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Include recent lab values, imaging results, or diagnostic tests that support medical necessity.",
      },
      {
        id: "functional_assessment",
        label: "Current functional status",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Document current functional status using standardized assessments (e.g., HAQ, BASFI) where applicable.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // REQUESTED SERVICE
  // ══════════════════════════════════════════════════════════════
  {
    category: "Requested Service",
    description:
      "Details of the medication or service being requested.",
    items: [
      {
        id: "medication_name",
        label: "Requested medication/service name",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Specify the exact medication name, strength, and formulation being requested.",
      },
      {
        id: "dosing_regimen",
        label: "Dosing/treatment regimen",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Document the prescribed dose, frequency, and route of administration.",
      },
      {
        id: "treatment_duration",
        label: "Expected treatment duration",
        required: true,
        auditRisk: "LOW",
        guidance:
          "Specify expected duration of treatment or criteria for discontinuation.",
      },
      {
        id: "treatment_goals",
        label: "Treatment goals documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Define measurable treatment goals and expected outcomes.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // MEDICAL NECESSITY JUSTIFICATION
  // ══════════════════════════════════════════════════════════════
  {
    category: "Medical Necessity Justification",
    description:
      "The clinical rationale and evidence supporting why the requested treatment is medically necessary.",
    items: [
      {
        id: "clinical_rationale",
        label: "Clinical rationale for treatment",
        required: true,
        critical: true,
        auditRisk: "VERY_HIGH",
        guidance:
          "Provide clear clinical rationale explaining why this specific treatment is necessary for this patient.",
      },
      {
        id: "guidelines_cited",
        label: "Clinical guidelines referenced",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Reference relevant clinical guidelines (ACR, AAN, NCCN, etc.) that support the treatment request.",
      },
      {
        id: "expected_benefits",
        label: "Expected benefits documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Document expected clinical benefits and improvements from the requested treatment.",
      },
      {
        id: "risk_benefit_analysis",
        label: "Risk-benefit analysis",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Include assessment of treatment risks versus benefits, addressing why benefits outweigh risks.",
      },
    ],
  },
]

/**
 * Get all requirements flattened into a single array
 */
export function getAllRequirements(): MedicalNecessityRequirement[] {
  return MEDICAL_NECESSITY_REQUIREMENTS.flatMap((category) => category.items)
}

/**
 * Get high-risk requirements (VERY_HIGH and HIGH)
 */
export function getHighRiskRequirements(): MedicalNecessityRequirement[] {
  return getAllRequirements().filter(
    (req) => req.auditRisk === "VERY_HIGH" || req.auditRisk === "HIGH"
  )
}

/**
 * Get critical requirements only
 */
export function getCriticalRequirements(): MedicalNecessityRequirement[] {
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
export function getRequirementsByCategory(
  categoryName: string
): MedicalNecessityRequirement[] {
  const category = MEDICAL_NECESSITY_REQUIREMENTS.find(
    (cat) => cat.category === categoryName
  )
  return category ? category.items : []
}
