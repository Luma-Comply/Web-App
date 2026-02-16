"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  StickyNote,
  Check,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  LCDValidationResult,
  ChecklistEdit,
  ChecklistItemWithEdits,
} from "@/lib/lcd-validation";
import {
  AUDIT_RISK_LEVELS,
  type AuditRiskLevel,
  type WoundType,
} from "@/lib/lcd-requirements";

const WOUND_TYPE_OPTIONS: { value: WoundType; label: string }[] = [
  { value: "DFU", label: "Diabetic Foot Ulcer (DFU)" },
  { value: "VLU", label: "Venous Leg Ulcer (VLU)" },
  { value: "PRESSURE_ULCER", label: "Pressure Ulcer / Pressure Injury" },
  { value: "ARTERIAL_ULCER", label: "Arterial Ulcer" },
  { value: "SURGICAL_WOUND", label: "Surgical Wound (Non-healing)" },
  { value: "TRAUMATIC_WOUND", label: "Traumatic Wound" },
  { value: "BURN", label: "Burn Wound" },
  { value: "OTHER", label: "Other" },
];

interface LCDValidationPanelProps {
  validation: {
    riskLevel: string;
    denialProbability: number;
    foundCount: number;
    missingCount: number;
    totalRequirements: number;
    detectedWoundType?: string;
    ctpCovered: boolean;
    instantDenialTriggers: string[];
    veryHighRiskItems: string[];
    highRiskItems: string[];
    checklist: LCDValidationResult["checklist"];
    recommendations: LCDValidationResult["recommendations"];
    perplexityFindings: LCDValidationResult["perplexityFindings"];
  };
  isCollapsed?: boolean;
  checklistEdits?: Record<string, ChecklistEdit>;
  onItemClick?: (item: ChecklistItemWithEdits) => void;
  onWoundTypeChange?: (woundType: WoundType) => void;
  isEditable?: boolean;
  docType?: string;
}

// Get panel title based on document type
function getPanelTitle(docType?: string): string {
  switch (docType) {
    case "biologics_pa":
      return "LCD L35041 Validation";
    case "medical_necessity":
      return "Medical Necessity Checklist";
    case "appeal":
      return "Appeal Documentation Checklist";
    default:
      return "Documentation Checklist";
  }
}

