"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MFAEnrollment } from "@/components/settings/MFAEnrollment"
import {
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  FileText,
  LogIn,
  CreditCard,
  MessageSquare,
  Users,
  Download,
} from "lucide-react"

interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

const ACTION_LABELS: Record<string, { label: string; icon: typeof LogIn; color: string }> = {
  user_login: { label: "Login", icon: LogIn, color: "bg-blue-100 text-blue-700" },
  user_signup: { label: "Signup", icon: User, color: "bg-green-100 text-green-700" },
  document_generated: { label: "Document Generated", icon: FileText, color: "bg-mint/20 text-mint" },
  document_uploaded: { label: "Document Uploaded", icon: Download, color: "bg-purple-100 text-purple-700" },
  team_invite_sent: { label: "Team Invite Sent", icon: Users, color: "bg-amber-100 text-amber-700" },
  team_member_removed: { label: "Team Member Removed", icon: Users, color: "bg-coral/20 text-coral" },
  checkout_initiated: { label: "Checkout", icon: CreditCard, color: "bg-indigo-100 text-indigo-700" },
  feedback_submitted: { label: "Feedback", icon: MessageSquare, color: "bg-teal-100 text-teal-700" },
}

const PAGE_SIZE = 20

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export default function SecurityPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter)
      }

      if (searchQuery.trim()) {
        query = query.or(
          `action.ilike.%${searchQuery}%,resource_type.ilike.%${searchQuery}%,metadata->email.ilike.%${searchQuery}%`
        )
      }

      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) {
        console.error("Failed to load audit logs:", error)
        setLogs([])
        setTotalCount(0)
      } else {
        setLogs(data || [])
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error("Error loading audit logs:", err)
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, searchQuery])

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase
          .from("users")
          .select("is_super_admin")
          .eq("id", session.user.id)
          .single()
        setIsSuperAdmin(data?.is_super_admin || false)
      }
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    if (isSuperAdmin) {
      loadLogs()
    }
  }, [isSuperAdmin, loadLogs])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function getActionDisplay(action: string) {
    return ACTION_LABELS[action] || { label: action, icon: Clock, color: "bg-gray-100 text-gray-700" }
  }

  function getMetadataPreview(log: AuditLog): string {
    const m = log.metadata
    if (!m) return ""
    if (m.email) return String(m.email)
    if (m.doc_type && m.medication) return `${m.medication} (${m.doc_type})`
    if (m.invited_email) return String(m.invited_email)
    if (m.file_name) return String(m.file_name)
    return ""
  }

  return (
    <div className="space-y-8">
      {/* MFA Section */}
      <MFAEnrollment />

      {/* Audit Log Section — Super Admin Only */}
      {isSuperAdmin && (
        <Card className="glass-card border border-sage-medium/30 p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-dark-bg mb-1">Activity Log</h2>
              <p className="text-sm text-gray-600">
                Track all actions across the platform. {totalCount > 0 && `${totalCount} total events.`}
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search actions, emails..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(0)
                  }}
                  className="pl-9"
                />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value)
                  setPage(0)
                }}
                className="h-10 w-full sm:w-[200px] rounded-md border border-sage-medium/30 bg-white px-3 py-2 text-sm text-dark-bg focus:outline-none focus:ring-2 focus:ring-mint/30 focus:border-mint"
              >
                <option value="all">All actions</option>
                <option value="user_login">Logins</option>
                <option value="user_signup">Signups</option>
                <option value="document_generated">Documents Generated</option>
                <option value="document_uploaded">Documents Uploaded</option>
                <option value="team_invite_sent">Team Invites</option>
                <option value="team_member_removed">Team Removals</option>
                <option value="checkout_initiated">Checkouts</option>
                <option value="feedback_submitted">Feedback</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadLogs()}
                className="border-sage-medium/30 h-10 hover:bg-mint/10 hover:text-mint hover:border-mint/30"
              >
                Refresh
              </Button>
            </div>

            {/* Log List */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No activity logged yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => {
                  const display = getActionDisplay(log.action)
                  const Icon = display.icon
                  const preview = getMetadataPreview(log)
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-sage-medium/20 bg-white/60 hover:bg-white/80 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${display.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-dark-bg">
                            {display.label}
                          </span>
                          {log.resource_type && (
                            <Badge variant="outline" className="text-xs font-normal">
                              {log.resource_type}
                            </Badge>
                          )}
                        </div>
                        {preview && (
                          <p className="text-xs text-gray-500 truncate">{preview}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-500" title={formatFullDate(log.created_at)}>
                          {formatRelativeTime(log.created_at)}
                        </p>
                        {log.ip_address && (
                          <p className="text-[10px] text-gray-400">{log.ip_address}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-sage-medium/20">
                <p className="text-xs text-gray-500">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="border-sage-medium/30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="border-sage-medium/30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
