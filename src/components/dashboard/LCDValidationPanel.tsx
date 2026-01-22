"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  StickyNote,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LCDValidationResult, ChecklistEdit, ChecklistItemWithEdits } from "@/lib/lcd-validation"
import { AUDIT_RISK_LEVELS, type AuditRiskLevel } from "@/lib/lcd-requirements"

interface LCDValidationPanelProps {
  validation: {
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
  isCollapsed?: boolean
  checklistEdits?: Record<string, ChecklistEdit>
  onItemClick?: (item: ChecklistItemWithEdits) => void
  isEditable?: boolean
}

export function LCDValidationPanel({
  validation,
  isCollapsed: initialCollapsed = false,
  checklistEdits,
  onItemClick,
  isEditable = true,
}: LCDValidationPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])

  // Merge user edits with checklist items
  const getItemWithEdits = (item: LCDValidationResult["checklist"][0]["items"][0]): ChecklistItemWithEdits => {
    const edit = checklistEdits?.[item.id]
    return {
      ...item,
      userNotes: edit?.user_notes,
      markedAddressed: edit?.marked_addressed,
    }
  }

  const handleItemClick = (item: LCDValidationResult["checklist"][0]["items"][0]) => {
    if (isEditable && onItemClick) {
      onItemClick(getItemWithEdits(item))
    }
  }

  const riskLevel = validation.riskLevel as AuditRiskLevel
  const riskConfig = AUDIT_RISK_LEVELS[riskLevel] || AUDIT_RISK_LEVELS.MEDIUM

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "FOUND":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case "MISSING":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "PARTIAL":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case "VIOLATION":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case "NOT_APPLICABLE":
        return <Info className="w-4 h-4 text-gray-400" />
      default:
        return <Info className="w-4 h-4 text-gray-400" />
    }
  }

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "INSTANT_DENIAL":
      case "VERY_HIGH":
        return "bg-red-100 text-red-800 border-red-300"
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-300"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-400"
      case "LOW":
        return "bg-green-100 text-green-800 border-green-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  return (
    <Card className="bg-white rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow border-0">
      <Collapsible open={!isCollapsed} onOpenChange={() => setIsCollapsed(!isCollapsed)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-sage-light/10 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg font-sans font-semibold">
                  LCD L35041 Validation
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn("ml-2", getRiskBadgeColor(riskLevel))}
                >
                  {riskConfig.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {validation.foundCount}/{validation.totalRequirements} found
                </span>
                {isCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Denial Risk</div>
                <div
                  className={cn(
                    "text-xl font-bold",
                    riskLevel === "LOW"
                      ? "text-green-600"
                      : riskLevel === "MEDIUM"
                        ? "text-yellow-600"
                        : "text-red-600"
                  )}
                >
                  {validation.denialProbability}%
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Wound Type</div>
                <div className="text-xl font-bold text-dark-bg">
                  {validation.detectedWoundType
                    ? validation.detectedWoundType.split('_').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      ).join(' ')
                    : "Unknown"}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">CTP Product</div>
                <div
                  className={cn(
                    "text-xl font-bold",
                    validation.ctpCovered ? "text-green-600" : "text-red-600"
                  )}
                >
                  {validation.ctpCovered ? "Covered" : "Verify"}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">LCD Date</div>
                <div className="text-xl font-bold text-dark-bg">
                  {validation.perplexityFindings.lcdEffectiveDate}
                </div>
              </div>
            </div>

            {/* Instant Denial Warnings */}
            {validation.instantDenialTriggers.length > 0 && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-800">
                    Instant Denial Triggers
                  </span>
                </div>
                <ul className="space-y-1">
                  {validation.instantDenialTriggers.map((trigger, i) => (
                    <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                      <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {trigger}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Very High Risk Items */}
            {validation.veryHighRiskItems.length > 0 && (
              <div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-orange-800">
                    Very High Risk - Missing
                  </span>
                </div>
                <ul className="space-y-1">
                  {validation.veryHighRiskItems.map((item, i) => (
                    <li
                      key={i}
                      className="text-sm text-orange-700 flex items-start gap-2"
                    >
                      <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Checklist Categories */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Documentation Checklist</h4>
              {validation.checklist.map((category) => (
                <Collapsible
                  key={category.category}
                  open={expandedCategories.includes(category.category)}
                  onOpenChange={() => toggleCategory(category.category)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            getRiskBadgeColor(category.categoryRisk)
                          )}
                        >
                          {category.foundCount}/{category.items.length}
                        </Badge>
                        <span className="font-medium">{category.category}</span>
                      </div>
                      {expandedCategories.includes(category.category) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-l-2 border-gray-200 ml-4 pl-4 py-2 space-y-2">
                      {category.items.map((item) => {
                        const itemWithEdits = getItemWithEdits(item)
                        const hasUserNotes = Boolean(itemWithEdits.userNotes)
                        const isAddressed = itemWithEdits.markedAddressed

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className={cn(
                              "flex items-start gap-2 rounded-md p-2 -ml-2 transition-colors",
                              isEditable && onItemClick && "cursor-pointer hover:bg-sage-light/20",
                              isAddressed && "bg-mint/5"
                            )}
                          >
                            {/* Status icon or addressed checkmark */}
                            {isAddressed ? (
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-mint/20">
                                <Check className="w-3 h-3 text-mint" />
                              </div>
                            ) : (
                              getStatusIcon(item.status)
                            )}
                            <div className="flex-1 min-w-0">
                              <div
                                className={cn(
                                  "text-sm",
                                  isAddressed
                                    ? "text-mint font-medium"
                                    : item.status === "FOUND"
                                      ? "text-gray-700"
                                      : item.status === "VIOLATION"
                                        ? "text-red-700 font-medium"
                                        : "text-gray-600"
                                )}
                              >
                                {item.label}
                              </div>
                              {item.evidence && (
                                <div className="text-xs text-green-600 mt-0.5 italic">
                                  Found: "{item.evidence}"
                                </div>
                              )}
                              {item.suggestion &&
                                (item.status === "MISSING" ||
                                  item.status === "PARTIAL") &&
                                !isAddressed && (
                                  <div className="text-xs text-orange-600 mt-0.5">
                                    Add: {item.suggestion}
                                  </div>
                                )}
                              {/* Show user notes indicator */}
                              {hasUserNotes && (
                                <div className="flex items-center gap-1 text-xs text-mint mt-1">
                                  <StickyNote className="w-3 h-3" />
                                  <span className="truncate max-w-[200px]">
                                    {itemWithEdits.userNotes}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {/* Notes indicator badge */}
                              {hasUserNotes && !isAddressed && (
                                <div className="w-2 h-2 rounded-full bg-mint" title="Has notes" />
                              )}
                              {item.auditRisk && item.status !== "FOUND" && !isAddressed && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    getRiskBadgeColor(item.auditRisk)
                                  )}
                                >
                                  {item.auditRisk.replace("_", " ")}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            {/* Recommendations */}
            {validation.recommendations.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Recommendations</h4>
                <div className="space-y-2">
                  {validation.recommendations.slice(0, 5).map((rec, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded-lg border",
                        rec.priority === "CRITICAL"
                          ? "bg-red-50 border-red-300"
                          : rec.priority === "HIGH"
                            ? "bg-orange-50 border-orange-300"
                            : "bg-yellow-50 border-yellow-400"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            rec.priority === "CRITICAL"
                              ? "bg-red-100 text-red-700 border-red-300"
                              : rec.priority === "HIGH"
                                ? "bg-orange-100 text-orange-700 border-orange-300"
                                : "bg-yellow-100 text-yellow-700 border-yellow-400"
                          )}
                        >
                          {rec.priority}
                        </Badge>
                        <span className="text-sm font-medium">{rec.action}</span>
                      </div>
                      <p className="text-xs text-gray-600">{rec.reason}</p>
                      {rec.suggestedLanguage && (
                        <p className="text-xs text-blue-600 mt-1 italic">
                          Suggested: "{rec.suggestedLanguage}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Perplexity Research Notes */}
            {(validation.perplexityFindings.currentAuditFocusAreas.length > 0 ||
              validation.perplexityFindings.recentLcdChanges.length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Research Notes</h4>
                {validation.perplexityFindings.recentLcdChanges.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-blue-700">
                      Recent LCD Changes:
                    </span>
                    <ul className="text-xs text-blue-600 ml-4">
                      {validation.perplexityFindings.recentLcdChanges.map(
                        (change, i) => (
                          <li key={i}>- {change}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
                {validation.perplexityFindings.currentAuditFocusAreas.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-blue-700">
                      Audit Focus Areas:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {validation.perplexityFindings.currentAuditFocusAreas.map(
                        (area, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs bg-blue-100 text-blue-700 border-blue-300"
                          >
                            {area}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
