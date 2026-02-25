/**
 * Ratchet Lock — prevents compliance score regression on regeneration.
 *
 * Core principle: once an item is FOUND, it stays FOUND.
 * Score can only go up, never down.
 *
 * Runs as a post-processing merge step after Gemini validation returns,
 * before saving to the database.
 */

import type {
  ChecklistCategory,
  ChecklistItem,
  RequirementStatus,
  AuditRiskLevel,
} from "./validation-types.js"

// Higher number = better status (used for ratchet comparison)
const STATUS_PRIORITY: Record<RequirementStatus, number> = {
  FOUND: 5,
  NOT_APPLICABLE: 4,
  PARTIAL: 3,
  MISSING: 2,
  VIOLATION: 1,
}

interface RatchetMergeInput {
  newChecklist: ChecklistCategory[]
  previousChecklist?: ChecklistCategory[]
}

interface RatchetMergeResult {
  checklist: ChecklistCategory[]
  summary: {
    totalRequirements: number
    foundCount: number
    missingCount: number
    partialCount: number
    violationCount: number
  }
  auditRisk: {
    overallScore: AuditRiskLevel
    instantDenialTriggers: string[]
    veryHighRiskItems: string[]
    highRiskItems: string[]
    estimatedDenialProbability: number
  }
}

export function ratchetMergeValidation(input: RatchetMergeInput): RatchetMergeResult {
  const { newChecklist, previousChecklist } = input

  // Build lookup: item ID → previous item (across all categories)
  const previousItemMap = new Map<string, ChecklistItem>()
  if (previousChecklist) {
    for (const cat of previousChecklist) {
      for (const item of cat.items) {
        previousItemMap.set(item.id, item)
      }
    }
  }

  // Merge each category
  const mergedChecklist: ChecklistCategory[] = newChecklist.map((category) => {
    const mergedItems: ChecklistItem[] = category.items.map((newItem) => {
      const prev = previousItemMap.get(newItem.id)

      // No previous data → use new result as-is (first run)
      if (!prev) return newItem

      const prevPriority = STATUS_PRIORITY[prev.status]
      const newPriority = STATUS_PRIORITY[newItem.status]

      // VIOLATION special handling: only overridden by new FOUND
      if (prev.status === "VIOLATION") {
        if (newItem.status === "FOUND" || newItem.status === "NOT_APPLICABLE") {
          return newItem // Violation resolved
        }
        return { ...newItem, status: prev.status, evidence: prev.evidence || newItem.evidence }
      }

      // Ratchet: take the higher-priority status
      if (prevPriority > newPriority) {
        return {
          ...newItem,
          status: prev.status,
          evidence: newItem.evidence || prev.evidence,
        }
      }

      return newItem
    })

    const foundCount = mergedItems.filter(
      (i) => i.status === "FOUND" || i.status === "NOT_APPLICABLE"
    ).length
    const missingCount = mergedItems.filter(
      (i) => i.status === "MISSING" || i.status === "VIOLATION"
    ).length

    return {
      ...category,
      items: mergedItems,
      foundCount,
      missingCount,
    }
  })

  const allItems = mergedChecklist.flatMap((c) => c.items)
  const summary = {
    totalRequirements: allItems.length,
    foundCount: allItems.filter((i) => i.status === "FOUND" || i.status === "NOT_APPLICABLE").length,
    missingCount: allItems.filter((i) => i.status === "MISSING" || i.status === "VIOLATION").length,
    partialCount: allItems.filter((i) => i.status === "PARTIAL").length,
    violationCount: allItems.filter((i) => i.status === "VIOLATION").length,
  }

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
    checklist: mergedChecklist,
    summary,
    auditRisk: {
      overallScore,
      instantDenialTriggers,
      veryHighRiskItems,
      highRiskItems,
      estimatedDenialProbability: Math.min(estimatedDenialProbability, 99),
    },
  }
}
