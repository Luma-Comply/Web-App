"use client"

import { useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import jsPDF from "jspdf"
import type { CaseData } from "../types"
import { formatDate } from "../utils"

interface P2PScore {
  overall_readiness: number
  strengths: string[]
  weaknesses: string[]
  suggested_responses: { objection: string; better_response: string }[]
}

interface P2PMessage {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

interface UseP2PRehearsalProps {
  caseData: CaseData | null
}

export function useP2PRehearsal({ caseData }: UseP2PRehearsalProps) {
  const { toast } = useToast()

  const [isP2POpen, setIsP2POpen] = useState(false)
  const [p2pRehearsalId, setP2PRehearsalId] = useState<string | null>(null)
  const [p2pMessages, setP2PMessages] = useState<P2PMessage[]>([])
  const [p2pInput, setP2PInput] = useState("")
  const [p2pStreaming, setP2PStreaming] = useState(false)
  const [p2pStreamingContent, setP2PStreamingContent] = useState("")
  const [p2pScore, setP2PScore] = useState<P2PScore | null>(null)
  const [p2pEnding, setP2PEnding] = useState(false)
  const [p2pStatus, setP2PStatus] = useState<"idle" | "active" | "completed">("idle")
  const p2pEndRef = useRef<HTMLDivElement>(null)
  const p2pInputRef = useRef<HTMLTextAreaElement>(null)

  async function startP2PSession() {
    if (!caseData) return
    setP2PMessages([])
    setP2PScore(null)
    setP2PRehearsalId(null)
    setP2PStatus("idle")
    setIsP2POpen(true)
    setP2PStreaming(true)
    setP2PStreamingContent("")

    try {
      const response = await fetch("/api/p2p-rehearsal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", caseId: caseData.id }),
      })
      if (!response.ok) throw new Error("Failed to start session")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No stream")
      const decoder = new TextDecoder()
      let full = ""
      let newId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.rehearsalId) { newId = d.rehearsalId; setP2PRehearsalId(d.rehearsalId) }
            if (d.content) { full += d.content; setP2PStreamingContent(full) }
          } catch { /* skip malformed */ }
        }
      }

      if (full) {
        setP2PMessages([{ id: "msg-0", role: "assistant", content: full, created_at: new Date().toISOString() }])
      }
      setP2PStreamingContent("")
      setP2PStreaming(false)
      setP2PStatus("active")
      if (newId) setP2PRehearsalId(newId)
      setTimeout(() => p2pInputRef.current?.focus(), 100)
    } catch {
      setP2PStreaming(false)
      toast({ title: "Error", description: "Could not start payer call practice session.", variant: "destructive" })
    }
  }

  async function sendP2PMessage() {
    if (!p2pInput.trim() || p2pStreaming || !p2pRehearsalId || !caseData) return
    const text = p2pInput.trim()
    const userMsg: P2PMessage = { id: `msg-${p2pMessages.length}`, role: "user", content: text, created_at: new Date().toISOString() }
    setP2PMessages((prev) => [...prev, userMsg])
    setP2PInput("")
    setP2PStreaming(true)
    setP2PStreamingContent("")

    try {
      const response = await fetch("/api/p2p-rehearsal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", caseId: caseData.id, rehearsalId: p2pRehearsalId, message: text }),
      })
      if (!response.ok) throw new Error("Failed to send")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No stream")
      const decoder = new TextDecoder()
      let full = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.content) { full += d.content; setP2PStreamingContent(full) }
          } catch { /* skip */ }
        }
      }

      if (full) {
        setP2PMessages((prev) => [...prev, { id: `msg-${prev.length}`, role: "assistant", content: full, created_at: new Date().toISOString() }])
      }
      setP2PStreamingContent("")
      setP2PStreaming(false)
      setTimeout(() => p2pInputRef.current?.focus(), 100)
    } catch {
      setP2PStreaming(false)
      toast({ title: "Error", description: "Failed to get response.", variant: "destructive" })
    }
  }

  async function endP2PSession() {
    if (!p2pRehearsalId || !caseData || p2pEnding) return
    setP2PEnding(true)
    try {
      const response = await fetch("/api/p2p-rehearsal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end_session", caseId: caseData.id, rehearsalId: p2pRehearsalId }),
      })
      if (!response.ok) throw new Error("Failed to score")
      const scoreData = await response.json()
      setP2PScore(scoreData)
      setP2PStatus("completed")
    } catch {
      toast({ title: "Error", description: "Could not generate scorecard.", variant: "destructive" })
    } finally {
      setP2PEnding(false)
    }
  }

  function generateP2PSheet() {
    if (!caseData) return

    const p2pDoc = new jsPDF()
    const margin = 20
    const pageWidth = p2pDoc.internal.pageSize.getWidth()
    const usableWidth = pageWidth - margin * 2
    let y = margin

    function sectionHeader(title: string) {
      y += 4
      p2pDoc.setFont("helvetica", "bold")
      p2pDoc.setFontSize(11)
      p2pDoc.setTextColor(52, 78, 65)
      p2pDoc.text(title, margin, y)
      y += 1
      p2pDoc.setDrawColor(200, 200, 200)
      p2pDoc.line(margin, y, pageWidth - margin, y)
      y += 6
    }

    function labelValue(label: string, value: string) {
      p2pDoc.setFont("helvetica", "bold")
      p2pDoc.setFontSize(9.5)
      p2pDoc.setTextColor(80, 80, 80)
      p2pDoc.text(`${label}: `, margin, y)
      const labelW = p2pDoc.getTextWidth(`${label}: `)
      p2pDoc.setFont("helvetica", "normal")
      p2pDoc.setTextColor(0, 0, 0)
      const valLines = p2pDoc.splitTextToSize(value || "N/A", usableWidth - labelW)
      p2pDoc.text(valLines, margin + labelW, y)
      y += valLines.length * 4.5
    }

    function wrappedText(text: string, fontSize: number = 9.5) {
      p2pDoc.setFont("helvetica", "normal")
      p2pDoc.setFontSize(fontSize)
      p2pDoc.setTextColor(30, 30, 30)
      const lines = p2pDoc.splitTextToSize(text || "N/A", usableWidth)
      p2pDoc.text(lines, margin, y)
      y += lines.length * 4.2
    }

    // Header
    p2pDoc.setFont("helvetica", "bold")
    p2pDoc.setFontSize(18)
    p2pDoc.setTextColor(52, 78, 65)
    p2pDoc.text("PEER-TO-PEER REVIEW PREPARATION", margin, y + 6)
    y += 12
    p2pDoc.setFont("helvetica", "italic")
    p2pDoc.setFontSize(10)
    p2pDoc.setTextColor(100, 100, 100)
    p2pDoc.text("Prepared for Physician Review", margin, y)
    const dateText = `Date: ${new Date().toLocaleDateString()}`
    const dateW = p2pDoc.getTextWidth(dateText)
    p2pDoc.text(dateText, pageWidth - margin - dateW, y)
    y += 4
    p2pDoc.setDrawColor(52, 78, 65)
    p2pDoc.setLineWidth(0.5)
    p2pDoc.line(margin, y, pageWidth - margin, y)
    y += 6

    // Case Summary
    sectionHeader("CASE SUMMARY")
    labelValue("Patient", `${caseData.patient_first_name} ${caseData.patient_last_name}`)
    labelValue("Medication", `${caseData.requested_medication}${caseData.medication_dose ? ` ${caseData.medication_dose}` : ""}`)
    labelValue("Diagnosis", Array.isArray(caseData.diagnosis_codes) ? caseData.diagnosis_codes.join(", ") : String(caseData.diagnosis_codes || "N/A"))
    labelValue("Payer", caseData.payer_name || "N/A")

    // Denial Details
    sectionHeader("DENIAL DETAILS")
    labelValue("Category", caseData.denial_category || "N/A")
    labelValue("Reason", caseData.denial_reason || "N/A")
    labelValue("Date", caseData.decision_date ? formatDate(caseData.decision_date) : "N/A")

    // Key Clinical Evidence
    sectionHeader("KEY CLINICAL EVIDENCE")
    labelValue("Disease Activity", caseData.disease_activity || "N/A")
    labelValue("Lab Values", caseData.lab_values || "N/A")
    labelValue("Prior Treatments", caseData.prior_treatments || "N/A")

    // Documentation Highlights
    sectionHeader("DOCUMENTATION HIGHLIGHTS")
    const rawOutput = caseData.generated_output || caseData.edited_output || ""
    const cleanedOutput = rawOutput.replace(/<[^>]*>/g, "").replace(/[#*_~`]/g, "").trim()
    const snippet = cleanedOutput.length > 500 ? cleanedOutput.slice(0, 500) + "..." : cleanedOutput
    wrappedText(snippet || "No documentation generated yet.")

    // Recommended Talking Points
    sectionHeader("RECOMMENDED TALKING POINTS")
    const denialCat = caseData.denial_category || "the denial"
    const talkingPoints = [
      `1. Address "${denialCat}" directly by presenting supporting clinical evidence and documentation.`,
      `2. Emphasize clinical urgency and disease progression that necessitates ${caseData.requested_medication}.`,
      `3. Reference step therapy completion — outline all prior treatments attempted and their outcomes.`,
      `4. Cite relevant clinical guidelines, LCD/NCD requirements, and payer-specific criteria.`,
      `5. Highlight patient-specific factors that support medical necessity for this biologic therapy.`,
    ]
    p2pDoc.setFont("helvetica", "normal")
    p2pDoc.setFontSize(9.5)
    p2pDoc.setTextColor(30, 30, 30)
    for (const point of talkingPoints) {
      const lines = p2pDoc.splitTextToSize(point, usableWidth)
      p2pDoc.text(lines, margin, y)
      y += lines.length * 4.2 + 1.5
    }

    // Footer
    p2pDoc.setFont("helvetica", "italic")
    p2pDoc.setFontSize(8)
    p2pDoc.setTextColor(150, 150, 150)
    const footerY = p2pDoc.internal.pageSize.getHeight() - 10
    p2pDoc.text("Generated by Luma | Peer-to-Peer Review Preparation", margin, footerY)
    const caseIdText = `Case ID: ${caseData.id.slice(0, 8)}`
    const caseIdW = p2pDoc.getTextWidth(caseIdText)
    p2pDoc.text(caseIdText, pageWidth - margin - caseIdW, footerY)

    p2pDoc.save(`${caseData.patient_first_name}_${caseData.patient_last_name}_P2P_Prep.pdf`)
  }

  return {
    isP2POpen,
    setIsP2POpen,
    p2pRehearsalId,
    p2pMessages,
    p2pInput,
    setP2PInput,
    p2pStreaming,
    p2pStreamingContent,
    p2pScore,
    setP2PScore,
    p2pEnding,
    p2pStatus,
    p2pEndRef,
    p2pInputRef,
    startP2PSession,
    sendP2PMessage,
    endP2PSession,
    generateP2PSheet,
  }
}
