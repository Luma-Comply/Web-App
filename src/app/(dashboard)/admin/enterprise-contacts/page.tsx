"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Reorder, motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Plus,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Edit,
  Trash2,
  Building2,
  Search,
  MapPin,
  BedDouble,
  DollarSign,
  Target,
  Briefcase,
  Star,
  ChevronRight,
  X,
  GripVertical,
  Globe,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  UserPlus,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Contact {
  id: string
  contact_name: string
  title: string | null
  organization: string
  email: string | null
  phone: string | null
  status: string
  notes: string | null
  deal_value: number | null
  background: string | null
  hospital_details: string | null
  hospital_beds: string | null
  hospital_system: string | null
  hospital_location: string | null
  why_they_matter: string | null
  target_offer: string | null
  strategy_type: string | null
  monthly_price_low: number | null
  monthly_price_high: number | null
  implementation_low: number | null
  implementation_high: number | null
  sort_order: number | null
  profile_image_url: string | null
  is_active_contract: boolean
  created_at: string | null
  updated_at: string | null
}

interface ContactLog {
  id: string
  contact_id: string
  log_type: string
  content: string
  created_at: string | null
}

interface ResearchResult {
  name: string
  title: string | null
  organization: string | null
  location: string | null
  background: string | null
  profile_image_url: string | null
  hospital_beds: string | null
  hospital_system: string | null
  hospital_location: string | null
  hospital_details: string | null
  fit_score: string | null
  fit_reasoning: string | null
  strategy_type: string | null
  why_they_matter: string | null
  target_offer: string | null
  monthly_price_low: number | null
  monthly_price_high: number | null
  implementation_low: number | null
  implementation_high: number | null
  notable_info: string | null
  deals_with_biologics_or_pa: boolean | null
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

const FIT_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  strong_fit: { label: "Strong Fit", icon: <CheckCircle2 className="w-4 h-4" />, className: "text-green-600 bg-green-50 border-green-200" },
  possible_fit: { label: "Possible Fit", icon: <AlertCircle className="w-4 h-4" />, className: "text-amber-600 bg-amber-50 border-amber-200" },
  not_a_fit: { label: "Not a Fit", icon: <XCircle className="w-4 h-4" />, className: "text-red-600 bg-red-50 border-red-200" },
}

const LOG_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  call: { label: "Call", icon: <Phone className="w-3.5 h-3.5" /> },
  email: { label: "Email", icon: <Mail className="w-3.5 h-3.5" /> },
  meeting: { label: "Meeting", icon: <Calendar className="w-3.5 h-3.5" /> },
  note: { label: "Note", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  status_change: { label: "Status", icon: <Edit className="w-3.5 h-3.5" /> },
}

function formatPrice(low: number | null, high: number | null): string {
  if (!low && !high) return "—"
  if (low && high && low !== high) {
    return `$${(low / 1000).toFixed(0)}k–$${high >= 1000000 ? `${(high / 1000000).toFixed(1)}M` : `${(high / 1000).toFixed(0)}k`}`
  }
  const val = low || high || 0
  return val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : `$${(val / 1000).toFixed(0)}k`
}

