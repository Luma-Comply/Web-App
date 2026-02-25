"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { LCDValidationPanel } from "@/components/dashboard/LCDValidationPanel"
import { ChecklistItemEditModal } from "@/components/dashboard/ChecklistItemEditModal"
import { LumaLogo } from "@/components/LumaLogo"
import {
  Shield,
  ArrowLeft,
  Loader2,
  FileText,
  ImageIcon,
  X,
  AlertTriangle,
} from "lucide-react"
import type { ChecklistEdit, ChecklistItemWithEdits } from "@/lib/lcd-validation"
import type { ValidationResult } from "@/lib/validation/validation-types"

// --- Loading Steps Config ---
type AuditPhase = "preparing" | "researching" | "analyzing" | "assessing" | "finalizing" | "complete" | "error"

const auditSteps: { id: AuditPhase; label: string }[] = [
  { id: "preparing", label: "Preparing audit data" },
  { id: "researching", label: "Researching payer requirements" },
  { id: "analyzing", label: "Analyzing documentation compliance" },
  { id: "assessing", label: "Assessing audit risk" },
  { id: "finalizing", label: "Generating recommendations" },
]

// Timings: when each phase starts (ms from start)
const phaseTimings: Record<string, number> = {
  preparing: 0,
  researching: 1500,
  analyzing: 8000,
  assessing: 18000,
  finalizing: 25000,
}

const auditTidbits = [
  "65% of prior authorization denials are due to incomplete documentation.",
  "Medical record audits check for 15+ distinct documentation elements.",
  "Claims with complete physician orders have 40% fewer audit findings.",
  "JW/JZ modifier compliance is a top CMS audit focus area for 2025-2026.",
  "Copy-paste documentation is flagged in 1 out of 4 medical record audits.",
  "Timely lab results within 90 days significantly reduce audit risk.",
  "Our AI reviews 1000+ payer policies to find compliance gaps before auditors do.",
]

function AnimatedCheck({ isComplete }: { isComplete: boolean }) {
  return (
    <div className="w-6 h-6 relative">
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={{ backgroundColor: "rgb(229 231 235)" }}
        animate={{ backgroundColor: isComplete ? "rgb(22 82 197)" : "rgb(229 231 235)" }}
        transition={{ duration: 0.3 }}
      />
      <svg viewBox="0 0 24 24" fill="none" className="absolute inset-0 w-6 h-6">
        <motion.path
          d="M6 12.5L10 16.5L18 8.5"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isComplete ? 1 : 0 }}
          transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
    </div>
  )
}

function PulsingDot() {
  return (
    <div className="w-6 h-6 flex items-center justify-center">
      <motion.div
        className="w-3 h-3 rounded-full bg-[#1652C5]"
        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  )
}

function EmptyCircle() {
  return <div className="w-6 h-6 rounded-full border-2 border-gray-200" />
}

// Mapped shape for LCDValidationPanel
interface PanelValidation {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checklist: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recommendations: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  perplexityFindings: any
}

interface CaseOption {
  id: string
  patient_first_name: string
  patient_last_name: string
  requested_medication: string
  payer_name: string
  doc_type: string
  created_at: string
}

interface AuditMeta {
  patientFirstName: string
  patientLastName: string
  medication: string
  payerName: string
  payerType: string
  patientAge: number | null
  patientState: string
}


