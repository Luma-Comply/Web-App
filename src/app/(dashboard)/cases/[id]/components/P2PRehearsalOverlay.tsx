"use client"

import { RefObject } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChatMessage } from "@/components/chat/ChatMessage"
import { Loader2, Send, X, Square, RotateCcw } from "lucide-react"

interface P2PMessage {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

interface P2PScore {
  overall_readiness: number
  strengths: string[]
  weaknesses: string[]
  suggested_responses: { objection: string; better_response: string }[]
}

interface P2PRehearsalOverlayProps {
  isOpen: boolean
  onClose: () => void
  p2pMessages: P2PMessage[]
  p2pStreaming: boolean
  p2pStreamingContent: string
  p2pStatus: "idle" | "active" | "completed"
  p2pScore: P2PScore | null
  p2pInput: string
  setP2PInput: (input: string) => void
  p2pEnding: boolean
  p2pEndRef: RefObject<HTMLDivElement | null>
  p2pInputRef: RefObject<HTMLTextAreaElement | null>
  sendP2PMessage: () => void
  endP2PSession: () => void
  startP2PSession: () => void
  setP2PScore: (score: P2PScore | null) => void
  patientName: string
  medication: string
  payerName: string
}

export function P2PRehearsalOverlay(props: P2PRehearsalOverlayProps) {
  const {
    isOpen, onClose,
    p2pMessages, p2pStreaming, p2pStreamingContent, p2pStatus, p2pScore,
    p2pInput, setP2PInput, p2pEnding,
    p2pEndRef, p2pInputRef,
    sendP2PMessage, endP2PSession, startP2PSession, setP2PScore,
    patientName, medication, payerName,
  } = props

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            onClick={() => { if (p2pStatus !== "active" || p2pMessages.length === 0) onClose() }}
          />
          <motion.button
            className="fixed top-6 right-6 z-[80] w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
            onClick={onClose}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1], delay: 0.15 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Close payer call practice"
          >
            <X className="w-5 h-5" />
          </motion.button>
          <motion.div
            className="fixed inset-0 z-[70] flex flex-col"
            style={{ background: 'linear-gradient(135deg, #131B2E 0%, #0F1629 50%, #0A0E1A 100%)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative z-[2] flex-1 flex flex-col min-h-0 max-w-3xl w-full mx-auto px-4">
              {/* Header */}
              <div className="py-6 flex-shrink-0">
                <h2 className="text-xl font-serif font-semibold text-white">Payer Call Practice</h2>
                <p className="text-sm text-white/40 mt-1">
                  {patientName} &middot; {medication || "—"} &middot; {payerName || "—"}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-4" role="log" aria-label="Payer call practice conversation" aria-live="polite">
                {p2pStatus === "idle" && p2pStreaming && !p2pStreamingContent && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-white/40 mr-2" />
                    <span className="text-sm text-white/40">Medical director is reviewing your case...</span>
                  </div>
                )}
                {p2pMessages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} isStreaming={false} patientName={patientName} darkMode />
                ))}
                {p2pStreamingContent && (
                  <ChatMessage
                    message={{ id: "p2p-streaming", role: "assistant", content: p2pStreamingContent, created_at: new Date().toISOString() }}
                    isStreaming={true}
                    patientName={patientName}
                    darkMode
                  />
                )}
                <div ref={p2pEndRef} />
              </div>

              {/* Scorecard */}
              {p2pScore && (
                <div className="flex-shrink-0 mb-4 p-5 rounded-xl bg-white/5 border border-white/10 overflow-y-auto max-h-[50vh]">
                  <h3 className="text-lg font-serif font-semibold text-white mb-4">Readiness Score</h3>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm text-white/50">Overall Readiness</span>
                    <span className={`text-3xl font-bold ${p2pScore.overall_readiness >= 7 ? "text-green-400" : p2pScore.overall_readiness >= 4 ? "text-amber-400" : "text-coral"}`}>
                      {p2pScore.overall_readiness}/10
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-5">
                    <div
                      className={`h-full rounded-full ${p2pScore.overall_readiness >= 7 ? "bg-green-500" : p2pScore.overall_readiness >= 4 ? "bg-amber-500" : "bg-coral"}`}
                      style={{ width: `${p2pScore.overall_readiness * 10}%` }}
                    />
                  </div>
                  {p2pScore.strengths?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Strengths</p>
                      <ul className="space-y-1">
                        {p2pScore.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {p2pScore.weaknesses?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Areas to Improve</p>
                      <ul className="space-y-1">
                        {p2pScore.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {p2pScore.suggested_responses?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Suggested Stronger Responses</p>
                      <div className="space-y-2">
                        {p2pScore.suggested_responses.map((sr, i) => (
                          <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <p className="text-[10px] font-semibold text-white/30 uppercase mb-1">Objection</p>
                            <p className="text-sm text-white/50 mb-2">{sr.objection}</p>
                            <p className="text-[10px] font-semibold text-mint uppercase mb-1">Better Response</p>
                            <p className="text-sm text-white/80">{sr.better_response}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 mt-4 pt-3 border-t border-white/10">
                    <button
                      onClick={() => { setP2PScore(null); startP2PSession() }}
                      className="text-sm text-white/50 hover:text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> New Session
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              {p2pStatus === "active" && !p2pScore && (
                <div className="flex-shrink-0 pb-6 pt-2 border-t border-white/10">
                  <div className="flex gap-2">
                    <textarea
                      ref={p2pInputRef}
                      value={p2pInput}
                      onChange={(e) => setP2PInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendP2PMessage() } }}
                      placeholder="Defend your prior authorization..."
                      className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-mint/30 focus:border-mint/30"
                      rows={2}
                      disabled={p2pStreaming}
                      aria-label="Your response to the medical director"
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={sendP2PMessage}
                        disabled={!p2pInput.trim() || p2pStreaming}
                        className="h-10 px-4 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center"
                        aria-label="Send message"
                      >
                        {p2pStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={endP2PSession}
                        disabled={p2pStreaming || p2pEnding || p2pMessages.length < 2}
                        className="h-10 px-3 rounded-lg border border-coral/30 text-coral hover:bg-coral/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center text-xs"
                        aria-label="End session and get scorecard"
                      >
                        {p2pEnding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/20 mt-2">Enter to send · Shift+Enter for new line · End session when ready for your score</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
