"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LumaLogo } from "@/components/LumaLogo"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
  MapPin,
  UserPlus,
  Shield,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDistanceToNow } from "date-fns"
import { SubscriptionBanner } from "@/components/dashboard/SubscriptionBanner"

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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  lead: { label: "Lead", className: "bg-blue-100 text-blue-700 border-blue-200" },
  active: { label: "Active", className: "bg-green-100 text-green-700 border-green-200" },
  negotiating: { label: "Negotiating", className: "bg-amber-100 text-amber-700 border-amber-200" },
  churned: { label: "Churned", className: "bg-gray-100 text-gray-500 border-gray-200" },
}

const STRATEGY_CONFIG: Record<string, { label: string; className: string }> = {
  founding_partner: { label: "Founding Partner", className: "bg-purple-100 text-purple-700 border-purple-200" },
  flagship: { label: "Flagship", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  expansion: { label: "Expansion", className: "bg-teal-100 text-teal-700 border-teal-200" },
  corporate_bundle: { label: "Corporate Bundle", className: "bg-orange-100 text-orange-700 border-orange-200" },
  design_partner: { label: "Design Partner", className: "bg-pink-100 text-pink-700 border-pink-200" },
}

function formatPipelinePrice(low: number | null, high: number | null): string {
  if (!low && !high) return "—"
  if (low && high && low !== high) {
    return `$${low.toLocaleString()}–$${high.toLocaleString()}/mo`
  }
  return `$${(low || high || 0).toLocaleString()}/mo`
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function PipelineAvatar({ src, name }: { src: string | null; name: string }) {
  const [imgError, setImgError] = useState(false)
  if (src && !imgError) {
    return <img src={src} alt={name} onError={() => setImgError(true)} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mint/60 to-sage-light/80 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
      {getInitials(name)}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [practiceName, setPracticeName] = useState("")
  const [isTeamOwner, setIsTeamOwner] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState("active")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null)

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
  const [pipelineSearch, setPipelineSearch] = useState("")
  const [pipelinePage, setPipelinePage] = useState(0)
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
  const pipelineTotalPages = Math.max(1, Math.ceil(filteredPipeline.length / PIPELINE_PAGE_SIZE))
  const paginatedPipeline = filteredPipeline.slice(
    pipelinePage * PIPELINE_PAGE_SIZE,
    (pipelinePage + 1) * PIPELINE_PAGE_SIZE
  )

  const displayCases = cases.filter((c) => {
    const matchesTab = activeTab === "archived" ? c.is_archived === true : !c.is_archived

    if (!searchQuery.trim()) return matchesTab

    const query = searchQuery.toLowerCase()
    const matchesSearch =
      c.patient_first_name?.toLowerCase().includes(query) ||
      c.patient_last_name?.toLowerCase().includes(query) ||
      c.payer_name?.toLowerCase().includes(query) ||
      c.doc_type?.toLowerCase().includes(query) ||
      c.created_by_email?.toLowerCase().includes(query) ||
      `${c.patient_first_name} ${c.patient_last_name}`.toLowerCase().includes(query)

    return matchesTab && matchesSearch
  })

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
            {isSuperAdmin && (
              <Button
                onClick={() => router.push("/admin/enterprise-contacts?action=research")}
                variant="outline"
                size="sm"
                className="border-mint/30 text-mint hover:bg-mint/10 transition-all duration-200"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Research Contact
              </Button>
            )}
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
                    <DropdownMenuItem
                      onClick={() => router.push('/settings/security')}
                      className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Security
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/admin/enterprise-contacts')}
                      className="focus:bg-mint/10 focus:text-dark-bg cursor-pointer"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      Enterprise CRM
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
        {/* ═══════════ ENTERPRISE PIPELINE (super admin only) ═══════════ */}
        {pipeline && pipelineContacts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-sans font-semibold text-dark-bg">Enterprise Pipeline</h1>
              <Link
                href="/admin/enterprise-contacts"
                className="flex items-center gap-1.5 text-sm text-mint hover:text-mint/80 font-medium transition-colors"
              >
                Open CRM
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Pipeline Stats Bar */}
            <Card className="flex flex-wrap items-center gap-6 md:gap-8 p-4 px-8 glass-card border border-sage-medium/30">
              <div className="flex flex-col gap-0.5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Contacts</p>
                <p className="text-2xl font-bold leading-none text-dark-bg">{pipeline.total_contacts}</p>
              </div>
              <div className="w-px h-10 bg-sage-medium/20" />
              {pipeline.active_contracts > 0 && (
                <>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wider">Active Revenue</p>
                    <p className="text-2xl font-bold leading-none text-green-700">
                      {formatPipelinePrice(pipeline.active_monthly_low, pipeline.active_monthly_high)}
                    </p>
                  </div>
                  <div className="w-px h-10 bg-sage-medium/20" />
                </>
              )}
              <div className="flex flex-col gap-0.5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Potential Pipeline</p>
                <p className="text-2xl font-bold leading-none text-dark-bg">
                  {formatPipelinePrice(pipeline.potential_monthly_low, pipeline.potential_monthly_high)}
                </p>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                {/* Pipeline search */}
                <div className="relative w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search pipeline..."
                    value={pipelineSearch}
                    onChange={(e) => { setPipelineSearch(e.target.value); setPipelinePage(0) }}
                    className="pl-9 h-9 text-sm"
                  />
                </div>

                {isTeamOwner && subscription.subscription_status === "trialing" && subscription.trial_ends_at && (
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
                    className="flex items-center gap-2 bg-mint/10 border border-mint/30 rounded-lg px-4 py-2 text-sm font-semibold text-dark-bg hover:bg-mint/20 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Trial Active
                    <span className="bg-mint text-white text-xs font-bold px-2 py-0.5 rounded">
                      {Math.ceil((new Date(subscription.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                    </span>
                  </button>
                )}

                {isTeamOwner && subscription.subscription_status === "active" && (
                  <button
                    onClick={async () => {
                      const response = await fetch("/api/stripe/create-portal", { method: "POST" })
                      const data = await response.json()
                      if (data.url) window.location.href = data.url
                    }}
                    className="flex items-center gap-2 bg-mint/10 border border-mint/30 rounded-lg px-4 py-2 text-sm font-semibold text-dark-bg hover:bg-mint/20 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span className="w-2 h-2 rounded-full bg-mint" />
                    Active
                  </button>
                )}
              </div>
            </Card>

            {/* Pipeline Table */}
            <Card className="glass-card border border-sage-medium/30 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-sage-medium/10 hover:bg-sage-medium/10">
                    <TableHead className="text-dark-bg font-semibold">Contact</TableHead>
                    <TableHead className="text-dark-bg font-semibold">Organization</TableHead>
                    <TableHead className="hidden md:table-cell text-dark-bg font-semibold">Location</TableHead>
                    <TableHead className="hidden lg:table-cell text-dark-bg font-semibold">Strategy</TableHead>
                    <TableHead className="text-dark-bg font-semibold">Status</TableHead>
                    <TableHead className="text-right text-dark-bg font-semibold">Monthly</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPipeline.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                        {pipelineSearch.trim()
                          ? `No contacts matching "${pipelineSearch}"`
                          : "No contacts in pipeline yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPipeline.map((c) => (
                      <TableRow
                        key={c.id}
                        className="group cursor-pointer hover:bg-sage-light/20 transition-colors"
                        onClick={() => router.push(`/admin/enterprise-contacts?contact=${c.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <PipelineAvatar src={c.profile_image_url} name={c.contact_name} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-dark-bg text-sm truncate">{c.contact_name}</span>
                                {c.is_active_contract && (
                                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Active contract" />
                                )}
                              </div>
                              {c.title && (
                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{c.title}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">{c.organization}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-600">
                          {c.hospital_location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {c.hospital_location}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {c.strategy_type && STRATEGY_CONFIG[c.strategy_type] ? (
                            <Badge variant="outline" className={`text-[10px] ${STRATEGY_CONFIG[c.strategy_type].className}`}>
                              {STRATEGY_CONFIG[c.strategy_type].label}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${STATUS_CONFIG[c.status]?.className || ""}`}>
                            {STATUS_CONFIG[c.status]?.label || c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-gray-700">
                          {formatPipelinePrice(c.monthly_price_low, c.monthly_price_high)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {filteredPipeline.length > PIPELINE_PAGE_SIZE && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-sage-medium/20">
                  <p className="text-xs text-gray-500">
                    {filteredPipeline.length} contact{filteredPipeline.length !== 1 ? "s" : ""}
                    {pipelineSearch.trim() ? ` matching "${pipelineSearch}"` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pipelinePage === 0}
                      onClick={() => setPipelinePage((p) => p - 1)}
                      className="h-8 px-3 text-xs"
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-gray-600 tabular-nums">
                      {pipelinePage + 1} / {pipelineTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pipelinePage + 1 >= pipelineTotalPages}
                      onClick={() => setPipelinePage((p) => p + 1)}
                      className="h-8 px-3 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Subscription alerts */}
        {isTeamOwner && (subscription.subscription_status === "canceled" || subscription.subscription_status === "past_due" || (subscription.subscription_status === "trialing" && subscription.trial_ends_at && new Date(subscription.trial_ends_at) < new Date())) && (
          <SubscriptionBanner
            subscriptionStatus={subscription.subscription_status}
            trialEndsAt={subscription.trial_ends_at}
            billingPeriodEnd={subscription.billing_period_end}
          />
        )}

        {/* ═══════════ CASE MANAGEMENT ═══════════ */}
        <div className="space-y-4">
          <h1 className="text-2xl font-sans font-semibold text-dark-bg">Case Management</h1>

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
          <Tabs defaultValue="active" onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <TabsList className="bg-white/50 border border-sage-medium/30">
                <TabsTrigger value="active" className="data-[state=active]:bg-white">Active Cases</TabsTrigger>
                <TabsTrigger value="archived" className="gap-2 data-[state=active]:bg-white">
                  Archived
                  <Archive className="w-3 h-3" />
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                    <TableHead className="hidden sm:table-cell text-dark-bg font-semibold">Created</TableHead>
                    <TableHead className="hidden lg:table-cell text-dark-bg font-semibold">Created By</TableHead>
                    <TableHead className="text-right text-dark-bg font-semibold">Claim Value</TableHead>
                    <TableHead className="w-[60px] lg:w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayCases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                        {searchQuery.trim()
                          ? `No cases found matching "${searchQuery}"`
                          : activeTab === 'active'
                            ? "No active cases found. Create a new case to get started."
                            : "No archived cases."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayCases.map((c) => (
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
                              <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
            </Card>
          </Tabs>
        </div>
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
    </div>
  )
}
