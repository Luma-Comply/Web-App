"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ChatMessage } from "@/components/chat/ChatMessage"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Send, Loader2, Square, RotateCcw } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

interface Score {
  overall_readiness: number
  strengths: string[]
  weaknesses: string[]
  suggested_responses: { objection: string; better_response: string }[]
}

interface CaseInfo {
  id: string
  patient_first_name: string
  patient_last_name: string
  requested_medication: string
  payer_name: string
  generated_output: string | null
}

export default function P2PRehearsalPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string
  const supabase = createClient()

  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null)
  const [rehearsalId, setRehearsalId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [score, setScore] = useState<Score | null>(null)
  const [isEnding, setIsEnding] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<"loading" | "active" | "completed">("loading")
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  // Load case data and check for existing active rehearsal
  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push("/")
        return
      }

      const { data: caseData } = await supabase
        .from("cases")
        .select("id, patient_first_name, patient_last_name, requested_medication, payer_name, generated_output")
        .eq("id", caseId)
        .eq("user_id", session.user.id)
        .single()

      if (!caseData) {
        router.push("/dashboard")
        return
      }

      setCaseInfo(caseData)

      if (!caseData.generated_output) {
        setError("This case needs generated documentation before you can practice P2P.")
        setSessionStatus("completed")
        return
      }

      // Check for existing active rehearsal
      const { data: existing } = await supabase
        .from("p2p_rehearsals")
        .select("id, transcript, score, status")
        .eq("case_id", caseId)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (existing?.status === "active") {
        // Resume active session
        setRehearsalId(existing.id)
        const transcript = (existing.transcript as Array<{ role: string; content: string; timestamp: string }>) || []
        setMessages(
          transcript.map((t, i) => ({
            id: `msg-${i}`,
            role: t.role as "user" | "assistant",
            content: t.content,
            created_at: t.timestamp,
          }))
        )
        setSessionStatus("active")
      } else if (existing?.status === "completed" && existing.score) {
        // Show completed session
        setRehearsalId(existing.id)
        const transcript = (existing.transcript as Array<{ role: string; content: string; timestamp: string }>) || []
        setMessages(
          transcript.map((t, i) => ({
            id: `msg-${i}`,
            role: t.role as "user" | "assistant",
            content: t.content,
            created_at: t.timestamp,
          }))
        )
        setScore(existing.score as Score)
        setSessionStatus("completed")
      } else {
        // Start new session
        startSession()
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

  async function startSession() {
    setSessionStatus("loading")
    setMessages([])
    setScore(null)
    setRehearsalId(null)
    setIsStreaming(true)
    setStreamingContent("")

    try {
      const response = await fetch("/api/p2p-rehearsal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", caseId }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to start session")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      let fullContent = ""
      let newRehearsalId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue

          try {
            const data = JSON.parse(line.slice(6))
            if (data.rehearsalId) {
              newRehearsalId = data.rehearsalId
              setRehearsalId(data.rehearsalId)
            }
            if (data.content) {
              fullContent += data.content
              setStreamingContent(fullContent)
            }
            if (data.error) throw new Error(data.error)
          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }

      if (fullContent) {
        setMessages([
          {
            id: `msg-0`,
            role: "assistant",
            content: fullContent,
            created_at: new Date().toISOString(),
          },
        ])
      }

      setStreamingContent("")
      setIsStreaming(false)
      setSessionStatus("active")
      if (newRehearsalId) setRehearsalId(newRehearsalId)
      inputRef.current?.focus()
    } catch (e) {
      console.error("Start session error:", e)
      setError(e instanceof Error ? e.message : "Failed to start session")
      setIsStreaming(false)
      setSessionStatus("completed")
    }
  }

  async function sendMessage() {
    if (!input.trim() || isStreaming || !rehearsalId) return

    const userMessage: Message = {
      id: `msg-${messages.length}`,
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsStreaming(true)
    setStreamingContent("")

    try {
      const response = await fetch("/api/p2p-rehearsal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          caseId,
          rehearsalId,
          message: userMessage.content,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to send message")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue

          try {
            const data = JSON.parse(line.slice(6))
            if (data.content) {
              fullContent += data.content
              setStreamingContent(fullContent)
            }
            if (data.error) throw new Error(data.error)
          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }

      if (fullContent) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${prev.length}`,
            role: "assistant",
            content: fullContent,
            created_at: new Date().toISOString(),
          },
        ])
      }

      setStreamingContent("")
      setIsStreaming(false)
      inputRef.current?.focus()
    } catch (e) {
      console.error("Send message error:", e)
      setError(e instanceof Error ? e.message : "Failed to send message")
      setIsStreaming(false)
    }
  }

  async function endSession() {
    if (!rehearsalId || isEnding) return

    setIsEnding(true)

    try {
      const response = await fetch("/api/p2p-rehearsal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end_session", caseId, rehearsalId }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to end session")
      }

      const scoreData: Score = await response.json()
      setScore(scoreData)
      setSessionStatus("completed")
    } catch (e) {
      console.error("End session error:", e)
      setError(e instanceof Error ? e.message : "Failed to generate scorecard")
    } finally {
      setIsEnding(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const patientName = caseInfo
    ? `${caseInfo.patient_first_name} ${caseInfo.patient_last_name}`.trim()
    : ""

  const readinessColor =
    score && score.overall_readiness >= 7
      ? "text-green-600"
      : score && score.overall_readiness >= 4
        ? "text-amber-600"
        : "text-coral"

  const readinessBarColor =
    score && score.overall_readiness >= 7
      ? "bg-green-500"
      : score && score.overall_readiness >= 4
        ? "bg-amber-500"
        : "bg-coral"

  return (
    <div className="min-h-screen bg-gradient-to-b from-light-gray to-white">
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/cases/${caseId}`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-dark-bg mb-3 cursor-pointer"
            aria-label="Back to case"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Case
          </button>
          <h1 className="text-2xl font-serif font-semibold text-dark-bg">P2P Rehearsal Coach</h1>
          {caseInfo && (
            <p className="text-sm text-gray-500 mt-1">
              {patientName} &middot; {caseInfo.requested_medication || "—"} &middot;{" "}
              {caseInfo.payer_name || "—"}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <Card className="p-4 mb-4 bg-coral/5 border-coral/20">
            <p className="text-sm text-coral">{error}</p>
          </Card>
        )}

        {/* Chat Messages */}
        <div
          className="flex-1 overflow-y-auto space-y-4 mb-4"
          role="log"
          aria-label="P2P rehearsal conversation"
          aria-live="polite"
        >
          {sessionStatus === "loading" && messages.length === 0 && !streamingContent && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-mint mr-2" />
              <span className="text-sm text-gray-500">Medical director is reviewing your case...</span>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isStreaming={false}
              patientName={patientName}
            />
          ))}

          {streamingContent && (
            <ChatMessage
              message={{
                id: "streaming",
                role: "assistant",
                content: streamingContent,
                created_at: new Date().toISOString(),
              }}
              isStreaming={true}
              patientName={patientName}
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {sessionStatus === "active" && (
          <div className="border-t border-sage-medium/20 pt-4 pb-2">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Defend your prior authorization..."
                className="flex-1 resize-none rounded-lg border border-sage-medium/30 bg-white px-4 py-3 text-sm text-dark-bg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mint/30 focus:border-mint/50"
                rows={2}
                disabled={isStreaming}
                aria-label="Your response to the medical director"
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming}
                  size="sm"
                  className="bg-dark-bg hover:bg-dark-bg/90 text-white h-10 px-4"
                  aria-label="Send message"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={endSession}
                  disabled={isStreaming || isEnding || messages.length < 2}
                  variant="outline"
                  size="sm"
                  className="border-coral/30 text-coral hover:bg-coral/5 h-10 px-3 text-xs"
                  aria-label="End rehearsal session"
                >
                  {isEnding ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Square className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Press Enter to send &middot; Shift+Enter for new line &middot; End session when ready for your score
            </p>
          </div>
        )}

        {/* Scorecard */}
        {score && (
          <Card className="p-6 mt-4 mb-6 glass-card border border-sage-medium/30">
            <h2 className="text-lg font-serif font-semibold text-dark-bg mb-4">
              P2P Readiness Score
            </h2>

            {/* Overall Score */}
            <div className="mb-6">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Overall Readiness</span>
                <span className={`text-3xl font-bold ${readinessColor}`}>
                  {score.overall_readiness}/10
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${readinessBarColor}`}
                  style={{ width: `${score.overall_readiness * 10}%` }}
                />
              </div>
            </div>

            {/* Strengths */}
            {score.strengths?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wider mb-2">
                  Strengths
                </h3>
                <ul className="space-y-1.5">
                  {score.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-dark-bg">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {score.weaknesses?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-2">
                  Areas to Improve
                </h3>
                <ul className="space-y-1.5">
                  {score.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-dark-bg">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Better Responses */}
            {score.suggested_responses?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-dark-bg uppercase tracking-wider mb-3">
                  Suggested Stronger Responses
                </h3>
                <div className="space-y-3">
                  {score.suggested_responses.map((sr, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-white border border-sage-medium/20"
                    >
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Objection
                      </p>
                      <p className="text-sm text-dark-bg/70 mb-2">{sr.objection}</p>
                      <p className="text-xs font-semibold text-mint uppercase tracking-wider mb-1">
                        Better Response
                      </p>
                      <p className="text-sm text-dark-bg">{sr.better_response}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-sage-medium/15">
              <Button
                onClick={() => {
                  setScore(null)
                  setError(null)
                  startSession()
                }}
                variant="outline"
                size="sm"
                className="border-dark-bg/20 text-dark-bg hover:bg-dark-bg/5"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Start New Session
              </Button>
              <Button
                onClick={() => router.push(`/cases/${caseId}`)}
                size="sm"
                className="bg-dark-bg hover:bg-dark-bg/90 text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Case
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
