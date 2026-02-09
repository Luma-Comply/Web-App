'use client'

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, AlertTriangle, FileText } from 'lucide-react'
import { motion } from 'framer-motion'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: { attachments?: { name: string; type?: string; url?: string }[] }
  created_at: string
}

interface ChatInterfaceProps {
  caseId: string
  caseData: any
  onGenerate: () => void
}

export interface ChatInterfaceRef {
  sendMessage: (content: string) => Promise<void>
}

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(function ChatInterface({ caseId, caseData, onGenerate }, ref) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [readyToGenerate, setReadyToGenerate] = useState(false)
  const [showHipaaWarning, setShowHipaaWarning] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingFileName, setUploadingFileName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadMessages = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('case_messages')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data as Message[])
      const hasReadySignal = data.some(m => m.content?.includes('[READY_TO_GENERATE]'))
      setReadyToGenerate(hasReadySignal)
    }
    setIsLoading(false)
  }, [caseId, supabase])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  const sendMessage = async (content: string, files?: File[]) => {
    if (!content.trim() && !files?.length) return

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      metadata: files ? { attachments: files.map(f => ({ name: f.name, type: f.type })) } : undefined,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)
    setStreamingContent('')

    try {
      // If there are files, upload them first and collect results
      let uploadedFileInfo: string[] = []
      if (files && files.length > 0) {
        setIsUploading(true)
        setUploadProgress(0)

        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          setUploadingFileName(file.name)

          // Simulate progress for better UX (actual upload doesn't support progress with fetch)
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 10, 90))
          }, 200)

          const formData = new FormData()
          formData.append('file', file)
          formData.append('caseId', caseId)

          const uploadResponse = await fetch('/api/chat/upload', {
            method: 'POST',
            body: formData,
          })

          clearInterval(progressInterval)
          setUploadProgress(100)

          if (uploadResponse.ok) {
            const result = await uploadResponse.json()
            uploadedFileInfo.push(`${file.name}: ${result.summary || 'Uploaded successfully'}`)
          }

          // Reset for next file or completion
          if (i < files.length - 1) {
            setUploadProgress(0)
          }
        }

        setIsUploading(false)
        setUploadProgress(0)
        setUploadingFileName('')
      }

      // Build the message - include info about uploaded files
      let finalMessage = content
      if (uploadedFileInfo.length > 0 && !content.trim()) {
        finalMessage = `I have uploaded the following document(s) for review:\n${uploadedFileInfo.join('\n')}\n\nPlease analyze the uploaded content for compliance gaps.`
      } else if (uploadedFileInfo.length > 0) {
        finalMessage = `${content}\n\n[Uploaded files: ${files?.map(f => f.name).join(', ')}]`
      }

      // Send the chat message (JSON format)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId,
          message: finalMessage,
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })

        // Parse SSE data format
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullContent += parsed.content
                setStreamingContent(fullContent)
              }
              if (parsed.ready_to_generate) {
                setReadyToGenerate(true)
              }
            } catch {
              // Not JSON, skip
            }
          }
        }

        if (fullContent.includes('[READY_TO_GENERATE]')) {
          setReadyToGenerate(true)
        }
      }

      await loadMessages()
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
    }
  }

  // Expose sendMessage to parent via ref
  useImperativeHandle(ref, () => ({
    sendMessage: (content: string) => sendMessage(content),
  }))

  const handleFileUpload = (files: File[]) => {
    setPendingFiles(files)
    setShowHipaaWarning(true)
  }

  const confirmFileUpload = () => {
    setShowHipaaWarning(false)
    sendMessage('I have uploaded documents for review.', pendingFiles)
    setPendingFiles([])
  }

  const cancelFileUpload = () => {
    setShowHipaaWarning(false)
    setPendingFiles([])
  }

  const handleGenerate = () => {
    onGenerate()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-sage-light">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sage-light">
            Start a conversation to gather case information.
          </div>
        ) : (
          messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 w-full justify-end"
          >
            <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-dark-bg text-white rounded-br-md">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-4 h-4 text-mint" />
                <span className="text-sm font-medium truncate max-w-[200px]">{uploadingFileName}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-mint rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <p className="text-xs text-white/60 mt-2">Uploading and analyzing document...</p>
            </div>
          </motion.div>
        )}
        {isStreaming && streamingContent && (
          <ChatMessage
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent.replace('[READY_TO_GENERATE]', ''),
              created_at: new Date().toISOString(),
            }}
            isStreaming
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {readyToGenerate && (
        <div className="px-4 pb-2">
          <Button onClick={handleGenerate} className="w-full" variant="glow" size="lg">
            <Sparkles className="h-5 w-5 mr-2" />
            Generate Documentation
          </Button>
        </div>
      )}

      <div className="p-4 border-t border-sage-light/30">
        <ChatInput
          onSend={sendMessage}
          onFileUpload={handleFileUpload}
          disabled={isStreaming}
          placeholder="Describe the patient's condition..."
        />
      </div>

      <Dialog open={showHipaaWarning} onOpenChange={setShowHipaaWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-coral" />
              HIPAA Compliance Notice
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-left pt-2 space-y-3 text-sm text-muted-foreground">
                <p>
                  Before uploading documents, please ensure they do not contain Protected Health Information (PHI) such as:
                </p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Social Security Numbers</li>
                  <li>Medical Record Numbers (MRN)</li>
                  <li>Full dates (birth dates, admission dates)</li>
                  <li>Addresses, phone numbers, or email addresses</li>
                  <li>Insurance policy numbers</li>
                </ul>
                <p className="font-medium">
                  Only upload de-identified clinical documents that follow Safe Harbor guidelines.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelFileUpload}>
              Cancel
            </Button>
            <Button onClick={confirmFileUpload}>
              I Confirm - Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})
