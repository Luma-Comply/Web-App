"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import jsPDF from "jspdf"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Autocomplete } from "@/components/ui/autocomplete"
import { searchPayers } from "@/lib/payers"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LumaLogo } from "@/components/LumaLogo"
import { SuggestedForms } from "@/components/dashboard/SuggestedForms"
import { LCDValidationPanel } from "@/components/dashboard/LCDValidationPanel"
import { ChecklistItemEditModal } from "@/components/dashboard/ChecklistItemEditModal"
import { ChatInterface, ChatInterfaceRef } from "@/components/chat/ChatInterface"
import { ChatMessage } from "@/components/chat/ChatMessage"
import { ChatOverlay } from "@/components/chat/ChatOverlay"
import type { CaseContext } from "@/components/chat/ChatInput"
import { GeneratingSteps } from "@/components/GeneratingSteps"
import { ArrowLeft, Loader2, Sparkles, Copy, Download, CheckCircle, Check, RefreshCw, ChevronDown, MessageSquare, FileText, Image, AlertTriangle, Send, ThumbsUp, ThumbsDown, Clock, Calendar, Hash, FileWarning, Bell, RotateCcw, Square, X } from "lucide-react"
import type { LCDValidationResult, ChecklistEdit, ChecklistEditsData, ChecklistItemWithEdits } from "@/lib/lcd-validation"
import { motion, AnimatePresence } from "framer-motion"

interface CaseData {
  id: string
  user_id: string
  doc_type: string
  patient_first_name: string
  patient_last_name: string
  patient_age: number
  patient_state: string
  patient_gender: string | null
  diagnosis_codes: string[]
  disease_activity: string
  lab_values: string
  prior_treatments: string
  requested_medication: string
  medication_dose: string
  payer_type: string
  payer_name: string
  claim_amount: number | null
  generated_output: string | null
  edited_output: string | null
  status: string
  created_at: string
  updated_at: string | null
  pa_reference_number: string | null
  submitted_at: string | null
  decision_date: string | null
  denial_reason: string | null
  denial_category: string | null
  denial_notes: string | null
  pa_expiration_date: string | null
  expected_decision_date: string | null
  followup_date: string | null
  parent_case_id: string | null
  metadata?: {
    manually_edited?: boolean
    creation_method?: string
    original_pasted_text?: string
    [key: string]: unknown
  }
}

const DENIAL_CATEGORIES = [
  "Missing documentation",
  "Medical necessity not established",
  "Step therapy incomplete",
  "Formulary exclusion",
  "Coding error",
  "Other",
] as const

function getStatusConfig(status: string) {
  switch (status) {
    case "chat":
      return { label: "Chat", classes: "bg-purple-100 text-purple-700", icon: MessageSquare }
    case "draft":
      return { label: "Draft", classes: "bg-gray-100 text-gray-700", icon: FileText }
    case "generating":
      return { label: "Generating", classes: "bg-amber-100 text-amber-700", icon: Loader2 }
    case "submitted":
      return { label: "Submitted", classes: "bg-blue-100 text-blue-700", icon: Send }
    case "approved":
      return { label: "Approved", classes: "bg-green-100 text-green-700", icon: ThumbsUp }
    case "denied":
      return { label: "Denied", classes: "bg-coral/20 text-coral", icon: ThumbsDown }
    default:
      return { label: status, classes: "bg-gray-100 text-gray-700", icon: FileText }
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++
    }
  }
  return result
}

function toInputDateStr(date: Date): string {
  return date.toISOString().split("T")[0]
}

// --- Tidbits Component logic moved inside component ---

