"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import type { CaseData } from "../types"
import { inferGender } from "../utils"

interface PatientHeaderStripProps {
  caseData: CaseData
  isCompact: boolean
  displayFirstName: string
  displayLastName: string
  displayPayer: string
  showExtractedNameLabel: boolean
  onEdit: () => void
}

export function PatientHeaderStrip({
  caseData,
  isCompact,
  displayFirstName,
  displayLastName,
  displayPayer,
  showExtractedNameLabel,
  onEdit,
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

  // Build a human-readable case reference: PA-6E7A1BFB
  const refPrefix = caseData.doc_type === "appeal" ? "APL" : "PA"
  const caseRef = `${refPrefix}-${caseData.id.slice(0, 8).toUpperCase()}`

  return (
    <header
      className={`sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200/60 transition-all duration-300 ${
        isCompact ? "py-3 shadow-sm" : "py-4"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between gap-6">
        {/* Left: Back + Patient Info */}
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/dashboard" className="flex-shrink-0">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-dark-bg hover:bg-gray-100 h-8 px-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          {/* Avatar */}
          <div
            className={`flex-shrink-0 rounded-xl bg-dark-bg text-white flex items-center justify-center font-semibold transition-all duration-300 ${
              isCompact ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
            }`}
            aria-label={`${displayFirstName} ${displayLastName}`}
          >
            {initials}
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1
                className={`font-serif font-semibold tracking-tight transition-all duration-300 ${
                  isCompact ? "text-base" : "text-xl"
                }`}
              >
                {displayFirstName} {displayLastName}
              </h1>
              {showExtractedNameLabel && (
                <span className="text-xs text-gray-400">(from notes)</span>
              )}
              <span className="text-xs text-gray-400">
                {caseData.patient_age}y · {displayGender} · {caseData.patient_state}
              </span>
            </div>

            {/* Details row — hidden when compact */}
            {!isCompact && (
              <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-500" aria-hidden={isCompact}>
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
                <button
                  onClick={onEdit}
                  className="rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors px-2.5 py-0.5 text-[11px] text-gray-500 hover:text-gray-700 font-medium"
                  title="Edit case details"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