export default function AuditPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Input state
  const [inputMode, setInputMode] = useState<"case" | "manual">("case")
  const [selectedCaseId, setSelectedCaseId] = useState("")
  const [cases, setCases] = useState<CaseOption[]>([])
  const [casesLoaded, setCasesLoaded] = useState(false)

  // Manual entry fields
  const [patientFirstName, setPatientFirstName] = useState("")
  const [patientLastName, setPatientLastName] = useState("")
  const [patientAge, setPatientAge] = useState("")
  const [selectedIcd10Codes, setSelectedIcd10Codes] = useState<Array<{ code: string; description: string }>>([])
  const [icd10Query, setIcd10Query] = useState("")
  const [icd10Results, setIcd10Results] = useState<Array<{ code: string; description: string }>>([])
  const [icd10Loading, setIcd10Loading] = useState(false)
  const [icd10Open, setIcd10Open] = useState(false)
  const [icd10ActiveIndex, setIcd10ActiveIndex] = useState(0)
  const icd10ContainerRef = useRef<HTMLDivElement>(null)
  const icd10TimerRef = useRef<NodeJS.Timeout | null>(null)
  const [medication, setMedication] = useState("")
  const [medicationDose, setMedicationDose] = useState("")
  const [payerType, setPayerType] = useState("commercial")
  const [patientState, setPatientState] = useState("")
  const [clinicalNotes, setClinicalNotes] = useState("")

  // Document upload
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [extractedTexts, setExtractedTexts] = useState<string[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Audit state
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [auditId, setAuditId] = useState<string | null>(null)
  const [results, setResults] = useState<PanelValidation | null>(null)
  const [auditMeta, setAuditMeta] = useState<AuditMeta | null>(null)
  const [loadingAudit, setLoadingAudit] = useState(false)

  // Loading steps state
  const [auditPhase, setAuditPhase] = useState<AuditPhase>("preparing")
  const [completedPhases, setCompletedPhases] = useState<AuditPhase[]>([])
  const [elapsedTime, setElapsedTime] = useState(0)
  const [tidbitIndex, setTidbitIndex] = useState(0)
  const auditStartRef = useRef<number>(0)

  // Checklist editing state
  const [checklistEdits, setChecklistEdits] = useState<Record<string, ChecklistEdit>>({})
  const [selectedItem, setSelectedItem] = useState<ChecklistItemWithEdits | null>(null)

  // AI suggestion state
  const [aiSuggestionCache, setAiSuggestionCache] = useState<Record<string, string>>({})
  const [loadingAiSuggestion, setLoadingAiSuggestion] = useState<string | null>(null)

  // Load user's cases on first switch to case tab
  const loadCases = useCallback(async () => {
    if (casesLoaded) return
    const { data } = await supabase
      .from("cases")
      .select("id, patient_first_name, patient_last_name, requested_medication, payer_name, doc_type, created_at")
      .order("created_at", { ascending: false })
      .limit(50)

    if (data) {
      setCases(data as CaseOption[])
    }
    setCasesLoaded(true)
  }, [casesLoaded, supabase])

  // Load cases on mount since "case" tab is the default
  useEffect(() => {
    loadCases()
  }, [loadCases])

  // Load audit from ?id= query param (deep-link from dashboard)
  useEffect(() => {
    const id = searchParams.get("id")
    if (!id || results || loadingAudit) return

    setLoadingAudit(true)
    fetch(`/api/audit/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Audit not found")
        return res.json()
      })
      .then((audit) => {
        setAuditId(audit.id)
        if (audit.audit_results) {
          setResults(mapToPanel(audit.audit_results))
        }
        setAuditMeta({
          patientFirstName: audit.patient_first_name || "",
          patientLastName: audit.patient_last_name || "",
          medication: audit.requested_medication || "",
          payerName: audit.payer_name || "",
          payerType: audit.payer_type || "",
          patientAge: audit.patient_age || null,
          patientState: audit.patient_state || "",
        })
        if (audit.checklist_edits?.edits) {
          setChecklistEdits(audit.checklist_edits.edits)
        }
      })
      .catch(() => {
        // Audit not found — just show the form
      })
      .finally(() => setLoadingAudit(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Debounced ICD-10 search against NLM API
  useEffect(() => {
    if (icd10Query.length < 2) {
      setIcd10Results([])
      setIcd10Open(false)
      return
    }
    if (icd10TimerRef.current) clearTimeout(icd10TimerRef.current)
    icd10TimerRef.current = setTimeout(async () => {
      setIcd10Loading(true)
      try {
        const res = await fetch(
          `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(icd10Query)}&maxList=15`
        )
        const data = await res.json()
        const pairs: Array<{ code: string; description: string }> = (data[3] || []).map(
          (pair: [string, string]) => ({ code: pair[0], description: pair[1] })
        )
        setIcd10Results(pairs)
        setIcd10Open(pairs.length > 0)
        setIcd10ActiveIndex(0)
      } catch {
        setIcd10Results([])
      } finally {
        setIcd10Loading(false)
      }
    }, 300)
    return () => { if (icd10TimerRef.current) clearTimeout(icd10TimerRef.current) }
  }, [icd10Query])

  // Close ICD-10 dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (icd10ContainerRef.current && !icd10ContainerRef.current.contains(event.target as Node)) {
        setIcd10Open(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Phase advancement timer — runs while audit is in progress
  useEffect(() => {
    if (!isRunning) return

    auditStartRef.current = Date.now()
    setAuditPhase("preparing")
    setCompletedPhases([])
    setElapsedTime(0)

    const interval = setInterval(() => {
      const elapsed = Date.now() - auditStartRef.current
      setElapsedTime(Math.floor(elapsed / 1000))

      // Advance phases based on elapsed time
      const phases = auditSteps.map((s) => s.id) as AuditPhase[]
      const newCompleted: AuditPhase[] = []
      let currentPhase: AuditPhase = "preparing"

      for (let i = 0; i < phases.length; i++) {
        const nextPhase = phases[i + 1]
        if (nextPhase && phaseTimings[nextPhase] && elapsed >= phaseTimings[nextPhase]) {
          newCompleted.push(phases[i])
          currentPhase = nextPhase
        } else if (!nextPhase || !phaseTimings[nextPhase] || elapsed < phaseTimings[nextPhase]) {
          currentPhase = phases[i]
          break
        }
      }

      setCompletedPhases(newCompleted)
      setAuditPhase(currentPhase)
    }, 500)

    return () => clearInterval(interval)
  }, [isRunning])

  // Rotate tidbits while loading
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setTidbitIndex((prev) => (prev + 1) % auditTidbits.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [isRunning])

  // AI suggestion fetch for checklist items
  const fetchAiSuggestion = useCallback(async (item: ChecklistItemWithEdits, force = false) => {
    if (!auditId) return
    if (!force && aiSuggestionCache[item.id]) return

    setLoadingAiSuggestion(item.id)
    try {
      const response = await fetch("/api/audit/checklist-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId,
          itemLabel: item.label,
          itemSuggestion: item.suggestion,
          itemGuidance: item.guidance,
          itemStatus: item.status,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.suggestion) {
          setAiSuggestionCache((prev) => ({ ...prev, [item.id]: data.suggestion }))
        }
      }
    } catch {
      // Silent fail — modal will show short suggestion as fallback
    } finally {
      setLoadingAiSuggestion(null)
    }
  }, [auditId, aiSuggestionCache])

  const addIcd10Code = (code: string, description: string) => {
    if (selectedIcd10Codes.some(c => c.code === code)) return
    setSelectedIcd10Codes(prev => [...prev, { code, description }])
    setIcd10Query("")
    setIcd10Open(false)
  }

  const removeIcd10Code = (code: string) => {
    setSelectedIcd10Codes(prev => prev.filter(c => c.code !== code))
  }

  // Handle file upload and text extraction
  const ACCEPTED_EXTENSIONS = ["pdf", "docx", "txt", "png", "jpg", "jpeg", "heic", "webp"]
  const MAX_UPLOAD_SIZE = 25 * 1024 * 1024 // 25MB

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase()
      return ACCEPTED_EXTENSIONS.includes(ext || "") && f.size <= MAX_UPLOAD_SIZE
    })

    if (validFiles.length === 0) {
      setError("Please upload PDF, DOCX, TXT, or image files (PNG, JPG, HEIC, WEBP) — max 25MB each")
      return
    }

    setUploadingFile(true)
    setError(null)

    for (const file of validFiles) {
      try {
        if (file.name.endsWith(".txt")) {
          // Read text files directly
          const text = await file.text()
          setExtractedTexts((prev) => [...prev, text])
          setUploadedFiles((prev) => [...prev, file])
        } else {
          // Use process-document endpoint for PDF/DOCX/images
          const formData = new FormData()
          formData.append("file", file)

          const response = await fetch("/api/process-document", {
            method: "POST",
            body: formData,
          })

          if (response.ok) {
            const data = await response.json()
            // Endpoint returns "text" field
            if (data.text) {
              setExtractedTexts((prev) => [...prev, data.text])
              setUploadedFiles((prev) => [...prev, file])
            } else {
              setError(`No text could be extracted from ${file.name}`)
            }
          } else {
            setError(`Failed to process ${file.name}`)
          }
        }
      } catch {
        setError(`Error processing ${file.name}`)
      }
    }

    setUploadingFile(false)
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
    setExtractedTexts((prev) => prev.filter((_, i) => i !== index))
  }

  // Map ValidationResult to panel-compatible shape
  const mapToPanel = (result: ValidationResult): PanelValidation => ({
    riskLevel: result.auditRisk.overallScore,
    denialProbability: result.auditRisk.estimatedDenialProbability,
    foundCount: result.summary.foundCount,
    missingCount: result.summary.missingCount,
    totalRequirements: result.summary.totalRequirements,
    ctpCovered: false,
    instantDenialTriggers: result.auditRisk.instantDenialTriggers,
    veryHighRiskItems: result.auditRisk.veryHighRiskItems,
    highRiskItems: result.auditRisk.highRiskItems,
    checklist: result.checklist,
    recommendations: result.recommendations,
    perplexityFindings: {
      lcdEffectiveDate: "",
      productCoverageStatus: "VERIFY_MANUALLY" as const,
      applicationLimit: 0,
      kxModifierRequired: false,
      recentLcdChanges: [],
      currentAuditFocusAreas: result.researchFindings.auditFocusAreas,
      oigWorkPlanItems: [],
      rawResearch: result.researchFindings.rawResearch,
      // Also include generic fields for the panel's fallback handling
      auditFocusAreas: result.researchFindings.auditFocusAreas,
      recentChanges: result.researchFindings.recentChanges,
    },
  })

  // Run the audit
  const runAudit = async () => {
    setIsRunning(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {}

      if (inputMode === "case" && selectedCaseId) {
        body.caseId = selectedCaseId
      } else if (inputMode === "manual") {
        body.manualInput = {
          patientFirstName,
          patientLastName,
          patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
          diagnosisCodes: selectedIcd10Codes.map(c => c.code),
          requestedMedication: medication,
          medicationDose,
          payerType,
          patientState,
          docType: "audit",
          clinicalNotes,
        }
      } else {
        setError("Please select a case or enter data manually")
        setIsRunning(false)
        return
      }

      if (extractedTexts.length > 0) {
        body.documentTexts = extractedTexts
      }

      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Audit failed")
      }

      const data = await response.json()

      // Mark all phases complete before showing results
      setCompletedPhases(auditSteps.map((s) => s.id) as AuditPhase[])
      setAuditPhase("complete")

      // Brief delay so user sees the final checkmarks
      await new Promise((r) => setTimeout(r, 800))

      setAuditId(data.auditId)
      setResults(mapToPanel(data.results))

      // Capture audit metadata for the results header
      if (inputMode === "case" && selectedCaseId) {
        const selectedCase = cases.find((c) => c.id === selectedCaseId)
        if (selectedCase) {
          setAuditMeta({
            patientFirstName: selectedCase.patient_first_name || "",
            patientLastName: selectedCase.patient_last_name || "",
            medication: selectedCase.requested_medication || "",
            payerName: selectedCase.payer_name || "",
            payerType: "",
            patientAge: null,
            patientState: "",
          })
        }
      } else if (inputMode === "manual") {
        setAuditMeta({
          patientFirstName,
          patientLastName,
          medication,
          payerName: "",
          payerType,
          patientAge: patientAge ? parseInt(patientAge, 10) : null,
          patientState,
        })
      }
    } catch (err) {
      setAuditPhase("error")
      setError(err instanceof Error ? err.message : "Unexpected error")
    } finally {
      setIsRunning(false)
    }
  }

  // Save checklist edit
  const saveChecklistEdit = async (
    itemId: string,
    notes: string,
    addressed: boolean
  ) => {
    const edit: ChecklistEdit = {
      item_id: itemId,
      user_notes: notes,
      marked_addressed: addressed,
      addressed_at: addressed ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    }

    const newEdits = { ...checklistEdits, [itemId]: edit }
    setChecklistEdits(newEdits)
    setSelectedItem(null)

    // Persist to server if audit was saved
    if (auditId) {
      await fetch(`/api/audit/${auditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist_edits: { version: 1, edits: newEdits },
        }),
      }).catch(() => {})
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  // Can we run the audit?
  const canRun =
    !isRunning &&
    ((inputMode === "case" && selectedCaseId) ||
      (inputMode === "manual" && (clinicalNotes.trim().length >= 50 || extractedTexts.length > 0)))

  // Show loading state when fetching audit from URL
  if (loadingAudit) {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading audit...</p>
        </div>
      </div>
    )
  }

  // If we have results, show them
  if (results) {
    const complianceRate = results.totalRequirements
      ? Math.round((results.foundCount / results.totalRequirements) * 100)
      : 0
    const barColor =
      complianceRate >= 80
        ? "bg-green-500"
        : complianceRate >= 60
          ? "bg-amber-500"
          : "bg-coral"
    const scoreColor =
      complianceRate >= 80
        ? "text-green-600"
        : complianceRate >= 60
          ? "text-amber-600"
          : "text-coral"

    const patientName = auditMeta
      ? `${auditMeta.patientFirstName} ${auditMeta.patientLastName}`.trim()
      : ""

    return (
      <div className="min-h-screen bg-light-gray">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {patientName || "Pre-Audit Review Results"}
                </h1>
                <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                  {auditMeta?.medication && (
                    <>
                      <span>{auditMeta.medication}</span>
                      <span className="text-gray-300">·</span>
                    </>
                  )}
                  {auditMeta?.payerName && (
                    <>
                      <span>{auditMeta.payerName}</span>
                      <span className="text-gray-300">·</span>
                    </>
                  )}
                  <span>{results.foundCount} of {results.totalRequirements} requirements met</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResults(null)
                setAuditId(null)
                setAuditMeta(null)
                setChecklistEdits({})
                // Clear the URL param
                window.history.replaceState(null, "", "/audit")
              }}
            >
              New Audit
            </Button>
          </div>

          {/* Score Card */}
          <div className="relative rounded-xl border border-gray-200 bg-white p-6 overflow-hidden mb-6">
            <span className="inline-block text-[0.6rem] font-semibold uppercase tracking-wider text-[#1652C5] bg-[#1652C5]/10 rounded-full px-2.5 py-1 mb-4">
              Audit Assessment
            </span>
            <div className="flex items-baseline gap-2 mb-3">
              <span className={`text-[2.2rem] font-bold leading-none ${scoreColor}`}>
                {complianceRate}%
              </span>
              <span className="text-[0.78rem] text-dark-bg/50">
                Readiness
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-300/40 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${complianceRate}%` }}
              />
            </div>
            <p className="text-[0.65rem] text-gray-500">
              AI-verified documentation coverage against payer requirements. Does not guarantee payer approval.
            </p>
          </div>

          {/* Validation Panel */}
          <LCDValidationPanel
            validation={results}
            isCollapsed={false}
            checklistEdits={checklistEdits}
            onItemClick={setSelectedItem}
            docType="audit"
            isEditable={true}
          />

          {/* Checklist Edit Modal */}
          <ChecklistItemEditModal
            item={selectedItem}
            open={!!selectedItem}
            onOpenChange={(open) => {
              if (!open) setSelectedItem(null)
            }}
            onSave={async (itemId, notes, markedAddressed) => {
              await saveChecklistEdit(itemId, notes, markedAddressed)
            }}
            aiSuggestion={selectedItem ? aiSuggestionCache[selectedItem.id] || null : null}
            isLoadingAiSuggestion={!!selectedItem && loadingAiSuggestion === selectedItem.id}
            onRequestAiSuggestion={(item) => fetchAiSuggestion(item)}
            onRegenerateAiSuggestion={(item) => fetchAiSuggestion(item, true)}
          />
        </div>
      </div>
    )
  }

  // Loading view — shown while audit is running
  if (isRunning) {
    const completedCount = completedPhases.length
    const totalSteps = auditSteps.length

    return (
      <div className="min-h-screen bg-light-gray flex items-start justify-center pt-20">
        <div className="text-center px-4 max-w-md mx-auto">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <LumaLogo className="w-16 h-16" variant="loading" />
          </div>

          <h3 className="text-xl font-semibold text-dark-bg mb-1">
            Running Pre-Audit Review
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            Checking your documentation against payer requirements
          </p>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-left">
            <div className="space-y-4">
              {auditSteps.map((step, index) => {
                const isComplete = completedPhases.includes(step.id)
                const isCurrent = auditPhase === step.id && !isComplete

                return (
                  <motion.div
                    key={step.id}
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {isComplete ? (
                      <AnimatedCheck isComplete={true} />
                    ) : isCurrent ? (
                      <PulsingDot />
                    ) : (
                      <EmptyCircle />
                    )}

                    <motion.span
                      className={`text-sm flex-1 transition-colors duration-300 ${
                        isComplete
                          ? "text-dark-bg font-medium"
                          : isCurrent
                            ? "text-dark-bg"
                            : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </motion.span>

                    {isComplete && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-xs text-[#1652C5] font-medium"
                      >
                        Done
                      </motion.span>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {error ? (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-sm text-coral mb-3">{error}</p>
                <button
                  onClick={() => {
                    setError(null)
                    setIsRunning(false)
                  }}
                  className="w-full py-2.5 px-4 bg-[#1652C5] text-white text-sm font-medium rounded-lg hover:bg-[#1241a0] transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#1652C5] rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(completedCount / totalSteps) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-400">
                    {completedCount} of {totalSteps} steps complete
                  </p>
                  <p className="text-xs text-gray-400">
                    {elapsedTime}s elapsed
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tidbits */}
          <div className="mt-8 h-16 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={tidbitIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-gray-500 italic max-w-sm"
              >
                &quot;{auditTidbits[tidbitIndex]}&quot;
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }

  // Input form view
  return (
    <div className="min-h-screen bg-light-gray">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Pre-Audit Documentation Review
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Check your clinical documentation for compliance gaps before payer review
            </p>
          </div>
        </div>

        {/* Input Tabs */}
        <Tabs
          value={inputMode}
          onValueChange={(v) => {
            setInputMode(v as "case" | "manual")
            if (v === "case") loadCases()
          }}
          className="mb-6"
        >
          <TabsList className="w-full bg-white/50 border border-sage-medium/30">
            <TabsTrigger value="case" className="flex-1 data-[state=active]:bg-white">
              From Existing Case
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1 data-[state=active]:bg-white">
              Manual Entry
            </TabsTrigger>
          </TabsList>

          {/* From Existing Case */}
          <TabsContent value="case">
            <Card>
              <CardContent className="pt-6">
                <label
                  htmlFor="case-select"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Select a case to audit
                </label>
                <select
                  id="case-select"
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                >
                  <option value="">Select a case...</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.patient_first_name} {c.patient_last_name} — {c.requested_medication || "No medication"} ({c.payer_name || "No payer"})
                    </option>
                  ))}
                </select>
                {cases.length === 0 && casesLoaded && (
                  <p className="text-xs text-muted-foreground mt-2">
                    No cases found. Create a case first or use manual entry.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Entry */}
          <TabsContent value="manual">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label htmlFor="patient-first-name" className="block text-sm font-medium text-foreground mb-1">
                      First Name
                    </label>
                    <Input
                      id="patient-first-name"
                      value={patientFirstName}
                      onChange={(e) => setPatientFirstName(e.target.value)}
                      placeholder="Jane"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label htmlFor="patient-last-name" className="block text-sm font-medium text-foreground mb-1">
                      Last Name
                    </label>
                    <Input
                      id="patient-last-name"
                      value={patientLastName}
                      onChange={(e) => setPatientLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                  <div className="col-span-1">
                    <label htmlFor="patient-age" className="block text-sm font-medium text-foreground mb-1">
                      Age
                    </label>
                    <Input
                      id="patient-age"
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="45"
                      min={0}
                      max={150}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="medication" className="block text-sm font-medium text-foreground mb-1">
                      Requested Medication
                    </label>
                    <Input
                      id="medication"
                      value={medication}
                      onChange={(e) => setMedication(e.target.value)}
                      placeholder="e.g. Humira, Stelara"
                    />
                  </div>
                  <div>
                    <label htmlFor="medication-dose" className="block text-sm font-medium text-foreground mb-1">
                      Dose
                    </label>
                    <Input
                      id="medication-dose"
                      value={medicationDose}
                      onChange={(e) => setMedicationDose(e.target.value)}
                      placeholder="e.g. 40mg every 2 weeks"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="payer-type" className="block text-sm font-medium text-foreground mb-1">
                      Payer Type
                    </label>
                    <select
                      id="payer-type"
                      value={payerType}
                      onChange={(e) => setPayerType(e.target.value)}
                      className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                    >
                      <option value="commercial">Commercial</option>
                      <option value="medicare">Medicare</option>
                      <option value="medicaid">Medicaid</option>
                      <option value="medicare_advantage">Medicare Advantage</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="patient-state-manual" className="block text-sm font-medium text-foreground mb-1">
                      State
                    </label>
                    <Input
                      id="patient-state-manual"
                      value={patientState}
                      onChange={(e) => setPatientState(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="CA"
                      maxLength={2}
                    />
                  </div>
                </div>

                {/* ICD-10 Search */}
                <div ref={icd10ContainerRef}>
                  <label htmlFor="icd10-search" className="block text-sm font-medium text-foreground mb-1">
                    Diagnosis Codes (ICD-10)
                  </label>

                  {/* Selected code badges */}
                  {selectedIcd10Codes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedIcd10Codes.map((item) => (
                        <span
                          key={item.code}
                          className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-accent/8 border border-accent/20 text-sm"
                        >
                          <span className="font-mono font-semibold text-accent text-xs">{item.code}</span>
                          <span className="text-foreground/60 text-xs truncate max-w-[200px]">— {item.description}</span>
                          <button
                            type="button"
                            onClick={() => removeIcd10Code(item.code)}
                            className="ml-0.5 p-1 rounded-full text-foreground/30 hover:bg-destructive/10 hover:text-destructive transition-colors"
                            aria-label={`Remove ${item.code}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search input */}
                  <div className="relative">
                    <input
                      id="icd10-search"
                      type="text"
                      value={icd10Query}
                      onChange={(e) => { setIcd10Query(e.target.value); setIcd10ActiveIndex(0) }}
                      onKeyDown={(e) => {
                        if (!icd10Open || icd10Results.length === 0) return
                        if (e.key === "ArrowDown") { e.preventDefault(); setIcd10ActiveIndex(prev => Math.min(prev + 1, icd10Results.length - 1)) }
                        else if (e.key === "ArrowUp") { e.preventDefault(); setIcd10ActiveIndex(prev => Math.max(prev - 1, 0)) }
                        else if (e.key === "Enter") { e.preventDefault(); const s = icd10Results[icd10ActiveIndex]; if (s) addIcd10Code(s.code, s.description) }
                        else if (e.key === "Escape") { setIcd10Open(false) }
                      }}
                      placeholder={selectedIcd10Codes.length > 0 ? "Add another code..." : "Search by code or description (e.g. L97.419)"}
                      className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={icd10Open}
                      aria-autocomplete="list"
                      aria-controls="audit-icd10-listbox"
                    />
                    {icd10Loading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}

                    {/* Dropdown results */}
                    {icd10Open && icd10Results.length > 0 && (
                      <ul
                        id="audit-icd10-listbox"
                        role="listbox"
                        className="absolute z-[100] w-full mt-1 bg-card border border-border rounded-lg shadow-elevation-md max-h-60 overflow-auto"
                      >
                        {icd10Results.map((result, idx) => {
                          const isAlreadySelected = selectedIcd10Codes.some(c => c.code === result.code)
                          return (
                            <li
                              key={result.code}
                              id={`audit-icd10-option-${idx}`}
                              role="option"
                              aria-selected={idx === icd10ActiveIndex}
                              aria-disabled={isAlreadySelected}
                              className={`px-4 py-2.5 text-sm border-b border-border/50 last:border-0 transition-colors ${
                                isAlreadySelected
                                  ? "opacity-40 cursor-default"
                                  : idx === icd10ActiveIndex
                                    ? "bg-accent/10 cursor-pointer"
                                    : "hover:bg-secondary cursor-pointer"
                              }`}
                              onMouseEnter={() => setIcd10ActiveIndex(idx)}
                              onClick={() => { if (!isAlreadySelected) addIcd10Code(result.code, result.description) }}
                            >
                              <span className="font-mono font-medium text-foreground">{result.code}</span>
                              <span className="text-muted-foreground ml-2">—</span>
                              <span className="text-foreground/80 ml-2">{result.description}</span>
                              {isAlreadySelected && <span className="ml-2 text-accent text-xs font-medium">(added)</span>}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="clinical-notes" className="block text-sm font-medium text-foreground mb-1">
                    Clinical Notes / Documentation
                  </label>
                  <textarea
                    id="clinical-notes"
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Paste clinical notes, chart documentation, or the generated PA letter here..."
                    rows={8}
                    className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none resize-y"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum 50 characters required
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Document Upload Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-foreground mb-3">
              Upload Supporting Documents
              <span className="text-xs text-muted-foreground font-normal ml-2">(optional)</span>
            </h3>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                isDragging
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-input"
              }`}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload documents"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.heic,.webp"
                onChange={(e) => {
                  if (e.target.files) handleFileUpload(e.target.files)
                  e.target.value = ""
                }}
                className="hidden"
                aria-hidden="true"
              />
              {uploadingFile ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Processing document...</span>
                </div>
              ) : (
                <>
                  <FileText className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drop files or screenshots here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">PDF, DOCX, TXT, PNG, JPG, HEIC, WEBP · Max 25MB per file</p>
                </>
              )}
            </div>

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {["png","jpg","jpeg","heic","webp"].includes(file.name.split(".").pop()?.toLowerCase() || "")
                        ? <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        : <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      }
                      <span className="text-sm text-foreground truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-6" role="alert">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Run Audit Button */}
        <Button
          onClick={runAudit}
          disabled={!canRun}
          className="w-full py-6 text-base font-semibold"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Running Pre-Audit Review...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 mr-2" />
              Run Pre-Audit Review
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-3">
          Reviews documentation against payer requirements, checks for missing elements, and assesses audit risk.
        </p>
      </div>
    </div>
  )
}
