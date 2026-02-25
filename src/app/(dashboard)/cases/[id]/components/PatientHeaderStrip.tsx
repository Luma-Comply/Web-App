"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  Menu,
  X,
  MessageSquare,
  Pencil,
  RefreshCw,
  LayoutGrid,
  FileText,
  Search,
  Clock,
  Plus,
  ChevronDown,
  User,
  Users,
  CreditCard,
  LogOut,
  ExternalLink,
  Building2,
  Shield,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
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
  activeTab: string
  onTabChange: (tab: string) => void
  onEdit: () => void
  onChat: () => void
  onRegenerate: () => void
  onGenerate: () => void
  generating: boolean
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
  activeTab,
  onTabChange,
  onEdit,
  onChat,
  onRegenerate,
  onGenerate,
  generating,
}: PatientHeaderStripProps) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<{
    email: string; practiceName: string; isTeamOwner: boolean; isSuperAdmin: boolean
  } | null>(null)
  const initials = `${(displayFirstName || "?")[0]}${(displayLastName || "?")[0]}`.toUpperCase()
  const displayGender = caseData.patient_gender || inferGender(displayFirstName) || "—"

  // Fetch user info for org dropdown
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase
        .from("users")
        .select("practice_name, subscription_tier, is_super_admin")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          setUserInfo({
            email: session.user.email || "",
            practiceName: data?.practice_name || "",
            isTeamOwner: data?.subscription_tier === "professional",
            isSuperAdmin: !!data?.is_super_admin,
          })
        })
    })
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [mobileMenuOpen])

  const handleMobileAction = (action: () => void) => {
    setMobileMenuOpen(false)
    // Small delay so the panel closes before the action triggers (e.g. opening a modal)
    setTimeout(action, 150)
  }

  return (
    <>
      <header
        className={`sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200/60 transition-all duration-300 ${
          isCompact ? "py-2.5 shadow-sm" : "py-3 md:py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-2 md:gap-6">
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
              {/* Name + demographics */}
              <div className="flex items-baseline gap-1.5 md:gap-2 flex-wrap">
                <h1
                  className={`font-serif font-semibold tracking-tight transition-all duration-300 truncate ${
                    isCompact ? "text-lg md:text-base" : "text-xl md:text-xl"
                  }`}
                >
                  {displayFirstName} {displayLastName}
                </h1>
                {showExtractedNameLabel && (
                  <span className="text-xs text-gray-400 hidden md:inline">(from notes)</span>
                )}
                <span className="hidden md:inline text-xs text-gray-400 whitespace-nowrap">
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

          {/* Right: New Case + Org dropdown (desktop) */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={() => router.push("/cases/new")}
              size="sm"
              className="relative overflow-hidden bg-dark-bg hover:bg-dark-bg/90 text-white transition-all duration-300 hover:scale-105 active:scale-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Button>
            {userInfo && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-gray-100">
                    <span className="text-sm text-gray-600 max-w-[200px] truncate">{userInfo.practiceName || userInfo.email}</span>
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border border-sage-medium/30">
                  <DropdownMenuItem
                    onClick={() => router.push("/settings/profile")}
                    className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  {userInfo.isTeamOwner && (
                    <>
                      <DropdownMenuItem
                        onClick={() => router.push("/settings/team")}
                        className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Team
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/settings/billing")}
                        className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Billing
                      </DropdownMenuItem>
                    </>
                  )}
                  {userInfo.isSuperAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">Admin</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => window.open("https://clarity.microsoft.com/projects/view/v64a4br39t/dashboard", "_blank")}
                        className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Clarity Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/admin/enterprise-contacts")}
                        className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        Enterprise CRM
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/settings/security")}
                        className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Security
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="focus:bg-coral/10 focus:text-coral cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Right: Mobile — hamburger trigger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex md:hidden items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-dark-bg hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Mobile slide-over panel */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Case menu"
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-base font-serif font-semibold text-dark-bg truncate">
              {displayFirstName} {displayLastName}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {caseData.patient_age}y · {displayGender} · {caseData.patient_state}
            </p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-dark-bg hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="px-3 py-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pb-1.5">Navigate</p>
          {([
            { value: "overview", label: "Overview", icon: LayoutGrid },
            { value: "documents", label: "Documents", icon: FileText },
            { value: "clinical", label: "Clinical Review", icon: Search },
            { value: "activity", label: "Activity", icon: Clock },
          ] as const).map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => handleMobileAction(() => onTabChange(tab.value))}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-100 text-dark-bg"
                    : "text-gray-600 hover:bg-gray-50 active:bg-gray-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#1652C5]" : "text-gray-400"}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-gray-100" />

        {/* Actions */}
        <div className="px-3 py-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pb-1.5">Actions</p>
          <button
            onClick={() => handleMobileAction(onEdit)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-dark-bg hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Pencil className="w-4 h-4 text-gray-400" />
            Edit Case Details
          </button>
          <button
            onClick={() => handleMobileAction(onChat)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-dark-bg hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Chat with Luma
          </button>
          {!isInChatMode && (
            <button
              onClick={() => handleMobileAction(() => {
                if (hasGenerated) onRegenerate()
                else onGenerate()
              })}
              disabled={generating}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-dark-bg hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-amber-600 ${generating ? "animate-spin" : ""}`} />
              {hasGenerated ? "Regenerate Documentation" : "Generate Documentation"}
            </button>
          )}
        </div>

        {/* Details */}
        <div className="mx-5 pt-3 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</p>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Payer</span>
              <span className="font-medium text-dark-bg">{displayPayer || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Type</span>
              <span className="font-medium text-dark-bg">{docTypeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ref</span>
              <span className="font-mono text-xs text-dark-bg/60">{caseRef}</span>
            </div>
            {caseData.claim_amount != null && caseData.claim_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Claim</span>
                <span className="font-medium text-dark-bg">
                  ${caseData.claim_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
