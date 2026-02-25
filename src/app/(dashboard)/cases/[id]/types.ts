import type { LCDValidationResult, ChecklistEdit, ChecklistItemWithEdits } from "@/lib/lcd-validation"
import type { CaseContext } from "@/components/chat/ChatInput"

export interface CaseData {
  id: string
  user_id: string
  doc_type: string
  patient_first_name: string
  patient_last_name: string
  patient_age: number
  patient_state: string
  patient_gender: string | null
  diagnosis_codes: string[]
  disease_activity: string
  lab_values: string
  prior_treatments: string
  requested_medication: string
  medication_dose: string
  payer_type: string
  payer_name: string
  claim_amount: number | null
  generated_output: string | null
  edited_output: string | null
  status: string
  created_at: string
  updated_at: string | null
  pa_reference_number: string | null
  submitted_at: string | null
  decision_date: string | null
  denial_reason: string | null
  denial_category: string | null
  denial_notes: string | null
  pa_expiration_date: string | null
  expected_decision_date: string | null
  followup_date: string | null
  parent_case_id: string | null
  metadata?: {
    manually_edited?: boolean
    creation_method?: string
    original_pasted_text?: string
    lcd_validation_full?: LCDValidationState
    lcd_validation?: {
      run_at: string
      risk_level: string
      denial_probability: number
      found_count: number
      missing_count: number
      detected_wound_type?: string
      ctp_covered: boolean
    }
    checklist_edits?: {
      version: number
      last_validation_run: string
      edits: Record<string, ChecklistEdit>
    }
    recommendation_edits?: {
      version: number
      edits: Record<string, RecommendationEdit>
    }
    [key: string]: unknown
  }
}

export interface LCDValidationState {
  riskLevel: string
  denialProbability: number
  foundCount: number
  missingCount: number
  totalRequirements: number
  detectedWoundType?: string
  ctpCovered: boolean
  instantDenialTriggers: string[]
  veryHighRiskItems: string[]
  highRiskItems: string[]
  checklist: LCDValidationResult["checklist"]
  recommendations: LCDValidationResult["recommendations"]
  perplexityFindings: LCDValidationResult["perplexityFindings"]
}

export interface AppealCase {
  id: string
  status: string
  created_at: string
}

export interface UploadedDoc {
  filename: string
  fileType: string
  storagePath: string | null
}

export interface RiskItem {
  label: string
  text: string
  severity: "instant" | "very-high" | "high"
}

export const DENIAL_CATEGORIES = [
  "Missing documentation",
  "Medical necessity not established",
  "Step therapy incomplete",
  "Formulary exclusion",
  "Coding error",
  "Other",
] as const

export interface RecommendationEdit {
  rec_id: string
  user_notes: string
  marked_addressed: boolean
  addressed_at?: string
  updated_at: string
}

export type { ChecklistEdit, ChecklistItemWithEdits, CaseContext }
