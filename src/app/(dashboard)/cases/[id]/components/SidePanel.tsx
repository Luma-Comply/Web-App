"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Bell,
  ChevronRight,
  Download,
  FileWarning,
  Loader2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react"
import type { CaseData, AppealCase } from "../types"
import { getStatusConfig, formatDate } from "../utils"
import Link from "next/link"

interface SidePanelProps {
  caseData: CaseData
  hasGenerated: boolean
  isInChatMode: boolean
  appealCases: AppealCase[]

  // Quick action handlers
  onChat: () => void
  onP2PRehearsal: () => void
  onRegenerate: () => void
  onGenerate: () => void
  generating: boolean

  // Status actions
  onSubmit: () => void
  onApproved: () => void
  onDenied: () => void
  onFollowUp: () => void
  onStartRenewal: () => void
  onCreateAppeal: () => void
  onP2PSheet: () => void
  isStartingRenewal: boolean
  isCreatingAppeal: boolean
}

export function SidePanel({
  caseData,
  hasGenerated,
  isInChatMode,
  appealCases,
  onChat,
  onP2PRehearsal,
  onRegenerate,
  onGenerate,
  generating,
  onSubmit,
  onApproved,
  onDenied,
  onFollowUp,
  onStartRenewal,
  onCreateAppeal,
  onP2PSheet,
  isStartingRenewal,
  isCreatingAppeal,
}: SidePanelProps) {
  return (
    <div className="hidden lg:block w-80 flex-shrink-0 space-y-4">
      {/* Quick Actions */}
      <Card className="p-4 bg-white rounded-xl border border-gray-200">
        <h3 className="text-xs font-semibold text-dark-bg/50 uppercase tracking-wide mb-3">Quick Actions</h3>
        <div className="space-y-1.5">
          {/* Chat with Luma — hero button with video background */}
          <button
            onClick={onChat}
            className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer border-0 outline-none overflow-hidden text-left group"
            style={{ background: 'linear-gradient(90deg, #24315D 0%, #161F35 100%)' }}
            aria-label="Open chat with Luma AI assistant"
          >
            <div
              className="absolute right-0 top-0 w-1/2 h-full pointer-events-none overflow-hidden"
              style={{
                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 50%)',
                maskImage: 'linear-gradient(90deg, transparent 0%, black 50%)',
              }}
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover opacity-20"
                style={{ mixBlendMode: 'screen' }}
                poster="/hero.webp"
              >
                <source src="/hero.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="relative z-10 w-8 h-8 rounded-lg bg-[#1652C5]/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-[#1652C5]" />
            </div>
            <div className="relative z-10 flex-1 min-w-0">
              <p className="text-sm font-medium text-white leading-tight">Chat with Luma</p>
              <p className="text-[11px] text-white/50 leading-tight">Ask questions or discuss gaps</p>
            </div>
            <ChevronRight className="relative z-10 w-4 h-4 text-white/30 group-hover:text-white/50 flex-shrink-0" />
          </button>

          {caseData.generated_output && (
            <button
              onClick={onP2PRehearsal}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-bg">Payer Call Practice</p>
                <p className="text-[11px] text-gray-400">Rehearse P2P defense</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
            </button>
          )}

          {!isInChatMode && (
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
          )}
        </div>
      </Card>

      {/* Status Actions */}
      {hasGenerated && !isInChatMode && (
        <Card className="p-4 bg-white rounded-xl border border-gray-200">
          <h3 className="text-xs font-semibold text-dark-bg/50 uppercase tracking-wide mb-3">Status Actions</h3>
          <div className="space-y-2">
            {caseData.status === "draft" && (
              <Button onClick={onSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                <Send className="w-4 h-4 mr-2" />
                Mark as Submitted
              </Button>
            )}
            {caseData.status === "submitted" && (
              <>
                <div className="flex gap-2">
                  <Button onClick={onApproved} className="flex-1 bg-green-600 hover:bg-green-700 text-white" size="sm">
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Approved
                  </Button>
                  <Button onClick={onDenied} variant="outline" className="flex-1 border-coral/30 text-coral hover:bg-coral/10 hover:text-coral" size="sm">
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Denied
                  </Button>
                </div>
                {/* Follow-up with expiration check */}
                {(() => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const expectedDate = caseData.expected_decision_date ? new Date(caseData.expected_decision_date) : null
                  if (expectedDate) expectedDate.setHours(0, 0, 0, 0)
                  const followupDt = caseData.followup_date ? new Date(caseData.followup_date) : null
                  const isPastExpected = expectedDate && today > expectedDate
                  const needsFollowup = isPastExpected && (!followupDt || followupDt < expectedDate)
                  return (
                    <div className="pt-1">
                      {needsFollowup && (
                        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          <span className="text-xs text-amber-800 font-medium">Follow-up recommended</span>
                        </div>
                      )}
                      <Button onClick={onFollowUp} variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-blue-50" size="sm">
                        <Bell className="w-4 h-4 mr-2" />
                        Mark Follow-Up
                      </Button>
                      {caseData.followup_date && (
                        <p className="text-xs text-dark-bg/50 text-center mt-1.5">
                          Last followed up: {formatDate(caseData.followup_date)}
                        </p>
                      )}
                    </div>
                  )
                })()}
              </>
            )}
            {caseData.status === "approved" && (() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const expDate = caseData.pa_expiration_date ? new Date(caseData.pa_expiration_date) : null
              if (expDate) expDate.setHours(0, 0, 0, 0)
              const daysUntilExpiry = expDate ? Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null
              const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0
              const expiresWithin30 = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30
              return (
                <div className="space-y-2">
                  {expDate && (
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
                  )}
                  <Button onClick={onStartRenewal} disabled={isStartingRenewal} className="w-full bg-dark-bg hover:bg-dark-bg/90 text-white" size="sm">
                    {isStartingRenewal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                    {isStartingRenewal ? "Creating..." : "Start Renewal"}
                  </Button>
                </div>
              )
            })()}
            {caseData.status === "denied" && (
              <div className="flex gap-2">
                <Button onClick={onCreateAppeal} className="flex-1 bg-dark-bg hover:bg-dark-bg/90 text-white" size="sm" disabled={isCreatingAppeal}>
                  {isCreatingAppeal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileWarning className="w-4 h-4 mr-2" />}
                  {isCreatingAppeal ? "Creating..." : "Generate Appeal"}
                </Button>
                <Button onClick={onP2PSheet} variant="outline" className="flex-1 border-dark-bg/20 text-dark-bg hover:bg-dark-bg/5" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  P2P Prep
                </Button>
              </div>
            )}
          </div>

          {/* Denial Details */}
          {caseData.status === "denied" && caseData.denial_category && (
            <div className="mt-3 p-3 bg-coral/5 border border-coral/15 rounded-lg">
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
          )}

          {/* Appeal History */}
          {appealCases.length > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200/50 rounded-lg">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Appeal History</p>
              <div className="space-y-2">
                {appealCases.map((appeal) => {
                  const statusConf = getStatusConfig(appeal.status)
                  return (
                    <Link
                      key={appeal.id}
                      href={`/cases/${appeal.id}`}
                      className="flex items-center justify-between p-2 rounded-md bg-white border border-amber-100 hover:border-amber-300 transition-colors group"
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
            </div>
          )}
        </Card>
      )}

    </div>
  )
}
