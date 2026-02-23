"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { CaseData, LCDValidationState, AppealCase, UploadedDoc, RiskItem } from "../types"
import type { CaseContext } from "@/components/chat/ChatInput"
import type { ChecklistEdit, ChecklistItemWithEdits } from "@/lib/lcd-validation"
import { extractPatientNameFromNotes, extractPayerFromNotes, isValidName, sanitizeDocumentOutput } from "../utils"

export function useCaseDetail() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // Core state
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [editedOutput, setEditedOutput] = useState("")
  const [copied, setCopied] = useState(false)
  const [isDocCollapsed, setIsDocCollapsed] = useState(false)
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [generationKey, setGenerationKey] = useState(0)

  // LCD Validation
  const [lcdValidation, setLcdValidation] = useState<LCDValidationState | null>(null)

  // Uploaded docs
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([])

  // Appeal state
  const [appealCases, setAppealCases] = useState<AppealCase[]>([])

  // Suggested forms count (for badge)
  const [suggestedFormsCount, setSuggestedFormsCount] = useState(0)

  // Checklist edit state
  const [checklistEdits, setChecklistEdits] = useState<Record<string, ChecklistEdit>>({})
  const [editingItem, setEditingItem] = useState<ChecklistItemWithEdits | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingChecklistEdit, setIsSavingChecklistEdit] = useState(false)

  // Tidbit carousel
  const [tidbitIndex, setTidbitIndex] = useState(0)

  const tidbits = useMemo(() => [
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
  ], [caseData?.payer_name])

  // Tidbit rotation effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (generating) {
      interval = setInterval(() => {
        setTidbitIndex((prev) => (prev + 1) % tidbits.length)
      }, 7000)
    }
    return () => clearInterval(interval)
  }, [generating, tidbits.length])

  // Load case on mount
  useEffect(() => {
    loadCase()
  }, [params.id])

  // Load appeal history when case data is available
  useEffect(() => {
    if (caseData?.id) {
      loadAppealHistory()
    }
  }, [caseData?.id])

  // Load uploaded docs when case data loads
  useEffect(() => {
    if (caseData) {
      loadUploadedDocs()
    }
  }, [caseData?.id])

  // Load suggested forms count for badge
  useEffect(() => {
    if (caseData?.id) {
      supabase
        .from("case_suggested_forms")
        .select("id", { count: "exact", head: true })
        .eq("case_id", caseData.id)
        .then(({ count }) => setSuggestedFormsCount(count ?? 0))
    }
  }, [caseData?.id, caseData?.generated_output])

  // Derived values
  const hasManuallyEdited = caseData?.metadata?.manually_edited === true
  const isInChatMode = caseData?.status === 'chat'
  const hasGenerated = Boolean(caseData?.generated_output || editedOutput)
  const needsGeneration = caseData && !caseData.generated_output && (caseData.status === 'draft' || caseData.status === 'generating')

  // Risk items
  const riskItems: RiskItem[] = useMemo(() => {
    if (!lcdValidation) return []
    const items: RiskItem[] = []
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
  }, [lcdValidation])

  // Case context for chat presets
  const caseContext: CaseContext | undefined = useMemo(() => {
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
  }, [lcdValidation, caseData])

  // Display name extraction
  const displayNames = useMemo(() => {
    let displayFirstName = caseData?.patient_first_name || ''
    let displayLastName = caseData?.patient_last_name || ''
    let displayPayer = caseData?.payer_name || ''
    let showExtractedNameLabel = false
    let showExtractedPayerLabel = false

    if (!hasManuallyEdited) {
      const nameFieldsEmpty = !caseData?.patient_first_name?.trim() || !caseData?.patient_last_name?.trim()
      const payerFieldEmpty = !caseData?.payer_name?.trim()

      if (nameFieldsEmpty) {
        const extractedName = extractPatientNameFromNotes(
          caseData?.disease_activity,
          caseData?.generated_output,
          editedOutput || undefined,
        )
        if (extractedName && isValidName(extractedName.first) && isValidName(extractedName.last)) {
          displayFirstName = extractedName.first
          displayLastName = extractedName.last
          showExtractedNameLabel = true
        }
      }

      if (payerFieldEmpty) {
        const extractedPayer = extractPayerFromNotes(
          caseData?.disease_activity,
          caseData?.generated_output,
          editedOutput || undefined,
        )
        if (extractedPayer) {
          displayPayer = extractedPayer
          showExtractedPayerLabel = true
        }
      }
    }

    return { displayFirstName, displayLastName, displayPayer, showExtractedNameLabel, showExtractedPayerLabel }
  }, [caseData, editedOutput, hasManuallyEdited])

  // --- Data Loading ---
  async function loadCase() {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error) throw error

      setCaseData(data)
      const rawOutput = data.edited_output || data.generated_output || ""
      setEditedOutput(sanitizeDocumentOutput(rawOutput, data.patient_age))

      if (data.metadata?.lcd_validation_full) {
        setLcdValidation(data.metadata.lcd_validation_full as LCDValidationState)
      }

      if (data.metadata?.checklist_edits?.edits) {
        setChecklistEdits(data.metadata.checklist_edits.edits as Record<string, ChecklistEdit>)
      }
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string }
      console.error("Error loading case:", err?.message || err?.code || JSON.stringify(error))
    } finally {
      setLoading(false)
    }
  }

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

  // Checklist item click handler
  const handleChecklistItemClick = (item: ChecklistItemWithEdits) => {
    setEditingItem(item)
    setIsEditModalOpen(true)
  }

  // Save checklist item edit
  async function handleSaveChecklistEdit(itemId: string, notes: string, markedAddressed: boolean) {
    if (!caseData) return

    setIsSavingChecklistEdit(true)
    try {
      const now = new Date().toISOString()

      const newEdit: ChecklistEdit = {
        item_id: itemId,
        user_notes: notes,
        marked_addressed: markedAddressed,
        updated_at: now,
        ...(markedAddressed && !checklistEdits[itemId]?.addressed_at
          ? { addressed_at: now }
          : { addressed_at: checklistEdits[itemId]?.addressed_at }),
      }

      const updatedEdits = {
        ...checklistEdits,
        [itemId]: newEdit,
      }
      setChecklistEdits(updatedEdits)

      const checklistEditsData = {
        version: 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        last_validation_run: (caseData.metadata?.lcd_validation as any)?.run_at || now,
        edits: updatedEdits,
      }

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

  return {
    // Router/params
    params,
    router,
    supabase,
    toast,

    // Core state
    caseData,
    setCaseData,
    loading,
    generating,
    setGenerating,
    editedOutput,
    setEditedOutput,
    copied,
    setCopied,
    isDocCollapsed,
    setIsDocCollapsed,
    isChatExpanded,
    setIsChatExpanded,
    generationKey,
    setGenerationKey,

    // LCD Validation
    lcdValidation,
    setLcdValidation,

    // Uploaded docs
    uploadedDocs,

    // Appeal
    appealCases,

    // Checklist
    checklistEdits,
    editingItem,
    isEditModalOpen,
    setIsEditModalOpen,
    isSavingChecklistEdit,
    handleChecklistItemClick,
    handleSaveChecklistEdit,

    // Tidbit
    tidbitIndex,
    tidbits,

    // Derived
    hasManuallyEdited,
    isInChatMode,
    hasGenerated,
    needsGeneration,
    riskItems,
    caseContext,
    displayNames,
    suggestedFormsCount,
    setSuggestedFormsCount,

    // Actions
    loadCase,
    loadUploadedDocs,
  }
}
