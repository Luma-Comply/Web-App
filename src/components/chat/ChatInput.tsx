'use client'

import { useState, useRef, useCallback, KeyboardEvent, DragEvent, ChangeEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send, Paperclip, X, FileText, AlertCircle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'png', 'jpg', 'jpeg']
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void
  onFileUpload?: (files: File[]) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, onFileUpload, disabled, placeholder = 'Type a message...' }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileAttached, setFileAttached] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''

    // Check extension
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      // Provide specific error messages for common unsupported types
      if (extension === 'heic' || extension === 'heif') {
        return { valid: false, error: `HEIC/HEIF files are not supported. Please convert to JPG or PNG first.` }
      }
      if (['mp4', 'mp3', 'mov', 'avi', 'wmv', 'webm'].includes(extension)) {
        return { valid: false, error: `Video files are not supported. Please upload documents or images only.` }
      }
      if (['doc', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
        return { valid: false, error: `${extension.toUpperCase()} files are not supported. Please convert to PDF or DOCX.` }
      }
      return { valid: false, error: `${extension.toUpperCase()} files are not supported. Allowed: PDF, DOCX, PNG, JPG.` }
    }

    // Check file size (10MB limit)
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
      setFileError(errors[0]) // Show first error
      // Auto-dismiss after 5 seconds
      setTimeout(() => setFileError(null), 5000)
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
      onFileUpload?.(validFiles)
      // Show checkmark briefly
      setFileAttached(true)
      setTimeout(() => setFileAttached(false), 1500)
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

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`
  }

  return (
    <div
      className={cn('rounded-lg border bg-white p-3 transition-colors', isDragging && 'border-2 border-dashed border-mint')}
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* File type error message */}
      <AnimatePresence>
        {fileError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2"
          >
            <div className="flex items-center gap-2 rounded-lg bg-coral/10 border border-coral/20 px-3 py-2 text-sm text-coral">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{fileError}</span>
              <button
                onClick={() => setFileError(null)}
                className="ml-auto hover:bg-coral/20 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-1 rounded bg-sage-light/50 px-2 py-1 text-sm">
              <FileText className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button onClick={() => removeFile(i)} className="ml-1 hover:text-coral"><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
          accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
        />
        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={disabled} className="shrink-0">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={fileAttached ? "check" : "paperclip"}
              initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
              transition={{
                type: "spring",
                duration: 0.3,
                bounce: 0,
              }}
            >
              {fileAttached ? (
                <Check className="h-5 w-5 text-mint" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </motion.div>
          </AnimatePresence>
        </Button>
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={e => { setMessage(e.target.value); adjustHeight() }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="min-h-[40px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button onClick={handleSend} disabled={disabled || (!message.trim() && !files.length)} size="icon" className="shrink-0">
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
