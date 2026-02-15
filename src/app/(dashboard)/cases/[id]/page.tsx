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
import { GeneratingSteps } from "@/components/GeneratingSteps"
import { ArrowLeft, Loader2, Sparkles, Copy, Download, CheckCircle, Check, Pencil, X, Plus, RefreshCw, Send, Save, ChevronDown, MessageSquare, FileText, Image, AlertTriangle, User, Users, CreditCard, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  metadata?: {
    manually_edited?: boolean
    creation_method?: string
    original_pasted_text?: string
    [key: string]: any
  }
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
  const [isChatCopied, setIsChatCopied] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<{ filename: string; fileType: string }[]>([])
  const [showDocsDropdown, setShowDocsDropdown] = useState(false)
  const [showRisksDropdown, setShowRisksDropdown] = useState(false)
  const [copiedRiskIndex, setCopiedRiskIndex] = useState<string | null>(null)
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

  // User/org state for nav
  const [userEmail, setUserEmail] = useState("")
  const [practiceName, setPracticeName] = useState("")
  const [isTeamOwner, setIsTeamOwner] = useState(true)

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

  useEffect(() => {
    async function loadUserNav() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserEmail(session.user.email || "")
      const { data: userData } = await supabase
        .from("users")
        .select("practice_name, team_owner_id, is_team_owner")
        .eq("id", session.user.id)
        .single()
      if (userData) {
        const ownerStatus = userData.is_team_owner || !userData.team_owner_id
        setIsTeamOwner(ownerStatus)
        if (userData.team_owner_id) {
          const { data: ownerData } = await supabase
            .from("users")
            .select("practice_name")
            .eq("id", userData.team_owner_id)
            .single()
          setPracticeName(ownerData?.practice_name || "")
        } else {
          setPracticeName(userData.practice_name || "")
        }
      }
    }
    loadUserNav()
  }, [])

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

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

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
    } catch (error: any) {
      console.error("Error loading case:", error?.message || error?.code || JSON.stringify(error))
    } finally {
      setLoading(false)
    }
  }

  async function copyChatMessages() {
    if (!caseData) return

    const { data: messages } = await supabase
      .from("case_messages")
      .select("role, content")
      .eq("case_id", caseData.id)
      .order("created_at", { ascending: true })

    if (messages && messages.length > 0) {
      const assistantMessages = messages
        .filter(m => m.role === "assistant")
        .map(m => m.content.replace("[READY_TO_GENERATE]", "").trim())
        .join("\n\n---\n\n")

      if (assistantMessages) {
        await navigator.clipboard.writeText(assistantMessages)
        setIsChatCopied(true)
        setTimeout(() => setIsChatCopied(false), 2000)
      }
    }
  }

  async function copyRiskItem(text: string, index: string) {
    await navigator.clipboard.writeText(text)
    setCopiedRiskIndex(index)
    setTimeout(() => setCopiedRiskIndex(null), 2000)
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

  async function saveEdits() {
    if (!caseData) return

    try {
      const { error } = await supabase
        .from("cases")
        .update({ edited_output: editedOutput })
        .eq("id", caseData.id)

      if (error) throw error

      toast({
        title: "Changes Saved",
        description: "Your changes have been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving edits:", error)
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save changes. Please try again.",
      })
    }
  }

  async function markAsSubmitted() {
    if (!caseData) return

    try {
      const { error } = await supabase
        .from("cases")
        .update({ status: "submitted" })
        .eq("id", caseData.id)

      if (error) throw error

      setCaseData({ ...caseData, status: "submitted" })
      toast({
        title: "Case Submitted",
        description: "This case has been marked as submitted.",
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update case status. Please try again.",
      })
    }
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
        last_validation_run: caseData.metadata?.lcd_validation?.run_at || now,
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
  const needsGeneration = caseData && !caseData.generated_output && caseData.status === 'draft'

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

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Case Title Section */}
        {caseData && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-dark-bg/70 mb-1 uppercase tracking-wide">
                  {caseData.doc_type === "biologics_pa" && "Biologics Prior Authorization"}
                  {caseData.doc_type === "medical_necessity" && "Medical Necessity Letter"}
                  {caseData.doc_type === "appeal" && "Appeal Letter"}
                  {!["biologics_pa", "medical_necessity", "appeal"].includes(caseData.doc_type) && "Case Documentation"}
                </p>
                <h1 className="text-3xl font-sans font-bold text-dark-bg">
                  {displayFirstName} {displayLastName}
                </h1>
                {caseData.requested_medication &&
                 !caseData.requested_medication.toLowerCase().includes("see notes") && (
                  <p className="text-lg text-gray-600 mt-1">
                    {caseData.requested_medication}
                    {caseData.medication_dose &&
                     !caseData.medication_dose.toLowerCase().includes("see notes") &&
                     ` · ${caseData.medication_dose}`}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-2">
                  {/* Only show Regenerate button when not in chat mode */}
                  {!isInChatMode && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Show confirmation modal if regenerating (already has output)
                          if (caseData.generated_output) {
                            setRegenerateModalOpen(true)
                          } else {
                            // Clear output and trigger streaming generation
                            setGenerating(true)
                          }
                        }}
                        disabled={generating}
                        className="gap-2 border-dark-bg text-dark-bg hover:bg-dark-bg hover:text-white"
                      >
                        {generating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Regenerate
                      </Button>
                    </>
                  )}
                  {caseData.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={markAsSubmitted}
                      className="gap-2 bg-mint hover:bg-mint/90"
                    >
                      <Send className="w-4 h-4" />
                      Mark Submitted
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Left Column - Case Details */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-4 md:p-6 bg-white rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow border-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-sans font-semibold text-dark-bg">Case Details</h2>
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition-colors px-3 py-1.5 h-7 text-xs text-gray-700 hover:text-gray-900 font-medium"
                  title="Edit case details"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">First Name</p>
                  <p className="font-semibold text-dark-bg">
                    {displayFirstName}
                    {showExtractedNameLabel && (
                      <span className="text-xs text-gray-500 ml-2 font-normal">(from notes)</span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500 mb-1">Last Name</p>
                  <p className="font-semibold text-dark-bg">
                    {displayLastName}
                    {showExtractedNameLabel && (
                      <span className="text-xs text-gray-500 ml-2 font-normal">(from notes)</span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500 mb-1">Age</p>
                  <p className="text-dark-bg">
                    {caseData.patient_age}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500 mb-1">State</p>
                  <p className="text-dark-bg">
                    {caseData.patient_state}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-gray-500 mb-1">Payer</p>
                  <p className="text-dark-bg">
                    {displayPayer}
                    {showExtractedPayerLabel && (
                      <span className="text-xs text-gray-500 ml-2 font-normal">(from notes)</span>
                    )}
                  </p>
                </div>

                {caseData.claim_amount != null && caseData.claim_amount > 0 && (
                  <div className="col-span-2">
                    <p className="text-gray-500 mb-1">Claim Amount</p>
                    <p className="text-dark-bg">
                      ${caseData.claim_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 md:p-6 bg-white rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow border-0">
              <h3 className="font-semibold text-dark-bg mb-3">Clinical Details</h3>
              <div className="space-y-3 text-sm">
                {caseData.disease_activity && (
                  <div>
                    <p className="text-gray-500 mb-1">Clinical Notes</p>
                    <p className="text-gray-700 text-xs">
                      {caseData.disease_activity.length > 200
                        ? `${caseData.disease_activity.substring(0, 200)}...`
                        : caseData.disease_activity}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Uploaded Documents */}
            {uploadedDocs.length > 0 && (
              <Card className="p-4 md:p-6 bg-white rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] hover:shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_1px_2px_-1px_rgba(0,0,0,0.08),0px_2px_4px_0px_rgba(0,0,0,0.06)] transition-shadow border-0">
                <h3 className="font-semibold text-dark-bg mb-3">Uploaded Documents</h3>
                <div className="space-y-2">
                  {uploadedDocs.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 rounded-lg bg-sage-light/20"
                      title={doc.filename}
                    >
                      {["png", "jpg", "jpeg"].includes(doc.fileType) ? (
                        <Image className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-700 truncate">{doc.filename}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Suggested Forms */}
          </div>

          {/* Right Column - Chat Interface or Generated Documentation */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="wait">
              {/* Chat Interface - Full screen when in chat mode */}
              {isInChatMode ? (
                <motion.div
                  key="chat-interface"
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
                  transition={{
                    type: "spring",
                    duration: 0.5,
                    bounce: 0.1,
                  }}
                >
                  <Card className="bg-white rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_2px_-1px_rgba(0,0,0,0.06),0px_2px_4px_0px_rgba(0,0,0,0.04)] border-0 h-[600px]">
                    <ChatInterface
                      caseId={caseData.id}
                      caseData={caseData}
                      onGenerate={() => {
                        // Trigger streaming generation via GeneratingSteps
                        setGenerating(true)
                      }}
                    />
                  </Card>
                </motion.div>
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
                  {/* Chat with Luma - Opens modal for follow-up questions */}
                  <button
                    onClick={() => setIsChatExpanded(true)}
                    className="w-full group"
                  >
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-dark-bg to-dark-bg/90 p-5 transition-all hover:shadow-lg hover:shadow-dark-bg/20 hover:scale-[1.01]">
                      <div className="absolute inset-0 bg-gradient-to-br from-mint/10 via-transparent to-sage-light/10" />
                      <div className="relative flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-mint/20 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-mint" />
                        </div>
                        <div className="flex-1 text-left">
                          <h2 className="text-lg font-semibold text-white">Chat with Luma</h2>
                          <p className="text-sm text-white/60">Ask questions or discuss compliance gaps</p>
                        </div>
                        <ChevronDown className="w-5 h-5 text-white/40 -rotate-90 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>

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
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-sans font-semibold text-dark-bg">
                          Generated Documentation
                        </h2>
                        <button
                          onClick={() => setIsDocCollapsed(!isDocCollapsed)}
                          className="p-2 hover:bg-sage-light/20 rounded-lg transition-colors"
                        >
                          <motion.div
                            animate={{ rotate: isDocCollapsed ? 0 : 180 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          </motion.div>
                        </button>
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
                                      "{tidbits[tidbitIndex]}"
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
                                <p className="text-gray-500 text-xs mt-0.5 italic">"{item.notes}"</p>
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
                        I acknowledge that the addressed items listed above will be included in the regenerated documentation. I confirm that the information I've provided is accurate and I take responsibility for its clinical validity.
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

      {/* Chat Modal - For follow-up questions after generation */}
      <Dialog open={isChatExpanded} onOpenChange={setIsChatExpanded}>
        <DialogContent className="sm:max-w-4xl h-[80vh] max-h-[700px] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle className="text-lg">Chat with Luma</DialogTitle>
            <DialogDescription className="pt-1">
              All conversations and uploaded documents are saved and will be used to generate more accurate letters.
            </DialogDescription>
          </DialogHeader>

          {/* Action Bar */}
          <div className="px-6 pb-4 flex-shrink-0 flex items-center gap-3 flex-wrap">
            <button
              onClick={copyChatMessages}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={isChatCopied ? "check" : "copy"}
                  initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                  transition={{
                    type: "spring",
                    duration: 0.3,
                    bounce: 0,
                  }}
                  className="flex items-center gap-2"
                >
                  {isChatCopied ? (
                    <>
                      <Check className="h-4 w-4 text-mint" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy Responses</span>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </button>

            {/* Uploaded Documents - Click to expand */}
            {uploadedDocs.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowDocsDropdown(!showDocsDropdown)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-light/40 hover:bg-sage-light/60 transition-colors text-xs font-medium text-gray-600"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{uploadedDocs.length} document{uploadedDocs.length !== 1 ? 's' : ''}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${showDocsDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showDocsDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[200px] max-w-[280px]"
                    >
                      <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Uploaded Files
                      </div>
                      {uploadedDocs.map((doc, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 flex items-center gap-2 hover:bg-gray-50"
                          title={doc.filename}
                        >
                          {["png", "jpg", "jpeg"].includes(doc.fileType) ? (
                            <Image className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span className="text-sm text-gray-700 truncate">{doc.filename}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          </div>

          {/* Risk Items - Simple select with colored dots */}
          {riskItems.length > 0 && (
            <div className="px-6 pb-4">
              <select
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-mint focus:border-transparent cursor-pointer"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    const selectedItem = riskItems[parseInt(e.target.value)]
                    if (selectedItem && chatRef.current) {
                      chatRef.current.sendMessage(`I'd like to discuss this compliance gap: "${selectedItem.text}". What specific documentation or evidence do I need to address this?`)
                    }
                    e.target.value = "" // Reset selection
                  }
                }}
              >
                <option value="" disabled>Discuss a compliance gap ({riskItems.length})...</option>
                {riskItems.map((item, index) => (
                  <option key={index} value={index}>
                    {item.severity === 'instant' ? '● ' : item.severity === 'very-high' ? '● ' : '● '}{item.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 min-h-0 border-t border-gray-100">
            <ChatInterface
              ref={chatRef}
              caseId={caseData?.id || ""}
              caseData={caseData}
              onGenerate={async () => {
                setIsChatExpanded(false)
                setRegenerateModalOpen(true)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div >
  )
}
