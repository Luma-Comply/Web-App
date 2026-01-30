"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Autocomplete } from "@/components/ui/autocomplete"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { LumaLogo } from "@/components/LumaLogo"
import { searchPayers } from "@/lib/payers"
import { getActiveWiserSkinSubStates, isWiserActiveForSkinSubs, getMACInfo } from "@/lib/mac-jurisdictions"
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ExternalLink,
  Upload,
  FileText,
  Image,
  X,
  AlertCircle,
} from "lucide-react"

export default function NewCasePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [pastedText, setPastedText] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showFullHipaaList, setShowFullHipaaList] = useState(false)
  const [payerSelected, setPayerSelected] = useState(false) // Track if payer was selected from dropdown

  // File upload configuration
  const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg']
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      if (extension === 'heic' || extension === 'heif') {
        return { valid: false, error: `HEIC/HEIF files are not supported. Please convert to JPG or PNG.` }
      }
      if (['mp4', 'mp3', 'mov', 'avi', 'wmv', 'webm'].includes(extension)) {
        return { valid: false, error: `Video files are not supported. Please upload documents or images.` }
      }
      if (extension === 'doc') {
        return { valid: false, error: `DOC files are not supported. Please convert to DOCX or PDF.` }
      }
      if (extension === 'xls') {
        return { valid: false, error: `XLS files are not supported. Please convert to XLSX or PDF.` }
      }
      return { valid: false, error: `${extension.toUpperCase()} files are not supported. Allowed: PDF, DOCX, XLSX, PNG, JPG.` }
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `"${file.name}" exceeds 10MB limit.` }
    }

    return { valid: true }
  }

  const handleFileSelect = (files: FileList | File[]) => {
    setFileError(null)
    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of fileArray) {
      // Check for duplicates
      if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        continue // Skip duplicates silently
      }

      const validation = validateFile(file)
      if (validation.valid) {
        validFiles.push(file)
      } else {
        errors.push(validation.error || 'Invalid file')
      }
    }

    if (errors.length > 0) {
      setFileError(errors[0])
      setTimeout(() => setFileError(null), 5000)
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const [formData, setFormData] = useState({
    doc_type: "", // Default to empty - user must select
    patient_first_name: "",
    patient_last_name: "",
    patient_age: "",
    patient_state: "",
    claim_amount: "",
    payer_name: "",
    wound_type: "", // Required for biologics_pa
    custom_wound_type: "", // Used when wound_type is "OTHER"
  })

  // Basic change handler for flat inputs
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    if (name === "claim_amount") {
      const numericValue = value.replace(/,/g, "")
      setFormData((prev) => ({ ...prev, [name]: numericValue }))
    } else if (name === "patient_state") {
      setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const formatCurrency = (value: string) => {
    if (!value) return ""
    const numeric = value.replace(/[^\d.]/g, "")
    const parts = numeric.split(".")
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0]
  }

  // Progressive disclosure: check if each step is complete
  const isStep1Complete = formData.doc_type === "biologics_pa"
    ? !!(formData.doc_type && formData.wound_type && (formData.wound_type !== "OTHER" || formData.custom_wound_type.trim()))
    : !!formData.doc_type
  const isStep2Complete = !!(
    formData.patient_first_name &&
    formData.patient_last_name &&
    formData.patient_age &&
    formData.patient_state &&
    payerSelected // Only true when payer is selected from dropdown
  )
  // Step 3 requires either clinical notes (50+ chars) OR uploaded files
  const isStep3Complete = (pastedText && pastedText.length >= 50) || selectedFiles.length > 0

  // Submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Basic validation
    if (!formData.doc_type) {
      setError("Please select a document type.")
      return
    }

    // Wound type required for biologics PA
    if (formData.doc_type === "biologics_pa" && !formData.wound_type) {
      setError("Please select a wound type for Biologics Prior Authorization.")
      return
    }

    // Custom wound type required when "Other" is selected
    if (formData.wound_type === "OTHER" && !formData.custom_wound_type.trim()) {
      setError("Please enter the wound type.")
      return
    }

    // Require either clinical notes (50+ chars) OR uploaded files
    const hasValidNotes = pastedText && pastedText.length >= 50
    const hasFiles = selectedFiles.length > 0

    if (!hasValidNotes && !hasFiles) {
      setError("Please paste clinical notes (at least 50 characters) or upload documents.")
      return
    }

    // If notes provided but too short, show specific error
    if (pastedText && pastedText.length > 0 && pastedText.length < 50 && !hasFiles) {
      setError("Clinical notes must be at least 50 characters, or upload documents instead.")
      return
    }

    if (!agreedToTerms) {
      setError("You must agree to the compliance terms before creating a case.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      // Check subscription status
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("subscription_status, trial_ends_at")
        .eq("id", session.user.id)
        .single()

      if (userError || !user) {
        setError("Failed to verify subscription status. Please try again.")
        setLoading(false)
        return
      }

      // Check if user has access (trial or active subscription)
      const now = new Date()
      const trialEnded = user.trial_ends_at ? new Date(user.trial_ends_at) < now : true
      const hasActiveSubscription = user.subscription_status === "active"
      const isTrialing = user.subscription_status === "trialing" && !trialEnded

      if (!hasActiveSubscription && !isTrialing) {
        setError("Your trial has ended. Please subscribe to continue creating cases.")
        setLoading(false)
        router.push("/dashboard") // Redirect to dashboard to show upgrade prompt
        return
      }

      // Prepare case data
      // We map the pasted text to 'disease_activity' (primary context field)
      // and 'prior_treatments' (secondary) to ensure AI sees it.
      // Other specific fields like 'diagnosis_codes' get a default placeholder
      // so the AI Generator knows to extract them from the text.
      //
      // Auto-generate if user provided clinical notes OR uploaded files
      // Chat mode only if neither is provided
      const hasClinicaNotes = pastedText && pastedText.length >= 50
      const hasContent = hasClinicaNotes || selectedFiles.length > 0
      const caseInsert: any = {
        user_id: session.user.id,
        created_by_email: session.user.email, // Track who created the case
        status: hasContent ? "draft" : "chat", // Auto-generate if notes or files provided

        // 1. Key Fields Input Manually
        doc_type: formData.doc_type,
        patient_first_name: formData.patient_first_name,
        patient_last_name: formData.patient_last_name,
        patient_age: formData.patient_age ? parseInt(formData.patient_age) : 0,
        patient_state: formData.patient_state,
        claim_amount: formData.claim_amount ? parseFloat(formData.claim_amount.replace(/,/g, "")) : 0,
        payer_name: formData.payer_name, // User input

        // 2. Data from PASTE (The Source of Truth)
        // We put the full text in disease_activity as the main context carrier
        disease_activity: pastedText,

        // 3. Placeholders (AI will ignore these or use defaults)
        diagnosis_codes: ["See Notes"],
        lab_values: "See Clinical Notes",
        prior_treatments: "See Clinical Notes",
        requested_medication: "See Notes",
        medication_dose: "See Notes",
        payer_type: "commercial", // Default, can be inferred


        // 4. Metadata for UI to know the creation method
        metadata: {
          creation_method: pastedText && selectedFiles.length > 0
            ? "paste_and_upload"
            : selectedFiles.length > 0
              ? "upload_only"
              : "paste_only",
          original_pasted_text: pastedText,
          // Wound type for LCD validation (biologics PA only)
          wound_type: formData.wound_type || undefined,
          custom_wound_type: formData.wound_type === "OTHER" ? formData.custom_wound_type.trim() : undefined,
          // AUDIT TRAIL - Terms Agreement
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_accepted_by_user_id: session.user.id,
          terms_accepted_by_email: session.user.email,
          terms_version: "1.0",
        },
      }

      // Create case
      const { data: caseData, error: insertError } = await supabase
        .from("cases")
        .insert(caseInsert)
        .select()
        .single()

      if (insertError) {
        throw new Error(insertError.message || insertError.hint || "Failed to create case")
      }

      if (!caseData) {
        throw new Error("Case was created but no data was returned")
      }

      // Upload selected files to the case
      if (selectedFiles.length > 0) {
        setUploadingFiles(true)
        for (const file of selectedFiles) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('caseId', caseData.id)

          try {
            await fetch('/api/chat/upload', {
              method: 'POST',
              body: formData,
            })
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError)
            // Continue with other files even if one fails
          }
        }
        setUploadingFiles(false)
      }

      // Redirect to case processing/AI generation
      // This matches User intent: "go straight to perplexity ai" (conceptually)
      router.push(`/cases/${caseData.id}`)

    } catch (err: any) {
      console.error("Error creating case:", err)
      setError(err.message || "Failed to create case")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white">
      {/* Header */}
      <header className="border-b border-sage-medium/50 glass-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LumaLogo className="w-8 h-8" />
            <span className="text-xl font-serif font-bold text-dark-bg">Luma</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-sans font-semibold text-dark-bg mb-2">Create New Case</h1>
          <p className="text-gray-600">
            Select document type and paste clinical notes. Our AI will handle the rest.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-coral/10 border border-coral/20 text-coral">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ============================================== */}
          {/* 1. DOCUMENT TYPE (Top Priority)                */}
          {/* ============================================== */}
          <Card className="p-6 glass-card border border-sage-medium/30">
            <h2 className="text-xl font-sans font-semibold text-dark-bg mb-4">1. Document Type</h2>
            <Label htmlFor="doc_type">What document do you need generated?</Label>
            <select
              id="doc_type"
              name="doc_type"
              value={formData.doc_type}
              onChange={handleChange}
              className="w-full mt-2 h-11 px-4 rounded-md border border-sage-medium bg-white focus:border-mint focus:ring-2 focus:ring-mint focus:ring-offset-0 outline-none"
              required
            >
              <option value="" disabled>Select Document Type</option>
              <option value="biologics_pa">Biologics Prior Authorization</option>
              <option value="medical_necessity">Medical Necessity Letter</option>
              <option value="appeal">Appeal Letter</option>
            </select>

            {/* Wound Type - Required for Biologics PA */}
            {formData.doc_type === "biologics_pa" && (
              <div className="mt-4">
                <Label htmlFor="wound_type">Wound Type</Label>
                <select
                  id="wound_type"
                  name="wound_type"
                  value={formData.wound_type}
                  onChange={handleChange}
                  className="w-full mt-2 h-11 px-4 rounded-md border border-sage-medium bg-white focus:border-mint focus:ring-2 focus:ring-mint focus:ring-offset-0 outline-none"
                  required
                >
                  <option value="" disabled>Select Wound Type</option>
                  <option value="DFU">Diabetic Foot Ulcer (DFU)</option>
                  <option value="VLU">Venous Leg Ulcer (VLU)</option>
                  <option value="PRESSURE_ULCER">Pressure Ulcer / Pressure Injury</option>
                  <option value="ARTERIAL_ULCER">Arterial Ulcer</option>
                  <option value="SURGICAL_WOUND">Surgical Wound (Non-healing)</option>
                  <option value="TRAUMATIC_WOUND">Traumatic Wound</option>
                  <option value="BURN">Burn Wound</option>
                  <option value="OTHER">Other</option>
                </select>
                {formData.wound_type === "OTHER" && (
                  <Input
                    id="custom_wound_type"
                    name="custom_wound_type"
                    value={formData.custom_wound_type}
                    onChange={handleChange}
                    placeholder="Enter wound type"
                    className="mt-2"
                    required
                  />
                )}
              </div>
            )}

            {/* WISeR Pilot State Info */}
            {formData.doc_type === "biologics_pa" && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">WISeR Prior Authorization Pilot (2026)</p>
                    <p className="text-blue-700 mb-2">
                      Medicare requires AI-based Prior Authorization for skin substitutes/CTPs in 6 states:
                    </p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {getActiveWiserSkinSubStates().map((state) => {
                        const info = getMACInfo(state)
                        return (
                          <span key={state} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            {state} ({info?.aiVendor?.split(",")[0]})
                          </span>
                        )
                      })}
                    </div>
                    <p className="text-blue-600 text-xs">
                      Other states: Coverage based on MAC-specific LCDs or &quot;reasonable and necessary&quot; determinations.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Step 2: Shows after document type is selected */}
          {isStep1Complete && (
          <Card className="p-6 glass-card border border-sage-medium/30 overflow-visible">
            <h2 className="text-xl font-sans font-semibold text-dark-bg mb-4">2. Patient & Claim Info</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Patient Name */}
              <div>
                <Label htmlFor="patient_first_name">First Name</Label>
                <Input
                  id="patient_first_name"
                  name="patient_first_name"
                  value={formData.patient_first_name}
                  onChange={handleChange}
                  placeholder="John"
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="patient_last_name">Last Name</Label>
                <Input
                  id="patient_last_name"
                  name="patient_last_name"
                  value={formData.patient_last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="mt-2"
                  required
                />
              </div>

              {/* Age & State */}
              <div>
                <Label htmlFor="patient_age">Age</Label>
                <Input
                  id="patient_age"
                  name="patient_age"
                  type="number"
                  value={formData.patient_age}
                  onChange={handleChange}
                  placeholder="45"
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="patient_state">State</Label>
                <Input
                  id="patient_state"
                  name="patient_state"
                  value={formData.patient_state}
                  onChange={handleChange}
                  placeholder="TX"
                  maxLength={2}
                  className="mt-2"
                  required
                />
              </div>

              {/* Insurance Payer - CRITICAL for AI */}
              <div className="md:col-span-2">
                <Label htmlFor="payer_name">Insurance Payer (Required for Research)</Label>
                <Autocomplete
                  id="payer_name"
                  name="payer_name"
                  value={formData.payer_name}
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, payer_name: value }))
                    // Reset selection if user starts typing again
                    if (payerSelected) setPayerSelected(false)
                  }}
                  onSelect={(value) => {
                    setFormData((prev) => ({ ...prev, payer_name: value }))
                    setPayerSelected(true)
                  }}
                  onSearch={searchPayers}
                  placeholder="Start typing... e.g. Tradi, Blue Cross, Aetna"
                  className="mt-2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The AI will research the specific policy for this payer. Start typing to see suggestions.
                </p>
              </div>

              {/* Claim Amount */}
              <div className="md:col-span-2">
                <Label htmlFor="claim_amount">Estimated Claim Amount</Label>
                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="claim_amount"
                    name="claim_amount"
                    type="text"
                    value={formatCurrency(formData.claim_amount)}
                    onChange={handleChange}
                    placeholder="35,808.23"
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </Card>
          )}

          {/* Step 3: Shows after patient info is complete - NOW OPTIONAL */}
          {isStep1Complete && isStep2Complete && (
          <Card className="p-6 glass-card border border-mint/30 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-sans font-semibold text-dark-bg">3. Paste Clinical Notes (Optional)</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Paste clinical context here, or skip to chat with our AI assistant.
                  You can provide notes during the chat conversation instead.
                </p>
              </div>
              {pastedText.length > 0 && (
                <Badge variant="default" className="bg-mint text-white">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {pastedText.length} chars
                </Badge>
              )}
            </div>

            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="PASTE HERE (or skip and provide via chat)...

Example:
Patient is a 45yo male with RA.
Failed Methotrexate (3 months) and Humira (6 months).
Current DAS28 is 5.2.
Requesting Rinvoq 15mg daily."
              className="min-h-[200px] font-mono text-sm mb-4 bg-white/80"
            />

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">or upload documents</span>
              </div>
            </div>

            {/* File Upload Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging ? 'border-mint bg-mint/5' : 'border-gray-200 hover:border-gray-300'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  <span className="text-mint font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, DOCX, XLSX, PNG, JPG (max 10MB each)
                </p>
              </label>
            </div>

            {/* File Error Display */}
            {fileError && (
              <div className="mt-3 flex items-center gap-2 text-sm text-coral">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{fileError}</span>
                <button onClick={() => setFileError(null)} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                </p>
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-lg bg-sage-light/20"
                  >
                    {['png', 'jpg', 'jpeg'].includes(file.name.split('.').pop()?.toLowerCase() || '') ? (
                      <Image className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                    <span className="text-xs text-gray-400">
                      {(file.size / 1024).toFixed(0)}KB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-4">
              {pastedText.length >= 50
                ? "With clinical notes provided, documentation will generate automatically."
                : selectedFiles.length > 0
                ? "Files will be processed when you start the chat."
                : "Without notes or files, you'll chat with our AI to refine your case."}
            </p>
          </Card>
          )}

          {/* Step 4: Shows with Step 3 after patient info is complete */}
          {isStep1Complete && isStep2Complete && (
          <Card className="p-6 glass-card border border-amber-500/30 bg-amber-50/30">
            <h2 className="text-xl font-sans font-semibold text-dark-bg mb-4">4. Compliance Agreement</h2>

            {/* Warning Box */}
            <div className="bg-amber-100/50 border border-amber-300/50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 mb-2">
                    Safe Harbor De-identification Required
                  </h3>
                  <p className="text-sm text-amber-700 mb-3">
                    Luma uses a &quot;Safe Harbor&quot; approach. Your clinical notes must <strong>NOT</strong> contain the following PHI identifiers:
                  </p>
                  <ul className="text-sm text-amber-700 space-y-1.5 mb-3">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      Social Security Numbers
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      Full addresses (state only is allowed)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      Phone numbers or email addresses
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      Medical Record Numbers (MRN)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      Dates of birth (age only is allowed)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      Health insurance ID numbers
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => setShowFullHipaaList(true)}
                    className="text-sm text-amber-800 hover:text-amber-900 underline underline-offset-2 flex items-center gap-1"
                  >
                    View full list of 18 HIPAA identifiers
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Checkbox Agreement */}
            <label className="flex items-start gap-4 cursor-pointer p-4 rounded-lg border border-sage-medium/30 bg-white/50 hover:bg-white/80 transition-colors">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-6 h-6 rounded-md border-2 border-sage-medium text-mint focus:ring-mint focus:ring-offset-0 cursor-pointer accent-mint"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                I confirm that my clinical notes do not contain PHI identifiers (SSN, full addresses, phone numbers, MRN, DOB, etc.). I understand that I am responsible for de-identifying patient data before submission.
              </span>
            </label>
          </Card>
          )}

          {/* HIPAA Full List Dialog */}
          <Dialog open={showFullHipaaList} onOpenChange={setShowFullHipaaList}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-mint" />
                  18 HIPAA Safe Harbor Identifiers
                </DialogTitle>
                <DialogDescription>
                  To comply with HIPAA Safe Harbor de-identification, your clinical notes must not contain any of these identifiers:
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li><strong>Names</strong> — <span className="text-mint">(patient name IS allowed for our use case)</span></li>
                  <li><strong>Geographic data</strong> smaller than state</li>
                  <li><strong>Dates</strong> (except year) related to an individual — birth date, admission date, discharge date, death date</li>
                  <li><strong>Phone numbers</strong></li>
                  <li><strong>Fax numbers</strong></li>
                  <li><strong>Email addresses</strong></li>
                  <li><strong>Social Security Numbers</strong></li>
                  <li><strong>Medical Record Numbers</strong></li>
                  <li><strong>Health plan beneficiary numbers</strong></li>
                  <li><strong>Account numbers</strong></li>
                  <li><strong>Certificate/license numbers</strong></li>
                  <li><strong>Vehicle identifiers</strong> and serial numbers</li>
                  <li><strong>Device identifiers</strong> and serial numbers</li>
                  <li><strong>Web URLs</strong></li>
                  <li><strong>IP addresses</strong></li>
                  <li><strong>Biometric identifiers</strong> (fingerprints, voiceprints)</li>
                  <li><strong>Full-face photographs</strong></li>
                  <li><strong>Any other unique identifying number</strong>, characteristic, or code</li>
                </ol>
                <div className="mt-4 p-3 bg-mint/10 rounded-lg border border-mint/20">
                  <p className="text-sm text-gray-600">
                    <strong>What IS allowed:</strong> Patient name, age (not DOB), state (not full address), and clinical data (diagnoses, medications, lab values, treatment history).
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>


          {/* Submit Buttons */}
          <div className="flex gap-4 justify-end pt-4">
            <Link href="/dashboard">
              <Button type="button" variant="outline" size="lg">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              size="lg"
              disabled={loading || !agreedToTerms || (pastedText.length < 50 && selectedFiles.length === 0)}
              className="gap-2 bg-dark-bg hover:bg-dark-bg/90 text-white min-w-[200px] disabled:opacity-50"
            >
              {loading ? (
                uploadingFiles ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading Files...
                  </>
                ) : (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Case...
                  </>
                )
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Documentation
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
