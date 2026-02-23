"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { SuggestedForms } from "@/components/dashboard/SuggestedForms"
import { Copy, Download, Check, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { CaseData } from "../types"

interface DocumentsTabProps {
  caseData: CaseData
  editedOutput: string
  setEditedOutput: (output: string) => void
  hasGenerated: boolean
  isDocCollapsed: boolean
  setIsDocCollapsed: (collapsed: boolean) => void
  copied: boolean
  onCopy: () => void
  onDownloadWord: () => void
  onDownloadPdf: () => void
  isInChatMode: boolean
  onFormsCountChange?: (count: number) => void
}

export function DocumentsTab({
  caseData,
  editedOutput,
  setEditedOutput,
  hasGenerated,
  isDocCollapsed,
  setIsDocCollapsed,
  copied,
  onCopy,
  onDownloadWord,
  onDownloadPdf,
  isInChatMode,
  onFormsCountChange,
}: DocumentsTabProps) {
  return (
    <div className="space-y-6">
      {/* Generated PA Letter */}
      <Card className="bg-white rounded-xl border border-gray-200">
        <div className="p-6">
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50/50 -m-6 p-6 rounded-xl transition-colors"
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
                transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                className="overflow-hidden pt-4"
              >
                {hasGenerated ? (
                  <>
                    <Textarea
                      value={editedOutput}
                      onChange={(e) => setEditedOutput(e.target.value)}
                      className="min-h-[500px] font-mono text-xs mb-4"
                      placeholder="Generated documentation will appear here..."
                    />

                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={onCopy} variant="outline" size="sm" className="text-xs">
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.div
                            key={copied ? "check" : "copy"}
                            initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                            className="flex items-center"
                          >
                            {copied ? (
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 mr-1.5" />
                            )}
                          </motion.div>
                        </AnimatePresence>
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      <Button onClick={onDownloadWord} variant="outline" size="sm" className="text-xs">
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        DOCX
                      </Button>
                      <Button onClick={onDownloadPdf} variant="outline" size="sm" className="text-xs">
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        PDF
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-sm">No documentation generated yet.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Suggested Supporting Documents */}
      {!isInChatMode && (
        <SuggestedForms
          caseId={caseData.id}
          lastGenerated={caseData.generated_output}
          onCountChange={onFormsCountChange}
        />
      )}
    </div>
  )
}
