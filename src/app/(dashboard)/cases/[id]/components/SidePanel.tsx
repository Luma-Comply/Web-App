"use client"

import { Card } from "@/components/ui/card"
import {
  RefreshCw,
  Clock,
  ChevronRight,
  FileWarning,
} from "lucide-react"
import type { CaseData, AppealCase } from "../types"
import { getStatusConfig, formatDate } from "../utils"
import Link from "next/link"

interface SidePanelProps {
  caseData: CaseData
  isInChatMode: boolean
  appealCases: AppealCase[]

  // Regenerate action
  onRegenerate: () => void
  onGenerate: () => void
  generating: boolean
}

export function SidePanel({
  caseData,
  isInChatMode,
  appealCases,
  onRegenerate,
  onGenerate,
  generating,
}: SidePanelProps) {
  return (
    <div className="hidden lg:block w-80 flex-shrink-0 space-y-4">
      {/* Regenerate CTA */}
      {!isInChatMode && (
        <Card className="p-4 bg-white rounded-xl border border-gray-200">
          <button
            onClick={() => {
              if (caseData.generated_output) {
                onRegenerate()
              } else {
                onGenerate()
              }
            }}
            disabled={generating}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <RefreshCw className={`w-4 h-4 text-amber-600 ${generating ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-bg">
                {caseData.generated_output ? "Regenerate" : "Generate"}
              </p>
              <p className="text-[11px] text-gray-400">Re-run payer research</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
          </button>
        </Card>
      )}

      {/* Denial Details (informational) */}
      {caseData.status === "denied" && caseData.denial_category && (
        <Card className="p-4 bg-white rounded-xl border border-gray-200">
          <div className="p-3 bg-coral/5 border border-coral/15 rounded-lg">
            <p className="text-xs font-semibold text-coral uppercase tracking-wide mb-2">Denial Details</p>
            <div className="space-y-1.5 text-sm">
              <p className="text-dark-bg"><span className="text-dark-bg/50">Category:</span> {caseData.denial_category}</p>
              {caseData.denial_reason && (
                <p className="text-dark-bg"><span className="text-dark-bg/50">Reason:</span> {caseData.denial_reason}</p>
              )}
              {caseData.denial_notes && (
                <p className="text-dark-bg/70 text-xs mt-1 italic">{caseData.denial_notes}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* PA Expiration (informational — approved status) */}
      {caseData.status === "approved" && caseData.pa_expiration_date && (() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const expDate = new Date(caseData.pa_expiration_date)
        expDate.setHours(0, 0, 0, 0)
        const daysUntilExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const isExpired = daysUntilExpiry < 0
        const expiresWithin30 = daysUntilExpiry >= 0 && daysUntilExpiry <= 30
        return (
          <Card className="p-4 bg-white rounded-xl border border-gray-200">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              isExpired ? "bg-coral/5 border-coral/20" : expiresWithin30 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
            }`}>
              <Clock className={`w-4 h-4 flex-shrink-0 ${isExpired ? "text-coral" : expiresWithin30 ? "text-amber-600" : "text-green-600"}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${isExpired ? "text-coral" : expiresWithin30 ? "text-amber-800" : "text-green-800"}`}>
                  {isExpired ? "PA Expired" : daysUntilExpiry === 0 ? "Expires today" : `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`}
                </p>
                <p className="text-xs text-dark-bg/50">{formatDate(caseData.pa_expiration_date)}</p>
              </div>
            </div>
          </Card>
        )
      })()}

      {/* Appeal History (informational) */}
      {appealCases.length > 0 && (
        <Card className="p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Appeal History</p>
          <div className="space-y-2">
            {appealCases.map((appeal) => {
              const statusConf = getStatusConfig(appeal.status)
              return (
                <Link
                  key={appeal.id}
                  href={`/cases/${appeal.id}`}
                  className="flex items-center justify-between p-2 rounded-md bg-amber-50 border border-amber-100 hover:border-amber-300 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileWarning className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="text-sm text-dark-bg truncate group-hover:underline">
                      Appeal &mdash; {formatDate(appeal.created_at)}
                    </span>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusConf.classes} flex-shrink-0`}>
                    {statusConf.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
