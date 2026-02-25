"use client"

import { Suspense, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LayoutGrid, FileText, Search, Clock, Pencil, MessageSquare, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import { LumaLogo } from "@/components/LumaLogo"
import { ChecklistItemEditModal } from "@/components/dashboard/ChecklistItemEditModal"
import { ChatInterface, ChatInterfaceRef } from "@/components/chat/ChatInterface"
import { ChatOverlay } from "@/components/chat/ChatOverlay"
import { GeneratingSteps } from "@/components/GeneratingSteps"
import { sanitizeDocumentOutput } from "./utils"

// Local hooks
import { useCaseDetail } from "./hooks/useCaseDetail"
import { useStatusActions } from "./hooks/useStatusActions"
import { useP2PRehearsal } from "./hooks/useP2PRehearsal"
import { useDocumentActions } from "./hooks/useDocumentActions"
import { useStickyHeader } from "./hooks/useStickyHeader"

// Local components
import { PatientHeaderStrip } from "./components/PatientHeaderStrip"
// import { WorkflowProgressBar } from "./components/WorkflowProgressBar"
import { SidePanel } from "./components/SidePanel"
import { OverviewTab } from "./components/OverviewTab"
import { DocumentsTab } from "./components/DocumentsTab"
import { ClinicalReviewTab } from "./components/ClinicalReviewTab"
import { ActivityTab } from "./components/ActivityTab"
import { CaseDialogs } from "./components/CaseDialogs"
import { P2PRehearsalOverlay } from "./components/P2PRehearsalOverlay"

function CaseDetailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const chatRef = useRef<ChatInterfaceRef>(null)

  const activeTab = searchParams.get("tab") || "overview"
  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // Core state hook
  const detail = useCaseDetail()
  const { isCompact } = useStickyHeader()

  // Status actions hook
  const statusActions = useStatusActions({
    caseData: detail.caseData,
    setCaseData: detail.setCaseData,
  })

  // P2P rehearsal hook
  const p2p = useP2PRehearsal({
    caseData: detail.caseData,
  })

  // Document actions hook
  const docActions = useDocumentActions({
    caseData: detail.caseData,
    setCaseData: detail.setCaseData,
    editedOutput: detail.editedOutput,
    displayPayer: detail.displayNames.displayPayer,
  })

  // --- Loading / Not Found guards ---
  if (detail.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light-gray">
        <div className="text-center">
          <LumaLogo className="w-16 h-16 mx-auto mb-4" />
          <p className="text-gray-600">Loading case details...</p>
        </div>
      </div>
    )
  }

  if (!detail.caseData) {
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

  const caseData = detail.caseData

  // Show full-screen generating UI
  if (detail.generating || (detail.needsGeneration && !detail.hasGenerated)) {
    return (
      <GeneratingSteps
        key={detail.generationKey}
        caseId={caseData.id}
        docType={caseData.doc_type}
        onComplete={(result) => {
          detail.setCaseData({
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
          detail.setEditedOutput(sanitizeDocumentOutput(result.documentation, caseData.patient_age))
          if (result.validation) {
            detail.setLcdValidation(result.validation)
          }
          detail.setGenerating(false)
        }}
        onError={(error) => {
          detail.toast({
            variant: "destructive",
            title: "Generation Failed",
            description: error || "Failed to generate documentation. Please try again.",
          })
          detail.setGenerating(false)
        }}
        onRetry={() => {
          detail.setGenerating(true)
          detail.setGenerationKey(k => k + 1)
        }}
      />
    )
  }

  // Regenerate handler for the dialog
  const handleRegenerate = async () => {
    docActions.setRegenerateModalOpen(false)
    const supabase = createClient()
    await supabase
      .from("cases")
      .update({ generated_output: null, status: "generating" })
      .eq("id", caseData.id)
    detail.setCaseData({ ...caseData, generated_output: null, status: "generating" })
    detail.setEditedOutput("")
    detail.setGenerationKey(k => k + 1)
    detail.setGenerating(true)
  }

  return (
    <div className="min-h-screen bg-light-gray">
      {/* Patient Header Strip */}
      <PatientHeaderStrip
        caseData={caseData}
        isCompact={isCompact}
        displayFirstName={detail.displayNames.displayFirstName}
        displayLastName={detail.displayNames.displayLastName}
        displayPayer={detail.displayNames.displayPayer}
        showExtractedNameLabel={detail.displayNames.showExtractedNameLabel}
        hasGenerated={detail.hasGenerated}
        isInChatMode={detail.isInChatMode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onEdit={docActions.openEditModal}
        onChat={() => detail.setIsChatExpanded(true)}
        onRegenerate={() => docActions.setRegenerateModalOpen(true)}
        onGenerate={() => detail.setGenerating(true)}
        generating={detail.generating}
      />

      {/* Workflow Progress Bar — removed per beta feedback (users confused by Draft/Submitted/Decision language) */}

      {/* Main Content — centered like audit page */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab Navigation Bar + Actions */}
        <div
          className="hidden md:flex items-center border-b border-gray-300 mb-6 overflow-x-auto scrollbar-hide"
          role="tablist"
          aria-label="Case sections"
        >
          <div className="flex items-center gap-0.5">
            {([
              { value: "overview", label: "Overview", icon: LayoutGrid, showBadge: false },
              { value: "documents", label: "Documents", icon: FileText, showBadge: true },
              { value: "clinical", label: "Clinical Review", icon: Search, showBadge: false },
              { value: "activity", label: "Activity", icon: Clock, showBadge: false },
            ]).map((tab) => {
              const isActive = activeTab === tab.value
              const Icon = tab.icon
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  role="tab"
                  aria-selected={isActive}
                  className={`relative overflow-visible flex items-center gap-1.5 px-4 py-3 text-[0.78rem] border-none bg-transparent cursor-pointer whitespace-nowrap transition-colors duration-200 ${
                    isActive ? "text-dark-bg font-semibold" : "text-gray-500 font-medium hover:text-dark-bg"
                  }`}
                >
                  <Icon className="w-[15px] h-[15px]" />
                  {tab.label}
                  {tab.showBadge && detail.hasGenerated && (detail.suggestedFormsCount + 1) > 0 && (
                    <span className="text-[0.6rem] font-semibold px-1.5 py-px rounded-full bg-red-600 text-white leading-[1.4]">
                      {detail.suggestedFormsCount + 1}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute -bottom-px left-0 right-0 h-[2px] bg-[#1652C5] rounded-t-sm z-10"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Actions — right-aligned */}
          <div className="ml-auto flex items-center gap-1 pl-4">
            <button
              onClick={docActions.openEditModal}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium text-gray-500 hover:text-dark-bg hover:bg-gray-100 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => detail.setIsChatExpanded(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium text-gray-500 hover:text-dark-bg hover:bg-gray-100 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
            {!detail.isInChatMode && (
              <button
                onClick={() => {
                  if (detail.hasGenerated) {
                    docActions.setRegenerateModalOpen(true)
                  } else {
                    detail.setGenerating(true)
                  }
                }}
                disabled={detail.generating}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${detail.generating ? "animate-spin" : ""}`} />
                {detail.hasGenerated ? "Regenerate" : "Generate"}
              </button>
            )}
          </div>
        </div>

        {/* Tab Content Panels */}
        {activeTab === "overview" && (
          <OverviewTab
            caseData={caseData}
            lcdValidation={detail.lcdValidation}
            checklistEdits={detail.checklistEdits}
            onChecklistItemClick={detail.handleChecklistItemClick}
            recommendationEdits={detail.recommendationEdits}
            onRecommendationClick={detail.handleRecommendationClick}
          />
        )}

        {activeTab === "documents" && (
          <DocumentsTab
            caseData={caseData}
            editedOutput={detail.editedOutput}
            setEditedOutput={detail.setEditedOutput}
            hasGenerated={detail.hasGenerated}
            isDocCollapsed={detail.isDocCollapsed}
            setIsDocCollapsed={detail.setIsDocCollapsed}
            copied={docActions.copied}
            onCopy={docActions.copyToClipboard}
            onDownloadWord={docActions.downloadAsWord}
            onDownloadPdf={docActions.generatePdf}
            isInChatMode={detail.isInChatMode}
            onFormsCountChange={(count) => detail.setSuggestedFormsCount(count)}
          />
        )}

        {activeTab === "clinical" && (
          <ClinicalReviewTab
            caseData={caseData}
            lcdValidation={detail.lcdValidation}
            uploadedDocs={detail.uploadedDocs}
          />
        )}

        {activeTab === "activity" && (
          <ActivityTab
            caseData={caseData}
            appealCases={detail.appealCases}
          />
        )}

        {/* Contextual info — only shows for denied cases or cases with appeals */}
        <SidePanel
          caseData={caseData}
          appealCases={detail.appealCases}
        />
      </div>

      {/* --- Modals (rendered outside layout flow) --- */}

      {/* Checklist Item Edit Modal */}
      <ChecklistItemEditModal
        item={detail.editingItem}
        open={detail.isEditModalOpen}
        onOpenChange={detail.setIsEditModalOpen}
        onSave={detail.handleSaveEdit}
        isSaving={detail.isSavingChecklistEdit}
        aiSuggestion={detail.editingItem ? detail.aiSuggestionCache[detail.editingItem.id] ?? null : null}
        isLoadingAiSuggestion={detail.loadingAiSuggestion === detail.editingItem?.id}
        onRequestAiSuggestion={(item) => {
          detail.fetchAiSuggestion(item.id, item.label, item.suggestion, item.guidance, item.status)
        }}
        onRegenerateAiSuggestion={(item) => {
          detail.fetchAiSuggestion(item.id, item.label, item.suggestion, item.guidance, item.status, true)
        }}
      />

      {/* All Case Dialogs */}
      <CaseDialogs
        caseData={caseData}
        editModalOpen={docActions.editModalOpen}
        setEditModalOpen={docActions.setEditModalOpen}
        isSavingEdits={docActions.isSavingEdits}
        editFormData={docActions.editFormData}
        setEditFormData={docActions.setEditFormData}
        saveAllEdits={docActions.saveAllEdits}
        regenerateModalOpen={docActions.regenerateModalOpen}
        setRegenerateModalOpen={docActions.setRegenerateModalOpen}
        regenerateAcknowledged={docActions.regenerateAcknowledged}
        setRegenerateAcknowledged={docActions.setRegenerateAcknowledged}
        onRegenerate={handleRegenerate}
        lcdValidation={detail.lcdValidation}
        checklistEdits={detail.checklistEdits}
        submittedDialogOpen={statusActions.submittedDialogOpen}
        setSubmittedDialogOpen={statusActions.setSubmittedDialogOpen}
        submittedForm={statusActions.submittedForm}
        setSubmittedForm={statusActions.setSubmittedForm}
        handleMarkAsSubmitted={statusActions.handleMarkAsSubmitted}
        isSavingStatus={statusActions.isSavingStatus}
        approvedDialogOpen={statusActions.approvedDialogOpen}
        setApprovedDialogOpen={statusActions.setApprovedDialogOpen}
        approvedForm={statusActions.approvedForm}
        setApprovedForm={statusActions.setApprovedForm}
        handleMarkAsApproved={statusActions.handleMarkAsApproved}
        deniedDialogOpen={statusActions.deniedDialogOpen}
        setDeniedDialogOpen={statusActions.setDeniedDialogOpen}
        deniedForm={statusActions.deniedForm}
        setDeniedForm={statusActions.setDeniedForm}
        handleMarkAsDenied={statusActions.handleMarkAsDenied}
        followupDialogOpen={statusActions.followupDialogOpen}
        setFollowupDialogOpen={statusActions.setFollowupDialogOpen}
        followupDate={statusActions.followupDate}
        setFollowupDate={statusActions.setFollowupDate}
        handleMarkFollowUp={statusActions.handleMarkFollowUp}
        isSavingFollowup={statusActions.isSavingFollowup}
      />

      {/* P2P Rehearsal Overlay */}
      <P2PRehearsalOverlay
        isOpen={p2p.isP2POpen}
        onClose={() => p2p.setIsP2POpen(false)}
        p2pMessages={p2p.p2pMessages}
        p2pStreaming={p2p.p2pStreaming}
        p2pStreamingContent={p2p.p2pStreamingContent}
        p2pStatus={p2p.p2pStatus}
        p2pScore={p2p.p2pScore}
        p2pInput={p2p.p2pInput}
        setP2PInput={p2p.setP2PInput}
        p2pEnding={p2p.p2pEnding}
        p2pEndRef={p2p.p2pEndRef}
        p2pInputRef={p2p.p2pInputRef}
        sendP2PMessage={p2p.sendP2PMessage}
        endP2PSession={p2p.endP2PSession}
        startP2PSession={p2p.startP2PSession}
        setP2PScore={p2p.setP2PScore}
        patientName={`${caseData.patient_first_name} ${caseData.patient_last_name}`.trim()}
        medication={caseData.requested_medication || ""}
        payerName={caseData.payer_name || ""}
      />

      {/* Chat Overlay */}
      <ChatOverlay
        isOpen={detail.isChatExpanded}
        onClose={() => detail.setIsChatExpanded(false)}
      >
        <ChatInterface
          ref={chatRef}
          caseId={caseData.id}
          caseData={caseData}
          onGenerate={async () => {
            detail.setIsChatExpanded(false)
            if (detail.isInChatMode) {
              detail.setGenerating(true)
            } else {
              docActions.setRegenerateModalOpen(true)
            }
          }}
          riskItems={detail.riskItems}
          caseContext={detail.caseContext}
        />
      </ChatOverlay>
    </div>
  )
}

export default function CaseDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-light-gray">
        <div className="text-center">
          <LumaLogo className="w-16 h-16 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CaseDetailContent />
    </Suspense>
  )
}
