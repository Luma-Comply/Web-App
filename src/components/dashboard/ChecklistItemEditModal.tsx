"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  FileText,
  Lightbulb,
  BookOpen,
  Loader2,
  Check,
  StickyNote,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChecklistItemWithEdits } from "@/lib/lcd-validation"
import type { AuditRiskLevel } from "@/lib/lcd-requirements"

interface ChecklistItemEditModalProps {
  item: ChecklistItemWithEdits | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (itemId: string, notes: string, markedAddressed: boolean) => Promise<void>
  isSaving?: boolean
}

export function ChecklistItemEditModal({
  item,
  open,
  onOpenChange,
  onSave,
  isSaving = false,
}: ChecklistItemEditModalProps) {
  const [notes, setNotes] = useState("")
  const [markedAddressed, setMarkedAddressed] = useState(false)

  // Sync state when item changes
  useEffect(() => {
    if (item) {
      setNotes(item.userNotes || "")
      setMarkedAddressed(item.markedAddressed || false)
    }
  }, [item])

  if (!item) return null

  const handleSave = async () => {
    await onSave(item.id, notes, markedAddressed)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "FOUND":
        return <CheckCircle2 className="w-4 h-4" />
      case "MISSING":
        return <XCircle className="w-4 h-4" />
      case "PARTIAL":
        return <AlertCircle className="w-4 h-4" />
      case "VIOLATION":
        return <AlertTriangle className="w-4 h-4" />
      case "NOT_APPLICABLE":
        return <Info className="w-4 h-4" />
      default:
        return <Info className="w-4 h-4" />
    }
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "FOUND":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "MISSING":
        return "bg-red-50 text-red-700 border-red-200"
      case "PARTIAL":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "VIOLATION":
        return "bg-red-100 text-red-800 border-red-300"
      case "NOT_APPLICABLE":
        return "bg-gray-50 text-gray-600 border-gray-200"
      default:
        return "bg-gray-50 text-gray-600 border-gray-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "FOUND":
        return "Found"
      case "MISSING":
        return "Missing"
      case "PARTIAL":
        return "Partial"
      case "VIOLATION":
        return "Violation"
      case "NOT_APPLICABLE":
        return "N/A"
      default:
        return status
    }
  }

  const getRiskBadge = (risk?: AuditRiskLevel) => {
    if (!risk) return null

    const riskStyles: Record<string, string> = {
      INSTANT_DENIAL: "bg-red-100 text-red-800 border-red-200",
      VERY_HIGH: "bg-orange-100 text-orange-800 border-orange-200",
      HIGH: "bg-amber-100 text-amber-800 border-amber-200",
      MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
      LOW: "bg-green-100 text-green-700 border-green-200",
    }

    return (
      <Badge
        variant="outline"
        className={cn("text-xs font-medium", riskStyles[risk] || riskStyles.MEDIUM)}
      >
        {risk.replace("_", " ")} Risk
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header with item label and status */}
        <DialogHeader className="space-y-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-lg font-semibold text-dark-bg leading-tight pr-6">
              {item.label}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1",
                getStatusStyles(item.status)
              )}
            >
              {getStatusIcon(item.status)}
              <span>{getStatusLabel(item.status)}</span>
            </Badge>
            {getRiskBadge(item.auditRisk)}
            {item.markedAddressed && (
              <Badge
                variant="outline"
                className="bg-mint/10 text-mint border-mint/30 flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Addressed
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Evidence Found (read-only) */}
          {item.evidence && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-emerald-800">
                  Evidence Found
                </span>
              </div>
              <p className="text-sm text-emerald-700 leading-relaxed pl-8 italic">
                &quot;{item.evidence}&quot;
              </p>
            </div>
          )}

          {/* Suggested Action (read-only) */}
          {item.suggestion && (item.status === "MISSING" || item.status === "PARTIAL") && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-amber-800">
                  Suggested Action
                </span>
              </div>
              <p className="text-sm text-amber-700 leading-relaxed pl-8">
                {item.suggestion}
              </p>
            </div>
          )}

          {/* Guidance (read-only) */}
          {item.guidance && (
            <div className="rounded-lg border border-sage-medium/40 bg-sage-light/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-sage-medium/30">
                  <BookOpen className="w-3.5 h-3.5 text-mint" />
                </div>
                <span className="text-sm font-medium text-dark-bg">
                  LCD Guidance
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed pl-8">
                {item.guidance}
              </p>
            </div>
          )}

          {/* Editable Notes Section */}
          <div className="rounded-lg border border-sage-medium/50 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-mint/15">
                <StickyNote className="w-3.5 h-3.5 text-mint" />
              </div>
              <span className="text-sm font-medium text-dark-bg">Your Notes</span>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes, codes, or clarifications for this requirement (e.g., 'Q4100, Q4101 - HTC PC codes verified')..."
              className="min-h-[100px] resize-none border-sage-medium/40 focus:border-mint focus:ring-mint/20 text-sm"
            />
            <p className="text-xs text-gray-400 mt-2">
              Notes will be incorporated when regenerating documentation.
            </p>
          </div>

          {/* Mark as Addressed Checkbox */}
          <label className="flex items-start gap-3 p-4 rounded-lg border border-sage-medium/30 bg-gray-50/50 cursor-pointer hover:bg-sage-light/10 transition-colors group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                type="checkbox"
                checked={markedAddressed}
                onChange={(e) => setMarkedAddressed(e.target.checked)}
                className="peer sr-only"
              />
              <div
                className={cn(
                  "w-5 h-5 rounded border-2 transition-all duration-200",
                  "flex items-center justify-center",
                  markedAddressed
                    ? "bg-mint border-mint"
                    : "border-gray-300 group-hover:border-mint/50"
                )}
              >
                {markedAddressed && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-dark-bg">
                Mark as Addressed
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Indicate that you&apos;ve reviewed this requirement and taken action. This helps track your progress through the checklist.
              </p>
            </div>
          </label>
        </div>

        {/* Footer with actions */}
        <DialogFooter className="pt-4 border-t border-sage-medium/20 gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="border-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-mint hover:bg-mint/90 text-white min-w-[100px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
