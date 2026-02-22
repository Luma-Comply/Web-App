'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent, DragEvent, ChangeEvent } from 'react'
import { ArrowUp, Paperclip, X, FileText, AlertCircle, ChevronUp, ChevronDown, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'png', 'jpg', 'jpeg']

interface ModeItem {
  id: string
  label: string
  color: string
}

interface PresetPrompt {
  label: string
  prompt: string
  badge?: number
  badgeType?: string
}

const MODE_ITEMS: ModeItem[] = [
  { id: 'general', label: 'Documentation checklist', color: '#5b8def' },
  { id: 'security', label: 'Recommendations', color: '#f87171' },
  { id: 'observability', label: 'Research Notes', color: '#34d399' },
  { id: 'network', label: 'Supporting Documents', color: '#fbbf24' },
]

// Fallback presets when no case context is available
const FALLBACK_PRESETS: Record<string, PresetPrompt[]> = {
  general: [
    { label: 'Discuss a compliance gap?', prompt: 'discuss a compliance gap', badge: 0, badgeType: 'error' },
  ],
  security: [
    { label: 'Risk Assessment', prompt: 'Can you provide a risk assessment for this case?' },
    { label: 'Gap Analysis', prompt: 'Can you perform a gap analysis on the current documentation?' },
    { label: 'Priority Actions', prompt: 'What are the priority actions needed for this case?' },
  ],
  observability: [
    { label: 'Key Findings', prompt: 'What are the key findings from the research?' },
    { label: 'Source Review', prompt: 'Can you review the sources used for this documentation?' },
    { label: 'Evidence Map', prompt: 'Can you create an evidence map for the clinical data?' },
  ],
  network: [
    { label: 'Reference Files', prompt: 'What reference files are relevant to this case?' },
    { label: 'Audit Trail', prompt: 'Can you show the audit trail for this documentation?' },
    { label: 'Version History', prompt: 'What changes have been made to this documentation?' },
  ],
}

// Case context passed from the case detail page
export interface CaseContext {
  // Documentation checklist data
  checklist?: {
    category: string
    items: { label: string; status: string; suggestion?: string; evidence?: string }[]
    foundCount: number
    missingCount: number
  }[]
  // Recommendations
  recommendations?: {
    priority: string
    action: string
    reason: string
    suggestedLanguage?: string
  }[]
  // Research notes (perplexity findings)
  researchFindings?: {
    lcdEffectiveDate?: string
    productCoverageStatus?: string
    recentLcdChanges?: string[]
    currentAuditFocusAreas?: string[]
    oigWorkPlanItems?: string[]
  }
  // Case clinical summary for supporting docs context
  caseSummary?: {
    patientName?: string
    diagnosis?: string[]
    medication?: string
    payer?: string
    priorTreatments?: string
  }
  // Overall risk
  riskLevel?: string
  denialProbability?: number
}

