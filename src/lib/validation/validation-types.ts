/**
 * Shared validation types for all document types
 * These types are used by biologics PA (LCD), medical necessity, and appeal validation
 */

export type AuditRiskLevel =
  | "INSTANT_DENIAL"
  | "VERY_HIGH"
  | "HIGH"
  | "MEDIUM"
  | "LOW"

export type RequirementStatus =
  | "FOUND"
  | "MISSING"
  | "PARTIAL"
  | "NOT_APPLICABLE"
  | "VIOLATION"

export interface ChecklistItem {
  id: string
  label: string
  status: RequirementStatus
  auditRisk?: AuditRiskLevel
  evidence?: string
  suggestion?: string
  guidance?: string
}

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

export interface ValidationRecommendation {
  id?: string
  sourceItemId?: string
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  action: string
  reason: string
  suggestedLanguage?: string
}

export interface ResearchFindings {
  effectiveDate?: string
  coverageStatus?: "COVERED" | "NOT_COVERED" | "VERIFY_MANUALLY"
  recentChanges: string[]
  auditFocusAreas: string[]
  rawResearch?: string
}

export interface ValidationResult {
  // Document type this validation is for
  docType: "biologics_pa" | "medical_necessity" | "appeal"

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
  researchFindings: ResearchFindings

  // Summary Stats
  summary: {
    totalRequirements: number
    foundCount: number
    missingCount: number
    partialCount: number
    violationCount: number
  }
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
