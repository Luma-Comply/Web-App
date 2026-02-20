/**
 * LCD L35041 Requirements for CTP/Skin Substitutes
 * Based on Novitas Solutions Medicare Part B coverage criteria
 * Last LCD update: November 2024, Effective: April 13, 2025
 *
 * Sources:
 * - CMS LCD L35041: https://www.cms.gov/medicare-coverage-database/view/lcd.aspx?lcdid=35041
 * - Novitas Solutions MAC
 */

export type AuditRiskLevel =
  | "INSTANT_DENIAL"
  | "VERY_HIGH"
  | "HIGH"
  | "MEDIUM"
  | "LOW"

export type WoundType =
  | "DFU"
  | "VLU"
  | "PRESSURE_ULCER"
  | "ARTERIAL_ULCER"
  | "SURGICAL_WOUND"
  | "TRAUMATIC_WOUND"
  | "BURN"
  | "OTHER"

/**
 * Map ICD-10 code to WoundType for LCD requirement filtering.
 * Uses code prefix matching. Returns undefined if no match (triggers auto-detect).
 */
export function icd10ToWoundType(code: string): WoundType | undefined {
  const upper = code.toUpperCase()
  // DFU: E08-E13.62x (diabetic foot ulcer codes)
  if (/^E1[0-3]\.62/.test(upper) || /^E0[89]\.62/.test(upper)) return "DFU"
  // DFU: L97.4xx (heel/midfoot ulcers), L97.5xx (other foot ulcers)
  if (/^L97\.[45]/.test(upper)) return "DFU"
  // VLU: I83.0/2 (varicose veins with ulcer), I87.0x (postthrombotic syndrome)
  if (/^I83\.[02]/.test(upper) || /^I87\.0/.test(upper)) return "VLU"
  // Pressure ulcer: L89.xxx
  if (/^L89\./.test(upper)) return "PRESSURE_ULCER"
  // Arterial ulcer: I70.2xx (atherosclerosis with ulceration), I73.x
  if (/^I70\.2/.test(upper) || /^I73\./.test(upper)) return "ARTERIAL_ULCER"
  // Surgical wound: T81.3x (disruption of wound)
  if (/^T81\.3/.test(upper)) return "SURGICAL_WOUND"
  // Burns: T20-T32
  if (/^T(2[0-9]|3[0-2])/.test(upper)) return "BURN"
  // Traumatic wound: S/T codes not matching above
  if (/^[ST]\d/.test(upper)) return "TRAUMATIC_WOUND"
  // Other chronic ulcers: L97.xxx (not caught above), L98.4xx
  if (/^L97\./.test(upper) || /^L98\.4/.test(upper)) return "OTHER"
  return undefined
}

export interface LCDRequirement {
  id: string
  label: string
  required: boolean
  critical?: boolean
  auditRisk?: AuditRiskLevel
  guidance?: string
  woundType?: WoundType // Only applies to specific wound types
  type?: "NOT_ALLOWED" // For instant denial triggers
}

