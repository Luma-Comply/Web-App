"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LumaLogo } from "@/components/LumaLogo"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  LogOut,
  MoreHorizontal,
  Archive,
  RefreshCw,
  Trash2,
  Eye,
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
  is_archived: boolean // New field
}

interface UserStats {
  total_cases: number
  cases_this_month: number
  cases_remaining: number
  revenue_protected: number
}

interface UserSubscription {
  subscription_status: string
  trial_ends_at: string | null
  cases_remaining: number
  cases_used_this_period: number
  billing_period_end: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [activeTab, setActiveTab] = useState("active") // "active" | "archived"
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null)

  // We keep stats separate so they calculate across ALL cases (active + archived)
  const [stats, setStats] = useState<UserStats>({
    total_cases: 0,
    cases_this_month: 0,
    cases_remaining: 50,
    revenue_protected: 0,
  })

  const [subscription, setSubscription] = useState<UserSubscription>({
    subscription_status: "trialing",
    trial_ends_at: null,
    cases_remaining: 50,
    cases_used_this_period: 0,
    billing_period_end: null,
  })

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

      // Load user profile for subscription and limits
      const { data: userData } = await supabase
        .from("users")
        .select("subscription_status, trial_ends_at, cases_remaining, cases_used_this_period, billing_period_end")
        .eq("id", session.user.id)
        .single()

      if (userData) {
        setSubscription({
          subscription_status: userData.subscription_status || "trialing",
          trial_ends_at: userData.trial_ends_at,
          cases_remaining: userData.cases_remaining || 50,
          cases_used_this_period: userData.cases_used_this_period || 0,
          billing_period_end: userData.billing_period_end,
        })
      }

      // Load ALL cases (active + archived) to calculate stats correctly
      const { data: casesData } = await supabase
        .from("cases")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(100) // Fetches recent 100 cases

      if (casesData) {
        setCases(casesData as Case[]) // Type assertion for new is_archived field

        // --- Calculate Stats (Archived cases count towards Revenue!) ---
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
          cases_remaining: userData?.cases_remaining || 50,
          revenue_protected: totalRevenue,
        })
      }
    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleArchive(caseId: string, archive: boolean) {
    try {
      // Optimistic update
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
      loadDashboardData() // Revert on error
    }
  }

  function openDeleteDialog(caseItem: Case) {
    setCaseToDelete(caseItem)
    setDeleteDialogOpen(true)
  }

  async function handleDelete() {
    if (!caseToDelete) return

    try {
      setCases(cases.filter(c => c.id !== caseToDelete.id)); // Optimistic
      await supabase.from("cases").delete().eq("id", caseToDelete.id);
      // Reload to recalc stats since delete affects revenue
      loadDashboardData();
      setDeleteDialogOpen(false)
      setCaseToDelete(null)
    } catch (error) {
      console.error("Error deleting case:", error);
      loadDashboardData() // Revert on error
    }
  }


  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

  // Filter cases for the current view
  const displayCases = cases.filter((c) => {
    if (activeTab === "archived") return c.is_archived === true
    return !c.is_archived // Default to showing non-archived
  })

  // --- Helpers ---
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <Clock className="w-4 h-4 text-gray-500" />
      case "submitted":
        return <CheckCircle className="w-4 h-4 text-mint" />
      case "approved":
        return <CheckCircle className="w-4 h-4 text-mint" />
      case "denied":
        return <XCircle className="w-4 h-4 text-coral" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-light-gray to-white">
        <LumaLogo className="w-16 h-16 animate-pulse text-mint" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white">
      {/* Header */}
      <header className="border-b border-sage-medium/50 glass-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LumaLogo className="w-8 h-8" />
            <span className="text-xl font-serif font-bold text-dark-bg">Luma</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden md:block">{userEmail}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Subscription Banner */}
        <SubscriptionBanner
          subscriptionStatus={subscription.subscription_status}
          trialEndsAt={subscription.trial_ends_at}
          casesRemaining={subscription.cases_remaining}
          casesUsedThisPeriod={subscription.cases_used_this_period}
          billingPeriodEnd={subscription.billing_period_end}
        />

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 glass-card border border-sage-medium/30">
            <p className="text-sm text-gray-600 mb-1">Total Cases</p>
            <p className="text-3xl font-mono font-bold text-dark-bg">{stats.total_cases}</p>
          </Card>
          <Card className="p-6 glass-card border border-sage-medium/30">
            <p className="text-sm text-gray-600 mb-1">This Month</p>
            <p className="text-3xl font-mono font-bold text-dark-bg">{stats.cases_this_month}</p>
          </Card>
          <Card className="p-6 glass-card border border-sage-medium/30">
            <p className="text-sm text-gray-600 mb-1">Revenue Protected</p>
            <p className="text-3xl font-mono font-bold text-mint">
              ${stats.revenue_protected.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Includes archived cases</p>
          </Card>
          <Card className="p-6 glass-card border border-sage-medium/30">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600 mb-1">Cases Remaining</p>
                <p className="text-3xl font-mono font-bold text-dark-bg">{stats.cases_remaining}</p>
              </div>
              <Link href="/cases/new">
                <Button size="sm" className="bg-dark-bg text-white hover:bg-dark-bg/90">
                  <Plus className="w-4 h-4 mr-1" /> New Case
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Improved Table Layout with Tabs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-serif text-dark-bg">Case Management</h1>
          </div>

          <Tabs defaultValue="active" onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-white/50 border border-sage-medium/30">
                <TabsTrigger value="active">Active Cases</TabsTrigger>
                <TabsTrigger value="archived" className="gap-2">
                  Archived
                  <Archive className="w-3 h-3" />
                </TabsTrigger>
              </TabsList>
            </div>

            <Card className="glass-card border border-sage-medium/30 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-sage-medium/10 hover:bg-sage-medium/10">
                    <TableHead className="w-[300px]">Patient & Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Claim Value</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayCases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                        {activeTab === 'active'
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
                              {c.payer_name && `• ${c.payer_name}`}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(c.status)}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${c.status === 'approved' ? 'bg-mint/10 text-mint' :
                                c.status === 'denied' ? 'bg-coral/10 text-coral' :
                                  'bg-gray-100 text-gray-600'
                              }`}>
                              {c.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
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