export default function CaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [editedOutput, setEditedOutput] = useState("")
  const [copied, setCopied] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [isDocCollapsed, setIsDocCollapsed] = useState(false)
  const [isSavingEdits, setIsSavingEdits] = useState(false)
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false)
  const [regenerateAcknowledged, setRegenerateAcknowledged] = useState(false)
  const [generationKey, setGenerationKey] = useState(0) // Forces GeneratingSteps remount on regeneration
  const [isChatExpanded, setIsChatExpanded] = useState(false) // Opens when user clicks "Chat with Luma" card
  const [isP2POpen, setIsP2POpen] = useState(false)
  const [p2pRehearsalId, setP2PRehearsalId] = useState<string | null>(null)
  const [p2pMessages, setP2PMessages] = useState<{ id: string; role: "user" | "assistant"; content: string; created_at: string }[]>([])
  const [p2pInput, setP2PInput] = useState("")
  const [p2pStreaming, setP2PStreaming] = useState(false)
  const [p2pStreamingContent, setP2PStreamingContent] = useState("")
  const [p2pScore, setP2PScore] = useState<{ overall_readiness: number; strengths: string[]; weaknesses: string[]; suggested_responses: { objection: string; better_response: string }[] } | null>(null)
  const [p2pEnding, setP2PEnding] = useState(false)
  const [p2pStatus, setP2PStatus] = useState<"idle" | "active" | "completed">("idle")
  const p2pEndRef = useRef<HTMLDivElement>(null)
  const p2pInputRef = useRef<HTMLTextAreaElement>(null)
  const [uploadedDocs, setUploadedDocs] = useState<{ filename: string; fileType: string; storagePath: string | null }[]>([])
  const chatRef = useRef<ChatInterfaceRef>(null)
  const [lcdValidation, setLcdValidation] = useState<{
    riskLevel: string
    denialProbability: number
    foundCount: number
    missingCount: number
    totalRequirements: number
    detectedWoundType?: string
    ctpCovered: boolean
    instantDenialTriggers: string[]
    veryHighRiskItems: string[]
    highRiskItems: string[]
    checklist: LCDValidationResult["checklist"]
    recommendations: LCDValidationResult["recommendations"]
    perplexityFindings: LCDValidationResult["perplexityFindings"]
  } | null>(null)

  // Status management state
  const [submittedDialogOpen, setSubmittedDialogOpen] = useState(false)
  const [approvedDialogOpen, setApprovedDialogOpen] = useState(false)
  const [deniedDialogOpen, setDeniedDialogOpen] = useState(false)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [submittedForm, setSubmittedForm] = useState({
    pa_reference_number: "",
    submitted_at: toInputDateStr(new Date()),
    expected_decision_date: toInputDateStr(addBusinessDays(new Date(), 7)),
  })
  const [approvedForm, setApprovedForm] = useState({
    decision_date: toInputDateStr(new Date()),
    pa_expiration_date: "",
    pa_reference_number: "",
  })
  const [deniedForm, setDeniedForm] = useState({
    decision_date: toInputDateStr(new Date()),
    denial_category: "" as string,
    denial_reason: "",
    denial_notes: "",
  })

  // Follow-up state
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false)
  const [followupDate, setFollowupDate] = useState(toInputDateStr(new Date()))
  const [isSavingFollowup, setIsSavingFollowup] = useState(false)

  // Renewal state
  const [isStartingRenewal, setIsStartingRenewal] = useState(false)

  // Appeal state
  const [isCreatingAppeal, setIsCreatingAppeal] = useState(false)
  const [appealCases, setAppealCases] = useState<{ id: string; status: string; created_at: string }[]>([])

  // Checklist edit state
  const [checklistEdits, setChecklistEdits] = useState<Record<string, ChecklistEdit>>({})
  const [editingItem, setEditingItem] = useState<ChecklistItemWithEdits | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingChecklistEdit, setIsSavingChecklistEdit] = useState(false)

  // Check if user has manually edited (from database metadata)
  const hasManuallyEdited = caseData?.metadata?.manually_edited === true
  const [editFormData, setEditFormData] = useState({
    patient_first_name: "",
    patient_last_name: "",
    patient_age: "",
    patient_state: "",
    payer_name: "",
    claim_amount: "",
    disease_activity: "",
  })

  // Carousel State
  const [tidbitIndex, setTidbitIndex] = useState(0)

  const tidbits = [
    "Did you know? Insurance denials cost healthcare practices over $262 billion annually.",
    `Searching current Clinical Policy Bulletins for ${caseData?.payer_name || "payer"}...`,
    "Fact: 65% of denials are recoverable, but only 2% are ever appealed.",
    "Analyzing step therapy requirements and prior authorization criteria...",
    "Studies show: Prior auth appeals take 2-4 hours manually. We reduce this to minutes.",
    "Cross-referencing diagnosis codes against medical necessity guidelines...",
    "Healthcare providers spend 13 hours per week on prior authorization paperwork.",
    "Structuring arguments to proactively address common rejection reasons...",
    "Our AI reviews 1000+ payer policies to find the strongest evidence for your case.",
    "Ensuring compliance with Medicare LCD/NCD requirements...",
    "Average approval rate increases by 40% when using evidence-based documentation.",
    "Extracting key clinical indicators that support medical necessity...",
    "Fact: 89% of denials are due to insufficient documentation, not medical necessity.",
    "Building persuasive arguments backed by current clinical guidelines...",
  ]

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (generating) {
      interval = setInterval(() => {
        setTidbitIndex((prev) => (prev + 1) % tidbits.length)
      }, 7000) // Change message every 7 seconds (slower)
    }
    return () => clearInterval(interval)
  }, [generating, tidbits.length])

  useEffect(() => {
    loadCase()
  }, [params.id])

  // Load appeal history when case data is available
  useEffect(() => {
    if (caseData?.id) {
      loadAppealHistory()
    }
  }, [caseData?.id])

  // Common words and medical terms to exclude from name extraction
  const excludedWords = new Set([
    'the', 'last', 'first', 'patient', 'this', 'that', 'these', 'those', 'with', 'from', 'for', 'and', 'or', 'but', 'see', 'clinical', 'notes',
    // Medical/pharmaceutical terms
    'amniotic', 'membrane', 'simplimax', 'biologic', 'therapy', 'treatment', 'medication', 'drug', 'infusion', 'injection',
    'humira', 'remicade', 'enbrel', 'stelara', 'cosentyx', 'taltz', 'skyrizi', 'rinvoq', 'xeljanz', 'orencia', 'actemra',
    'methotrexate', 'prednisone', 'sulfasalazine', 'plaquenil', 'hydroxychloroquine',
    // Common medical words that appear capitalized
    'medicare', 'medicaid', 'insurance', 'diagnosis', 'medical', 'hospital', 'clinic', 'doctor', 'physician', 'nurse'
  ])

  // Medical/pharmaceutical naming patterns to exclude
  const medicalPatterns = [
    /max$/i,           // SimpliMax, EpiMax, etc.
    /^bio/i,          // BioSkin, BioMembrane, etc.
    /mab$/i,          // -mab (monoclonal antibodies)
    /^anti/i,         // Anti-TNF, etc.
    /tinib$/i,        // -tinib (tyrosine kinase inhibitors)
    /olimus$/i,       // -olimus (immunosuppressants)
    /parin$/i,        // Heparin derivatives
    /mycin$/i,        // Antibiotics
    /cillin$/i,       // Penicillin derivatives
    /^\d/,            // Starts with number
  ]

  // Validate if extracted text looks like a real name
  const isValidName = (name: string): boolean => {
    if (!name || typeof name !== 'string') return false
    // Must be at least 3 characters (to avoid "the", "last", etc.)
    if (name.length < 3) return false
    // Must start with capital letter
    if (!/^[A-Z]/.test(name)) return false
    // Must not be in excluded words
    if (excludedWords.has(name.toLowerCase())) return false
    // Check against medical naming patterns
    for (const pattern of medicalPatterns) {
      if (pattern.test(name)) return false
    }
    // Must contain only letters (no numbers, special chars except hyphens/apostrophes)
    if (!/^[A-Za-z'-]+$/.test(name)) return false
    // Must have at least 2 letters (not just one letter)
    if (name.replace(/[^A-Za-z]/g, '').length < 2) return false
    // Reject names that are all caps (often medical abbreviations or product names)
    if (name === name.toUpperCase() && name.length > 1) return false
    // Reject names longer than 20 characters (likely product names or descriptions)
    if (name.length > 20) return false
    return true
  }

  // Extract actual patient name from clinical notes if available
  const extractPatientNameFromNotes = () => {
    if (!caseData?.disease_activity) return null

    // Pattern 1: Look in generated output first (most reliable - AI already extracted it)
    if (caseData.generated_output || editedOutput) {
      const output = caseData.generated_output || editedOutput
      // Look for "for [FirstName] [LastName]" in generated letter
      const outputPattern = /for\s+([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})(?:\s|,|\.|who|is|has)/i
      const outputMatch = output.match(outputPattern)
      if (outputMatch) {
        const first = outputMatch[1].trim()
        const last = outputMatch[2].trim()
        if (isValidName(first) && isValidName(last)) {
          return { first, last }
        }
      }
    }

    // Combine all clinical note fields
    const notes = [
      caseData.disease_activity,
      caseData.prior_treatments,
      caseData.lab_values
    ].filter(Boolean).join(' ')

    // Pattern 2: "Patient: [FirstName] [LastName]" or "Name: [FirstName] [LastName]"
    const labelPattern = /(?:patient|name|pt):\s*([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})/i
    const labelMatch = notes.match(labelPattern)
    if (labelMatch) {
      const first = labelMatch[1].trim()
      const last = labelMatch[2].trim()
      if (isValidName(first) && isValidName(last)) {
        return { first, last }
      }
    }

    // Pattern 3: "Patient [FirstName] [LastName]" - explicit mention
    const patientPattern = /(?:patient|pt\.?)\s+([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})/i
    const patientMatch = notes.match(patientPattern)
    if (patientMatch) {
      const first = patientMatch[1].trim()
      const last = patientMatch[2].trim()
      if (isValidName(first) && isValidName(last)) {
        return { first, last }
      }
    }

    // Pattern 4: "[FirstName] [LastName] is a X-year-old" - very reliable in clinical notes
    const agePattern = /([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})(?:\s+is\s+a|\s+is\s+an|,\s+a)\s+\d+[-\s]?(?:year|yr|yo)/i
    const ageMatch = notes.match(agePattern)
    if (ageMatch) {
      const first = ageMatch[1].trim()
      const last = ageMatch[2].trim()
      if (isValidName(first) && isValidName(last)) {
        return { first, last }
      }
    }

    // Pattern 5: "[FirstName]'s" possessive form - common in clinical narratives
    const possessivePattern = /([A-Z][a-z]{2,})'s\s+(?:wounds|condition|treatment|case|history)/i
    const possessiveMatch = notes.match(possessivePattern)
    if (possessiveMatch) {
      // Found first name, now look for last name nearby
      const firstName = possessiveMatch[1].trim()
      if (isValidName(firstName)) {
        // Look for "[FirstName] [LastName]" pattern in the text
        const fullNamePattern = new RegExp(`${firstName}\\s+([A-Z][a-z]{2,})`, 'i')
        const fullMatch = notes.match(fullNamePattern)
        if (fullMatch) {
          const last = fullMatch[1].trim()
          if (isValidName(last)) {
            return { first: firstName, last }
          }
        }
      }
    }

    // Pattern 6: "for [FirstName] [LastName]" - common in letters
    const forPattern = /for\s+(?:patient\s+)?([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})(?:\s|,|\.|who|is|has)/i
    const forMatch = notes.match(forPattern)
    if (forMatch) {
      const first = forMatch[1].trim()
      const last = forMatch[2].trim()
      if (isValidName(first) && isValidName(last)) {
        return { first, last }
      }
    }

    return null
  }

  // Extract payer/insurance provider from clinical notes
  const extractPayerFromNotes = () => {
    if (!caseData?.disease_activity) return null

    // Common insurance provider names (case-insensitive)
    const insuranceProviders = [
      'Blue Cross Blue Shield', 'BCBS', 'Blue Cross', 'Blue Shield',
      'Cigna', 'Aetna', 'UnitedHealthcare', 'United Health', 'Medicare', 'Medicaid',
      'Anthem', 'Humana', 'Kaiser', 'Kaiser Permanente', 'Molina', 'Centene',
      'WellCare', 'Wellpoint', 'Health Net', 'Tricare', 'CHAMPVA'
    ]

    // Pattern 1: Look in generated output first (most reliable - AI already extracted it)
    if (caseData.generated_output || editedOutput) {
      const output = caseData.generated_output || editedOutput
      // Look for payer name at the beginning of the letter (usually in the address line)
      for (const provider of insuranceProviders) {
        const pattern = new RegExp(`^[^\\n]*${provider.replace(/\s+/g, '\\s+')}[^\\n]*$`, 'im')
        if (pattern.test(output)) {
          return provider
        }
      }
    }

    // Combine all clinical note fields
    const notes = [
      caseData.disease_activity,
      caseData.prior_treatments,
      caseData.lab_values
    ].filter(Boolean).join(' ')

    // Pattern 2: Look for "insurance: [Provider]" or "[Provider] insurance"
    for (const provider of insuranceProviders) {
      const patterns = [
        new RegExp(`(?:insurance|payer|coverage):\\s*${provider.replace(/\s+/g, '\\s+')}`, 'i'),
        new RegExp(`${provider.replace(/\s+/g, '\\s+')}\\s+(?:insurance|payer|coverage)`, 'i'),
        new RegExp(`\\b${provider.replace(/\s+/g, '\\s+')}\\b`, 'i')
      ]

      for (const pattern of patterns) {
        if (pattern.test(notes)) {
          return provider
        }
      }
    }

    return null
  }

  // AUTO-GENERATE TRIGGER
  // For 'draft' status cases without output, GeneratingSteps component handles generation
  // via the streaming API. No need to call generateDocumentation() here.
  // The render condition (needsGeneration && !hasGenerated) shows GeneratingSteps which handles it.

  // Check if case is in chat mode
  const isInChatMode = caseData?.status === 'chat'

  // Note: Auto-extraction is now display-only (see render logic below)
  // We no longer auto-save extracted names to the database to prevent overwriting user input

  async function loadCase() {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error) throw error

      setCaseData(data)
      setEditedOutput(data.edited_output || data.generated_output || "")

      // Load saved LCD validation from metadata if available
      if (data.metadata?.lcd_validation_full) {
        setLcdValidation(data.metadata.lcd_validation_full)
      }

      // Load saved checklist edits from metadata if available
      if (data.metadata?.checklist_edits?.edits) {
        setChecklistEdits(data.metadata.checklist_edits.edits)
      }
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string }
      console.error("Error loading case:", err?.message || err?.code || JSON.stringify(error))
    } finally {
      setLoading(false)
    }
  }

  const getRiskItems = () => {
    if (!lcdValidation) return []
    const items: { label: string; text: string; severity: 'instant' | 'very-high' | 'high' }[] = []

    lcdValidation.instantDenialTriggers.forEach((trigger) => {
      items.push({ label: trigger, text: trigger, severity: 'instant' })
    })
    lcdValidation.veryHighRiskItems.forEach((item) => {
      items.push({ label: item, text: item, severity: 'very-high' })
    })
    lcdValidation.highRiskItems.forEach((item) => {
      items.push({ label: item, text: item, severity: 'high' })
    })

    return items
  }

  const riskItems = getRiskItems()

  // Build case context for chat presets — pulls real data from lcdValidation + caseData
  const caseContext: CaseContext | undefined = (() => {
    if (!lcdValidation && !caseData) return undefined
    const ctx: CaseContext = {}

    if (lcdValidation) {
      ctx.checklist = lcdValidation.checklist?.map(cat => ({
        category: cat.category,
        items: cat.items.map(i => ({
          label: i.label,
          status: i.status,
          suggestion: i.suggestion,
          evidence: i.evidence,
        })),
        foundCount: cat.foundCount,
        missingCount: cat.missingCount,
      }))

      ctx.recommendations = lcdValidation.recommendations?.map(r => ({
        priority: r.priority,
        action: r.action,
        reason: r.reason,
        suggestedLanguage: r.suggestedLanguage,
      }))

      if (lcdValidation.perplexityFindings) {
        const pf = lcdValidation.perplexityFindings
        ctx.researchFindings = {
          lcdEffectiveDate: pf.lcdEffectiveDate,
          productCoverageStatus: pf.productCoverageStatus,
          recentLcdChanges: pf.recentLcdChanges,
          currentAuditFocusAreas: pf.currentAuditFocusAreas,
          oigWorkPlanItems: pf.oigWorkPlanItems,
        }
      }

      ctx.riskLevel = lcdValidation.riskLevel
      ctx.denialProbability = lcdValidation.denialProbability
    }

    if (caseData) {
      ctx.caseSummary = {
        patientName: `${caseData.patient_first_name || ''} ${caseData.patient_last_name || ''}`.trim() || undefined,
        diagnosis: caseData.diagnosis_codes,
        medication: caseData.requested_medication,
        payer: caseData.payer_name,
        priorTreatments: caseData.prior_treatments,
      }
    }

    return ctx
  })()

  async function loadUploadedDocs() {
    if (!caseData) return

    const { data: messages } = await supabase
      .from("case_messages")
      .select("metadata")
      .eq("case_id", caseData.id)
      .eq("role", "system")
      .order("created_at", { ascending: true })

    if (messages) {
      const docs = messages
        .filter(m => {
          const metadata = typeof m.metadata === "string" ? JSON.parse(m.metadata) : m.metadata
          return metadata?.type === "file_upload"
        })
        .map(m => {
          const metadata = typeof m.metadata === "string" ? JSON.parse(m.metadata) : m.metadata
          return {
            filename: metadata.filename || "Document",
            fileType: metadata.fileType || "file",
            storagePath: metadata.storagePath || null,
          }
        })
      setUploadedDocs(docs)
    }
  }

  // Load uploaded docs on page load and when chat modal opens
  useEffect(() => {
    if (caseData) {
      loadUploadedDocs()
    }
  }, [caseData?.id])

  // Status update handlers
  function openSubmittedDialog() {
    setSubmittedForm({
      pa_reference_number: caseData?.pa_reference_number || "",
      submitted_at: toInputDateStr(new Date()),
      expected_decision_date: toInputDateStr(addBusinessDays(new Date(), 7)),
    })
    setSubmittedDialogOpen(true)
  }

  function openApprovedDialog() {
    setApprovedForm({
      decision_date: toInputDateStr(new Date()),
      pa_expiration_date: "",
      pa_reference_number: caseData?.pa_reference_number || "",
    })
    setApprovedDialogOpen(true)
  }

  function openDeniedDialog() {
    setDeniedForm({
      decision_date: toInputDateStr(new Date()),
      denial_category: "",
      denial_reason: "",
      denial_notes: "",
    })
    setDeniedDialogOpen(true)
  }

  async function handleMarkAsSubmitted() {
    if (!caseData || isSavingStatus) return
    setIsSavingStatus(true)
    try {
      const { error } = await supabase
        .from("cases")
        .update({
          status: "submitted",
          pa_reference_number: submittedForm.pa_reference_number.trim() || null,
          submitted_at: new Date(submittedForm.submitted_at + "T12:00:00").toISOString(),
          expected_decision_date: submittedForm.expected_decision_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseData.id)

      if (error) throw error

      setCaseData({
        ...caseData,
        status: "submitted",
        pa_reference_number: submittedForm.pa_reference_number.trim() || null,
        submitted_at: new Date(submittedForm.submitted_at + "T12:00:00").toISOString(),
        expected_decision_date: submittedForm.expected_decision_date || null,
        updated_at: new Date().toISOString(),
      })
      setSubmittedDialogOpen(false)
      toast({ title: "Status Updated", description: "Case marked as submitted to payer." })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({ variant: "destructive", title: "Update Failed", description: error?.message || "Failed to update status." })
    } finally {
      setIsSavingStatus(false)
    }
  }

  async function handleMarkAsApproved() {
    if (!caseData || isSavingStatus) return
    if (!approvedForm.pa_expiration_date) {
      toast({ variant: "destructive", title: "Validation Error", description: "PA expiration date is required." })
      return
    }
    setIsSavingStatus(true)
    try {
      const { error } = await supabase
        .from("cases")
        .update({
          status: "approved",
          decision_date: new Date(approvedForm.decision_date + "T12:00:00").toISOString(),
          pa_expiration_date: approvedForm.pa_expiration_date,
          pa_reference_number: approvedForm.pa_reference_number.trim() || caseData.pa_reference_number,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseData.id)

      if (error) throw error

      setCaseData({
        ...caseData,
        status: "approved",
        decision_date: new Date(approvedForm.decision_date + "T12:00:00").toISOString(),
        pa_expiration_date: approvedForm.pa_expiration_date,
        pa_reference_number: approvedForm.pa_reference_number.trim() || caseData.pa_reference_number,
        updated_at: new Date().toISOString(),
      })
      setApprovedDialogOpen(false)
      toast({ title: "Status Updated", description: "Case marked as approved." })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({ variant: "destructive", title: "Update Failed", description: error?.message || "Failed to update status." })
    } finally {
      setIsSavingStatus(false)
    }
  }

  async function handleMarkAsDenied() {
    if (!caseData || isSavingStatus) return
    if (!deniedForm.denial_category) {
      toast({ variant: "destructive", title: "Validation Error", description: "Denial category is required." })
      return
    }
    if (!deniedForm.denial_reason.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Denial reason is required." })
      return
    }
    setIsSavingStatus(true)
    try {
      const { error } = await supabase
        .from("cases")
        .update({
          status: "denied",
          decision_date: new Date(deniedForm.decision_date + "T12:00:00").toISOString(),
          denial_category: deniedForm.denial_category,
          denial_reason: deniedForm.denial_reason.trim(),
          denial_notes: deniedForm.denial_notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseData.id)

      if (error) throw error

      setCaseData({
        ...caseData,
        status: "denied",
        decision_date: new Date(deniedForm.decision_date + "T12:00:00").toISOString(),
        denial_category: deniedForm.denial_category,
        denial_reason: deniedForm.denial_reason.trim(),
        denial_notes: deniedForm.denial_notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      setDeniedDialogOpen(false)
      toast({ title: "Status Updated", description: "Case marked as denied." })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({ variant: "destructive", title: "Update Failed", description: error?.message || "Failed to update status." })
    } finally {
      setIsSavingStatus(false)
    }
  }

  // Follow-up handler
  async function handleMarkFollowUp() {
    if (!caseData || isSavingFollowup) return
    setIsSavingFollowup(true)
    try {
      const dateValue = new Date(followupDate + "T12:00:00").toISOString()
      const { error } = await supabase
        .from("cases")
        .update({
          followup_date: dateValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseData.id)

      if (error) throw error

      setCaseData({
        ...caseData,
        followup_date: dateValue,
        updated_at: new Date().toISOString(),
      })
      setFollowupDialogOpen(false)
      toast({ title: "Follow-Up Recorded", description: `Follow-up logged for ${formatDate(followupDate)}.` })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error saving follow-up:", error)
      toast({ variant: "destructive", title: "Save Failed", description: error?.message || "Failed to record follow-up." })
    } finally {
      setIsSavingFollowup(false)
    }
  }

  // PA renewal handler — creates a new case with same patient/clinical data
  async function handleStartRenewal() {
    if (!caseData || isStartingRenewal) return
    setIsStartingRenewal(true)
    try {
      const { data, error } = await supabase
        .from("cases")
        .insert({
          user_id: caseData.user_id,
          doc_type: caseData.doc_type,
          status: "draft",
          parent_case_id: caseData.id,
          patient_first_name: caseData.patient_first_name,
          patient_last_name: caseData.patient_last_name,
          patient_age: caseData.patient_age,
          patient_state: caseData.patient_state,
          patient_gender: caseData.patient_gender,
          diagnosis_codes: caseData.diagnosis_codes,
          disease_activity: caseData.disease_activity,
          lab_values: caseData.lab_values,
          prior_treatments: caseData.prior_treatments,
          requested_medication: caseData.requested_medication,
          medication_dose: caseData.medication_dose,
          payer_type: caseData.payer_type,
          payer_name: caseData.payer_name,
          claim_amount: caseData.claim_amount,
        })
        .select("id")
        .single()

      if (error) throw error

      toast({ title: "Renewal Case Created", description: "Navigate to the new case to generate updated documentation." })
      router.push(`/cases/${data.id}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error creating renewal case:", error)
      toast({ variant: "destructive", title: "Renewal Failed", description: error?.message || "Failed to create renewal case." })
    } finally {
      setIsStartingRenewal(false)
    }
  }

  // Appeal: load child appeal cases for history display
  async function loadAppealHistory() {
    if (!caseData?.id) return
    const { data } = await supabase
      .from("cases")
      .select("id, status, created_at")
      .eq("parent_case_id", caseData.id)
      .eq("doc_type", "appeal")
      .order("created_at", { ascending: false })
    if (data) setAppealCases(data)
  }

  // Appeal: create a new appeal case cloned from the current denied case
  async function handleCreateAppeal() {
    if (!caseData || isCreatingAppeal) return
    setIsCreatingAppeal(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated.")

      const { data, error } = await supabase
        .from("cases")
        .insert({
          user_id: session.user.id,
          doc_type: "appeal",
          parent_case_id: caseData.id,
          status: "draft",
          patient_first_name: caseData.patient_first_name,
          patient_last_name: caseData.patient_last_name,
          patient_age: caseData.patient_age,
          patient_state: caseData.patient_state,
          patient_gender: caseData.patient_gender,
          diagnosis_codes: caseData.diagnosis_codes,
          disease_activity: caseData.disease_activity,
          lab_values: caseData.lab_values,
          prior_treatments: caseData.prior_treatments,
          requested_medication: caseData.requested_medication,
          medication_dose: caseData.medication_dose,
          payer_type: caseData.payer_type,
          payer_name: caseData.payer_name,
          claim_amount: caseData.claim_amount,
          metadata: {
            creation_method: "appeal_from_denied",
            original_case_id: caseData.id,
            original_denial_category: caseData.denial_category,
            original_denial_reason: caseData.denial_reason,
          },
        })
        .select("id")
        .single()

      if (error) throw error
      toast({ title: "Appeal Created", description: "Navigating to appeal case..." })
      router.push(`/cases/${data.id}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error creating appeal:", error)
      toast({ variant: "destructive", title: "Appeal Failed", description: error?.message || "Failed to create appeal case." })
    } finally {
      setIsCreatingAppeal(false)
    }
  }

  // ─── Payer Call Practice (P2P Rehearsal) ─────────────────────────
  async function startP2PSession() {
    if (!caseData) return
    setP2PMessages([])
    setP2PScore(null)
    setP2PRehearsalId(null)
    setP2PStatus("idle")
    setIsP2POpen(true)
    setP2PStreaming(true)
    setP2PStreamingContent("")

    try {
      const response = await fetch("/api/p2p-rehearsal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", caseId: caseData.id }),
      })
      if (!response.ok) throw new Error("Failed to start session")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No stream")
      const decoder = new TextDecoder()
      let full = ""
      let newId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.rehearsalId) { newId = d.rehearsalId; setP2PRehearsalId(d.rehearsalId) }
            if (d.content) { full += d.content; setP2PStreamingContent(full) }
          } catch { /* skip malformed */ }
        }
      }

      if (full) {
        setP2PMessages([{ id: "msg-0", role: "assistant", content: full, created_at: new Date().toISOString() }])
      }
      setP2PStreamingContent("")
      setP2PStreaming(false)
      setP2PStatus("active")
      if (newId) setP2PRehearsalId(newId)
      setTimeout(() => p2pInputRef.current?.focus(), 100)
    } catch {
      setP2PStreaming(false)
      toast({ title: "Error", description: "Could not start payer call practice session.", variant: "destructive" })
    }
  }

  async function sendP2PMessage() {
    if (!p2pInput.trim() || p2pStreaming || !p2pRehearsalId || !caseData) return
    const text = p2pInput.trim()
    const userMsg = { id: `msg-${p2pMessages.length}`, role: "user" as const, content: text, created_at: new Date().toISOString() }
    setP2PMessages((prev) => [...prev, userMsg])
    setP2PInput("")
    setP2PStreaming(true)
    setP2PStreamingContent("")

    try {
      const response = await fetch("/api/p2p-rehearsal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", caseId: caseData.id, rehearsalId: p2pRehearsalId, message: text }),
      })
      if (!response.ok) throw new Error("Failed to send")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No stream")
      const decoder = new TextDecoder()
      let full = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.content) { full += d.content; setP2PStreamingContent(full) }
          } catch { /* skip */ }
        }
      }

      if (full) {
        setP2PMessages((prev) => [...prev, { id: `msg-${prev.length}`, role: "assistant", content: full, created_at: new Date().toISOString() }])
      }
      setP2PStreamingContent("")
      setP2PStreaming(false)
      setTimeout(() => p2pInputRef.current?.focus(), 100)
    } catch {
      setP2PStreaming(false)
      toast({ title: "Error", description: "Failed to get response.", variant: "destructive" })
    }
  }

  async function endP2PSession() {
    if (!p2pRehearsalId || !caseData || p2pEnding) return
    setP2PEnding(true)
    try {
      const response = await fetch("/api/p2p-rehearsal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end_session", caseId: caseData.id, rehearsalId: p2pRehearsalId }),
      })
      if (!response.ok) throw new Error("Failed to score")
      const scoreData = await response.json()
      setP2PScore(scoreData)
      setP2PStatus("completed")
    } catch {
      toast({ title: "Error", description: "Could not generate scorecard.", variant: "destructive" })
    } finally {
      setP2PEnding(false)
    }
  }

  // P2P Prep Sheet: generate and download a one-page PDF for peer-to-peer review
  function generateP2PSheet() {
    if (!caseData) return

    const p2pDoc = new jsPDF()
    const margin = 20
    const pageWidth = p2pDoc.internal.pageSize.getWidth()
    const usableWidth = pageWidth - margin * 2
    let y = margin

    // Helper: add section header
    function sectionHeader(title: string) {
      y += 4
      p2pDoc.setFont("helvetica", "bold")
      p2pDoc.setFontSize(11)
      p2pDoc.setTextColor(52, 78, 65)
      p2pDoc.text(title, margin, y)
      y += 1
      p2pDoc.setDrawColor(200, 200, 200)
      p2pDoc.line(margin, y, pageWidth - margin, y)
      y += 6
    }

    // Helper: add a label-value line
    function labelValue(label: string, value: string) {
      p2pDoc.setFont("helvetica", "bold")
      p2pDoc.setFontSize(9.5)
      p2pDoc.setTextColor(80, 80, 80)
      p2pDoc.text(`${label}: `, margin, y)
      const labelW = p2pDoc.getTextWidth(`${label}: `)
      p2pDoc.setFont("helvetica", "normal")
      p2pDoc.setTextColor(0, 0, 0)
      const valLines = p2pDoc.splitTextToSize(value || "N/A", usableWidth - labelW)
      p2pDoc.text(valLines, margin + labelW, y)
      y += valLines.length * 4.5
    }

    // Helper: add wrapped text block
    function wrappedText(text: string, fontSize: number = 9.5) {
      p2pDoc.setFont("helvetica", "normal")
      p2pDoc.setFontSize(fontSize)
      p2pDoc.setTextColor(30, 30, 30)
      const lines = p2pDoc.splitTextToSize(text || "N/A", usableWidth)
      p2pDoc.text(lines, margin, y)
      y += lines.length * 4.2
    }

    // --- HEADER ---
    p2pDoc.setFont("helvetica", "bold")
    p2pDoc.setFontSize(18)
    p2pDoc.setTextColor(52, 78, 65)
    p2pDoc.text("PEER-TO-PEER REVIEW PREPARATION", margin, y + 6)
    y += 12
    p2pDoc.setFont("helvetica", "italic")
    p2pDoc.setFontSize(10)
    p2pDoc.setTextColor(100, 100, 100)
    p2pDoc.text("Prepared for Physician Review", margin, y)
    const dateText = `Date: ${new Date().toLocaleDateString()}`
    const dateW = p2pDoc.getTextWidth(dateText)
    p2pDoc.text(dateText, pageWidth - margin - dateW, y)
    y += 4
    p2pDoc.setDrawColor(52, 78, 65)
    p2pDoc.setLineWidth(0.5)
    p2pDoc.line(margin, y, pageWidth - margin, y)
    y += 6

    // --- CASE SUMMARY ---
    sectionHeader("CASE SUMMARY")
    labelValue("Patient", `${caseData.patient_first_name} ${caseData.patient_last_name}`)
    labelValue("Medication", `${caseData.requested_medication}${caseData.medication_dose ? ` ${caseData.medication_dose}` : ""}`)
    labelValue("Diagnosis", Array.isArray(caseData.diagnosis_codes) ? caseData.diagnosis_codes.join(", ") : String(caseData.diagnosis_codes || "N/A"))
    labelValue("Payer", caseData.payer_name || "N/A")

    // --- DENIAL DETAILS ---
    sectionHeader("DENIAL DETAILS")
    labelValue("Category", caseData.denial_category || "N/A")
    labelValue("Reason", caseData.denial_reason || "N/A")
    labelValue("Date", caseData.decision_date ? formatDate(caseData.decision_date) : "N/A")

    // --- KEY CLINICAL EVIDENCE ---
    sectionHeader("KEY CLINICAL EVIDENCE")
    labelValue("Disease Activity", caseData.disease_activity || "N/A")
    labelValue("Lab Values", caseData.lab_values || "N/A")
    labelValue("Prior Treatments", caseData.prior_treatments || "N/A")

    // --- DOCUMENTATION HIGHLIGHTS ---
    sectionHeader("DOCUMENTATION HIGHLIGHTS")
    const rawOutput = caseData.generated_output || caseData.edited_output || ""
    const cleanedOutput = rawOutput.replace(/<[^>]*>/g, "").replace(/[#*_~`]/g, "").trim()
    const snippet = cleanedOutput.length > 500 ? cleanedOutput.slice(0, 500) + "..." : cleanedOutput
    wrappedText(snippet || "No documentation generated yet.")

    // --- RECOMMENDED TALKING POINTS ---
    sectionHeader("RECOMMENDED TALKING POINTS")
    const denialCat = caseData.denial_category || "the denial"
    const talkingPoints = [
      `1. Address "${denialCat}" directly by presenting supporting clinical evidence and documentation.`,
      `2. Emphasize clinical urgency and disease progression that necessitates ${caseData.requested_medication}.`,
      `3. Reference step therapy completion — outline all prior treatments attempted and their outcomes.`,
      `4. Cite relevant clinical guidelines, LCD/NCD requirements, and payer-specific criteria.`,
      `5. Highlight patient-specific factors that support medical necessity for this biologic therapy.`,
    ]
    p2pDoc.setFont("helvetica", "normal")
    p2pDoc.setFontSize(9.5)
    p2pDoc.setTextColor(30, 30, 30)
    for (const point of talkingPoints) {
      const lines = p2pDoc.splitTextToSize(point, usableWidth)
      p2pDoc.text(lines, margin, y)
      y += lines.length * 4.2 + 1.5
    }

    // --- FOOTER ---
    p2pDoc.setFont("helvetica", "italic")
    p2pDoc.setFontSize(8)
    p2pDoc.setTextColor(150, 150, 150)
    const footerY = p2pDoc.internal.pageSize.getHeight() - 10
    p2pDoc.text("Generated by Luma | Peer-to-Peer Review Preparation", margin, footerY)
    const caseIdText = `Case ID: ${caseData.id.slice(0, 8)}`
    const caseIdW = p2pDoc.getTextWidth(caseIdText)
    p2pDoc.text(caseIdText, pageWidth - margin - caseIdW, footerY)

    p2pDoc.save(`${caseData.patient_first_name}_${caseData.patient_last_name}_P2P_Prep.pdf`)
  }

  // Open edit modal and populate form
  // Always use actual database values, not auto-extracted display values
  const openEditModal = () => {
    if (!caseData) return
    setEditFormData({
      patient_first_name: caseData.patient_first_name || "",
      patient_last_name: caseData.patient_last_name || "",
      patient_age: caseData.patient_age?.toString() || "",
      patient_state: caseData.patient_state || "",
      payer_name: caseData.payer_name || "",
      claim_amount: caseData.claim_amount && caseData.claim_amount > 0 ? caseData.claim_amount.toLocaleString('en-US') : "",
      disease_activity: caseData.disease_activity || "",
    })
    setEditModalOpen(true)
  }

  // Save all edits from modal
  async function saveAllEdits() {
    if (!caseData) {
      console.error("No case data available")
      return
    }

    if (isSavingEdits) return

    setIsSavingEdits(true)

    try {
      // Validate required fields
      if (!editFormData.patient_first_name.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "First name is required.",
        })
        setIsSavingEdits(false)
        return
      }

      if (!editFormData.patient_last_name.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Last name is required.",
        })
        setIsSavingEdits(false)
        return
      }

      if (!editFormData.patient_age || isNaN(parseInt(editFormData.patient_age))) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Valid age is required.",
        })
        setIsSavingEdits(false)
        return
      }

      if (!editFormData.patient_state.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "State is required.",
        })
        setIsSavingEdits(false)
        return
      }

      if (!editFormData.payer_name.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Payer name is required.",
        })
        setIsSavingEdits(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        patient_first_name: editFormData.patient_first_name.trim(),
        patient_last_name: editFormData.patient_last_name.trim(),
        patient_age: parseInt(editFormData.patient_age),
        patient_state: editFormData.patient_state.trim().toUpperCase(),
        payer_name: editFormData.payer_name.trim(),
        disease_activity: editFormData.disease_activity.trim() || "",
        // Mark that user has manually edited this case
        metadata: {
          ...(caseData.metadata || {}),
          manually_edited: true,
        }
      }

      // Update claim_amount — set to value if provided, null if cleared
      if (editFormData.claim_amount && editFormData.claim_amount.trim()) {
        const claimAmount = parseFloat(editFormData.claim_amount.replace(/[^0-9.]/g, ''))
        if (!isNaN(claimAmount)) {
          updateData.claim_amount = claimAmount
        }
      } else {
        updateData.claim_amount = null
      }

      // Check authentication
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error("Not authenticated. Please refresh the page and try again.")
      }

      const { data, error } = await supabase
        .from("cases")
        .update(updateData)
        .eq("id", caseData.id)
        .select()

      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(error.message || "Database update failed")
      }

      // Update local state with returned data (includes the manually_edited flag)
      const updatedCase = data && data.length > 0 ? data[0] : { ...caseData, ...updateData }
      setCaseData(updatedCase)

      setEditModalOpen(false)

      toast({
        title: "Case Updated",
        description: "Case details have been updated successfully.",
      })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error saving case details:", error)
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error?.message || "Failed to save changes. Please try again.",
      })
    } finally {
      setIsSavingEdits(false)
    }
  }

  // Handle clicking a checklist item to open edit modal
  const handleChecklistItemClick = (item: ChecklistItemWithEdits) => {
    setEditingItem(item)
    setIsEditModalOpen(true)
  }

  // Save checklist item edit to database
  async function handleSaveChecklistEdit(itemId: string, notes: string, markedAddressed: boolean) {
    if (!caseData) return

    setIsSavingChecklistEdit(true)
    try {
      const now = new Date().toISOString()

      // Build the new edit
      const newEdit: ChecklistEdit = {
        item_id: itemId,
        user_notes: notes,
        marked_addressed: markedAddressed,
        updated_at: now,
        ...(markedAddressed && !checklistEdits[itemId]?.addressed_at
          ? { addressed_at: now }
          : { addressed_at: checklistEdits[itemId]?.addressed_at }),
      }

      // Update local state
      const updatedEdits = {
        ...checklistEdits,
        [itemId]: newEdit,
      }
      setChecklistEdits(updatedEdits)

      // Build the checklist edits data structure
      const checklistEditsData: ChecklistEditsData = {
        version: 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        last_validation_run: (caseData.metadata?.lcd_validation as any)?.run_at || now,
        edits: updatedEdits,
      }

      // Save to database metadata
      const { error } = await supabase
        .from("cases")
        .update({
          metadata: {
            ...caseData.metadata,
            checklist_edits: checklistEditsData,
          },
        })
        .eq("id", caseData.id)

      if (error) throw error

      // Update local case data
      setCaseData({
        ...caseData,
        metadata: {
          ...caseData.metadata,
          checklist_edits: checklistEditsData,
        },
      })

      setIsEditModalOpen(false)
      setEditingItem(null)

      toast({
        title: "Notes Saved",
        description: "Your checklist notes have been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving checklist edit:", error)
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save checklist notes. Please try again.",
      })
    } finally {
      setIsSavingChecklistEdit(false)
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(editedOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadAsWord() {
    // Create a simple doc format
    const blob = new Blob([editedOutput], { type: "application/msword" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${caseData?.patient_first_name}_${caseData?.patient_last_name}_documentation.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  const generatePdf = async () => {
    if (!caseData) return

    const doc = new jsPDF()

    // -- CONFIG --
    const margin = 20
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const usableWidth = pageWidth - (margin * 2)
    let yPos = margin

    // -- HEADER --
    // 1. Logo
    // Simple text logo if image fails or for speed, but let's try to add a nice header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(24)
    doc.setTextColor(52, 78, 65) // Dark Green #344E41
    doc.text("Luma", margin, yPos + 8)

    // URL
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    const urlWidth = doc.getTextWidth("www.useluma.io")
    doc.text("www.useluma.io", pageWidth - margin - urlWidth, yPos + 8)

    yPos += 20

    // Separator line
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 15

    // -- DOCUMENT INFO --
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)

    // Left side info
    const dateStr = new Date().toLocaleDateString()
    doc.text(`Date: ${dateStr}`, margin, yPos)
    doc.text(`Patient: ${caseData.patient_first_name} ${caseData.patient_last_name}`, margin, yPos + 5)
    doc.text(`DOB/Age: ${caseData.patient_age} | State: ${caseData.patient_state}`, margin, yPos + 10)

    // Right side info (Payer)
    const payerText = `Payer: ${displayPayer || "N/A"}`
    const payerWidth = doc.getTextWidth(payerText)
    doc.text(payerText, pageWidth - margin - payerWidth, yPos)

    const idText = `Case ID: ${caseData.id.slice(0, 8)}`
    const idWidth = doc.getTextWidth(idText)
    doc.text(idText, pageWidth - margin - idWidth, yPos + 5)

    yPos += 20

    // -- BODY CONTENT --
    // Split text to fit width
    doc.setFont("times", "normal") // Serif font looks more official
    doc.setFontSize(10.5) // Slightly small to ensure fit

    const splitText = doc.splitTextToSize(editedOutput, usableWidth)

    // Check if it fits, if not, we can scale down slightly or just let multipage handle it (jspdf handles strict page breaks manually usually, but we want single page preference)
    // Let's calculate height
    const lineHeight = 5 // approx mm
    const textHeight = splitText.length * lineHeight
    const spaceRemaining = pageHeight - yPos - margin

    if (textHeight > spaceRemaining) {
      // Warning: Content is long. We'll squish it a bit or just fill logic.
      // Option A: Reduce font size
      doc.setFontSize(9)
      const compressedSplit = doc.splitTextToSize(editedOutput, usableWidth)
      doc.text(compressedSplit, margin, yPos)
    } else {
      doc.text(splitText, margin, yPos)
    }

    // -- FOOTER --
    // Add page number at bottom
    doc.setFont("helvetica", "italic")
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text("Generated by Luma | Professional Medical Documentation", margin, pageHeight - 10)

    // Save
    doc.save(`${caseData.patient_first_name}_${caseData.patient_last_name}_Medical_Necessity.pdf`)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light-gray">
        <div className="text-center">
          <LumaLogo className="w-16 h-16 mx-auto mb-4" />
          <p className="text-gray-600">Loading case details...</p>
        </div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light-gray">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Case not found</p>
          <Link href="/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const hasGenerated = Boolean(caseData?.generated_output || editedOutput)
  const needsGeneration = caseData && !caseData.generated_output && (caseData.status === 'draft' || caseData.status === 'generating')

  // Always use database values for display
  // Only show extracted values as a hint when user left fields empty
  let displayFirstName = caseData?.patient_first_name || ''
  let displayLastName = caseData?.patient_last_name || ''
  let displayPayer = caseData?.payer_name || ''
  let showExtractedNameLabel = false
  let showExtractedPayerLabel = false

  // Only run extraction logic if user hasn't manually edited AND left name fields empty
  // This prevents overwriting user-entered names with auto-extracted values
  if (!hasManuallyEdited) {
    const nameFieldsEmpty = !caseData?.patient_first_name?.trim() || !caseData?.patient_last_name?.trim()
    const payerFieldEmpty = !caseData?.payer_name?.trim()

    if (nameFieldsEmpty) {
      const extractedName = extractPatientNameFromNotes()
      if (extractedName && isValidName(extractedName.first) && isValidName(extractedName.last)) {
        displayFirstName = extractedName.first
        displayLastName = extractedName.last
        showExtractedNameLabel = true
      }
    }

    if (payerFieldEmpty) {
      const extractedPayer = extractPayerFromNotes()
      if (extractedPayer) {
        displayPayer = extractedPayer
        showExtractedPayerLabel = true
      }
    }
  }

  // Show full-screen loading when generating (including regeneration)
  if (generating || (needsGeneration && !hasGenerated)) {
    return (
      <GeneratingSteps
        key={generationKey} // Forces remount on regeneration
        caseId={caseData.id}
        docType={caseData.doc_type}
        onComplete={(result) => {
          // Update local state with the generated documentation
          // Also update metadata to include lcd_validation_full so it persists on subsequent saves
          setCaseData({
            ...caseData,
            generated_output: result.documentation,
            status: 'draft',
            metadata: {
              ...caseData.metadata,
              ...(result.validation && {
                lcd_validation_full: result.validation,
                lcd_validation: {
                  run_at: new Date().toISOString(),
                  risk_level: result.validation.riskLevel,
                  denial_probability: result.validation.denialProbability,
                  found_count: result.validation.foundCount,
                  missing_count: result.validation.missingCount,
                  detected_wound_type: result.validation.detectedWoundType,
                  ctp_covered: result.validation.ctpCovered,
                },
              }),
            },
          })
          setEditedOutput(result.documentation)

          // Store LCD validation results if available (biologics PA)
          if (result.validation) {
            setLcdValidation(result.validation)
          }

          setGenerating(false)
        }}
        onError={(error) => {
          toast({
            variant: "destructive",
            title: "Generation Failed",
            description: error || "Failed to generate documentation. Please try again.",
          })
          setGenerating(false)
        }}
        onRetry={() => {
          setGenerating(true)
          setGenerationKey(k => k + 1)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-light-gray">
      {/* Header */}
      <header className="border-b border-sage-medium/50 glass-card sticky top-0 z-40">
        <div className="mx-auto px-4 max-w-6xl h-16 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {!isInChatMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (caseData?.generated_output) {
                      setRegenerateModalOpen(true)
                    } else {
                      setGenerating(true)
                    }
                  }}
                  disabled={generating}
                  className="text-gray-600 hover:text-dark-bg border-gray-200"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : caseData?.generated_output ? (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {caseData?.generated_output ? "Regenerate" : "Generate"}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Left Column - Case Details */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-4 md:p-6 bg-white rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow border-0">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg md:text-xl font-sans font-semibold text-dark-bg">Case Details</h2>
                  <p className="text-xs font-medium text-mint-light uppercase tracking-wide mt-1">
                    {caseData?.doc_type === "biologics_pa" && "Biologics Prior Authorization"}
                    {caseData?.doc_type === "medical_necessity" && "Prior Authorization Letter"}
                    {caseData?.doc_type === "appeal" && "Appeal Letter"}
                    {caseData && !["biologics_pa", "medical_necessity", "appeal"].includes(caseData.doc_type) && "Case Documentation"}
                  </p>
                </div>
                <button
                  onClick={openEditModal}
                  className="rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors px-2.5 py-0.5 text-[11px] text-gray-500 hover:text-gray-700 font-medium"
                  title="Edit case details"
                >
                  Edit
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="col-span-2">
                  <p className="text-xs font-medium text-dark-bg/50 uppercase tracking-wide mb-1">Full Name</p>
                  <p className="font-semibold text-dark-bg">
                    {displayFirstName} {displayLastName}
                    {showExtractedNameLabel && (
                      <span className="text-xs text-gray-500 ml-2 font-normal">(from notes)</span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-dark-bg/50 uppercase tracking-wide mb-1">Age</p>
                  <p className="text-dark-bg">{caseData.patient_age}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-dark-bg/50 uppercase tracking-wide mb-1">State</p>
                  <p className="text-dark-bg">{caseData.patient_state}</p>
                </div>

                <div className={caseData.claim_amount != null && caseData.claim_amount > 0 ? "col-span-2" : "col-span-4"}>
                  <p className="text-xs font-medium text-dark-bg/50 uppercase tracking-wide mb-1">Payer</p>
                  <p className="text-dark-bg">
                    {displayPayer}
                    {showExtractedPayerLabel && (
                      <span className="text-xs text-gray-500 ml-2 font-normal">(from notes)</span>
                    )}
                  </p>
                </div>

                {caseData.claim_amount != null && caseData.claim_amount > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-dark-bg/50 uppercase tracking-wide mb-1">Claim Amount</p>
                    <p className="text-dark-bg">
                      ${caseData.claim_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              {/* Clinical Details */}
              {caseData.disease_activity && (
                <>
                  <div className="border-t border-gray-100 my-4" />
                  <p className="text-xs font-medium text-dark-bg/50 uppercase tracking-wide mb-2">Clinical Details</p>
                  <p className="text-gray-700 text-xs">
                    {caseData.disease_activity.length > 200
                      ? `${caseData.disease_activity.substring(0, 200)}...`
                      : caseData.disease_activity}
                  </p>
                </>
              )}

              {/* Uploaded Documents */}
              {uploadedDocs.length > 0 && (
                <>
                  <div className="border-t border-gray-100 my-4" />
                  <p className="text-xs font-medium text-dark-bg/50 uppercase tracking-wide mb-2">Uploaded Documents</p>
                  <div className="space-y-2">
                    {uploadedDocs.map((doc, index) => (
                      <button
                        key={index}
                        className="flex items-center gap-3 p-2 rounded-lg bg-sage-light/20 hover:bg-sage-light/30 transition-colors w-full text-left group"
                        title={doc.storagePath ? `Download ${doc.filename}` : doc.filename}
                        onClick={async () => {
                          if (!doc.storagePath) return
                          const { data } = await supabase.storage
                            .from('case-documents')
                            .createSignedUrl(doc.storagePath, 60, { download: doc.filename })
                          if (data?.signedUrl) {
                            window.open(data.signedUrl, '_blank')
                          }
                        }}
                      >
                        {["png", "jpg", "jpeg"].includes(doc.fileType) ? (
                          <Image className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        )}
                        <span className="text-sm text-gray-700 truncate flex-1">{doc.filename}</span>
                        {doc.storagePath && (
                          <Download className="h-3.5 w-3.5 text-gray-400 group-hover:text-dark-bg transition-colors flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Card>

            {/* Submission Readiness Card */}
            {lcdValidation && caseData.status === "draft" && hasGenerated && (
              <Card className="p-4 md:p-6 bg-white rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow border-0">
                {(() => {
                  const approvalProbability = 100 - lcdValidation.denialProbability
                  const probColor = approvalProbability >= 80
                    ? "text-green-600"
                    : approvalProbability >= 60
                    ? "text-amber-600"
                    : "text-coral"
                  const barColor = approvalProbability >= 80
                    ? "bg-green-500"
                    : approvalProbability >= 60
                    ? "bg-amber-500"
                    : "bg-coral"
                  const bgTint = approvalProbability >= 80
                    ? "bg-green-50"
                    : approvalProbability >= 60
                    ? "bg-amber-50"
                    : "bg-red-50"

                  // Collect missing checklist items for payer intelligence alerts
                  const missingItems = lcdValidation.checklist
                    ?.flatMap(cat => cat.items.filter(i => i.status === "MISSING" || i.status === "VIOLATION"))
                    .slice(0, 5) ?? []

                  // Top recommendations (up to 5)
                  const topRecs = lcdValidation.recommendations?.slice(0, 5) ?? []

                  return (
                    <>
                      <div className="mb-4">
                        <h2 className="text-lg md:text-xl font-sans font-semibold text-dark-bg">Submission Readiness</h2>
                      </div>

                      {/* Approval Probability */}
                      <div className={`rounded-lg p-4 mb-4 ${bgTint}`}>
                        <div className="flex items-end justify-between mb-2">
                          <span className={`text-3xl font-bold ${probColor}`}>{approvalProbability}%</span>
                          <span className="text-xs font-medium text-dark-bg/50 uppercase tracking-wide">Est. Approval Rate</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${approvalProbability}%` }}
                          />
                        </div>
                      </div>

                      {/* Requirements Met Counter */}
                      <div className="flex items-center justify-between py-2 mb-3">
                        <span className="text-sm font-medium text-dark-bg">Requirements Met</span>
                        <span className="text-sm font-semibold text-dark-bg">
                          {lcdValidation.foundCount}/{lcdValidation.totalRequirements}
                          {lcdValidation.missingCount > 0 && (
                            <span className="text-xs text-dark-bg/50 ml-1.5 font-normal">
                              ({lcdValidation.missingCount} missing)
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Instant Denial Triggers */}
                      {lcdValidation.instantDenialTriggers.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-coral" />
                            <span className="text-xs font-semibold text-coral uppercase tracking-wide">Instant Denial Risk</span>
                          </div>
                          <ul className="space-y-1">
                            {lcdValidation.instantDenialTriggers.map((trigger, i) => (
                              <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                                <span className="mt-1 w-1 h-1 rounded-full bg-coral flex-shrink-0" />
                                {trigger}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Payer Intelligence Alerts — missing checklist items */}
                      {missingItems.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <FileWarning className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Payer Requirements Gap</span>
                          </div>
                          <ul className="space-y-1.5">
                            {missingItems.map((item, i) => (
                              <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                <span>
                                  {item.label}
                                  {item.suggestion && (
                                    <span className="text-dark-bg/40 ml-1">-- {item.suggestion}</span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* High Risk Items */}
                      {(lcdValidation.veryHighRiskItems.length > 0 || lcdValidation.highRiskItems.length > 0) && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Improvement Opportunities</span>
                          </div>
                          <ul className="space-y-1.5">
                            {lcdValidation.veryHighRiskItems.map((item, i) => (
                              <li key={`vh-${i}`} className="text-xs text-gray-700 flex items-start gap-1.5">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-coral flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                            {lcdValidation.highRiskItems.map((item, i) => (
                              <li key={`h-${i}`} className="text-xs text-gray-700 flex items-start gap-1.5">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Top Recommendations */}
                      {topRecs.length > 0 && (
                        <div>
                          <div className="border-t border-gray-100 pt-3 mt-1">
                            <span className="text-xs font-semibold text-dark-bg/60 uppercase tracking-wide">Recommendations</span>
                          </div>
                          <ul className="mt-2 space-y-2">
                            {topRecs.map((rec, i) => (
                              <li key={i} className="text-xs text-gray-700">
                                <div className="flex items-start gap-1.5">
                                  <span className={`mt-0.5 flex-shrink-0 rounded px-1 py-0.5 text-[10px] font-bold uppercase leading-none ${
                                    rec.priority === "CRITICAL" ? "bg-red-100 text-coral" :
                                    rec.priority === "HIGH" ? "bg-amber-100 text-amber-700" :
                                    rec.priority === "MEDIUM" ? "bg-blue-100 text-blue-700" :
                                    "bg-gray-100 text-gray-600"
                                  }`}>
                                    {rec.priority}
                                  </span>
                                  <span>{rec.action}</span>
                                </div>
                                {rec.reason && (
                                  <p className="text-dark-bg/40 mt-0.5 ml-[calc(0.375rem+theme(spacing[1.5]))]">{rec.reason}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )
                })()}
              </Card>
            )}

            {/* Status Management Panel */}
            {hasGenerated && !isInChatMode && (
              <Card className="p-4 md:p-6 bg-white rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow border-0">
                <div className="mb-4">
                  <h2 className="text-lg md:text-xl font-sans font-semibold text-dark-bg">PA Status</h2>
                  <p className="text-xs font-medium text-dark-bg/50 uppercase tracking-wide mt-1">Track prior authorization progress</p>
                </div>

                {/* Current Status Badge */}
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const config = getStatusConfig(caseData.status)
                      const Icon = config.icon
                      return (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.classes}`}>
                          <Icon className={`w-3.5 h-3.5 ${caseData.status === 'generating' ? 'animate-spin' : ''}`} />
                          {config.label}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="space-y-2 mb-5">
                  {caseData.status === "draft" && (
                    <Button
                      onClick={openSubmittedDialog}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Mark as Submitted
                    </Button>
                  )}
                  {caseData.status === "submitted" && (
                    <>
                      <div className="flex gap-2">
                        <Button
                          onClick={openApprovedDialog}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <ThumbsUp className="w-4 h-4 mr-2" />
                          Approved
                        </Button>
                        <Button
                          onClick={openDeniedDialog}
                          variant="outline"
                          className="flex-1 border-coral/30 text-coral hover:bg-coral/10 hover:text-coral"
                          size="sm"
                        >
                          <ThumbsDown className="w-4 h-4 mr-2" />
                          Denied
                        </Button>
                      </div>
                      {/* Follow-Up Section */}
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
                            <Button
                              onClick={() => {
                                setFollowupDate(toInputDateStr(new Date()))
                                setFollowupDialogOpen(true)
                              }}
                              variant="outline"
                              className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                              size="sm"
                            >
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
                            isExpired
                              ? "bg-coral/5 border-coral/20"
                              : expiresWithin30
                              ? "bg-amber-50 border-amber-200"
                              : "bg-green-50 border-green-200"
                          }`}>
                            <Clock className={`w-4 h-4 flex-shrink-0 ${
                              isExpired ? "text-coral" : expiresWithin30 ? "text-amber-600" : "text-green-600"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold ${
                                isExpired ? "text-coral" : expiresWithin30 ? "text-amber-800" : "text-green-800"
                              }`}>
                                {isExpired
                                  ? "PA Expired"
                                  : daysUntilExpiry === 0
                                  ? "Expires today"
                                  : `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`}
                              </p>
                              <p className="text-xs text-dark-bg/50">{formatDate(caseData.pa_expiration_date)}</p>
                            </div>
                            {(isExpired || expiresWithin30) && (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                isExpired ? "bg-coral/20 text-coral" : "bg-amber-100 text-amber-700"
                              }`}>
                                {isExpired ? "Expired" : "Soon"}
                              </span>
                            )}
                          </div>
                        )}
                        <Button
                          onClick={handleStartRenewal}
                          disabled={isStartingRenewal}
                          className="w-full bg-dark-bg hover:bg-dark-bg/90 text-white"
                          size="sm"
                        >
                          {isStartingRenewal ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4 mr-2" />
                          )}
                          {isStartingRenewal ? "Creating..." : "Start Renewal"}
                        </Button>
                      </div>
                    )
                  })()}
                  {caseData.status === "denied" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateAppeal}
                        className="flex-1 bg-dark-bg hover:bg-dark-bg/90 text-white"
                        size="sm"
                        disabled={isCreatingAppeal}
                      >
                        {isCreatingAppeal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileWarning className="w-4 h-4 mr-2" />}
                        {isCreatingAppeal ? "Creating..." : "Generate Appeal"}
                      </Button>
                      <Button
                        onClick={generateP2PSheet}
                        variant="outline"
                        className="flex-1 border-dark-bg/20 text-dark-bg hover:bg-dark-bg/5"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        P2P Prep Sheet
                      </Button>
                    </div>
                  )}
                  {/* Payer Call Practice — visible when documentation exists */}
                  {caseData.generated_output && (
                    <Button
                      onClick={startP2PSession}
                      variant="outline"
                      className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                      size="sm"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Payer Call Practice
                    </Button>
                  )}
                </div>

                {/* Denial Details (when denied) */}
                {caseData.status === "denied" && caseData.denial_category && (
                  <div className="mb-5 p-3 bg-coral/5 border border-coral/15 rounded-lg">
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

                {/* Appeal History (when this case has child appeal cases) */}
                {appealCases.length > 0 && (
                  <div className="mb-5 p-3 bg-amber-50 border border-amber-200/50 rounded-lg">
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

                {/* Status History / Key Dates */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-dark-bg/50 uppercase tracking-wide mb-3">Timeline</p>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center gap-2 text-dark-bg/70">
                      <Calendar className="w-3.5 h-3.5 text-dark-bg/40 flex-shrink-0" />
                      <span className="text-dark-bg/50 w-20 flex-shrink-0">Created</span>
                      <span className="text-dark-bg">{formatDate(caseData.created_at)}</span>
                    </div>
                    {caseData.submitted_at && (
                      <div className="flex items-center gap-2 text-dark-bg/70">
                        <Send className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-dark-bg/50 w-20 flex-shrink-0">Submitted</span>
                        <span className="text-dark-bg">{formatDate(caseData.submitted_at)}</span>
                      </div>
                    )}
                    {caseData.expected_decision_date && !caseData.decision_date && (
                      <div className="flex items-center gap-2 text-dark-bg/70">
                        <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="text-dark-bg/50 w-20 flex-shrink-0">Expected</span>
                        <span className="text-dark-bg">{formatDate(caseData.expected_decision_date)}</span>
                      </div>
                    )}
                    {caseData.followup_date && caseData.status === "submitted" && (
                      <div className="flex items-center gap-2 text-dark-bg/70">
                        <Bell className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <span className="text-dark-bg/50 w-20 flex-shrink-0">Followed up</span>
                        <span className="text-dark-bg">{formatDate(caseData.followup_date)}</span>
                      </div>
                    )}
                    {caseData.decision_date && (
                      <div className="flex items-center gap-2 text-dark-bg/70">
                        {caseData.status === "approved" ? (
                          <ThumbsUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <ThumbsDown className="w-3.5 h-3.5 text-coral flex-shrink-0" />
                        )}
                        <span className="text-dark-bg/50 w-20 flex-shrink-0">Decision</span>
                        <span className="text-dark-bg">{formatDate(caseData.decision_date)}</span>
                      </div>
                    )}
                    {caseData.pa_expiration_date && (
                      <div className="flex items-center gap-2 text-dark-bg/70">
                        <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="text-dark-bg/50 w-20 flex-shrink-0">Expires</span>
                        <span className="text-dark-bg">{formatDate(caseData.pa_expiration_date)}</span>
                      </div>
                    )}
                    {caseData.pa_reference_number && (
                      <div className="flex items-center gap-2 text-dark-bg/70">
                        <Hash className="w-3.5 h-3.5 text-dark-bg/40 flex-shrink-0" />
                        <span className="text-dark-bg/50 w-20 flex-shrink-0">PA Ref #</span>
                        <span className="text-dark-bg font-mono text-xs">{caseData.pa_reference_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Suggested Forms */}
          </div>

          {/* Right Column - Chat trigger + Documentation */}
          <div className="lg:col-span-2 space-y-4">
            {/* Chat with Luma bar */}
            <motion.button
              onClick={() => setIsChatExpanded(true)}
              className="relative w-full flex items-center gap-3 px-5 py-3 rounded-xl cursor-pointer border-0 outline-none overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, #24315D 0%, #161F35 100%)',
              }}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              aria-label="Open chat with Luma AI assistant"
            >
              {/* Hero video — right half, left edge fades to transparent via CSS mask */}
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
              <div className="relative z-10 w-8 h-8 rounded-full bg-[#1652C5]/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-[#1652C5]" />
              </div>
              <div className="relative z-10 text-left">
                <span className="text-white text-sm font-medium block leading-tight">Chat with Luma</span>
                <span className="text-white/50 text-xs leading-tight">Ask questions or discuss compliance gaps</span>
              </div>
            </motion.button>

            <AnimatePresence mode="wait">
              {isInChatMode ? (
                <div />
              ) : (
                <motion.div
                  key="documentation-view"
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
                  transition={{
                    type: "spring",
                    duration: 0.5,
                    bounce: 0.1,
                  }}
                  className="space-y-4"
                >
                  {/* Documentation Validation Panel - Available for all doc types */}
                  {lcdValidation && (
                    <LCDValidationPanel
                      validation={lcdValidation}
                      isCollapsed={false}
                      checklistEdits={checklistEdits}
                      onItemClick={handleChecklistItemClick}
                      docType={caseData?.doc_type}
                    />
                  )}

                  {/* Generated Documentation */}
                  <Card className="bg-white rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow border-0">
                    <div className="p-6">
                      <div
                        className="flex items-center justify-between cursor-pointer hover:bg-sage-light/10 -m-6 p-6 rounded-xl transition-colors"
                        onClick={() => setIsDocCollapsed(!isDocCollapsed)}
                      >
                        <h2 className="text-lg font-sans font-semibold text-dark-bg">
                          Generated Documentation
                        </h2>
                        <motion.div
                          animate={{ rotate: isDocCollapsed ? 0 : 180 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        </motion.div>
                      </div>

                      <AnimatePresence initial={false}>
                        {!isDocCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              type: "spring",
                              duration: 0.4,
                              bounce: 0,
                            }}
                            className="overflow-hidden"
                          >
                            {hasGenerated ? (
                              <>
                                <Textarea
                                  value={editedOutput}
                                  onChange={(e) => setEditedOutput(e.target.value)}
                                  className="min-h-[500px] font-mono text-sm mb-4"
                                  placeholder="Generated documentation will appear here..."
                                />

                                <div className="flex gap-3 flex-wrap">
                                  <Button onClick={copyToClipboard} variant="outline">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                      <motion.div
                                        key={copied ? "check" : "copy"}
                                        initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                        exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                                        transition={{
                                          type: "spring",
                                          duration: 0.3,
                                          bounce: 0,
                                        }}
                                        className="flex items-center"
                                      >
                                        {copied ? (
                                          <Check className="w-4 h-4 mr-2" />
                                        ) : (
                                          <Copy className="w-4 h-4 mr-2" />
                                        )}
                                      </motion.div>
                                    </AnimatePresence>
                                    {copied ? "Copied!" : "Copy to Clipboard"}
                                  </Button>
                                  <Button onClick={downloadAsWord} variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    DOCX
                                  </Button>
                                  <Button onClick={generatePdf} variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF
                                  </Button>
                                </div>
                              </>
                            ) : (
                              // LOADING STATE
                              <div className="text-center py-20">
                                <div className="relative w-20 h-20 mx-auto mb-8">
                                  <LumaLogo className="w-20 h-20 animate-pulse text-mint" />
                                </div>

                                <h3 className="text-lg font-semibold text-dark-bg mb-2">
                                  Researching & Drafting
                                </h3>

                                {/* Tidbit Carousel */}
                                <div className="h-16 flex items-center justify-center max-w-lg mx-auto px-4">
                                  <AnimatePresence mode="wait">
                                    <motion.p
                                      key={tidbitIndex}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      className="text-gray-600 italic"
                                    >
                                      &quot;{tidbits[tidbitIndex]}&quot;
                                    </motion.p>
                                  </AnimatePresence>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Suggested Forms Section - Only show when not in chat mode */}
        {!isInChatMode && (
        <div className="mt-8">
          <SuggestedForms
            caseId={caseData.id}
            lastGenerated={caseData.generated_output}
          />
        </div>
        )}
      </div>

      {/* Checklist Item Edit Modal */}
      <ChecklistItemEditModal
        item={editingItem}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSave={handleSaveChecklistEdit}
        isSaving={isSavingChecklistEdit}
      />

      {/* Edit Case Details Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Case Details</DialogTitle>
            <DialogDescription>
              Update patient information, payer details, and clinical notes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  value={editFormData.patient_first_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, patient_first_name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  value={editFormData.patient_last_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, patient_last_name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={editFormData.patient_age}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, patient_age: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={editFormData.patient_state}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, patient_state: e.target.value.toUpperCase() })
                  }
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="payer">Payer</Label>
                <Autocomplete
                  id="payer"
                  value={editFormData.payer_name}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, payer_name: value })
                  }
                  onSearch={searchPayers}
                  placeholder="Start typing... e.g. Traditional Medicare, Blue Cross"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="claim-amount">Claim Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <Input
                    id="claim-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="50,000.00"
                    className="pl-7"
                    value={editFormData.claim_amount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, '')
                      // Prevent multiple decimal points
                      const parts = raw.split('.')
                      const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw
                      // Format integer part with commas, preserve decimal part as-is
                      const [intPart, decPart] = sanitized.split('.')
                      const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      const display = decPart !== undefined ? `${formatted}.${decPart}` : formatted
                      setEditFormData({ ...editFormData, claim_amount: display })
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="clinical-notes">Clinical Details</Label>
                <Textarea
                  id="clinical-notes"
                  rows={8}
                  value={editFormData.disease_activity}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, disease_activity: e.target.value })
                  }
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={isSavingEdits}
            >
              Cancel
            </Button>
            <Button
              onClick={saveAllEdits}
              disabled={isSavingEdits}
            >
              {isSavingEdits ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation Modal */}
      <Dialog open={regenerateModalOpen} onOpenChange={(open) => {
        setRegenerateModalOpen(open)
        if (open) {
          setRegenerateAcknowledged(false)
        }
      }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Regenerate Documentation?</DialogTitle>
            <DialogDescription>
              Your current documentation will be replaced with a new version incorporating the latest payer research, your chat conversations with Luma, and any checklist updates.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-sage-light/30 border border-sage-medium/30 rounded-lg">
              <RefreshCw className="w-5 h-5 text-mint flex-shrink-0" />
              <p className="text-sm text-gray-700">
                This will re-run payer research and generate updated documentation based on all your inputs.
              </p>
            </div>

            {/* List of addressed checklist items */}
            {(() => {
              const addressedItems: { id: string; label: string; notes?: string }[] = []
              if (lcdValidation?.checklist && checklistEdits) {
                lcdValidation.checklist.forEach((category) => {
                  category.items.forEach((item) => {
                    const edit = checklistEdits[item.id]
                    if (edit?.marked_addressed) {
                      addressedItems.push({
                        id: item.id,
                        label: item.label,
                        notes: edit.user_notes
                      })
                    }
                  })
                })
              }

              if (addressedItems.length > 0) {
                return (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Addressed Checklist Items:</p>
                      <div className="max-h-40 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-3">
                        {addressedItems.map((item) => (
                          <div key={item.id} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-mint flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <p className="text-gray-700">{item.label}</p>
                              {item.notes && (
                                <p className="text-gray-500 text-xs mt-0.5 italic">&quot;{item.notes}&quot;</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">
                          The addressed items listed above will be incorporated into the regenerated documentation as if they are met criteria.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={regenerateAcknowledged}
                        onChange={(e) => setRegenerateAcknowledged(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-mint focus:ring-mint cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 leading-relaxed">
                        I acknowledge that the addressed items listed above will be included in the regenerated documentation. I confirm that the information I&apos;ve provided is accurate and I take responsibility for its clinical validity.
                      </span>
                    </label>
                  </>
                )
              }
              return null
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRegenerateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setRegenerateModalOpen(false)
                // Clear output in database FIRST to prevent polling race condition
                // The polling fallback checks database for generated_output + status='draft'
                // Without this, old output would make polling think regeneration already completed
                const supabase = createClient()
                await supabase
                  .from("cases")
                  .update({ generated_output: null, status: "generating" })
                  .eq("id", caseData!.id)
                // Then update client state to match
                setCaseData({ ...caseData!, generated_output: null, status: "generating" })
                setEditedOutput("")
                setGenerationKey(k => k + 1) // Force GeneratingSteps to remount fresh
                setGenerating(true)
              }}
              className="bg-dark-bg hover:bg-dark-bg/90"
              disabled={(() => {
                // Check if there are any addressed items
                let hasAddressedItems = false
                if (lcdValidation?.checklist && checklistEdits) {
                  lcdValidation.checklist.forEach((category) => {
                    category.items.forEach((item) => {
                      if (checklistEdits[item.id]?.marked_addressed) {
                        hasAddressedItems = true
                      }
                    })
                  })
                }
                // Only require acknowledgment if there are addressed items
                return hasAddressedItems && !regenerateAcknowledged
              })()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Submitted Dialog */}
      <Dialog open={submittedDialogOpen} onOpenChange={setSubmittedDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Mark as Submitted</DialogTitle>
            <DialogDescription>
              Record that this prior authorization has been submitted to the payer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pa-ref-number">PA Reference Number</Label>
              <Input
                id="pa-ref-number"
                placeholder="Optional — payer tracking number"
                value={submittedForm.pa_reference_number}
                onChange={(e) => setSubmittedForm({ ...submittedForm, pa_reference_number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="submitted-date">Submission Date</Label>
                <Input
                  id="submitted-date"
                  type="date"
                  value={submittedForm.submitted_at}
                  onChange={(e) => setSubmittedForm({ ...submittedForm, submitted_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected-date">Expected Decision</Label>
                <Input
                  id="expected-date"
                  type="date"
                  value={submittedForm.expected_decision_date}
                  onChange={(e) => setSubmittedForm({ ...submittedForm, expected_decision_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmittedDialogOpen(false)} disabled={isSavingStatus}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsSubmitted} disabled={isSavingStatus} className="bg-blue-600 hover:bg-blue-700">
              {isSavingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {isSavingStatus ? "Saving..." : "Mark as Submitted"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Approved Dialog */}
      <Dialog open={approvedDialogOpen} onOpenChange={setApprovedDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Mark as Approved</DialogTitle>
            <DialogDescription>
              Record the payer&apos;s approval of this prior authorization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approved-decision-date">Decision Date</Label>
              <Input
                id="approved-decision-date"
                type="date"
                value={approvedForm.decision_date}
                onChange={(e) => setApprovedForm({ ...approvedForm, decision_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pa-expiration">
                PA Expiration Date <span className="text-coral">*</span>
              </Label>
              <Input
                id="pa-expiration"
                type="date"
                value={approvedForm.pa_expiration_date}
                onChange={(e) => setApprovedForm({ ...approvedForm, pa_expiration_date: e.target.value })}
              />
              <p className="text-xs text-dark-bg/50">Biologics PAs typically expire in 6-12 months</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approved-pa-ref">PA Reference Number</Label>
              <Input
                id="approved-pa-ref"
                placeholder="Payer tracking number"
                value={approvedForm.pa_reference_number}
                onChange={(e) => setApprovedForm({ ...approvedForm, pa_reference_number: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovedDialogOpen(false)} disabled={isSavingStatus}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsApproved} disabled={isSavingStatus} className="bg-green-600 hover:bg-green-700">
              {isSavingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
              {isSavingStatus ? "Saving..." : "Mark as Approved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Denied Dialog */}
      <Dialog open={deniedDialogOpen} onOpenChange={setDeniedDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Mark as Denied</DialogTitle>
            <DialogDescription>
              Record the payer&apos;s denial and capture details for potential appeal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="denied-decision-date">Decision Date</Label>
              <Input
                id="denied-decision-date"
                type="date"
                value={deniedForm.decision_date}
                onChange={(e) => setDeniedForm({ ...deniedForm, decision_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="denial-category">
                Denial Category <span className="text-coral">*</span>
              </Label>
              <select
                id="denial-category"
                value={deniedForm.denial_category}
                onChange={(e) => setDeniedForm({ ...deniedForm, denial_category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Select denial category"
              >
                <option value="">Select a category...</option>
                {DENIAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="denial-reason">
                Denial Reason <span className="text-coral">*</span>
              </Label>
              <Input
                id="denial-reason"
                placeholder="Specific reason from payer"
                value={deniedForm.denial_reason}
                onChange={(e) => setDeniedForm({ ...deniedForm, denial_reason: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="denial-notes">Additional Notes</Label>
              <Textarea
                id="denial-notes"
                rows={3}
                placeholder="Optional — any additional context or notes"
                value={deniedForm.denial_notes}
                onChange={(e) => setDeniedForm({ ...deniedForm, denial_notes: e.target.value })}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeniedDialogOpen(false)} disabled={isSavingStatus}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsDenied}
              disabled={isSavingStatus}
              className="bg-coral hover:bg-coral/90 text-white"
            >
              {isSavingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
              {isSavingStatus ? "Saving..." : "Mark as Denied"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Follow-Up Dialog */}
      <Dialog open={followupDialogOpen} onOpenChange={setFollowupDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Follow-Up</DialogTitle>
            <DialogDescription>
              Log that you contacted the payer regarding this prior authorization.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="followup-date">Follow-Up Date</Label>
              <Input
                id="followup-date"
                type="date"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowupDialogOpen(false)} disabled={isSavingFollowup}>
              Cancel
            </Button>
            <Button onClick={handleMarkFollowUp} disabled={isSavingFollowup} className="bg-blue-600 hover:bg-blue-700">
              {isSavingFollowup ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
              {isSavingFollowup ? "Saving..." : "Record Follow-Up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payer Call Practice Overlay */}
      <AnimatePresence>
        {isP2POpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              onClick={() => { if (p2pStatus !== "active" || p2pMessages.length === 0) setIsP2POpen(false) }}
            />
            <motion.button
              className="fixed top-6 right-6 z-[80] w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              onClick={() => setIsP2POpen(false)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1], delay: 0.15 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Close payer call practice"
            >
              <X className="w-5 h-5" />
            </motion.button>
            <motion.div
              className="fixed inset-0 z-[70] flex flex-col"
              style={{ background: 'linear-gradient(135deg, #131B2E 0%, #0F1629 50%, #0A0E1A 100%)' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative z-[2] flex-1 flex flex-col min-h-0 max-w-3xl w-full mx-auto px-4">
                {/* Header */}
                <div className="py-6 flex-shrink-0">
                  <h2 className="text-xl font-serif font-semibold text-white">Payer Call Practice</h2>
                  {caseData && (
                    <p className="text-sm text-white/40 mt-1">
                      {caseData.patient_first_name} {caseData.patient_last_name} &middot; {caseData.requested_medication || "—"} &middot; {caseData.payer_name || "—"}
                    </p>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-4" role="log" aria-label="Payer call practice conversation" aria-live="polite">
                  {p2pStatus === "idle" && p2pStreaming && !p2pStreamingContent && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 animate-spin text-white/40 mr-2" />
                      <span className="text-sm text-white/40">Medical director is reviewing your case...</span>
                    </div>
                  )}
                  {p2pMessages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} isStreaming={false} patientName={caseData ? `${caseData.patient_first_name} ${caseData.patient_last_name}`.trim() : ""} darkMode />
                  ))}
                  {p2pStreamingContent && (
                    <ChatMessage
                      message={{ id: "p2p-streaming", role: "assistant", content: p2pStreamingContent, created_at: new Date().toISOString() }}
                      isStreaming={true}
                      patientName={caseData ? `${caseData.patient_first_name} ${caseData.patient_last_name}`.trim() : ""}
                      darkMode
                    />
                  )}
                  <div ref={p2pEndRef} />
                </div>

                {/* Scorecard */}
                {p2pScore && (
                  <div className="flex-shrink-0 mb-4 p-5 rounded-xl bg-white/5 border border-white/10 overflow-y-auto max-h-[50vh]">
                    <h3 className="text-lg font-serif font-semibold text-white mb-4">Readiness Score</h3>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm text-white/50">Overall Readiness</span>
                      <span className={`text-3xl font-bold ${p2pScore.overall_readiness >= 7 ? "text-green-400" : p2pScore.overall_readiness >= 4 ? "text-amber-400" : "text-coral"}`}>
                        {p2pScore.overall_readiness}/10
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-5">
                      <div
                        className={`h-full rounded-full ${p2pScore.overall_readiness >= 7 ? "bg-green-500" : p2pScore.overall_readiness >= 4 ? "bg-amber-500" : "bg-coral"}`}
                        style={{ width: `${p2pScore.overall_readiness * 10}%` }}
                      />
                    </div>
                    {p2pScore.strengths?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Strengths</p>
                        <ul className="space-y-1">
                          {p2pScore.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {p2pScore.weaknesses?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Areas to Improve</p>
                        <ul className="space-y-1">
                          {p2pScore.weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {p2pScore.suggested_responses?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Suggested Stronger Responses</p>
                        <div className="space-y-2">
                          {p2pScore.suggested_responses.map((sr, i) => (
                            <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                              <p className="text-[10px] font-semibold text-white/30 uppercase mb-1">Objection</p>
                              <p className="text-sm text-white/50 mb-2">{sr.objection}</p>
                              <p className="text-[10px] font-semibold text-mint uppercase mb-1">Better Response</p>
                              <p className="text-sm text-white/80">{sr.better_response}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 mt-4 pt-3 border-t border-white/10">
                      <button
                        onClick={() => { setP2PScore(null); startP2PSession() }}
                        className="text-sm text-white/50 hover:text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> New Session
                      </button>
                    </div>
                  </div>
                )}

                {/* Input */}
                {p2pStatus === "active" && !p2pScore && (
                  <div className="flex-shrink-0 pb-6 pt-2 border-t border-white/10">
                    <div className="flex gap-2">
                      <textarea
                        ref={p2pInputRef}
                        value={p2pInput}
                        onChange={(e) => setP2PInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendP2PMessage() } }}
                        placeholder="Defend your prior authorization..."
                        className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-mint/30 focus:border-mint/30"
                        rows={2}
                        disabled={p2pStreaming}
                        aria-label="Your response to the medical director"
                      />
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={sendP2PMessage}
                          disabled={!p2pInput.trim() || p2pStreaming}
                          className="h-10 px-4 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center"
                          aria-label="Send message"
                        >
                          {p2pStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={endP2PSession}
                          disabled={p2pStreaming || p2pEnding || p2pMessages.length < 2}
                          className="h-10 px-3 rounded-lg border border-coral/30 text-coral hover:bg-coral/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center text-xs"
                          aria-label="End session and get scorecard"
                        >
                          {p2pEnding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-white/20 mt-2">Enter to send · Shift+Enter for new line · End session when ready for your score</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chat Overlay - Fullscreen chat experience */}
      <ChatOverlay
        isOpen={isChatExpanded}
        onClose={() => setIsChatExpanded(false)}
      >
        <ChatInterface
          ref={chatRef}
          caseId={caseData?.id || ""}
          caseData={caseData}
          onGenerate={async () => {
            setIsChatExpanded(false)
            if (isInChatMode) {
              setGenerating(true)
            } else {
              setRegenerateModalOpen(true)
            }
          }}
          riskItems={riskItems}
          caseContext={caseContext}
        />
      </ChatOverlay>
    </div >
  )
}