export interface LCDRequirementCategory {
  category: string
  description: string
  items: LCDRequirement[]
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

export const LCD_L35041_REQUIREMENTS: LCDRequirementCategory[] = [
  // ══════════════════════════════════════════════════════════════
  // INSTANT DENIAL TRIGGERS (Non-Covered Situations)
  // ══════════════════════════════════════════════════════════════
  {
    category: "Instant Denial Triggers",
    description:
      "These conditions result in automatic denial. CTP cannot be placed if any are present.",
    items: [
      {
        id: "infected_wound",
        label: "Wound bed has active infection",
        type: "NOT_ALLOWED",
        required: true,
        critical: true,
        auditRisk: "INSTANT_DENIAL",
        guidance:
          "CTP cannot be placed on infected wound. Must clear infection first and document resolution.",
      },
      {
        id: "ischemic_wound",
        label: "Wound is ischemic (ABI < 0.5)",
        type: "NOT_ALLOWED",
        required: true,
        critical: true,
        auditRisk: "INSTANT_DENIAL",
        guidance:
          "Ischemic wounds are not covered. Document ABI ≥ 0.5 or toe pressure ≥ 30mmHg.",
      },
      {
        id: "necrotic_wound",
        label: "Wound bed has necrotic tissue",
        type: "NOT_ALLOWED",
        required: true,
        critical: true,
        auditRisk: "INSTANT_DENIAL",
        guidance:
          "Must debride all necrotic tissue before CTP placement. Document clean wound bed.",
      },
      {
        id: "combination_ctp",
        label: "Using multiple CTPs simultaneously",
        type: "NOT_ALLOWED",
        required: true,
        critical: true,
        auditRisk: "INSTANT_DENIAL",
        guidance:
          "Combination CTP therapy is never covered. Only one CTP product per wound episode.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // WOUND DOCUMENTATION (Required Every 30 Days)
  // ══════════════════════════════════════════════════════════════
  {
    category: "Wound Documentation",
    description:
      "Wound response must be documented at least every 30 days. Required at initial, 4-week, and each application.",
    items: [
      {
        id: "wound_duration_weeks",
        label: "Wound duration in weeks",
        required: true,
        auditRisk: "HIGH",
        guidance: 'Document exact wound age: "Wound present for X weeks"',
      },
      {
        id: "wound_location_exact",
        label: "Exact anatomical wound location",
        required: true,
        auditRisk: "HIGH",
        guidance:
          'Be specific: "Left medial malleolus" not just "left leg". Include laterality.',
      },
      {
        id: "wound_type",
        label: "Wound type (DFU, VLU, or pressure ulcer)",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Clearly state wound etiology. Different requirements apply to each type.",
      },
      {
        id: "icd10_codes",
        label: "ICD-10 diagnosis codes",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Include primary wound code and all contributing conditions (diabetes, venous insufficiency, etc.)",
      },
      {
        id: "wound_measurements_cm2",
        label: "Wound size in cm² (L x W x D)",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Initial, 4-week, and pre-each-application measurements required. Calculate area in cm².",
      },
      {
        id: "wound_bed_description",
        label: "Wound bed: granulation %, slough %, eschar %",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          'Document percentages: "80% granulation, 15% slough, 5% eschar". Must show prepared bed.',
      },
      {
        id: "exudate_amount_type",
        label: "Exudate amount and type",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Document: None, Scant, Minimal, Moderate, Heavy. Type: Serous, Serosanguinous, Purulent.",
      },
      {
        id: "photo_documentation",
        label: "Photo documentation referenced",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Photos required at initial, 4-week, and each application. Include ruler for scale.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // SOC FAILURE DOCUMENTATION (Most Common Audit Failure)
  // ══════════════════════════════════════════════════════════════
  {
    category: "Standard of Care (SOC) Failure",
    description:
      "This is the #1 cause of audit failures. Must document 4+ weeks of failed conservative treatment.",
    items: [
      {
        id: "soc_4weeks_minimum",
        label: "4+ weeks of standard care BEFORE CTP",
        required: true,
        critical: true,
        auditRisk: "VERY_HIGH",
        guidance:
          "This is the #1 audit failure. Document exact SOC start and end dates showing ≥28 days.",
      },
      {
        id: "soc_start_date",
        label: "SOC treatment start date",
        required: true,
        auditRisk: "HIGH",
        guidance:
          'Document when conservative treatment began: "SOC initiated on [date]"',
      },
      {
        id: "soc_end_date",
        label: "SOC treatment end date (before CTP)",
        required: true,
        auditRisk: "HIGH",
        guidance: "Must be ≥4 weeks (28 days) after start date.",
      },
      {
        id: "wound_size_at_soc_start",
        label: "Wound measurement at SOC start",
        required: true,
        auditRisk: "VERY_HIGH",
        guidance: "Required to prove wound failed to heal. Document L x W x D.",
      },
      {
        id: "wound_size_at_4weeks",
        label: "Wound measurement after 4 weeks SOC",
        required: true,
        auditRisk: "VERY_HIGH",
        guidance:
          "Must show <50% reduction for DFU to qualify. Calculate: (Initial - 4week) / Initial.",
      },
      {
        id: "dfu_50_percent_failure",
        label: "DFU: Wound failed ≥50% area reduction after 4 weeks",
        required: true,
        woundType: "DFU",
        auditRisk: "VERY_HIGH",
        guidance:
          "Calculate: (Initial area - 4week area) / Initial area. Must be < 50% healed.",
      },
      {
        id: "vlu_compression_documented",
        label: "VLU: Compression therapy documented for 4+ weeks",
        required: true,
        woundType: "VLU",
        auditRisk: "VERY_HIGH",
        guidance:
          "Document compression type (wrap, stocking), mmHg level, and patient compliance.",
      },
      {
        id: "prior_treatments_list",
        label: "List of failed treatments with dates",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Document all SOC treatments: debridement dates, dressing types, offloading, etc.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // UNDERLYING DISEASE MANAGEMENT
  // ══════════════════════════════════════════════════════════════
  {
    category: "Underlying Disease Management",
    description:
      "Must demonstrate that contributing conditions are being actively managed.",
    items: [
      {
        id: "diabetes_a1c",
        label: "DFU: A1C level documented",
        required: true,
        woundType: "DFU",
        auditRisk: "MEDIUM",
        guidance:
          'Include recent A1C value and managing provider: "A1C 7.2% managed by Dr. Smith"',
      },
      {
        id: "diabetes_management_plan",
        label: "DFU: Diabetes management plan documented",
        required: true,
        woundType: "DFU",
        auditRisk: "MEDIUM",
        guidance: "Document glucose control efforts, medications, monitoring.",
      },
      {
        id: "venous_insufficiency_mgmt",
        label: "VLU: Venous insufficiency treatment documented",
        required: true,
        woundType: "VLU",
        auditRisk: "MEDIUM",
        guidance:
          "Document venous treatment: compression, elevation, exercise, or surgical intervention.",
      },
      {
        id: "abi_results_documented",
        label: "ABI results documented (must be ≥0.5)",
        required: true,
        critical: true,
        auditRisk: "HIGH",
        guidance:
          "Document actual ABI value. ABI < 0.5 = ischemic = not covered. Consider toe pressure if calcified.",
      },
      {
        id: "smoking_status",
        label: "Smoking history documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Document smoking status. If smoker, must document cessation counseling provided.",
      },
      {
        id: "nutritional_status",
        label: "Nutritional status assessed",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Document albumin, prealbumin, or dietary assessment. Address deficiencies.",
      },
      {
        id: "offloading_device",
        label: "DFU: Offloading device documented",
        required: true,
        woundType: "DFU",
        auditRisk: "HIGH",
        guidance:
          "Document offloading device type (TCC, CAM boot, etc.) and patient compliance.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // CTP PRODUCT DOCUMENTATION
  // ══════════════════════════════════════════════════════════════
  {
    category: "CTP Product Documentation",
    description:
      "Specific documentation required for the CTP product being used.",
    items: [
      {
        id: "ctp_product_name",
        label: "CTP product name specified",
        required: true,
        auditRisk: "HIGH",
        guidance: "Document exact product name as it appears on LCD covered list.",
      },
      {
        id: "ctp_on_covered_list",
        label: "Product on Novitas covered CTP list",
        required: true,
        critical: true,
        auditRisk: "INSTANT_DENIAL",
        guidance:
          "Verify product is on current LCD L35041 Attachment A. Non-covered products = denial.",
      },
      {
        id: "ctp_hcpcs_code",
        label: "HCPCS code for CTP",
        required: true,
        auditRisk: "HIGH",
        guidance: "Document correct Q-code for the CTP product.",
      },
      {
        id: "ctp_serial_number",
        label: "Product lot/serial number",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Document graft lot/serial number for each application. Required for audit trail.",
      },
      {
        id: "graft_size_cm2",
        label: "Graft size used (cm²)",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Must match wound size appropriately. Excess graft compared to wound triggers review.",
      },
      {
        id: "wound_bed_preparation",
        label: "Wound bed preparation documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Document debridement method, confirm no necrosis, no infection before placement.",
      },
      {
        id: "ctp_fixation_method",
        label: "CTP fixation method documented",
        required: true,
        auditRisk: "LOW",
        guidance:
          "Document how CTP was secured: sutures, adhesive, bolster dressing, etc.",
      },
      {
        id: "application_count_planned",
        label: "Number of applications planned (max 8)",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Medicare expects mean of 4 applications. >4 requires KX modifier attestation.",
      },
      {
        id: "kx_modifier_attestation",
        label: "KX modifier attestation (if >4 applications)",
        required: false,
        auditRisk: "VERY_HIGH",
        guidance:
          "Required for applications 5-8. Attests that all LCD requirements continue to be met.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ONGOING DOCUMENTATION (Every 30 Days)
  // ══════════════════════════════════════════════════════════════
  {
    category: "Ongoing Documentation",
    description:
      "Required every 30 days and before each CTP application to justify continued treatment.",
    items: [
      {
        id: "wound_improvement_documented",
        label: "Wound improvement documented",
        required: true,
        critical: true,
        auditRisk: "VERY_HIGH",
        guidance:
          "Must show improvement every 30 days or coverage stops. No improvement = no continued CTP.",
      },
      {
        id: "measurement_each_application",
        label: "Wound measured before each CTP application",
        required: true,
        auditRisk: "HIGH",
        guidance: "Document L x W x D immediately before each CTP placement.",
      },
      {
        id: "response_to_treatment",
        label: "Response to CTP treatment documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance:
          "Describe healing progress: % size reduction, improved granulation, epithelialization.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // PROVIDER DOCUMENTATION
  // ══════════════════════════════════════════════════════════════
  {
    category: "Provider Documentation",
    description: "Required provider information and attestations.",
    items: [
      {
        id: "physician_signature",
        label: "Physician signature and credentials",
        required: true,
        auditRisk: "MEDIUM",
        guidance: "Must be signed by treating physician with credentials (MD, DO, DPM).",
      },
      {
        id: "date_of_service",
        label: "Date of service documented",
        required: true,
        auditRisk: "MEDIUM",
        guidance: "Document actual date of each CTP application.",
      },
      {
        id: "place_of_service",
        label: "Place of service specified",
        required: true,
        auditRisk: "LOW",
        guidance: "Document where service was performed (office, wound clinic, home, etc.).",
      },
      {
        id: "medical_necessity_statement",
        label: "Medical necessity justification",
        required: true,
        auditRisk: "HIGH",
        guidance:
          "Explain why CTP is needed instead of continued SOC. Reference failed SOC and patient factors.",
      },
    ],
  },
]

/**
 * Get all requirements flattened into a single array
 */
export function getAllRequirements(): LCDRequirement[] {
  return LCD_L35041_REQUIREMENTS.flatMap((category) => category.items)
}

/**
 * Get requirements filtered by wound type
 */
export function getRequirementsForWoundType(woundType: WoundType): LCDRequirement[] {
  return getAllRequirements().filter(
    (req) => !req.woundType || req.woundType === woundType
  )
}

/**
 * Get instant denial triggers only
 */
export function getInstantDenialTriggers(): LCDRequirement[] {
  return getAllRequirements().filter((req) => req.type === "NOT_ALLOWED")
}

/**
 * Get high-risk requirements (VERY_HIGH and HIGH)
 */
export function getHighRiskRequirements(): LCDRequirement[] {
  return getAllRequirements().filter(
    (req) => req.auditRisk === "VERY_HIGH" || req.auditRisk === "HIGH"
  )
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
