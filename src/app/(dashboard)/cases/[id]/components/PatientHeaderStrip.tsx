"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  MoreVertical,
  Menu,
  MessageSquare,
  Pencil,
  Send,
  ThumbsUp,
  ThumbsDown,
  Bell,
  RotateCcw,
  FileWarning,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import type { CaseData } from "../types"
import { inferGender } from "../utils"

interface PatientHeaderStripProps {
  caseData: CaseData
  isCompact: boolean
  displayFirstName: string
  displayLastName: string
  displayPayer: string
  showExtractedNameLabel: boolean
  hasGenerated: boolean
  isInChatMode: boolean
  onEdit: () => void
  onChat: () => void
  onSubmit: () => void
  onApproved: () => void
  onDenied: () => void
  onFollowUp: () => void
  onStartRenewal: () => void
  onCreateAppeal: () => void
  isStartingRenewal: boolean
  isCreatingAppeal: boolean
  needsFollowup: boolean
}

export function PatientHeaderStrip({
  caseData,
  isCompact,
  displayFirstName,
  displayLastName,
  displayPayer,
  showExtractedNameLabel,
  hasGenerated,
  isInChatMode,
  onEdit,
  onChat,
  onSubmit,
  onApproved,
  onDenied,
  onFollowUp,
  onStartRenewal,
  onCreateAppeal,
  isStartingRenewal,
  isCreatingAppeal,
  needsFollowup,
}: PatientHeaderStripProps) {
  const initials = `${(displayFirstName || "?")[0]}${(displayLastName || "?")[0]}`.toUpperCase()
  const displayGender = caseData.patient_gender || inferGender(displayFirstName) || "—"

  const docTypeLabel = (() => {
    switch (caseData.doc_type) {
      case "biologics_pa": return "Biologics PA"
      case "medical_necessity": return "Prior Auth Letter"
      case "appeal": return "Appeal Letter"
      default: return "Case"
    }
  })()

  const refPrefix = caseData.doc_type === "appeal" ? "APL" : "PA"
  const caseRef = `${refPrefix}-${caseData.id.slice(0, 8).toUpperCase()}`

  const showStatusActions = hasGenerated && !isInChatMode

  // Status action menu items — shared between mobile menu and desktop visible buttons
  const statusMenuItems = showStatusActions && (
    <>
      {caseData.status === "draft" && (
        <DropdownMenuItem onClick={onSubmit} className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer">
          <Send className="mr-2 h-4 w-4 text-blue-600" />
          Mark as Submitted
        </DropdownMenuItem>
      )}
      {caseData.status === "submitted" && (
        <>
          <DropdownMenuItem onClick={onApproved} className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer">
            <ThumbsUp className="mr-2 h-4 w-4 text-green-600" />
            Mark Approved
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDenied} className="focus:bg-coral/10 focus:text-coral cursor-pointer">
            <ThumbsDown className="mr-2 h-4 w-4" />
            Mark Denied
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onFollowUp} className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer">
            <Bell className="mr-2 h-4 w-4 text-blue-600" />
            <span className="flex-1">Mark Follow-Up</span>
            {needsFollowup && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          </DropdownMenuItem>
        </>
      )}
      {caseData.status === "approved" && (
        <DropdownMenuItem onClick={onStartRenewal} disabled={isStartingRenewal} className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer">
          {isStartingRenewal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
          {isStartingRenewal ? "Creating..." : "Start Renewal"}
        </DropdownMenuItem>
      )}
      {caseData.status === "denied" && (
        <DropdownMenuItem onClick={onCreateAppeal} disabled={isCreatingAppeal} className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer">
          {isCreatingAppeal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileWarning className="mr-2 h-4 w-4" />}
          {isCreatingAppeal ? "Creating..." : "Generate Appeal"}
        </DropdownMenuItem>
      )}
    </>
  )

  return (
    <header
      className={`sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200/60 transition-all duration-300 ${
        isCompact ? "py-3 shadow-sm" : "py-4"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 flex items-center justify-between gap-3 md:gap-6">
        {/* Left: Back + Patient Info */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Link href="/dashboard" className="flex-shrink-0">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-dark-bg hover:bg-gray-100 h-8 px-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          {/* Avatar — hidden on mobile */}
          <div
            className={`hidden md:flex flex-shrink-0 rounded-xl bg-dark-bg text-white items-center justify-center font-semibold transition-all duration-300 ${
              isCompact ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
            }`}
            aria-label={`${displayFirstName} ${displayLastName}`}
          >
            {initials}
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 md:gap-2 flex-wrap">
              <h1
                className={`font-serif font-semibold tracking-tight transition-all duration-300 truncate ${
                  isCompact ? "text-sm md:text-base" : "text-base md:text-xl"
                }`}
              >
                {displayFirstName} {displayLastName}
              </h1>
              {showExtractedNameLabel && (
                <span className="text-xs text-gray-400 hidden sm:inline">(from notes)</span>
              )}
              <span className="text-[11px] md:text-xs text-gray-400 whitespace-nowrap">
                {caseData.patient_age}y · {displayGender} · {caseData.patient_state}
              </span>
            </div>

            {/* Details row — hidden on mobile and when compact */}
            {!isCompact && (
              <div className="hidden md:flex items-center gap-4 mt-0.5 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="text-gray-400">Payer</span>
                  <strong className="text-dark-bg font-medium">{displayPayer || "—"}</strong>
                </span>
                {caseData.claim_amount != null && caseData.claim_amount > 0 && (
                  <>
                    <span className="w-px h-3.5 bg-gray-200" />
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400">Claim</span>
                      <strong className="text-dark-bg font-medium">
                        ${caseData.claim_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </span>
                  </>
                )}
                <span className="w-px h-3.5 bg-gray-200" />
                <span className="text-gray-400">{docTypeLabel}</span>
                <span className="w-px h-3.5 bg-gray-200" />
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-dark-bg/60 bg-gray-100 rounded px-1.5 py-0.5 font-medium">{caseRef}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Desktop — visible status buttons + secondary dropdown */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {showStatusActions && (
            <>
              {caseData.status === "draft" && (
                <Button onClick={onSubmit} size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Mark as Submitted
                </Button>
              )}

              {caseData.status === "submitted" && (
                <div className="flex items-center gap-1.5">
                  {needsFollowup && (
                    <button
                      onClick={onFollowUp}
                      className="flex items-center gap-1 h-8 px-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                      title="Follow-up recommended"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium hidden lg:inline">Follow Up</span>
                    </button>
                  )}
                  <Button onClick={onApproved} size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs">
                    <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                    Approved
                  </Button>
                  <Button onClick={onDenied} variant="outline" size="sm" className="h-8 border-coral/30 text-coral hover:bg-coral/10 text-xs">
                    <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
                    Denied
                  </Button>
                </div>
              )}

              {caseData.status === "approved" && (
                <Button onClick={onStartRenewal} disabled={isStartingRenewal} size="sm" className="h-8 bg-dark-bg hover:bg-dark-bg/90 text-white text-xs">
                  {isStartingRenewal ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
                  {isStartingRenewal ? "Creating..." : "Start Renewal"}
                </Button>
              )}

              {caseData.status === "denied" && (
                <Button onClick={onCreateAppeal} disabled={isCreatingAppeal} size="sm" className="h-8 bg-dark-bg hover:bg-dark-bg/90 text-white text-xs">
                  {isCreatingAppeal ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileWarning className="w-3.5 h-3.5 mr-1.5" />}
                  {isCreatingAppeal ? "Creating..." : "Generate Appeal"}
                </Button>
              )}
            </>
          )}

          {/* Desktop secondary dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-dark-bg hover:bg-gray-100">
                <MoreVertical className="w-4 h-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200">
              <DropdownMenuItem onClick={onChat} className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer">
                <MessageSquare className="mr-2 h-4 w-4 text-blue-600" />
                Chat with Luma
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Case Details
              </DropdownMenuItem>
              {showStatusActions && caseData.status === "submitted" && !needsFollowup && (
                <DropdownMenuItem onClick={onFollowUp} className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer">
                  <Bell className="mr-2 h-4 w-4 text-blue-600" />
                  Mark Follow-Up
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: Mobile — single hamburger with everything */}
        <div className="flex md:hidden flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-dark-bg hover:bg-gray-100">
                <Menu className="w-4 h-4" />
                <span className="sr-only">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-white border border-gray-200">
              <DropdownMenuItem onClick={onChat} className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer">
                <MessageSquare className="mr-2 h-4 w-4 text-blue-600" />
                Chat with Luma
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Case Details
              </DropdownMenuItem>

              {showStatusActions && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</DropdownMenuLabel>
                  {statusMenuItems}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
