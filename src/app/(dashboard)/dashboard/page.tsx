"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LumaLogo } from "@/components/LumaLogo"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  LogOut,
  MoreHorizontal,
  Archive,
  RefreshCw,
  Trash2,
  Eye,
  User,
  Users,
  CreditCard,
  ChevronDown,
  Search,
  Building2,
  ArrowRight,
  Shield,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ExternalLink,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDistanceToNow, differenceInDays, format, subMonths, startOfMonth } from "date-fns"
import { SubscriptionBanner } from "@/components/dashboard/SubscriptionBanner"
import {
  BarList,
  ProgressBar,
} from "@tremor/react"
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface LCDValidationSummary {
  found_count?: number
  missing_count?: number
  risk_level?: string
  denial_probability?: number
}

interface Case {
  id: string
  doc_type: string
  patient_first_name: string
  patient_last_name: string
  requested_medication: string
  status: string
  created_at: string
  payer_name: string
  claim_amount: number
  is_archived: boolean
  created_by_email?: string
  submitted_at: string | null
  decision_date: string | null
  denial_category: string | null
  pa_expiration_date: string | null
  expected_decision_date: string | null
  followup_date: string | null
  parent_case_id: string | null
  pa_reference_number: string | null
  metadata?: {
    lcd_validation?: LCDValidationSummary
  } | null
}

interface Audit {
  id: string
  case_id: string | null
  patient_first_name: string | null
  patient_last_name: string | null
  requested_medication: string | null
  risk_level: string | null
  denial_probability: number | null
  found_count: number | null
  total_requirements: number | null
  created_at: string
}

interface PipelineContact {
  id: string
  contact_name: string
  title: string | null
  organization: string
  status: string
  hospital_location: string | null
  hospital_beds: string | null
  strategy_type: string | null
  monthly_price_low: number | null
  monthly_price_high: number | null
  is_active_contract: boolean
  profile_image_url: string | null
}

interface UserStats {
  total_cases: number
  cases_this_month: number
  revenue_protected: number
}

interface PipelineStats {
  total_contacts: number
  active_contracts: number
  potential_monthly_low: number
  potential_monthly_high: number
  active_monthly_low: number
  active_monthly_high: number
}

interface UserSubscription {
  subscription_status: string
  trial_ends_at: string | null
  billing_period_end: string | null
}

interface PlatformStats {
  totalUsers: number
  activeSubscribers: number
  trialingUsers: number
  mrr: number
  statusBreakdown: { active: number; trialing: number; canceled: number; past_due: number }
  signupsThisMonth: number
}


