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

  // --- Recalculate score accounting for addressed checklist items ---
  const allItems = lcdValidation.checklist?.flatMap(c => c.items) ?? []
  const addressedIds = new Set(
    Object.entries(checklistEdits)
      .filter(([, edit]) => edit.marked_addressed)
      .map(([id]) => id)
  )

  // Filter instant denial triggers that haven't been addressed
  const remainingTriggers = lcdValidation.instantDenialTriggers.filter(label => {
    // Match trigger to checklist item by label
    const item = allItems.find(i => i.label === label)
    if (item) return !addressedIds.has(item.id)
    // CTP product check trigger (injected directly, not from a checklist item)
    // Link it to the ctp_on_covered_list checklist item
    if (label.startsWith("CTP product not found")) {
      return !addressedIds.has("ctp_on_covered_list")
    }
    return true
  })

  // Filter remaining risk items that haven't been addressed
  const remainingVeryHigh = allItems.filter(i =>
    (i.status === "MISSING" || i.status === "PARTIAL") &&
    i.auditRisk === "VERY_HIGH" &&
    !addressedIds.has(i.id)
  )
  const remainingHigh = allItems.filter(i =>
    (i.status === "MISSING" || i.status === "PARTIAL") &&
    i.auditRisk === "HIGH" &&
    !addressedIds.has(i.id)
  )

  // Recalculate denial probability based on remaining issues
  let effectiveDenialProb = 10
  if (remainingTriggers.length > 0) {
    effectiveDenialProb = 95
  } else if (remainingVeryHigh.length > 0) {
    effectiveDenialProb = 75 + remainingVeryHigh.length * 5
  } else if (remainingHigh.length >= 3) {
    effectiveDenialProb = 50 + remainingHigh.length * 5
  } else if (remainingHigh.length >= 1) {
    effectiveDenialProb = 25 + remainingHigh.length * 5
  }
  effectiveDenialProb = Math.min(effectiveDenialProb, 99)

  const approvalProbability = 100 - effectiveDenialProb
  const barColor = approvalProbability >= 80
    ? "bg-green-500"
    : approvalProbability >= 60
    ? "bg-amber-500"
    : "bg-coral"
  const scoreColor = approvalProbability >= 80
    ? "text-green-600"
    : approvalProbability >= 60
    ? "text-amber-600"
    : "text-coral"

  // Risk level label based on recalculated score
  const riskLabel = remainingTriggers.length > 0
    ? "Instant Denial"
    : effectiveDenialProb >= 70
    ? "Very High Risk"
    : effectiveDenialProb >= 50
    ? "High Risk"
    : effectiveDenialProb >= 30
    ? "Moderate Risk"
    : "Low Risk"

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
            {approvalProbability}%
          </span>
          <span className="text-[0.78rem] text-dark-bg/50">
            Est. Approval Rate · <span className={scoreColor}>{riskLabel}</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-300/40 rounded-full overflow-hidden mb-5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${approvalProbability}%` }}
          />
        </div>

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
