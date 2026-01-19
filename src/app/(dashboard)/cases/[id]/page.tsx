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
import { ArrowLeft, Loader2, Sparkles, Copy, Download, CheckCircle, Check, Pencil, X, Plus } from "lucide-react"
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
  const [isSavingEdits, setIsSavingEdits] = useState(false)
  const hasAutoExtracted = useRef(false) // Track if auto-extraction has run

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
  useEffect(() => {
    if (caseData && !caseData.generated_output && !generating && caseData.status === 'draft') {
      // Start generation immediately (no delay to prevent flash)
      generateDocumentation()
    }
  }, [caseData])

  // AUTO-UPDATE PATIENT NAME AND PAYER FROM NOTES
  // Only runs once after generation completes, not after manual edits
  useEffect(() => {
    if (!caseData) return
    if (hasManuallyEdited) {
      console.log("Skipping auto-extraction: User has manually edited")
      return // Skip auto-extraction if user has manually edited
    }
    if (hasAutoExtracted.current) {
      console.log("Skipping auto-extraction: Already extracted once")
      return // Only run once per case
    }

    const hasGenerated = Boolean(caseData.generated_output || editedOutput)
    if (!hasGenerated) return // Only update after generation is complete

    console.log("Running auto-extraction...")

    // Update patient name
    const extractedName = extractPatientNameFromNotes()
    const shouldUseExtractedName = extractedName &&
      (extractedName.first !== caseData.patient_first_name || extractedName.last !== caseData.patient_last_name) &&
      isValidName(extractedName.first) && isValidName(extractedName.last)

    if (shouldUseExtractedName && extractedName) {
      // Auto-save the corrected name to database
      const updateName = async () => {
        try {
          await supabase
            .from("cases")
            .update({
              patient_first_name: extractedName.first,
              patient_last_name: extractedName.last
            })
            .eq("id", caseData.id)

          // Update local state
          setCaseData({
            ...caseData,
            patient_first_name: extractedName.first,
            patient_last_name: extractedName.last
          })
        } catch (error) {
          console.error("Error updating patient name:", error)
        }
      }

      updateName()
    }

    // Update payer
    const extractedPayer = extractPayerFromNotes()
    const shouldUseExtractedPayer = extractedPayer &&
      extractedPayer !== caseData.payer_name

    if (shouldUseExtractedPayer && extractedPayer) {
      // Auto-save the corrected payer to database
      const updatePayer = async () => {
        try {
          await supabase
            .from("cases")
            .update({
              payer_name: extractedPayer
            })
            .eq("id", caseData.id)

          // Update local state
          setCaseData({
            ...caseData,
            payer_name: extractedPayer
          })
        } catch (error) {
          console.error("Error updating payer:", error)
        }
      }

      updatePayer()
    }

    // Mark that auto-extraction has run
    hasAutoExtracted.current = true
    // Removed patient_first_name and patient_last_name from deps to prevent infinite loop
    // Only trigger on generation completion
  }, [caseData?.generated_output, editedOutput, caseData?.id, hasManuallyEdited])

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

      // Reset auto-extraction flag when loading a new case
      hasAutoExtracted.current = false
    } catch (error) {
      console.error("Error loading case:", error)
    } finally {
      setLoading(false)
    }
  }

  async function generateDocumentation() {
    if (!caseData) return

    setGenerating(true)
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: caseData.id }),
      })

      if (!response.ok) throw new Error("Failed to generate documentation")

      const result = await response.json()

      // Update local state
      setCaseData({ ...caseData, generated_output: result.documentation })
      setEditedOutput(result.documentation)
    } catch (error) {
      console.error("Error generating documentation:", error)
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate documentation. Please try again.",
      })
    } finally {
      setGenerating(false)
    }
  }

  // ... (Save/Copy/Download functions remain same)

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

  // Open edit modal and populate form
  const openEditModal = () => {
    if (!caseData) return
    setEditFormData({
      patient_first_name: displayFirstName,
      patient_last_name: displayLastName,
      patient_age: caseData.patient_age?.toString() || "",
      patient_state: caseData.patient_state || "",
      payer_name: displayPayer,
      claim_amount: caseData.claim_amount?.toString() || "",
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

    if (isSavingEdits) {
      console.log("Already saving, skipping duplicate request")
      return
    }

    console.log("Saving edits...", editFormData)
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

      // Only update claim_amount if it's provided and valid
      if (editFormData.claim_amount && editFormData.claim_amount.trim()) {
        const claimAmount = parseFloat(editFormData.claim_amount.replace(/[^0-9.]/g, ''))
        if (!isNaN(claimAmount) && claimAmount > 0) {
          updateData.claim_amount = claimAmount
        }
      }

      console.log("Updating with data:", updateData)
      console.log("Case ID:", caseData.id)

      // Check authentication
      const { data: { session } } = await supabase.auth.getSession()
      console.log("Current session:", session?.user?.id)
      console.log("Case user_id:", caseData.user_id)

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

      console.log("Update successful:", data)

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-light-gray to-white">
        <div className="text-center">
          <LumaLogo className="w-16 h-16 mx-auto mb-4" />
          <p className="text-gray-600">Loading case details...</p>
        </div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-light-gray to-white">
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

  // If user has manually edited, always use database values - don't auto-extract
  let displayFirstName = caseData?.patient_first_name || ''
  let displayLastName = caseData?.patient_last_name || ''
  let displayPayer = caseData?.payer_name || ''
  let showExtractedNameLabel = false
  let showExtractedPayerLabel = false

  console.log("Display logic - hasManuallyEdited:", hasManuallyEdited)
  console.log("Display logic - DB values:", {
    first: caseData?.patient_first_name,
    last: caseData?.patient_last_name,
    payer: caseData?.payer_name,
    metadata: caseData?.metadata
  })

  // Only run extraction logic if user hasn't manually edited
  if (!hasManuallyEdited) {
    const extractedName = extractPatientNameFromNotes()
    const extractedPayer = extractPayerFromNotes()

    // Only use extracted name if it's different from form input and valid
    const shouldUseExtractedName = extractedName &&
      (extractedName.first !== caseData?.patient_first_name || extractedName.last !== caseData?.patient_last_name) &&
      isValidName(extractedName.first) && isValidName(extractedName.last)

    if (shouldUseExtractedName && extractedName) {
      displayFirstName = extractedName.first
      displayLastName = extractedName.last
      showExtractedNameLabel = true
    }

    // Only use extracted payer if it's different from form input
    const shouldUseExtractedPayer = extractedPayer && extractedPayer !== caseData?.payer_name
    if (shouldUseExtractedPayer && extractedPayer) {
      displayPayer = extractedPayer
      showExtractedPayerLabel = true
    }
  }

  // Show full-screen loading when generating OR when case needs generation (before any output exists)
  if ((generating || needsGeneration) && !hasGenerated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-light-gray to-white flex items-center justify-center">
        <div className="text-center px-4">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <LumaLogo className="w-20 h-20" variant="loading" />
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white">
      {/* Header */}
      <header className="border-b border-sage-medium/50 glass-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LumaLogo className="w-8 h-8" />
            <span className="text-xl font-serif font-bold text-dark-bg">Luma</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Case Details */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 glass-card border border-sage-medium/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif text-dark-bg">Case Details</h2>
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

                {caseData.claim_amount && (
                  <div className="col-span-2">
                    <p className="text-gray-500 mb-1">Claim Amount</p>
                    <p className="text-dark-bg">
                      ${caseData.claim_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 glass-card border border-sage-medium/30">
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

            {/* Suggested Forms */}
          </div>

          {/* Right Column - Generated Documentation */}
          <div className="lg:col-span-2">
            <Card className="p-6 glass-card border border-sage-medium/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-serif text-dark-bg">
                  {hasGenerated ? "Generated Documentation" : "Generating Documentation..."}
                </h2>
                {!hasGenerated && !generating && (
                  // Fallback button if auto-start fails or user cancels
                  <Button
                    onClick={generateDocumentation}
                    className="gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Retry Generation
                  </Button>
                )}
              </div>

              {hasGenerated ? (
                <>
                  <Textarea
                    value={editedOutput}
                    onChange={(e) => setEditedOutput(e.target.value)}
                    className="min-h-[500px] font-mono text-sm mb-4"
                    placeholder="Generated documentation will appear here..."
                  />

                  <div className="flex gap-3 flex-wrap">
                    <Button onClick={saveEdits} variant="outline">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
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
                    <Button
                      onClick={generateDocumentation}
                      disabled={generating}
                      variant="secondary"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                // LOADING STATE
                <div className="text-center py-20">
                  <div className="relative w-20 h-20 mx-auto mb-8">
                    <LumaLogo className="w-20 h-20 animate-pulse text-mint" />
                    {/* Or simple spinner if preferred, but user asked for "Preloader" feel */}
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
            </Card>
          </div>
        </div>

        {/* Suggested Forms Section */}
        <div className="mt-8">
          <SuggestedForms
            caseId={caseData.id}
            lastGenerated={caseData.generated_output}
          />
        </div>
      </div>

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
                    setEditFormData({ ...editFormData, patient_state: e.target.value })
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
                <Input
                  id="claim-amount"
                  type="text"
                  placeholder="50000"
                  value={editFormData.claim_amount}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, claim_amount: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500">Enter amount as a number (e.g., 50000)</p>
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
    </div >
  )
}