/** Build context-rich presets from real case data */
function buildPresets(ctx: CaseContext | undefined, _riskItems: RiskItem[]): Record<string, PresetPrompt[]> {
  if (!ctx) return FALLBACK_PRESETS

  const presets: Record<string, PresetPrompt[]> = {
    general: [
      { label: 'Discuss a compliance gap?', prompt: '', badge: 0, badgeType: 'error' },
    ],
    security: [],
    observability: [],
    network: [],
  }

  // --- Documentation checklist (general) ---
  // The compliance gap button is already wired via riskItems dropdown.
  // Add checklist-specific presets based on actual missing items.
  if (ctx.checklist && ctx.checklist.length > 0) {
    const missingItems = ctx.checklist.flatMap(cat =>
      cat.items.filter(i => i.status === 'MISSING' || i.status === 'PARTIAL')
    )
    const totalMissing = missingItems.length
    if (totalMissing > 0) {
      const missingList = missingItems.slice(0, 5).map(i => i.label).join(', ')
      presets.general.push({
        label: `${totalMissing} missing items`,
        prompt: `I have ${totalMissing} missing or partial checklist items: ${missingList}${totalMissing > 5 ? ` and ${totalMissing - 5} more` : ''}. Can you help me address the most critical ones first and suggest specific documentation language?`,
        badge: totalMissing,
      })
    }
  }

  // --- Recommendations (security) ---
  if (ctx.recommendations && ctx.recommendations.length > 0) {
    const critical = ctx.recommendations.filter(r => r.priority === 'CRITICAL')
    const high = ctx.recommendations.filter(r => r.priority === 'HIGH')
    const medium = ctx.recommendations.filter(r => r.priority === 'MEDIUM')

    if (critical.length > 0) {
      const items = critical.map(r => r.action).join('; ')
      presets.security.push({
        label: `${critical.length} Critical`,
        prompt: `There are ${critical.length} CRITICAL recommendations for this case: ${items}. Walk me through each one — what specific documentation do I need to add to address these?`,
        badge: critical.length,
        badgeType: 'critical',
      })
    }
    if (high.length > 0) {
      const items = high.map(r => r.action).join('; ')
      presets.security.push({
        label: `${high.length} High Priority`,
        prompt: `There are ${high.length} HIGH priority recommendations: ${items}. What's the most effective way to address these in my documentation?`,
        badge: high.length,
      })
    }
    if (medium.length > 0) {
      presets.security.push({
        label: `${medium.length} Medium Priority`,
        prompt: `There are ${medium.length} MEDIUM priority recommendations. Can you summarize these and suggest which ones I should prioritize based on the payer's typical review patterns?`,
        badge: medium.length,
      })
    }
    if (presets.security.length === 0) {
      presets.security = FALLBACK_PRESETS.security
    }
  } else {
    presets.security = FALLBACK_PRESETS.security
  }

  // --- Research Notes (observability) ---
  if (ctx.researchFindings) {
    const rf = ctx.researchFindings
    if (rf.currentAuditFocusAreas && rf.currentAuditFocusAreas.length > 0) {
      presets.observability.push({
        label: 'Audit Focus Areas',
        prompt: `The research found these current audit focus areas: ${rf.currentAuditFocusAreas.join(', ')}. How does our documentation address each of these? Are there any gaps I should be concerned about?`,
        badge: rf.currentAuditFocusAreas.length,
      })
    }
    if (rf.recentLcdChanges && rf.recentLcdChanges.length > 0) {
      presets.observability.push({
        label: 'LCD Changes',
        prompt: `Recent LCD changes were found: ${rf.recentLcdChanges.join('; ')}. How do these changes affect our current documentation? Do we need to update anything?`,
        badge: rf.recentLcdChanges.length,
      })
    }
    if (rf.oigWorkPlanItems && rf.oigWorkPlanItems.length > 0) {
      presets.observability.push({
        label: 'OIG Work Plan',
        prompt: `The OIG Work Plan includes these relevant items: ${rf.oigWorkPlanItems.join('; ')}. Should we strengthen our documentation in any specific areas to prepare for potential audits?`,
        badge: rf.oigWorkPlanItems.length,
      })
    }
    if (rf.lcdEffectiveDate) {
      presets.observability.push({
        label: 'LCD Effective Date',
        prompt: `The LCD effective date is ${rf.lcdEffectiveDate}. Is our documentation aligned with the most current LCD requirements? What has changed since the last revision?`,
      })
    }
    if (rf.productCoverageStatus) {
      const statusLabel = rf.productCoverageStatus === 'COVERED' ? 'Covered' :
        rf.productCoverageStatus === 'NOT_COVERED' ? 'Not Covered' : 'Verify Manually'
      presets.observability.push({
        label: `Coverage: ${statusLabel}`,
        prompt: `The product coverage status is "${statusLabel}". ${rf.productCoverageStatus === 'COVERED' ? 'What documentation requirements must be met to maintain coverage?' : rf.productCoverageStatus === 'NOT_COVERED' ? 'What are our options? Is there an appeals pathway or alternative documentation strategy?' : 'Can you help me verify the coverage status and identify what additional information we need?'}`,
      })
    }
    if (presets.observability.length === 0) {
      presets.observability = FALLBACK_PRESETS.observability
    }
  } else {
    presets.observability = FALLBACK_PRESETS.observability
  }

  // --- Supporting Documents (network) ---
  if (ctx.caseSummary) {
    const cs = ctx.caseSummary
    if (cs.diagnosis && cs.diagnosis.length > 0) {
      presets.network.push({
        label: 'Diagnosis Support',
        prompt: `The case involves diagnosis codes: ${cs.diagnosis.join(', ')}. What clinical evidence and supporting documentation should I gather for each diagnosis to strengthen the medical necessity argument?`,
      })
    }
    if (cs.priorTreatments) {
      presets.network.push({
        label: 'Prior Treatments',
        prompt: `The patient's prior treatments include: ${cs.priorTreatments}. How should I document treatment failure or inadequate response for each prior treatment to support step therapy requirements?`,
      })
    }
    if (cs.medication && cs.payer) {
      presets.network.push({
        label: 'Payer Requirements',
        prompt: `We're requesting ${cs.medication} from ${cs.payer}. What specific documentation does this payer typically require for this medication? Are there any known prior authorization quirks or common denial reasons?`,
      })
    }
    if (presets.network.length === 0) {
      presets.network = FALLBACK_PRESETS.network
    }
  } else {
    presets.network = FALLBACK_PRESETS.network
  }

  return presets
}