function formatPricePerMonth(low: number | null, high: number | null): string {
  if (!low && !high) return "—"
  if (low && high && low !== high) {
    return `$${low.toLocaleString()}–$${high.toLocaleString()}/mo`
  }
  return `$${(low || high || 0).toLocaleString()}/mo`
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/* ── Animated Toggle Switch ── */
function ContractToggle({
  isActive,
  onToggle,
  disabled,
}: {
  isActive: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      aria-label={isActive ? "Active contract" : "No contract"}
      disabled={disabled}
      onClick={onToggle}
      className={`
        relative inline-flex h-7 w-[52px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2
        ${isActive ? "bg-green-500" : "bg-gray-300"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 30 }}
        className={`
          pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow-lg ring-0
          ${isActive ? "ml-[24px]" : "ml-[2px]"}
        `}
        style={{ marginTop: "1px" }}
      />
    </button>
  )
}

/* ── Avatar Component ── */
function Avatar({
  src,
  name,
  size = "md",
}: {
  src: string | null
  name: string
  size?: "sm" | "md" | "lg"
}) {
  const [imgError, setImgError] = useState(false)
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
  }

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-mint/60 to-sage-light/80 flex items-center justify-center font-semibold text-white flex-shrink-0`}
    >
      {getInitials(name)}
    </div>
  )
}

const EMPTY_FORM = {
  contact_name: "",
  title: "",
  organization: "",
  email: "",
  phone: "",
  status: "lead",
  notes: "",
  background: "",
  hospital_details: "",
  hospital_beds: "",
  hospital_system: "",
  hospital_location: "",
  why_they_matter: "",
  target_offer: "",
  strategy_type: "founding_partner",
  monthly_price_low: "",
  monthly_price_high: "",
  implementation_low: "",
  implementation_high: "",
  profile_image_url: "",
}

export default function EnterpriseContactsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [search, setSearch] = useState("")

  // Contact dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Detail panel
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [logs, setLogs] = useState<ContactLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Log dialog
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [logType, setLogType] = useState("note")
  const [logContent, setLogContent] = useState("")
  const [savingLog, setSavingLog] = useState(false)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)

  // Research Contact dialog
  const [researchDialogOpen, setResearchDialogOpen] = useState(false)
  const [researchUrl, setResearchUrl] = useState("")
  const [researching, setResearching] = useState(false)
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null)
  const [researchError, setResearchError] = useState("")
  const [addingResearched, setAddingResearched] = useState(false)

  // Contract toggle loading
  const [togglingContract, setTogglingContract] = useState<string | null>(null)

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadContacts = useCallback(async () => {
    const { data } = await supabase
      .from("enterprise_contacts")
      .select("*")
      .order("sort_order", { ascending: true })
    setContacts(data || [])
    setLoading(false)
  }, [supabase])

  function handleReorder(newOrder: Contact[]) {
    setContacts(newOrder)

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      const updates = newOrder.map((c, i) => ({ id: c.id, sort_order: i + 1 }))
      for (const u of updates) {
        await supabase
          .from("enterprise_contacts")
          .update({ sort_order: u.sort_order })
          .eq("id", u.id)
      }
    }, 400)
  }

  const loadLogs = useCallback(async (contactId: string) => {
    setLogsLoading(true)
    const { data } = await supabase
      .from("enterprise_contact_logs")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
    setLogs(data || [])
    setLogsLoading(false)
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        await loadContacts()

        // Handle URL params for deep-linking
        const contactId = searchParams.get("contact")
        const action = searchParams.get("action")

        if (contactId) {
          const { data: target } = await supabase
            .from("enterprise_contacts")
            .select("*")
            .eq("id", contactId)
            .single()
          if (target) setSelectedContact(target)
        }
        if (action === "research") {
          setResearchDialogOpen(true)
        }
      }
    }
    init()
  }, [supabase, loadContacts, searchParams])

  useEffect(() => {
    if (selectedContact) {
      loadLogs(selectedContact.id)
    }
  }, [selectedContact, loadLogs])

  const filtered = contacts.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.contact_name.toLowerCase().includes(q) ||
      c.organization.toLowerCase().includes(q) ||
      (c.hospital_system?.toLowerCase().includes(q) ?? false) ||
      (c.hospital_location?.toLowerCase().includes(q) ?? false)
    )
  })

  function openCreateDialog() {
    setEditingContact(null)
    setFormData(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEditDialog(contact: Contact) {
    setEditingContact(contact)
    setFormData({
      contact_name: contact.contact_name,
      title: contact.title || "",
      organization: contact.organization,
      email: contact.email || "",
      phone: contact.phone || "",
      status: contact.status,
      notes: contact.notes || "",
      background: contact.background || "",
      hospital_details: contact.hospital_details || "",
      hospital_beds: contact.hospital_beds || "",
      hospital_system: contact.hospital_system || "",
      hospital_location: contact.hospital_location || "",
      why_they_matter: contact.why_they_matter || "",
      target_offer: contact.target_offer || "",
      strategy_type: contact.strategy_type || "founding_partner",
      monthly_price_low: contact.monthly_price_low?.toString() || "",
      monthly_price_high: contact.monthly_price_high?.toString() || "",
      implementation_low: contact.implementation_low?.toString() || "",
      implementation_high: contact.implementation_high?.toString() || "",
      profile_image_url: contact.profile_image_url || "",
    })
    setDialogOpen(true)
  }

  async function handleSaveContact() {
    if (!formData.contact_name || !formData.organization) return
    setSaving(true)

    const payload = {
      contact_name: formData.contact_name,
      title: formData.title || null,
      organization: formData.organization,
      email: formData.email || null,
      phone: formData.phone || null,
      status: formData.status,
      notes: formData.notes || null,
      background: formData.background || null,
      hospital_details: formData.hospital_details || null,
      hospital_beds: formData.hospital_beds || null,
      hospital_system: formData.hospital_system || null,
      hospital_location: formData.hospital_location || null,
      why_they_matter: formData.why_they_matter || null,
      target_offer: formData.target_offer || null,
      strategy_type: formData.strategy_type || null,
      monthly_price_low: formData.monthly_price_low ? parseInt(formData.monthly_price_low) : null,
      monthly_price_high: formData.monthly_price_high ? parseInt(formData.monthly_price_high) : null,
      implementation_low: formData.implementation_low ? parseInt(formData.implementation_low) : null,
      implementation_high: formData.implementation_high ? parseInt(formData.implementation_high) : null,
      profile_image_url: formData.profile_image_url || null,
    }

    if (editingContact) {
      const oldStatus = editingContact.status
      await supabase
        .from("enterprise_contacts")
        .update(payload)
        .eq("id", editingContact.id)

      if (oldStatus !== formData.status) {
        await supabase.from("enterprise_contact_logs").insert({
          contact_id: editingContact.id,
          log_type: "status_change",
          content: `Status changed from ${STATUS_CONFIG[oldStatus]?.label || oldStatus} to ${STATUS_CONFIG[formData.status]?.label || formData.status}`,
          created_by_id: userId,
        })
      }
    } else {
      await supabase
        .from("enterprise_contacts")
        .insert({ ...payload, created_by_id: userId })
    }

    setDialogOpen(false)
    setSaving(false)
    await loadContacts()

    if (editingContact && selectedContact?.id === editingContact.id) {
      const { data } = await supabase
        .from("enterprise_contacts")
        .select("*")
        .eq("id", editingContact.id)
        .single()
      if (data) {
        setSelectedContact(data)
        loadLogs(data.id)
      }
    }
  }

  async function handleDeleteContact() {
    if (!deletingContact) return
    await supabase
      .from("enterprise_contacts")
      .delete()
      .eq("id", deletingContact.id)

    if (selectedContact?.id === deletingContact.id) {
      setSelectedContact(null)
    }
    setDeleteDialogOpen(false)
    setDeletingContact(null)
    loadContacts()
  }

  async function handleAddLog() {
    if (!selectedContact || !logContent.trim()) return
    setSavingLog(true)

    await supabase.from("enterprise_contact_logs").insert({
      contact_id: selectedContact.id,
      log_type: logType,
      content: logContent.trim(),
      created_by_id: userId,
    })

    setLogDialogOpen(false)
    setLogContent("")
    setLogType("note")
    setSavingLog(false)
    loadLogs(selectedContact.id)
  }

  async function toggleContract(contact: Contact) {
    setTogglingContract(contact.id)
    const newVal = !contact.is_active_contract
    await supabase
      .from("enterprise_contacts")
      .update({ is_active_contract: newVal })
      .eq("id", contact.id)

    // Update local state
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, is_active_contract: newVal } : c))
    )
    if (selectedContact?.id === contact.id) {
      setSelectedContact({ ...selectedContact, is_active_contract: newVal })
    }

    // Log the change
    await supabase.from("enterprise_contact_logs").insert({
      contact_id: contact.id,
      log_type: "status_change",
      content: newVal ? "Contract activated" : "Contract deactivated",
      created_by_id: userId,
    })
    if (selectedContact?.id === contact.id) {
      loadLogs(contact.id)
    }

    setTogglingContract(null)
  }

  /* ── Research Contact ── */
  async function handleResearch() {
    if (!researchUrl.trim()) return
    setResearching(true)
    setResearchResult(null)
    setResearchError("")

    try {
      const res = await fetch("/api/admin/research-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: researchUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResearchError(data.error || "Research failed.")
      } else {
        setResearchResult(data.profile)
      }
    } catch {
      setResearchError("Network error. Please try again.")
    }
    setResearching(false)
  }

  async function handleAddResearchedContact() {
    if (!researchResult) return
    setAddingResearched(true)

    await supabase.from("enterprise_contacts").insert({
      created_by_id: userId,
      contact_name: researchResult.name,
      title: researchResult.title || null,
      organization: researchResult.organization || "Unknown",
      status: "lead",
      background: researchResult.background || null,
      hospital_beds: researchResult.hospital_beds || null,
      hospital_system: researchResult.hospital_system || null,
      hospital_location: researchResult.hospital_location || null,
      hospital_details: researchResult.hospital_details || null,
      why_they_matter: researchResult.why_they_matter || null,
      target_offer: researchResult.target_offer || null,
      strategy_type: researchResult.strategy_type || null,
      monthly_price_low: researchResult.monthly_price_low || null,
      monthly_price_high: researchResult.monthly_price_high || null,
      implementation_low: researchResult.implementation_low || null,
      implementation_high: researchResult.implementation_high || null,
      profile_image_url: researchResult.profile_image_url || null,
    })

    setAddingResearched(false)
    setResearchDialogOpen(false)
    setResearchUrl("")
    setResearchResult(null)
    loadContacts()
  }

  // Pipeline stats
  const potentialMonthlyLow = contacts
    .filter((c) => !c.is_active_contract)
    .reduce((s, c) => s + (c.monthly_price_low || 0), 0)
  const potentialMonthlyHigh = contacts
    .filter((c) => !c.is_active_contract)
    .reduce((s, c) => s + (c.monthly_price_high || 0), 0)
  const activeMonthlyLow = contacts
    .filter((c) => c.is_active_contract)
    .reduce((s, c) => s + (c.monthly_price_low || 0), 0)
  const activeMonthlyHigh = contacts
    .filter((c) => c.is_active_contract)
    .reduce((s, c) => s + (c.monthly_price_high || 0), 0)
  const statusCounts = contacts.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})
  const activeContracts = contacts.filter((c) => c.is_active_contract).length

  return (
    <div className="min-h-screen bg-light-gray">
      {/* Header */}
      <header className="border-b border-sage-medium/50 glass-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div className="h-6 w-px bg-sage-medium/30" />
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-mint" />
              <h1 className="text-lg font-semibold text-dark-bg">Enterprise Pipeline</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResearchDialogOpen(true)
                setResearchUrl("")
                setResearchResult(null)
                setResearchError("")
              }}
            >
              <Globe className="w-4 h-4 mr-2" />
              Research Contact
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Pipeline Stats */}
        <Card className="flex flex-wrap items-center gap-6 md:gap-8 p-5 px-8 glass-card border border-sage-medium/30 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Contacts</span>
            <span className="text-2xl font-bold text-dark-bg">{contacts.length}</span>
          </div>
          <div className="h-10 w-px bg-sage-medium/20 hidden md:block" />
          {Object.entries(STATUS_CONFIG).map(([key, config]) =>
            (statusCounts[key] || 0) > 0 ? (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 uppercase tracking-wider">{config.label}</span>
                <span className="text-2xl font-bold text-dark-bg">{statusCounts[key]}</span>
              </div>
            ) : null
          )}
          <div className="h-10 w-px bg-sage-medium/20 hidden md:block" />
          {activeContracts > 0 && (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-green-600 uppercase tracking-wider font-medium">Active Revenue</span>
                <span className="text-2xl font-bold text-green-700">
                  {formatPricePerMonth(activeMonthlyLow, activeMonthlyHigh)}
                </span>
              </div>
              <div className="h-10 w-px bg-sage-medium/20 hidden md:block" />
            </>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Potential Monthly Pipeline</span>
            <span className="text-2xl font-bold text-dark-bg">
              {formatPricePerMonth(potentialMonthlyLow, potentialMonthlyHigh)}
            </span>
          </div>
        </Card>

        <div className="flex gap-6">
          {/* Contact List */}
          <div className={`${selectedContact ? "w-[340px] flex-shrink-0" : "flex-1 max-w-2xl"} transition-all`}>
            {/* Search */}
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>

            {loading ? (
              <Card className="p-8 text-center text-gray-400 bg-white">Loading...</Card>
            ) : filtered.length === 0 ? (
              <Card className="p-8 text-center text-gray-400 bg-white">
                {search ? "No matches." : "No contacts yet."}
              </Card>
            ) : (
              <Reorder.Group
                axis="y"
                values={search ? filtered : contacts}
                onReorder={search ? () => {} : handleReorder}
                className="space-y-2"
              >
                {(search ? filtered : contacts).filter((c) => {
                  if (!search) return true
                  const q = search.toLowerCase()
                  return (
                    c.contact_name.toLowerCase().includes(q) ||
                    c.organization.toLowerCase().includes(q) ||
                    (c.hospital_system?.toLowerCase().includes(q) ?? false) ||
                    (c.hospital_location?.toLowerCase().includes(q) ?? false)
                  )
                }).map((contact) => (
                  <Reorder.Item
                    key={contact.id}
                    value={contact}
                    dragListener={!search}
                    className="list-none"
                  >
                    <Card
                      onClick={() => setSelectedContact(contact)}
                      className={`p-4 cursor-pointer transition-all bg-white hover:shadow-md ${
                        selectedContact?.id === contact.id
                          ? "ring-2 ring-mint/40 shadow-md"
                          : "hover:border-sage-medium/40"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!search && (
                          <div className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
                            <GripVertical className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex items-start gap-3">
                          <Avatar src={contact.profile_image_url} name={contact.contact_name} size="sm" />
                          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-semibold text-dark-bg truncate text-sm">{contact.contact_name}</h3>
                                {contact.is_active_contract && (
                                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500" title="Active contract" />
                                )}
                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                              </div>
                              {contact.title && (
                                <p className="text-xs text-gray-500 truncate mb-0.5">{contact.title}</p>
                              )}
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                {contact.hospital_location && (
                                  <>
                                    <MapPin className="w-3 h-3" />
                                    <span>{contact.hospital_location}</span>
                                    <span className="text-gray-300">|</span>
                                  </>
                                )}
                                <span className="truncate">{contact.organization}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <Badge variant="outline" className={STATUS_CONFIG[contact.status]?.className || ""}>
                                {STATUS_CONFIG[contact.status]?.label || contact.status}
                              </Badge>
                              {contact.strategy_type && (
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STRATEGY_CONFIG[contact.strategy_type]?.className || ""}`}>
                                  {STRATEGY_CONFIG[contact.strategy_type]?.label || contact.strategy_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {(contact.monthly_price_low || contact.monthly_price_high) && (
                        <div className={`mt-2 pt-2 border-t border-gray-50 flex items-center gap-1.5 text-xs ${!search ? "ml-6" : ""}`}>
                          <DollarSign className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600 font-medium">
                            {formatPricePerMonth(contact.monthly_price_low, contact.monthly_price_high)}
                          </span>
                          {contact.hospital_beds && (
                            <>
                              <span className="text-gray-300 mx-1">|</span>
                              <BedDouble className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-500">{contact.hospital_beds}</span>
                            </>
                          )}
                        </div>
                      )}
                    </Card>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </div>

          {/* Detail Panel */}
          {selectedContact && (
            <div className="flex-1 min-w-0">
              <Card className="bg-white rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,.06),0_1px_2px_-1px_rgba(0,0,0,.06),0_2px_4px_rgba(0,0,0,.04)] overflow-hidden">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <Avatar src={selectedContact.profile_image_url} name={selectedContact.contact_name} size="lg" />
                      <div>
                        <h2 className="text-xl font-bold text-dark-bg">{selectedContact.contact_name}</h2>
                        {selectedContact.title && (
                          <p className="text-sm text-gray-500 mt-0.5">{selectedContact.title}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEditDialog(selectedContact)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                        onClick={() => setSelectedContact(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={STATUS_CONFIG[selectedContact.status]?.className || ""}>
                      {STATUS_CONFIG[selectedContact.status]?.label || selectedContact.status}
                    </Badge>
                    {selectedContact.strategy_type && (
                      <Badge variant="outline" className={STRATEGY_CONFIG[selectedContact.strategy_type]?.className || ""}>
                        {STRATEGY_CONFIG[selectedContact.strategy_type]?.label || selectedContact.strategy_type}
                      </Badge>
                    )}
                    {selectedContact.hospital_system && (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                        {selectedContact.hospital_system}
                      </Badge>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <span className={`text-xs font-medium ${selectedContact.is_active_contract ? "text-green-600" : "text-gray-400"}`}>
                        {selectedContact.is_active_contract ? "Active Contract" : "No Contract"}
                      </span>
                      <ContractToggle
                        isActive={selectedContact.is_active_contract}
                        onToggle={() => toggleContract(selectedContact)}
                        disabled={togglingContract === selectedContact.id}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6 max-h-[calc(100vh-260px)] overflow-y-auto">
                  {/* Hospital & Location */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      Hospital
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400 text-xs">Organization</span>
                        <p className="text-gray-700">{selectedContact.organization}</p>
                      </div>
                      {selectedContact.hospital_location && (
                        <div>
                          <span className="text-gray-400 text-xs">Location</span>
                          <p className="text-gray-700">{selectedContact.hospital_location}</p>
                        </div>
                      )}
                      {selectedContact.hospital_beds && (
                        <div>
                          <span className="text-gray-400 text-xs">Beds</span>
                          <p className="text-gray-700">{selectedContact.hospital_beds}</p>
                        </div>
                      )}
                      {selectedContact.hospital_system && (
                        <div>
                          <span className="text-gray-400 text-xs">System</span>
                          <p className="text-gray-700">{selectedContact.hospital_system}</p>
                        </div>
                      )}
                    </div>
                    {selectedContact.hospital_details && (
                      <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{selectedContact.hospital_details}</p>
                    )}
                  </section>

                  {/* Contact Info */}
                  {(selectedContact.email || selectedContact.phone) && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        Contact
                      </h3>
                      <div className="space-y-1.5 text-sm">
                        {selectedContact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <a href={`mailto:${selectedContact.email}`} className="text-mint hover:underline">
                              {selectedContact.email}
                            </a>
                          </div>
                        )}
                        {selectedContact.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">{selectedContact.phone}</span>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Background */}
                  {selectedContact.background && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" />
                        Background
                      </h3>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{selectedContact.background}</p>
                    </section>
                  )}

                  {/* Why They Matter */}
                  {selectedContact.why_they_matter && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5" />
                        Why They Matter for Luma
                      </h3>
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedContact.why_they_matter}</p>
                      </div>
                    </section>
                  )}

                  {/* Pricing & Offer */}
                  {(selectedContact.monthly_price_low || selectedContact.monthly_price_high || selectedContact.target_offer) && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" />
                        Target Offer
                      </h3>
                      {(selectedContact.monthly_price_low || selectedContact.monthly_price_high) && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                            <span className="text-xs text-green-600 font-medium">Monthly</span>
                            <p className="text-lg font-bold text-green-700">
                              {formatPricePerMonth(selectedContact.monthly_price_low, selectedContact.monthly_price_high)}
                            </p>
                          </div>
                          {(selectedContact.implementation_low || selectedContact.implementation_high) && (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                              <span className="text-xs text-amber-600 font-medium">Implementation</span>
                              <p className="text-lg font-bold text-amber-700">
                                {formatPrice(selectedContact.implementation_low, selectedContact.implementation_high)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {selectedContact.target_offer && (
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{selectedContact.target_offer}</p>
                      )}
                    </section>
                  )}

                  {/* Notes */}
                  {selectedContact.notes && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Notes
                      </h3>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedContact.notes}</p>
                    </section>
                  )}

                  {/* Activity Log */}
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Activity
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLogDialogOpen(true)}
                        className="h-7 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Log
                      </Button>
                    </div>

                    {logsLoading ? (
                      <p className="text-sm text-gray-400">Loading...</p>
                    ) : logs.length === 0 ? (
                      <p className="text-sm text-gray-400">No activity logged yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {logs.map((log) => (
                          <div key={log.id} className="flex gap-3">
                            <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                              {LOG_TYPE_CONFIG[log.log_type]?.icon || <MessageSquare className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">
                                  {LOG_TYPE_CONFIG[log.log_type]?.label || log.log_type}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {log.created_at
                                    ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true })
                                    : ""}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-0.5">{log.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Actions */}
                  <div className="pt-2 border-t border-gray-100 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(selectedContact)}>
                      <Edit className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setLogDialogOpen(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Log Activity
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-coral hover:text-coral hover:bg-coral/5"
                      onClick={() => {
                        setDeletingContact(selectedContact)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Contact Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
            <DialogDescription>
              {editingContact
                ? "Update this enterprise contact."
                : "Add a new enterprise contact to the pipeline."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Person */}
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Person</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_name">Name *</Label>
                <Input id="contact_name" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="CEO, VP of Ops..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="profile_image_url">Profile Image URL</Label>
              <Input id="profile_image_url" value={formData.profile_image_url} onChange={(e) => setFormData({ ...formData, profile_image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="background">Background</Label>
              <textarea id="background" value={formData.background} onChange={(e) => setFormData({ ...formData, background: e.target.value })} rows={2} placeholder="Career history, credentials, relationship context..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>

            {/* Hospital */}
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Hospital</div>
            <div>
              <Label htmlFor="organization">Organization *</Label>
              <Input id="organization" value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="hospital_location">Location</Label>
                <Input id="hospital_location" value={formData.hospital_location} onChange={(e) => setFormData({ ...formData, hospital_location: e.target.value })} placeholder="El Paso, TX" />
              </div>
              <div>
                <Label htmlFor="hospital_beds">Beds</Label>
                <Input id="hospital_beds" value={formData.hospital_beds} onChange={(e) => setFormData({ ...formData, hospital_beds: e.target.value })} placeholder="~238 beds" />
              </div>
              <div>
                <Label htmlFor="hospital_system">System</Label>
                <Input id="hospital_system" value={formData.hospital_system} onChange={(e) => setFormData({ ...formData, hospital_system: e.target.value })} placeholder="Tenet" />
              </div>
            </div>
            <div>
              <Label htmlFor="hospital_details">Hospital Details</Label>
              <textarea id="hospital_details" value={formData.hospital_details} onChange={(e) => setFormData({ ...formData, hospital_details: e.target.value })} rows={2} placeholder="Acute-care, expansion plans, service lines..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>

            {/* Strategy */}
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Strategy</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Pipeline Status</Label>
                <select id="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="strategy_type">Strategy Type</Label>
                <select id="strategy_type" value={formData.strategy_type} onChange={(e) => setFormData({ ...formData, strategy_type: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {Object.entries(STRATEGY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="why_they_matter">Why They Matter for Luma</Label>
              <textarea id="why_they_matter" value={formData.why_they_matter} onChange={(e) => setFormData({ ...formData, why_they_matter: e.target.value })} rows={3} placeholder="Strategic value, relationship leverage, proof points..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>

            {/* Pricing */}
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Pricing</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_price_low">Monthly (Low)</Label>
                <Input id="monthly_price_low" type="number" value={formData.monthly_price_low} onChange={(e) => setFormData({ ...formData, monthly_price_low: e.target.value })} placeholder="10000" />
              </div>
              <div>
                <Label htmlFor="monthly_price_high">Monthly (High)</Label>
                <Input id="monthly_price_high" type="number" value={formData.monthly_price_high} onChange={(e) => setFormData({ ...formData, monthly_price_high: e.target.value })} placeholder="15000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="implementation_low">Implementation (Low)</Label>
                <Input id="implementation_low" type="number" value={formData.implementation_low} onChange={(e) => setFormData({ ...formData, implementation_low: e.target.value })} placeholder="25000" />
              </div>
              <div>
                <Label htmlFor="implementation_high">Implementation (High)</Label>
                <Input id="implementation_high" type="number" value={formData.implementation_high} onChange={(e) => setFormData({ ...formData, implementation_high: e.target.value })} placeholder="40000" />
              </div>
            </div>
            <div>
              <Label htmlFor="target_offer">Target Offer / Positioning</Label>
              <textarea id="target_offer" value={formData.target_offer} onChange={(e) => setFormData({ ...formData, target_offer: e.target.value })} rows={2} placeholder="How to position the deal, bundle structure..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Current status, next steps..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveContact} disabled={saving || !formData.contact_name || !formData.organization}>
              {saving ? "Saving..." : editingContact ? "Update" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Research Contact Dialog */}
      <Dialog open={researchDialogOpen} onOpenChange={setResearchDialogOpen}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-mint" />
              Research Contact
            </DialogTitle>
            <DialogDescription>
              Paste a profile URL (LinkedIn, hospital bio, etc.) and Perplexity will research the person, their hospital, and assess fit for Luma.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* URL Input */}
            <div className="flex gap-2">
              <Input
                placeholder="https://linkedin.com/in/... or hospital bio URL"
                value={researchUrl}
                onChange={(e) => setResearchUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !researching && handleResearch()}
                className="flex-1"
                disabled={researching}
              />
              <Button onClick={handleResearch} disabled={researching || !researchUrl.trim()}>
                {researching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Researching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Research
                  </>
                )}
              </Button>
            </div>

            {/* Loading State */}
            <AnimatePresence>
              {researching && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center py-12 gap-3"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-mint animate-spin" />
                  </div>
                  <p className="text-sm text-gray-500">Researching profile &amp; hospital data...</p>
                  <p className="text-xs text-gray-400">This takes 10–20 seconds</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {researchError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{researchError}</p>
              </div>
            )}

            {/* Results */}
            <AnimatePresence>
              {researchResult && !researching && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Profile Header */}
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Avatar src={researchResult.profile_image_url} name={researchResult.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-dark-bg">{researchResult.name}</h3>
                      {researchResult.title && <p className="text-sm text-gray-600">{researchResult.title}</p>}
                      {researchResult.organization && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5" />
                          {researchResult.organization}
                        </p>
                      )}
                      {researchResult.hospital_location && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {researchResult.hospital_location}
                        </p>
                      )}
                    </div>
                    {/* Fit Score */}
                    {researchResult.fit_score && FIT_CONFIG[researchResult.fit_score] && (
                      <Badge
                        variant="outline"
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${FIT_CONFIG[researchResult.fit_score].className}`}
                      >
                        {FIT_CONFIG[researchResult.fit_score].icon}
                        {FIT_CONFIG[researchResult.fit_score].label}
                      </Badge>
                    )}
                  </div>

                  {/* Fit Reasoning */}
                  {researchResult.fit_reasoning && (
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fit Assessment</h4>
                      <p className="text-sm text-gray-700">{researchResult.fit_reasoning}</p>
                    </div>
                  )}

                  {/* Hospital Info */}
                  {(researchResult.hospital_beds || researchResult.hospital_system || researchResult.hospital_details) && (
                    <div className="grid grid-cols-3 gap-3">
                      {researchResult.hospital_beds && (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-xs text-gray-500">Beds</span>
                          <p className="text-sm font-medium text-gray-700">{researchResult.hospital_beds}</p>
                        </div>
                      )}
                      {researchResult.hospital_system && (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-xs text-gray-500">System</span>
                          <p className="text-sm font-medium text-gray-700">{researchResult.hospital_system}</p>
                        </div>
                      )}
                      {researchResult.strategy_type && STRATEGY_CONFIG[researchResult.strategy_type] && (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-xs text-gray-500">Strategy</span>
                          <p className="text-sm font-medium text-gray-700">
                            {STRATEGY_CONFIG[researchResult.strategy_type].label}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {researchResult.hospital_details && (
                    <p className="text-sm text-gray-600">{researchResult.hospital_details}</p>
                  )}

                  {/* Why They Matter */}
                  {researchResult.why_they_matter && (
                    <div className="p-3 bg-green-50/50 border border-green-100 rounded-lg">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Why They Matter</h4>
                      <p className="text-sm text-gray-700">{researchResult.why_they_matter}</p>
                    </div>
                  )}

                  {/* Pricing */}
                  {(researchResult.monthly_price_low || researchResult.monthly_price_high) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                        <span className="text-xs text-green-600 font-medium">Suggested Monthly</span>
                        <p className="text-lg font-bold text-green-700">
                          {formatPricePerMonth(researchResult.monthly_price_low, researchResult.monthly_price_high)}
                        </p>
                      </div>
                      {(researchResult.implementation_low || researchResult.implementation_high) && (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                          <span className="text-xs text-amber-600 font-medium">Implementation</span>
                          <p className="text-lg font-bold text-amber-700">
                            {formatPrice(researchResult.implementation_low, researchResult.implementation_high)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Target Offer */}
                  {researchResult.target_offer && (
                    <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Suggested Positioning</h4>
                      <p className="text-sm text-gray-700">{researchResult.target_offer}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {researchResult && !researching && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setResearchResult(null)
                  setResearchUrl("")
                }}
              >
                Research Another
              </Button>
              <Button onClick={handleAddResearchedContact} disabled={addingResearched}>
                {addingResearched ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add to Pipeline
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Log Activity Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
            <DialogDescription>
              Record a touchpoint with {selectedContact?.contact_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label htmlFor="log_type">Type</Label>
              <select id="log_type" value={logType} onChange={(e) => setLogType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>
            <div>
              <Label htmlFor="log_content">Details</Label>
              <textarea id="log_content" value={logContent} onChange={(e) => setLogContent(e.target.value)} placeholder="What happened? Key takeaways?" rows={4} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLog} disabled={savingLog || !logContent.trim()}>
              {savingLog ? "Saving..." : "Log Activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Delete {deletingContact?.contact_name}? All activity logs will be removed too. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteContact}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
