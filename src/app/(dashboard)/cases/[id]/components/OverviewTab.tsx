"use client"

import { LCDValidationPanel } from "@/components/dashboard/LCDValidationPanel"
import type { CaseData, LCDValidationState, RecommendationEdit } from "../types"
import type { ChecklistEdit, ChecklistItemWithEdits, ValidationRecommendation } from "@/lib/lcd-validation"


interface OverviewTabProps {
  caseData: CaseData
  lcdValidation: LCDValidationState | null
  checklistEdits: Record<string, ChecklistEdit>
  onChecklistItemClick: (item: ChecklistItemWithEdits) => void
  recommendationEdits: Record<string, RecommendationEdit>
  onRecommendationClick: (rec: ValidationRecommendation) => void
}

export function OverviewTab({ caseData, lcdValidation, checklistEdits, onChecklistItemClick, recommendationEdits, onRecommendationClick }: OverviewTabProps) {
  if (!lcdValidation) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">No validation data available yet. Generate documentation to see readiness analysis.</p>
      </div>
    )
  }

  // --- Raw compliance score (same formula as dashboard: found / (found + missing)) ---
  const assessableTotal = (lcdValidation.foundCount + lcdValidation.missingCount) || 1
  const complianceRate = Math.round((lcdValidation.foundCount / assessableTotal) * 100)

  // Color based on compliance percentage
  const barColor = complianceRate >= 80
    ? "bg-green-500"
    : complianceRate >= 60
    ? "bg-amber-500"
    : "bg-coral"
  const scoreColor = complianceRate >= 80
    ? "text-green-600"
    : complianceRate >= 60
    ? "text-amber-600"
    : "text-coral"

  return (
    <div className="space-y-6">
      {/* AI Assessment Card */}
      <div
        className="relative rounded-xl border border-gray-200 bg-white p-6 overflow-hidden"
      >
        {/* AI Assessment badge */}
        <span className="inline-block text-[0.6rem] font-semibold uppercase tracking-wider text-[#1652C5] bg-[#1652C5]/10 rounded-full px-2.5 py-1 mb-4">
          AI Assessment
        </span>

        {/* Score display */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className={`text-[2.2rem] font-bold leading-none ${scoreColor}`}>
            {complianceRate}%
          </span>
          <span className="text-[0.78rem] text-dark-bg/50">
            Readiness
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-300/40 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${complianceRate}%` }}
          />
        </div>

        <p className="text-[0.65rem] text-gray-500">
          AI-verified documentation coverage against LCD requirements. Does not guarantee payer approval.
        </p>

      </div>

      {/* Documentation Checklist — includes recommendations, research notes & audit focus areas */}
      <LCDValidationPanel
        validation={lcdValidation}
        isCollapsed={false}
        checklistEdits={checklistEdits}
        onItemClick={onChecklistItemClick}
        docType={caseData.doc_type}
        recommendationEdits={recommendationEdits}
        onRecommendationClick={onRecommendationClick}
      />
    </div>
  )
}