export interface RiskItem {
  text: string
  label: string
  severity: 'instant' | 'very-high' | 'high'
}

const severityColors: Record<string, string> = {
  instant: 'bg-coral',
  'very-high': 'bg-amber-500',
  high: 'bg-yellow-500',
}

const severityLabels: Record<string, string> = {
  instant: 'Critical',
  'very-high': 'Very High',
  high: 'High',
}

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void
  onFileUpload?: (files: File[]) => void
  disabled?: boolean
  placeholder?: string
  darkMode?: boolean
  riskItems?: RiskItem[]
  caseContext?: CaseContext
  onPresetClick?: (prompt: string) => void
}

export function ChatInput({
  onSend,
  onFileUpload,
  disabled,
  placeholder = 'Ask anything...',
  darkMode = false,
  riskItems = [],
  caseContext,
  onPresetClick,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<ModeItem>(MODE_ITEMS[0])
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false)
  const [isGapMenuOpen, setIsGapMenuOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modeSelectorRef = useRef<HTMLDivElement>(null)
  const gapMenuRef = useRef<HTMLDivElement>(null)

  const isTyping = message.length > 0

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [message])

  // Close mode menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modeSelectorRef.current && !modeSelectorRef.current.contains(e.target as Node)) {
        setIsModeMenuOpen(false)
      }
      if (gapMenuRef.current && !gapMenuRef.current.contains(e.target as Node)) {
        setIsGapMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      if (extension === 'heic' || extension === 'heif') {
        return { valid: false, error: 'HEIC/HEIF files are not supported. Please convert to JPG or PNG first.' }
      }
      if (['mp4', 'mp3', 'mov', 'avi', 'wmv', 'webm'].includes(extension)) {
        return { valid: false, error: 'Video files are not supported. Please upload documents or images only.' }
      }
      if (['doc', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
        return { valid: false, error: `${extension.toUpperCase()} files are not supported. Please convert to PDF or DOCX.` }
      }
      return { valid: false, error: `${extension.toUpperCase()} files are not supported. Allowed: PDF, DOCX, PNG, JPG.` }
    }
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: `File "${file.name}" exceeds 10MB limit.` }
    }
    return { valid: true }
  }

  const handleFiles = useCallback((newFiles: File[]) => {
    setFileError(null)
    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of newFiles) {
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
      setFiles(prev => [...prev, ...validFiles])
      onFileUpload?.(validFiles)
    }
  }, [onFileUpload])

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length) handleFiles(droppedFiles)
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length) handleFiles(selected)
    e.target.value = ''
  }

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index))

  const handleSend = () => {
    if (!message.trim() && !files.length) return
    onSend(message, files.length ? files : undefined)
    setMessage('')
    setFiles([])
    setFileError(null)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePresetClick = (preset: PresetPrompt) => {
    // If this is the compliance gap preset and we have risk items, open the gap menu
    if (preset.badgeType === 'error' && riskItems.length > 0) {
      setIsGapMenuOpen(!isGapMenuOpen)
      return
    }
    if (onPresetClick) {
      onPresetClick(preset.prompt)
    } else {
      onSend(preset.prompt)
    }
  }

  const handleGapItemClick = (item: RiskItem) => {
    const msg = `I'd like to discuss this compliance gap: "${item.text}". What specific documentation or evidence do I need to address this?`
    setIsGapMenuOpen(false)
    if (onPresetClick) {
      onPresetClick(msg)
    } else {
      onSend(msg)
    }
  }

  // Build context-rich presets from case data
  const dynamicPresets = buildPresets(caseContext, riskItems)
  const currentPresets = dynamicPresets[selectedMode.id] || []

  if (!darkMode) {
    // Light mode fallback (non-overlay usage)
    return (
      <div
        className="rounded-lg border bg-white p-3"
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="min-h-[28px] flex-1 resize-none border-0 bg-transparent text-[16px] leading-[1.5] outline-none placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={disabled || (!message.trim() && !files.length)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-dark-bg text-white hover:bg-dark-bg/90 disabled:opacity-50 transition-all"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Main input wrapper */}
      <div
        className={cn(
          'flex flex-row flex-wrap items-center gap-2 bg-[#0F1629] border border-white/[0.04] rounded-[24px] transition-[padding] duration-200 ease-out',
          isTyping ? 'py-2 pr-2 pl-6' : 'p-6',
          isDragging && 'ring-2 ring-dashed ring-[#5b8def]/40'
        )}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* File error */}
        <AnimatePresence>
          {fileError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full mb-1"
            >
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-coral/20 border border-coral/30 text-coral">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{fileError}</span>
                <button onClick={() => setFileError(null)} className="ml-auto hover:bg-coral/20 rounded p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top row: textarea */}
        <div className={cn('flex-1 min-w-[200px]', !isTyping && 'basis-full')}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full border-0 bg-transparent p-0 text-[16px] font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif] text-[#e8eaf0] placeholder:text-[#e8eaf0]/30 resize-none min-h-[28px] max-h-[200px] leading-[1.5] outline-none focus:ring-0"
          />
        </div>

        {/* Attached files */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              className="flex flex-wrap gap-2 pt-2 overflow-hidden w-full"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {files.map((file, i) => (
                <motion.div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-2 py-1.5 px-2.5 bg-[#1e2a52] rounded-[10px] text-[13px] text-[#e8eaf0] max-w-[200px]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className="h-3.5 w-3.5 flex-shrink-0 text-[#e8eaf0]/50" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 flex-shrink-0 text-[#e8eaf0]/50" />
                  )}
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[#e8eaf0]/30 hover:text-[#e8eaf0] transition-colors flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom row: tools */}
        <div className={cn('flex items-center gap-2', !isTyping && 'basis-full')}>
          {/* Left tools (hidden when typing) */}
          <AnimatePresence>
            {!isTyping && (
              <motion.div
                className="flex items-center gap-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
                />
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[#e8eaf0]/30 hover:text-[#e8eaf0] hover:bg-white/[0.06] transition-all"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  aria-label="Add context"
                >
                  <Paperclip className="h-[18px] w-[18px]" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spacer (hidden when typing via CSS) */}
          {!isTyping && <div className="flex-1" />}

          {/* Right tools: mode selector + send */}
          <div className={cn('flex items-center', isTyping ? 'gap-0' : 'gap-2')}>
            {/* Mode selector (hidden when typing) */}
            <AnimatePresence>
              {!isTyping && (
                <motion.div
                  className="relative"
                  ref={modeSelectorRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-[10px] bg-[#181E33] text-[#e8eaf0]/50 text-[13px] font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif] hover:bg-white/[0.06] hover:text-[#e8eaf0] transition-all whitespace-nowrap cursor-pointer border-0"
                    onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: selectedMode.color }}
                    />
                    <span>{selectedMode.label}</span>
                    {isModeMenuOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 text-[#6A7180]" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-[#6A7180]" />
                    )}
                  </button>

                  {/* Mode dropdown menu (opens upward) */}
                  <AnimatePresence>
                    {isModeMenuOpen && (
                      <motion.div
                        className="absolute bottom-[calc(100%+8px)] left-0 min-w-[180px] bg-[#181E33] border border-white/[0.04] rounded-[16px] shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_4px_8px_-2px_rgba(0,0,0,0.1),0px_8px_16px_0px_rgba(0,0,0,0.08)] p-1 z-[1000]"
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {MODE_ITEMS.map((mode, index) => (
                          <motion.button
                            key={mode.id}
                            type="button"
                            className={cn(
                              'flex items-center gap-2 w-full py-2 px-3 rounded-[10px] bg-transparent text-[#e8eaf0]/50 text-[13px] font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif] hover:text-[#e8eaf0] transition-all text-left cursor-pointer border-0',
                              selectedMode.id === mode.id
                                ? 'bg-gradient-to-br from-white/10 to-white/[0.06] text-[#e8eaf0]'
                                : 'hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]'
                            )}
                            onClick={() => {
                              setSelectedMode(mode)
                              setIsModeMenuOpen(false)
                            }}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.04, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ background: mode.color }}
                            />
                            <span>{mode.label}</span>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Send button (always visible) */}
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled || (!message.trim() && !files.length)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#e8eaf0] text-[#0f1629] hover:opacity-80 disabled:bg-[#1e2a52] disabled:text-[#e8eaf0]/30 disabled:cursor-not-allowed disabled:opacity-100 transition-all flex-shrink-0"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Preset prompts (below the input, hidden when typing) */}
      <AnimatePresence mode="wait">
        {!isTyping && (
          <motion.div
            key={selectedMode.id}
            className="flex flex-wrap justify-center gap-2 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {currentPresets.map((preset, index) => {
              // For the compliance gap preset, use the dynamic risk count
              const isGapPreset = preset.badgeType === 'error'
              const badgeCount = isGapPreset ? riskItems.length : preset.badge
              const showBadge = badgeCount !== undefined && badgeCount > 0

              // Compliance gap preset gets wrapped with dropdown
              if (isGapPreset && riskItems.length > 0) {
                return (
                  <div key={`${selectedMode.id}-${index}`} className="relative" ref={gapMenuRef}>
                    <motion.button
                      type="button"
                      className={cn(
                        'py-1.5 rounded-full bg-[#182040] text-[#e8eaf0]/50 text-[13px] font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif] hover:text-[#e8eaf0] transition-all cursor-pointer border-0',
                        showBadge ? 'pl-3.5 pr-2.5' : 'px-3.5'
                      )}
                      onClick={() => handlePresetClick(preset)}
                      disabled={disabled}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.08), 0px 1px 2px -1px rgba(0,0,0,0.08), 0px 2px 4px 0px rgba(0,0,0,0.06)' }}
                    >
                      {preset.label}
                      {showBadge && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] ml-2 rounded-full text-[11px] font-semibold bg-[#F0503D] text-white font-mono">
                          {badgeCount}
                        </span>
                      )}
                    </motion.button>

                    {/* Compliance gap items dropdown */}
                    <AnimatePresence>
                      {isGapMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                          className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50 bg-[#0F1629] rounded-xl shadow-lg border border-white/10 py-1.5 min-w-[320px] max-w-[420px] max-h-[300px] overflow-y-auto"
                        >
                          <div className="px-3 py-2 text-xs font-medium text-white/30 uppercase tracking-wide border-b border-white/5">
                            Discuss a compliance gap
                          </div>
                          {riskItems.map((item, riskIndex) => (
                            <motion.button
                              key={riskIndex}
                              type="button"
                              className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-white/5 transition-colors cursor-pointer group"
                              onClick={() => handleGapItemClick(item)}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                delay: riskIndex * 0.03,
                                type: 'spring',
                                damping: 25,
                                stiffness: 300,
                              }}
                            >
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${severityColors[item.severity] || 'bg-gray-400'}`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white/70 group-hover:text-white transition-colors leading-snug">
                                  {item.label}
                                </p>
                                <p className="text-xs text-white/30 mt-0.5">
                                  {severityLabels[item.severity] || 'Risk'}
                                </p>
                              </div>
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              }

              return (
                <motion.button
                  key={`${selectedMode.id}-${index}`}
                  type="button"
                  className={cn(
                    'py-1.5 rounded-full bg-[#182040] text-[#e8eaf0]/50 text-[13px] font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif] hover:text-[#e8eaf0] transition-all cursor-pointer border-0',
                    showBadge ? 'pl-3.5 pr-2.5' : 'px-3.5'
                  )}
                  onClick={() => handlePresetClick(preset)}
                  disabled={disabled}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.08), 0px 1px 2px -1px rgba(0,0,0,0.08), 0px 2px 4px 0px rgba(0,0,0,0.06)' }}
                >
                  {preset.label}
                  {showBadge && (
                    <span
                      className={cn(
                        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] ml-2 rounded-full text-[11px] font-semibold',
                        'bg-[#1e2a52] text-[#e8eaf0]/50'
                      )}
                    >
                      {badgeCount}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