export function LCDValidationPanel({
  validation,
  isCollapsed: initialCollapsed = false,
  checklistEdits,
  onItemClick,
  onWoundTypeChange,
  isEditable = true,
  docType,
}: LCDValidationPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Count addressed items from checklistEdits
  const addressedCount = checklistEdits
    ? Object.values(checklistEdits).filter((e) => e.marked_addressed).length
    : 0;

  // Merge user edits with checklist items
  const getItemWithEdits = (
    item: LCDValidationResult["checklist"][0]["items"][0],
  ): ChecklistItemWithEdits => {
    const edit = checklistEdits?.[item.id];
    return {
      ...item,
      userNotes: edit?.user_notes,
      markedAddressed: edit?.marked_addressed,
    };
  };

  const handleItemClick = (
    item: LCDValidationResult["checklist"][0]["items"][0],
  ) => {
    if (isEditable && onItemClick) {
      onItemClick(getItemWithEdits(item));
    }
  };

  const riskLevel = validation.riskLevel as AuditRiskLevel;
  const riskConfig = AUDIT_RISK_LEVELS[riskLevel] || AUDIT_RISK_LEVELS.MEDIUM;

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "FOUND":
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case "MISSING":
        return <div className="w-4 h-4 rounded-full border-2 border-red-400" />;
      case "PARTIAL":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "VIOLATION":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "NOT_APPLICABLE":
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "INSTANT_DENIAL":
      case "VERY_HIGH":
        return "bg-red-100 text-red-800 border-red-300";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-400";
      case "LOW":
        return "bg-blue-50 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Get status badge color based on item status and user edits
  const getStatusBadgeConfig = (
    item: ChecklistItemWithEdits,
  ): { className: string; label: string } => {
    // If status is FOUND or item is marked as addressed -> GREEN
    if (item.status === "FOUND" || item.markedAddressed) {
      return {
        className: "bg-blue-50 text-blue-800 border-blue-300",
        label:
          item.markedAddressed && item.status !== "FOUND"
            ? "Addressed"
            : "Found",
      };
    }

    // If status is MISSING and not addressed -> RED
    if (item.status === "MISSING" || item.status === "VIOLATION") {
      return {
        className: "bg-red-100 text-red-800 border-red-300",
        label: "Missing",
      };
    }

    // For PARTIAL, NOT_APPLICABLE, or any other status -> YELLOW/AMBER
    return {
      className: "bg-amber-100 text-amber-800 border-amber-300",
      label:
        item.status === "PARTIAL"
          ? "Partial"
          : item.status === "NOT_APPLICABLE"
            ? "N/A"
            : "Unknown",
    };
  };

  return (
    <Card className="bg-white rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow border-0">
      <Collapsible
        open={!isCollapsed}
        onOpenChange={() => setIsCollapsed(!isCollapsed)}
      >
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-sage-light/10 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg font-sans font-semibold">
                  {getPanelTitle(docType)}
                </CardTitle>
                {/* Badge - hidden on mobile, shown on desktop inline */}
                <Badge
                  variant="outline"
                  className={cn("ml-2 hidden sm:inline-flex", getRiskBadgeColor(riskLevel))}
                >
                  {riskConfig.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                {/* Badge - shown on mobile before the count */}
                <Badge
                  variant="outline"
                  className={cn("sm:hidden", getRiskBadgeColor(riskLevel))}
                >
                  {riskConfig.label}
                </Badge>
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
            <div className={cn(
              "grid gap-2 md:gap-4",
              docType === "biologics_pa" ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2"
            )}>
              <div className="bg-white rounded-xl p-3 md:p-4 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Denial Risk
                </div>
                {(() => {
                  // Calculate effective denial probability accounting for addressed items
                  const effectiveMissing = validation.missingCount - addressedCount;
                  const effectiveRisk = effectiveMissing <= 0 ? "LOW" :
                    effectiveMissing <= 3 ? "MEDIUM" : riskLevel;
                  const effectiveProbability = effectiveMissing <= 0 ? 5 :
                    Math.max(5, Math.round(validation.denialProbability * (effectiveMissing / validation.missingCount)));
                  return (
                    <div
                      className={cn(
                        "text-xl font-bold",
                        effectiveRisk === "LOW"
                          ? "text-blue-600"
                          : effectiveRisk === "MEDIUM"
                            ? "text-yellow-600"
                            : "text-red-600",
                      )}
                    >
                      {effectiveProbability}%
                    </div>
                  );
                })()}
              </div>
              <div className="bg-white rounded-xl p-3 md:p-4 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Missing
                </div>
                <div className="flex flex-col">
                  <span
                    className={cn(
                      "text-xl font-bold",
                      validation.missingCount - addressedCount <= 0
                        ? "text-blue-600"
                        : "text-red-600",
                    )}
                  >
                    {validation.missingCount}
                  </span>
                  {addressedCount > 0 && (
                    <span className="text-xs font-medium text-mint">
                      {addressedCount} addressed
                    </span>
                  )}
                </div>
              </div>
              {/* Wound Type - Only for Biologics PA */}
              {docType === "biologics_pa" && (
                <div className="bg-white rounded-xl p-3 md:p-4 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Wound Type
                  </div>
                  {isEditable && onWoundTypeChange ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 text-xl font-bold text-dark-bg hover:text-mint transition-colors group">
                          {validation.detectedWoundType
                            ? WOUND_TYPE_OPTIONS.find(
                                (o) => o.value === validation.detectedWoundType,
                              )?.label.split(" (")[0] ||
                              validation.detectedWoundType
                            : "Unknown"}
                          <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {WOUND_TYPE_OPTIONS.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => onWoundTypeChange(option.value)}
                            className={cn(
                              "cursor-pointer",
                              validation.detectedWoundType === option.value &&
                                "bg-mint/10 text-mint",
                            )}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="text-xl font-bold text-dark-bg">
                      {validation.detectedWoundType
                        ? validation.detectedWoundType
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() +
                                word.slice(1).toLowerCase(),
                            )
                            .join(" ")
                        : "Unknown"}
                    </div>
                  )}
                </div>
              )}
              {/* CTP Product - Only for Biologics PA */}
              {docType === "biologics_pa" && (
                <div className="bg-white rounded-xl p-3 md:p-4 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    CTP Product
                  </div>
                  <div
                    className={cn(
                      "text-xl font-bold",
                      validation.ctpCovered ? "text-blue-600" : "text-red-600",
                    )}
                  >
                    {validation.ctpCovered ? "Covered" : "Verify"}
                  </div>
                </div>
              )}
              {/* LCD Date - Only for Biologics PA */}
              {docType === "biologics_pa" && validation.perplexityFindings.lcdEffectiveDate && (
                <div className="bg-white rounded-xl p-3 md:p-4 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    LCD Date
                  </div>
                  <div className="text-xl font-bold text-dark-bg">
                    {validation.perplexityFindings.lcdEffectiveDate}
                  </div>
                </div>
              )}
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
                    <li
                      key={i}
                      className="text-sm text-red-700 flex items-start gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
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
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Checklist Categories */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">
                Documentation Checklist
              </h4>
              {validation.checklist.map((category) => {
                // Calculate effective count: found + addressed items that weren't already found
                const addressedInCategory = category.items.filter(
                  (item) => item.status !== "FOUND" && checklistEdits?.[item.id]?.marked_addressed
                ).length;
                const effectiveFoundCount = category.foundCount + addressedInCategory;
                const allResolved = effectiveFoundCount === category.items.length;

                return (
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
                            allResolved
                              ? "bg-blue-50 text-blue-800 border-blue-300"
                              : getRiskBadgeColor(category.categoryRisk),
                          )}
                        >
                          {effectiveFoundCount}/{category.items.length}
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
                        const itemWithEdits = getItemWithEdits(item);
                        const hasUserNotes = Boolean(itemWithEdits.userNotes);
                        const isAddressed = itemWithEdits.markedAddressed;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className={cn(
                              "flex items-start gap-2 rounded-md p-2 -ml-2 transition-colors",
                              isEditable &&
                                onItemClick &&
                                "cursor-pointer hover:bg-sage-light/20",
                              isAddressed && "bg-mint/5",
                            )}
                          >
                            {/* Status icon or addressed checkmark */}
                            {isAddressed ? (
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-100">
                                <Check className="w-3 h-3 text-blue-600" />
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
                                        : "text-gray-600",
                                )}
                              >
                                {item.label}
                              </div>
                              {item.evidence && (
                                <div className="text-xs text-blue-600 mt-0.5 italic">
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
                                <div
                                  className="w-2 h-2 rounded-full bg-mint"
                                  title="Has notes"
                                />
                              )}
                              {/* Status badge with color coding */}
                              {(() => {
                                const statusConfig =
                                  getStatusBadgeConfig(itemWithEdits);
                                return (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      statusConfig.className,
                                    )}
                                  >
                                    {statusConfig.label}
                                  </Badge>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
              })}
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
                            : "bg-yellow-50 border-yellow-400",
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
                                : "bg-yellow-100 text-yellow-700 border-yellow-400",
                          )}
                        >
                          {rec.priority}
                        </Badge>
                        <span className="text-sm font-medium">
                          {rec.action}
                        </span>
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
            {(() => {
              // Handle both LCD fields (currentAuditFocusAreas, recentLcdChanges)
              // and generic fields (auditFocusAreas, recentChanges)
              const findings = validation.perplexityFindings as any
              const auditAreas = findings?.currentAuditFocusAreas || findings?.auditFocusAreas || []
              const recentChanges = findings?.recentLcdChanges || findings?.recentChanges || []

              if (auditAreas.length === 0 && recentChanges.length === 0) return null

              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Research Notes
                  </h4>
                  {recentChanges.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-blue-700">
                        {docType === "biologics_pa" ? "Recent LCD Changes:" : "Recent Policy Changes:"}
                      </span>
                      <ul className="text-xs text-blue-600 ml-4">
                        {recentChanges.map((change: string, i: number) => (
                          <li key={i}>- {change}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {auditAreas.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-blue-700">
                        {docType === "biologics_pa" ? "Audit Focus Areas:" : "Payer Focus Areas:"}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {auditAreas.map((area: string, i: number) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs bg-blue-100 text-blue-700 border-blue-300"
                          >
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
