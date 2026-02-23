"use client"

import Link from "next/link"
import { Calendar, Send, Clock, Bell, ThumbsUp, ThumbsDown, Hash, FileWarning } from "lucide-react"
import type { CaseData, AppealCase } from "../types"
import { getStatusConfig, formatDate } from "../utils"

interface ActivityTabProps {
  caseData: CaseData
  appealCases: AppealCase[]
}

export function ActivityTab({ caseData, appealCases }: ActivityTabProps) {
  // Build full timeline entries
  const timelineEntries: { icon: React.ReactNode; label: string; date: string; color: string }[] = []

  // Created
  timelineEntries.push({
    icon: <Calendar className="w-4 h-4" />,
    label: "Case Created",
    date: formatDate(caseData.created_at),
    color: "text-gray-400",
  })

  // Submitted
  if (caseData.submitted_at) {
    timelineEntries.push({
      icon: <Send className="w-4 h-4" />,
      label: "Submitted to Payer",
      date: formatDate(caseData.submitted_at),
      color: "text-blue-500",
    })
  }

  // Expected decision
  if (caseData.expected_decision_date && !caseData.decision_date) {
    timelineEntries.push({
      icon: <Clock className="w-4 h-4" />,
      label: "Expected Decision",
      date: formatDate(caseData.expected_decision_date),
      color: "text-amber-500",
    })
  }

  // Follow-up
  if (caseData.followup_date) {
    timelineEntries.push({
      icon: <Bell className="w-4 h-4" />,
      label: "Follow-Up Logged",
      date: formatDate(caseData.followup_date),
      color: "text-blue-400",
    })
  }

  // Decision
  if (caseData.decision_date) {
    timelineEntries.push({
      icon: caseData.status === "approved"
        ? <ThumbsUp className="w-4 h-4" />
        : <ThumbsDown className="w-4 h-4" />,
      label: caseData.status === "approved" ? "Approved" : "Denied",
      date: formatDate(caseData.decision_date),
      color: caseData.status === "approved" ? "text-green-500" : "text-coral",
    })
  }

  // Expiration
  if (caseData.pa_expiration_date) {
    timelineEntries.push({
      icon: <Clock className="w-4 h-4" />,
      label: "PA Expires",
      date: formatDate(caseData.pa_expiration_date),
      color: "text-amber-500",
    })
  }

  // PA Ref
  if (caseData.pa_reference_number) {
    timelineEntries.push({
      icon: <Hash className="w-4 h-4" />,
      label: `PA Reference: ${caseData.pa_reference_number}`,
      date: "",
      color: "text-gray-400",
    })
  }

  return (
    <div className="space-y-6">
      {/* Full Timeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-sans font-semibold text-dark-bg mb-4">Timeline</h2>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-200" />

          <div className="space-y-4">
            {timelineEntries.map((entry, i) => (
              <div key={i} className="flex items-start gap-4 relative">
                <div className={`w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0 z-10 ${entry.color}`}>
                  {entry.icon}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-medium text-dark-bg">{entry.label}</p>
                  {entry.date && (
                    <p className="text-xs text-gray-500">{entry.date}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Denial Details */}
      {caseData.status === "denied" && caseData.denial_category && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-sans font-semibold text-coral mb-3">Denial Details</h2>
          <div className="space-y-2 text-sm">
            <p className="text-dark-bg"><span className="text-dark-bg/50">Category:</span> {caseData.denial_category}</p>
            {caseData.denial_reason && (
              <p className="text-dark-bg"><span className="text-dark-bg/50">Reason:</span> {caseData.denial_reason}</p>
            )}
            {caseData.denial_notes && (
              <p className="text-dark-bg/70 text-xs mt-1 italic">{caseData.denial_notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Appeal History */}
      {appealCases.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-sans font-semibold text-dark-bg mb-3">Appeal History</h2>
          <div className="space-y-2">
            {appealCases.map((appeal) => {
              const statusConf = getStatusConfig(appeal.status)
              return (
                <Link
                  key={appeal.id}
                  href={`/cases/${appeal.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200/50 hover:border-amber-300 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileWarning className="w-4 h-4 text-amber-600 flex-shrink-0" />
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
        </div>
      )}
    </div>
  )
}