// Enterprise pipeline configs/helpers removed — hidden for now, code preserved in git history

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [cases, setCases] = useState<Case[]>([])
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [practiceName, setPracticeName] = useState("")
  const [isTeamOwner, setIsTeamOwner] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dashboardView, setDashboardView] = useState<"cases" | "analytics">("cases")
  const [activeTab, setActiveTab] = useState("active")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null)
  const [auditDeleteDialogOpen, setAuditDeleteDialogOpen] = useState(false)
  const [auditToDelete, setAuditToDelete] = useState<Audit | null>(null)
  const [payerSortKey, setPayerSortKey] = useState<"payer" | "cases" | "rate" | "turnaround">("cases")
  const [payerSortDir, setPayerSortDir] = useState<"asc" | "desc">("desc")
  const [casePage, setCasePage] = useState(0)

  const [stats, setStats] = useState<UserStats>({
    total_cases: 0,
    cases_this_month: 0,
    revenue_protected: 0,
  })

  const [subscription, setSubscription] = useState<UserSubscription>({
    subscription_status: "trialing",
    trial_ends_at: null,
    billing_period_end: null,
  })

  const [pipeline, setPipeline] = useState<PipelineStats | null>(null)
  const [pipelineContacts, setPipelineContacts] = useState<PipelineContact[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pipelineSearch, setPipelineSearch] = useState("")
  const [_pipelinePage, _setPipelinePage] = useState(0)
  const [_platformStats, _setPlatformStats] = useState<PlatformStats | null>(null)
  const PIPELINE_PAGE_SIZE = 10

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      setUserEmail(session.user.email || "")

      const { data: userData } = await supabase
        .from("users")
        .select("subscription_status, trial_ends_at, billing_period_end, practice_name, team_owner_id, is_team_owner, is_super_admin")
        .eq("id", session.user.id)
        .single()

      if (userData) {
        const userIsTeamOwner = userData.is_team_owner || !userData.team_owner_id
        setIsTeamOwner(userIsTeamOwner)
        setIsSuperAdmin(!!userData.is_super_admin)

        let ownerPracticeName = userData.practice_name || ""

        if (userData.team_owner_id) {
          const { data: ownerData } = await supabase
            .from("users")
            .select("practice_name")
            .eq("id", userData.team_owner_id)
            .single()

          if (ownerData) {
            ownerPracticeName = ownerData.practice_name || ""
          }
        }

        setPracticeName(ownerPracticeName)

        setSubscription({
          subscription_status: userData.subscription_status || "trialing",
          trial_ends_at: userData.trial_ends_at,
          billing_period_end: userData.billing_period_end,
        })
      }

      // Load cases
      const { data: casesData } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (casesData) {
        setCases(casesData as Case[])

        const thisMonth = new Date()
        thisMonth.setDate(1)
        thisMonth.setHours(0, 0, 0, 0)

        const casesThisMonth = casesData.filter(
          (c) => new Date(c.created_at) >= thisMonth
        ).length

        const totalRevenue = casesData.reduce((sum, c) => {
          return sum + (c.claim_amount || 0)
        }, 0)

        setStats({
          total_cases: casesData.length,
          cases_this_month: casesThisMonth,
          revenue_protected: totalRevenue,
        })
      }

      // Load recent audits
      const { data: auditsData } = await supabase
        .from("audits")
        .select("id, case_id, patient_first_name, patient_last_name, requested_medication, risk_level, denial_probability, found_count, total_requirements, created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      if (auditsData) {
        setAudits(auditsData as Audit[])
      }

      // Load enterprise pipeline (super admin only)
      if (userData?.is_super_admin) {
        const { data: contacts } = await supabase
          .from("enterprise_contacts")
          .select("id, contact_name, title, organization, status, hospital_location, hospital_beds, strategy_type, monthly_price_low, monthly_price_high, is_active_contract, profile_image_url")
          .order("sort_order", { ascending: true })

        if (contacts) {
          setPipelineContacts(contacts)
          const active = contacts.filter((c) => c.is_active_contract)
          const potential = contacts.filter((c) => !c.is_active_contract)
          setPipeline({
            total_contacts: contacts.length,
            active_contracts: active.length,
            potential_monthly_low: potential.reduce((s, c) => s + (c.monthly_price_low || 0), 0),
            potential_monthly_high: potential.reduce((s, c) => s + (c.monthly_price_high || 0), 0),
            active_monthly_low: active.reduce((s, c) => s + (c.monthly_price_low || 0), 0),
            active_monthly_high: active.reduce((s, c) => s + (c.monthly_price_high || 0), 0),
          })
        }

        // Fetch platform-level stats
        fetch("/api/admin/platform-stats")
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d) _setPlatformStats(d) })
          .catch(() => {})

      }
    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleArchive(caseId: string, archive: boolean) {
    try {
      setCases(
        cases.map((c) =>
          c.id === caseId ? { ...c, is_archived: archive } : c
        )
      )

      await supabase
        .from("cases")
        .update({ is_archived: archive })
        .eq("id", caseId)
    } catch (error) {
      console.error("Error updating case:", error)
      loadDashboardData()
    }
  }

  function openDeleteDialog(caseItem: Case) {
    setCaseToDelete(caseItem)
    setDeleteDialogOpen(true)
  }

  async function handleDelete() {
    if (!caseToDelete) return

    try {
      const { data: deleted, error } = await supabase
        .from("cases")
        .delete()
        .eq("id", caseToDelete.id)
        .select('id')

      if (error) {
        throw error
      }

      if (!deleted || deleted.length === 0) {
        toast({
          variant: "destructive",
          title: "Cannot Delete",
          description: "You can only delete cases you created. Team member cases must be deleted by their owner.",
        })
        setDeleteDialogOpen(false)
        setCaseToDelete(null)
        return
      }

      setCases(cases.filter(c => c.id !== caseToDelete.id))
      loadDashboardData()
      setDeleteDialogOpen(false)
      setCaseToDelete(null)

      toast({
        title: "Case Deleted",
        description: "The case has been permanently removed.",
      })
    } catch (error) {
      console.error("Error deleting case:", error)
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Something went wrong. Please try again.",
      })
      loadDashboardData()
    }
  }

  async function handleDeleteAudit() {
    if (!auditToDelete) return
    try {
      const { error } = await supabase
        .from("audits")
        .delete()
        .eq("id", auditToDelete.id)

      if (error) throw error

      setAudits(audits.filter((a) => a.id !== auditToDelete.id))
      setAuditDeleteDialogOpen(false)
      setAuditToDelete(null)
      toast({ title: "Audit Deleted", description: "The audit has been removed." })
    } catch (error) {
      console.error("Error deleting audit:", error)
      toast({ variant: "destructive", title: "Delete Failed", description: "Something went wrong. Please try again." })
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

  // Pipeline search + pagination
  const filteredPipeline = pipelineContacts.filter((c) => {
    if (!pipelineSearch.trim()) return true
    const q = pipelineSearch.toLowerCase()
    return (
      c.contact_name.toLowerCase().includes(q) ||
      c.organization.toLowerCase().includes(q) ||
      (c.title?.toLowerCase().includes(q) ?? false) ||
      (c.hospital_location?.toLowerCase().includes(q) ?? false) ||
      (c.strategy_type?.toLowerCase().includes(q) ?? false) ||
      (c.status?.toLowerCase().includes(q) ?? false)
    )
  })
  const _pipelineTotalPages = Math.max(1, Math.ceil(filteredPipeline.length / PIPELINE_PAGE_SIZE))
  const _paginatedPipeline = filteredPipeline.slice(
    _pipelinePage * PIPELINE_PAGE_SIZE,
    (_pipelinePage + 1) * PIPELINE_PAGE_SIZE
  )

  const _now = new Date()

  // ═══════════ ANALYTICS COMPUTATIONS ═══════════
  const analytics = useMemo(() => {
    const allCases = cases
    const approved = allCases.filter((c) => c.status === "approved")
    const denied = allCases.filter((c) => c.status === "denied")
    const decided = approved.length + denied.length

    // Overall approval rate
    const approvalRate = decided > 0 ? Math.round((approved.length / decided) * 100) : 0

    // Average turnaround (submitted_at → decision_date)
    const turnaroundDays: number[] = []
    allCases.forEach((c) => {
      if (c.submitted_at && c.decision_date) {
        const days = differenceInDays(new Date(c.decision_date), new Date(c.submitted_at))
        if (days >= 0) turnaroundDays.push(days)
      }
    })
    const avgTurnaround = turnaroundDays.length > 0
      ? Math.round(turnaroundDays.reduce((s, d) => s + d, 0) / turnaroundDays.length)
      : 0

    // Status distribution for donut chart
    const statusDistribution = [
      { name: "Draft", value: allCases.filter((c) => c.status === "draft" || c.status === "chat").length },
      { name: "Submitted", value: allCases.filter((c) => c.status === "submitted").length },
      { name: "Approved", value: approved.length },
      { name: "Denied", value: denied.length },
    ].filter((s) => s.value > 0)

    // Cases per month (last 12 months)
    const monthsBack = 12
    const monthlyData: { month: string; "Cases Created": number; Approved: number; Denied: number }[] = []
    for (let i = monthsBack - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i))
      const monthEnd = i === 0 ? new Date() : startOfMonth(subMonths(new Date(), i - 1))
      const monthLabel = format(monthStart, "MMM yyyy")
      const inRange = allCases.filter((c) => {
        const d = new Date(c.created_at)
        return d >= monthStart && d < monthEnd
      })
      monthlyData.push({
        month: monthLabel,
        "Cases Created": inRange.length,
        Approved: inRange.filter((c) => c.status === "approved").length,
        Denied: inRange.filter((c) => c.status === "denied").length,
      })
    }

    // Denial breakdown by category
    const denialMap: Record<string, number> = {}
    denied.forEach((c) => {
      const cat = c.denial_category || "Uncategorized"
      denialMap[cat] = (denialMap[cat] || 0) + 1
    })
    const denialBreakdown = Object.entries(denialMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Payer comparison
    const payerMap: Record<string, { total: number; approved: number; denied: number; turnaroundDays: number[]; denialReasons: Record<string, number> }> = {}
    allCases.forEach((c) => {
      const payer = c.payer_name || "Unknown"
      if (!payerMap[payer]) payerMap[payer] = { total: 0, approved: 0, denied: 0, turnaroundDays: [], denialReasons: {} }
      payerMap[payer].total++
      if (c.status === "approved") payerMap[payer].approved++
      if (c.status === "denied") {
        payerMap[payer].denied++
        const reason = c.denial_category || "Uncategorized"
        payerMap[payer].denialReasons[reason] = (payerMap[payer].denialReasons[reason] || 0) + 1
      }
      if (c.submitted_at && c.decision_date) {
        const days = differenceInDays(new Date(c.decision_date), new Date(c.submitted_at))
        if (days >= 0) payerMap[payer].turnaroundDays.push(days)
      }
    })

    const payerComparison = Object.entries(payerMap).map(([payer, data]) => {
      const decided = data.approved + data.denied
      const rate = decided > 0 ? Math.round((data.approved / decided) * 100) : null
      const avgTurn = data.turnaroundDays.length > 0
        ? Math.round(data.turnaroundDays.reduce((s, d) => s + d, 0) / data.turnaroundDays.length)
        : null
      const topDenial = Object.entries(data.denialReasons).sort((a, b) => b[1] - a[1])[0]
      return {
        payer,
        cases: data.total,
        approved: data.approved,
        denied: data.denied,
        rate,
        avgTurnaround: avgTurn,
        topDenialReason: topDenial ? topDenial[0] : null,
      }
    })

    // Gold Card data: payers with enough decided cases (>=5)
    const GOLD_CARD_THRESHOLD = 92
    const goldCardPayers = payerComparison
      .filter((p) => (p.approved + p.denied) >= 5 && p.rate !== null)
      .map((p) => ({
        payer: p.payer,
        rate: p.rate!,
        threshold: GOLD_CARD_THRESHOLD,
        eligible: p.rate! >= GOLD_CARD_THRESHOLD,
        decidedCount: p.approved + p.denied,
      }))

    return {
      approvalRate,
      avgTurnaround,
      totalDecided: decided,
      statusDistribution,
      monthlyData,
      denialBreakdown,
      payerComparison,
      goldCardPayers,
    }
  }, [cases])

  // Payer comparison sorting
  const sortedPayers = useMemo(() => {
    const sorted = [...analytics.payerComparison]
    sorted.sort((a, b) => {
      let aVal: number | string, bVal: number | string
      switch (payerSortKey) {
        case "payer": aVal = a.payer.toLowerCase(); bVal = b.payer.toLowerCase(); break
        case "cases": aVal = a.cases; bVal = b.cases; break
        case "rate": aVal = a.rate ?? -1; bVal = b.rate ?? -1; break
        case "turnaround": aVal = a.avgTurnaround ?? 999; bVal = b.avgTurnaround ?? 999; break
        default: aVal = a.cases; bVal = b.cases
      }
      if (aVal < bVal) return payerSortDir === "asc" ? -1 : 1
      if (aVal > bVal) return payerSortDir === "asc" ? 1 : -1
      return 0
    })
    return sorted
  }, [analytics.payerComparison, payerSortKey, payerSortDir])

  function handlePayerSort(key: typeof payerSortKey) {
    if (payerSortKey === key) {
      setPayerSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setPayerSortKey(key)
      setPayerSortDir("desc")
    }
  }

  const displayCases = cases.filter((c) => {
    const matchesTab = activeTab === "archived" ? c.is_archived === true : !c.is_archived
    if (!matchesTab) return false

    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    const matchesSearch =
      c.patient_first_name?.toLowerCase().includes(query) ||
      c.patient_last_name?.toLowerCase().includes(query) ||
      c.payer_name?.toLowerCase().includes(query) ||
      c.doc_type?.toLowerCase().includes(query) ||
      c.created_by_email?.toLowerCase().includes(query) ||
      `${c.patient_first_name} ${c.patient_last_name}`.toLowerCase().includes(query)

    return matchesSearch
  })

  const CASES_PAGE_SIZE = 10
  const caseTotalPages = Math.ceil(displayCases.length / CASES_PAGE_SIZE)
  const paginatedCases = displayCases.slice(casePage * CASES_PAGE_SIZE, (casePage + 1) * CASES_PAGE_SIZE)

  const getDocTypeLabel = (docType: string) => {
    switch (docType) {
      case "biologics_pa": return "Biologics PA"
      case "medical_necessity": return "Med Necessity"
      case "appeal": return "Appeal"
      default: return docType
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light-gray">
        <LumaLogo className="w-16 h-16 animate-pulse text-mint" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-gray">
      {/* Header */}
      <header className="border-b border-sage-medium/50 glass-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LumaLogo className="w-8 h-8" />
            <span className="text-xl font-serif font-bold text-dark-bg">Luma</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/cases/new")}
              size="sm"
              className="relative overflow-hidden bg-dark-bg hover:bg-dark-bg/90 text-white transition-all duration-300 hover:scale-105 before:content-[''] before:absolute before:top-0 before:left-[-100%] before:w-full before:h-full before:bg-white/20 before:transition-all before:duration-300 hover:before:left-[100%] active:scale-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-gray-100">
                  <span className="text-sm text-gray-600 hidden md:block max-w-[200px] truncate">{practiceName || userEmail}</span>
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border border-sage-medium/30">
                <DropdownMenuItem
                  onClick={() => router.push('/settings/profile')}
                  className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                {isTeamOwner && (
                  <>
                    <DropdownMenuItem
                      onClick={() => router.push('/settings/team')}
                      className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Team
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/settings/billing')}
                      className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </DropdownMenuItem>
                  </>
                )}
                {isSuperAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">Admin</DropdownMenuLabel>
                    {/* Platform Overview menu item hidden */}
                    <DropdownMenuItem
                      onClick={() => window.open('https://clarity.microsoft.com/projects/view/v64a4br39t/dashboard', '_blank')}
                      className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Clarity Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/admin/enterprise-contacts')}
                      className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      Enterprise CRM
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/settings/security')}
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
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Subscription alerts */}
        {isTeamOwner && (subscription.subscription_status === "canceled" || subscription.subscription_status === "past_due" || (subscription.subscription_status === "trialing" && subscription.trial_ends_at && new Date(subscription.trial_ends_at) < new Date())) && (
          <SubscriptionBanner
            subscriptionStatus={subscription.subscription_status}
            trialEndsAt={subscription.trial_ends_at}
            billingPeriodEnd={subscription.billing_period_end}
          />
        )}

        {/* Platform Overview hidden — re-enable when ready for admin dashboard */}


        {/* ═══════════ CASE MANAGEMENT ═══════════ */}
        <div className="space-y-4">
          <h1 className="text-2xl font-sans font-semibold text-dark-bg">Case Management</h1>

          {/* ═══════════ ANALYTICS VIEW ═══════════ */}
          {dashboardView === "analytics" && (
            <div className="space-y-6">
              {/* Core Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="glass-card border border-sage-medium/30 p-5">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Approval Rate</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold text-dark-bg">{analytics.approvalRate}%</p>
                    {analytics.totalDecided > 0 && (
                      <span className="text-xs text-gray-400">of {analytics.totalDecided} decided</span>
                    )}
                  </div>
                  {analytics.approvalRate >= 80 ? (
                    <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                      <TrendingUp className="w-3 h-3" />
                      <span>Strong performance</span>
                    </div>
                  ) : analytics.totalDecided > 0 ? (
                    <div className="flex items-center gap-1 mt-2 text-xs text-coral">
                      <TrendingDown className="w-3 h-3" />
                      <span>Below 80% target</span>
                    </div>
                  ) : null}
                </Card>

                <Card className="glass-card border border-sage-medium/30 p-5">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Avg Turnaround</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold text-dark-bg">
                      {analytics.avgTurnaround > 0 ? `${analytics.avgTurnaround}d` : "--"}
                    </p>
                    {analytics.avgTurnaround > 0 && (
                      <span className="text-xs text-gray-400">submission to decision</span>
                    )}
                  </div>
                </Card>

                <Card className="glass-card border border-sage-medium/30 p-5">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Cases</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold text-dark-bg">{cases.length}</p>
                    <span className="text-xs text-gray-400">all time</span>
                  </div>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Cases Per Month Bar Chart */}
                <Card className="glass-card border border-sage-medium/30 p-5">
                  <p className="text-sm font-semibold text-dark-bg">Cases Per Month</p>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {[
                      { label: "Cases Created", value: analytics.monthlyData.reduce((s, m) => s + m["Cases Created"], 0), color: "bg-blue-500" },
                      { label: "Approved", value: analytics.monthlyData.reduce((s, m) => s + m.Approved, 0), color: "bg-emerald-500" },
                      { label: "Denied", value: analytics.monthlyData.reduce((s, m) => s + m.Denied, 0), color: "bg-rose-500" },
                    ].map((tab) => (
                      <div
                        key={tab.label}
                        className="rounded-md border border-sage-medium/30 px-3 py-2"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-sm ${tab.color}`} />
                          <p className="text-xs text-gray-500">{tab.label}</p>
                        </div>
                        <p className="mt-0.5 text-lg font-semibold text-dark-bg">{tab.value}</p>
                      </div>
                    ))}
                  </div>
                  {analytics.monthlyData.some((m) => m["Cases Created"] > 0) ? (
                    <div className="mt-4 h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={analytics.monthlyData} barCategoryGap="20%">
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                            width={28}
                            allowDecimals={false}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(0,0,0,0.04)" }}
                            contentStyle={{
                              fontSize: 13,
                              borderRadius: 8,
                              border: "1px solid #e5e7eb",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            }}
                          />
                          <Bar dataKey="Approved" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Denied" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Cases Created" stackId="b" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                      No case data available yet
                    </div>
                  )}
                </Card>

                {/* Status Distribution Donut */}
                <Card className="glass-card border border-sage-medium/30 p-5">
                  <p className="text-sm font-semibold text-dark-bg mb-4">Status Distribution</p>
                  {analytics.statusDistribution.length > 0 ? (
                    <div className="flex items-center gap-8">
                      {/* Custom SVG donut — no Tremor color issues */}
                      <div className="relative h-40 w-40 flex-shrink-0">
                        <svg viewBox="0 0 36 36" className="h-full w-full" style={{ transform: "rotate(-90deg)" }}>
                          {(() => {
                            const total = analytics.statusDistribution.reduce((s, d) => s + d.value, 0)
                            const STATUS_COLORS: Record<string, string> = {
                              Draft: "#9ca3af",
                              Submitted: "#3b82f6",
                              Approved: "#10b981",
                              Denied: "#f43f5e",
                            }
                            let cumulative = 0
                            return analytics.statusDistribution.map((s) => {
                              const pct = s.value / total
                              const dashArray = `${pct * 100} ${100 - pct * 100}`
                              const dashOffset = `${-cumulative * 100}`
                              cumulative += pct
                              return (
                                <circle
                                  key={s.name}
                                  cx="18" cy="18" r="15.915"
                                  fill="none"
                                  stroke={STATUS_COLORS[s.name] || "#6b7280"}
                                  strokeWidth="3.8"
                                  strokeDasharray={dashArray}
                                  strokeDashoffset={dashOffset}
                                  strokeLinecap="round"
                                />
                              )
                            })
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-dark-bg">{cases.length}</span>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col gap-3">
                        {analytics.statusDistribution.map((s) => (
                          <div key={s.name} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-1 h-8 rounded-full flex-shrink-0 ${
                                s.name === "Draft" ? "bg-gray-400" :
                                s.name === "Submitted" ? "bg-blue-500" :
                                s.name === "Approved" ? "bg-emerald-500" :
                                "bg-rose-500"
                              }`} />
                              <div>
                                <p className="text-sm font-medium text-dark-bg">{s.name}</p>
                                <p className="text-xs text-gray-500">
                                  {cases.length > 0
                                    ? `${Math.round((s.value / cases.length) * 100)}% of total`
                                    : "0%"}
                                </p>
                              </div>
                            </div>
                            <p className="text-lg font-semibold text-dark-bg tabular-nums">{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                      No case data available yet
                    </div>
                  )}
                </Card>
              </div>

              {/* Denial Breakdown */}
              {analytics.denialBreakdown.length > 0 && (
                <Card className="glass-card border border-sage-medium/30 p-5">
                  <p className="text-sm font-semibold text-dark-bg mb-4">Denial Reasons</p>
                  <BarList
                    data={analytics.denialBreakdown}
                    color="rose"
                    valueFormatter={(v: number) => String(v)}
                    className="[&>div]:text-sm"
                  />
                </Card>
              )}

              {/* Payer Comparison Table */}
              {analytics.payerComparison.length > 0 && (
                <Card className="glass-card border border-sage-medium/30 overflow-hidden">
                  <div className="p-5 pb-0">
                    <p className="text-sm font-semibold text-dark-bg mb-4">Payer Comparison</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-sage-medium/10 hover:bg-sage-medium/10">
                        <TableHead
                          className="text-dark-bg font-semibold cursor-pointer hover:text-mint transition-colors"
                          onClick={() => handlePayerSort("payer")}
                        >
                          <span className="flex items-center gap-1">
                            Payer
                            {payerSortKey === "payer" && <span className="text-xs">{payerSortDir === "asc" ? "\u25B2" : "\u25BC"}</span>}
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-dark-bg font-semibold cursor-pointer hover:text-mint transition-colors"
                          onClick={() => handlePayerSort("cases")}
                        >
                          <span className="flex items-center gap-1">
                            Cases
                            {payerSortKey === "cases" && <span className="text-xs">{payerSortDir === "asc" ? "\u25B2" : "\u25BC"}</span>}
                          </span>
                        </TableHead>
                        <TableHead className="text-dark-bg font-semibold">Approved</TableHead>
                        <TableHead className="text-dark-bg font-semibold">Denied</TableHead>
                        <TableHead
                          className="text-dark-bg font-semibold cursor-pointer hover:text-mint transition-colors"
                          onClick={() => handlePayerSort("rate")}
                        >
                          <span className="flex items-center gap-1">
                            Approval Rate
                            {payerSortKey === "rate" && <span className="text-xs">{payerSortDir === "asc" ? "\u25B2" : "\u25BC"}</span>}
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-dark-bg font-semibold cursor-pointer hover:text-mint transition-colors"
                          onClick={() => handlePayerSort("turnaround")}
                        >
                          <span className="flex items-center gap-1">
                            Avg Turnaround
                            {payerSortKey === "turnaround" && <span className="text-xs">{payerSortDir === "asc" ? "\u25B2" : "\u25BC"}</span>}
                          </span>
                        </TableHead>
                        <TableHead className="text-dark-bg font-semibold">Top Denial Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPayers.map((p) => (
                        <TableRow key={p.payer} className="hover:bg-sage-light/20 transition-colors">
                          <TableCell className="font-semibold text-dark-bg text-sm">{p.payer}</TableCell>
                          <TableCell className="text-sm text-gray-700">{p.cases}</TableCell>
                          <TableCell className="text-sm text-gray-700">{p.approved}</TableCell>
                          <TableCell className="text-sm text-gray-700">{p.denied}</TableCell>
                          <TableCell>
                            {p.rate !== null ? (
                              <span className={`inline-flex items-center gap-1 text-sm font-semibold ${
                                p.rate >= 80 ? "text-green-600" : p.rate >= 60 ? "text-amber-600" : "text-coral"
                              }`}>
                                {p.rate >= 80 ? (
                                  <TrendingUp className="w-3.5 h-3.5" />
                                ) : p.rate < 60 ? (
                                  <TrendingDown className="w-3.5 h-3.5" />
                                ) : null}
                                {p.rate}%
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-700">
                            {p.avgTurnaround !== null ? `${p.avgTurnaround}d` : "--"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-[180px] truncate">
                            {p.topDenialReason || "--"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}

              {/* Gold Card Tracker */}
              {analytics.goldCardPayers.length > 0 && (
                <Card className="glass-card border border-sage-medium/30 p-5">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-dark-bg">Gold Card Tracker</p>
                    <p className="text-xs text-gray-400 mt-0.5">92% approval rate threshold for gold card eligibility</p>
                  </div>
                  <div className="space-y-4">
                    {analytics.goldCardPayers.map((g) => (
                      <div key={g.payer} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-dark-bg">{g.payer}</span>
                          <span className={`font-semibold ${g.eligible ? "text-green-600" : "text-gray-600"}`}>
                            {g.rate}%
                            {g.eligible && (
                              <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                Eligible
                              </span>
                            )}
                          </span>
                        </div>
                        <ProgressBar
                          value={Math.min(g.rate, 100)}
                          color={g.eligible ? "emerald" : g.rate >= 80 ? "blue" : "rose"}
                          className="h-2"
                        />
                        <p className="text-[11px] text-gray-400">
                          {g.eligible
                            ? `Approval rate exceeds ${g.threshold}% threshold (${g.decidedCount} decided cases)`
                            : `${g.threshold - g.rate}% below gold card threshold (${g.decidedCount} decided cases)`
                          }
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Empty state for analytics */}
              {cases.length === 0 && (
                <Card className="glass-card border border-sage-medium/30 p-12 text-center">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No case data available for analytics.</p>
                  <p className="text-gray-400 text-xs mt-1">Create cases to see charts and metrics here.</p>
                </Card>
              )}
            </div>
          )}

          {/* ═══════════ CASES VIEW (existing) ═══════════ */}
          {dashboardView === "cases" && <>
          {/* Case Stats Bar */}
          <Card className="flex flex-wrap items-center gap-6 md:gap-8 p-4 px-8 glass-card border border-sage-medium/30">
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Cases</p>
              <p className="text-2xl font-bold leading-none text-dark-bg">{stats.total_cases}</p>
            </div>
            <div className="w-px h-10 bg-sage-medium/20" />
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">This Month</p>
              <p className="text-2xl font-bold leading-none text-dark-bg">{stats.cases_this_month}</p>
            </div>
            <div className="w-px h-10 bg-sage-medium/20" />
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Revenue Protected</p>
              <p className="text-2xl font-bold leading-none text-dark-bg">${stats.revenue_protected.toLocaleString()}</p>
            </div>

            {/* Show subscription badge here if no pipeline section above */}
            {!pipeline && isTeamOwner && subscription.subscription_status === "trialing" && subscription.trial_ends_at && (
              <button
                onClick={async () => {
                  const response = await fetch("/api/stripe/create-portal", { method: "POST" })
                  const data = await response.json()
                  if (data.url) {
                    window.location.href = data.url
                  } else {
                    window.location.href = "/checkout"
                  }
                }}
                className="ml-auto flex items-center gap-2 bg-mint/10 border border-mint/30 rounded-lg px-4 py-2 text-sm font-semibold text-dark-bg hover:bg-mint/20 transition-colors cursor-pointer"
              >
                Trial Active
                <span className="bg-mint text-white text-xs font-bold px-2 py-0.5 rounded">
                  {Math.ceil((new Date(subscription.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                </span>
              </button>
            )}

            {!pipeline && isTeamOwner && subscription.subscription_status === "active" && (
              <button
                onClick={async () => {
                  const response = await fetch("/api/stripe/create-portal", { method: "POST" })
                  const data = await response.json()
                  if (data.url) window.location.href = data.url
                }}
                className="ml-auto flex items-center gap-2 bg-mint/10 border border-mint/30 rounded-lg px-4 py-2 text-sm font-semibold text-dark-bg hover:bg-mint/20 transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-mint" />
                Active
              </button>
            )}
          </Card>

          {/* Cases Table */}
          <Tabs defaultValue="active" onValueChange={(v) => { setActiveTab(v); setCasePage(0) }} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <TabsList className="bg-white/50 border border-sage-medium/30">
                  <TabsTrigger value="active" className="data-[state=active]:bg-white">Active Cases</TabsTrigger>
                  <TabsTrigger value="archived" className="gap-2 data-[state=active]:bg-white">
                    Archived
                    <Archive className="w-3 h-3" />
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search cases..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCasePage(0) }}
                  className="pl-9"
                />
              </div>
            </div>

            <Card className="glass-card border border-sage-medium/30 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-sage-medium/10 hover:bg-sage-medium/10">
                    <TableHead className="w-[200px] lg:w-[280px] text-dark-bg font-semibold">Patient & Document</TableHead>
                    <TableHead className="text-dark-bg font-semibold">Payer</TableHead>
                    <TableHead className="hidden sm:table-cell text-dark-bg font-semibold">Readiness</TableHead>
                    <TableHead className="hidden sm:table-cell text-dark-bg font-semibold">Created</TableHead>
                    <TableHead className="hidden lg:table-cell text-dark-bg font-semibold">Created By</TableHead>
                    <TableHead className="text-right text-dark-bg font-semibold">Claim Value</TableHead>
                    <TableHead className="w-[60px] lg:w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                        {searchQuery.trim()
                          ? `No cases found matching "${searchQuery}"`
                          : activeTab === 'active'
                            ? "No active cases found. Create a new case to get started."
                            : "No archived cases."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCases.map((c) => (
                      <TableRow key={c.id} className="group cursor-pointer hover:bg-sage-light/20 transition-colors">
                        <TableCell className="font-medium">
                          <Link href={`/cases/${c.id}`} className="block">
                            <div className="font-semibold text-dark-bg">
                              {c.patient_first_name} {c.patient_last_name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <span className="capitalize">{getDocTypeLabel(c.doc_type)}</span>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="text-gray-700 text-sm">
                          {c.payer_name || '-'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {c.metadata?.lcd_validation?.found_count != null && c.metadata?.lcd_validation?.missing_count != null ? (() => {
                            const found = c.metadata.lcd_validation!.found_count!
                            const total = found + c.metadata.lcd_validation!.missing_count!
                            const pct = total > 0 ? Math.round((found / total) * 100) : 0
                            const pctColor = pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-600"
                            return (
                              <span className={`text-sm font-semibold ${pctColor}`}>{pct}%</span>
                            )
                          })() : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-gray-700 text-sm">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-gray-700 text-sm">
                          {c.created_by_email || userEmail}
                        </TableCell>
                        <TableCell className="text-right font-mono text-gray-700">
                          {c.claim_amount ? `$${c.claim_amount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-sage-medium/20 text-gray-400 hover:text-dark-bg">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border border-sage-medium/30">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => router.push(`/cases/${c.id}`)}
                                className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                              >
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {c.is_archived ? (
                                <DropdownMenuItem
                                  onClick={() => handleArchive(c.id, false)}
                                  className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" /> Restore to Active
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleArchive(c.id, true)}
                                  className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                                >
                                  <Archive className="mr-2 h-4 w-4" /> Archive Case
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(c)}
                                className="text-coral focus:bg-coral/10 focus:text-coral cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Case Pagination */}
              {displayCases.length > CASES_PAGE_SIZE && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-sage-medium/20">
                  <p className="text-xs text-gray-500">
                    {displayCases.length} case{displayCases.length !== 1 ? "s" : ""}
                    {searchQuery.trim() ? ` matching "${searchQuery}"` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={casePage === 0}
                      onClick={() => setCasePage((p) => p - 1)}
                      className="h-8 px-3 text-xs"
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-gray-600 tabular-nums">
                      {casePage + 1} / {caseTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={casePage + 1 >= caseTotalPages}
                      onClick={() => setCasePage((p) => p + 1)}
                      className="h-8 px-3 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </Tabs>

          {/* Recent Audits */}
          {audits.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-dark-bg">Recent Audits</h2>
                <Link
                  href="/audit"
                  className="flex items-center gap-1.5 text-sm text-mint hover:text-mint/80 font-medium transition-colors"
                >
                  New Audit
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <Card className="glass-card border border-sage-medium/30 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-sage-medium/10 hover:bg-sage-medium/10">
                      <TableHead className="text-dark-bg font-semibold">Patient</TableHead>
                      <TableHead className="text-dark-bg font-semibold">Medication</TableHead>
                      <TableHead className="hidden sm:table-cell text-dark-bg font-semibold">Readiness</TableHead>
                      <TableHead className="text-dark-bg font-semibold">Created</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.map((a) => {
                      const complianceRate = a.total_requirements
                        ? Math.round(((a.found_count || 0) / a.total_requirements) * 100)
                        : 0
                      const pctColor = complianceRate >= 80 ? "text-green-600" : complianceRate >= 60 ? "text-amber-600" : "text-red-600"

                      return (
                        <TableRow
                          key={a.id}
                          className="group hover:bg-sage-light/20 transition-colors cursor-pointer"
                          onClick={() => router.push(`/audit?id=${a.id}`)}
                        >
                          <TableCell className="font-medium text-dark-bg">
                            {a.patient_first_name || a.patient_last_name
                              ? `${a.patient_first_name || ""} ${a.patient_last_name || ""}`.trim()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-gray-700 text-sm">
                            {a.requested_medication || "—"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className={`text-sm font-semibold ${pctColor}`}>
                              {complianceRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-700 text-sm">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-sage-medium/20 text-gray-400 hover:text-dark-bg">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white border border-sage-medium/30">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); setAuditToDelete(a); setAuditDeleteDialogOpen(true) }}
                                  className="text-coral focus:bg-coral/10 focus:text-coral cursor-pointer"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
          </>}
        </div>

        {/* Enterprise Pipeline — hidden for now, code preserved in git history */}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Case Permanently?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this case? This action cannot be undone and will remove it from your revenue stats.
            </DialogDescription>
            {caseToDelete && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="font-medium text-sm text-dark-bg">
                  {caseToDelete.patient_first_name} {caseToDelete.patient_last_name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {caseToDelete.claim_amount ? `Claim Value: $${caseToDelete.claim_amount.toLocaleString()}` : 'No claim value'}
                </p>
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setCaseToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-coral hover:bg-coral/90 text-white"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Delete Confirmation Dialog */}
      <Dialog open={auditDeleteDialogOpen} onOpenChange={setAuditDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Audit?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this audit? This action cannot be undone.
            </DialogDescription>
            {auditToDelete && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="font-medium text-sm text-dark-bg">
                  {auditToDelete.patient_first_name || auditToDelete.patient_last_name
                    ? `${auditToDelete.patient_first_name || ""} ${auditToDelete.patient_last_name || ""}`.trim()
                    : "Unnamed Audit"}
                </p>
                {auditToDelete.requested_medication && (
                  <p className="text-xs text-gray-500 mt-1">{auditToDelete.requested_medication}</p>
                )}
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAuditDeleteDialogOpen(false)
                setAuditToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAudit}
              className="bg-coral hover:bg-coral/90 text-white"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
