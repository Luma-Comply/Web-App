"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import jsPDF from "jspdf"
import type { CaseData } from "../types"

interface UseDocumentActionsProps {
  caseData: CaseData | null
  setCaseData: (data: CaseData) => void
  editedOutput: string
  displayPayer: string
}

export function useDocumentActions({ caseData, setCaseData, editedOutput, displayPayer }: UseDocumentActionsProps) {
  const supabase = createClient()
  const { toast } = useToast()

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [isSavingEdits, setIsSavingEdits] = useState(false)
  const [editFormData, setEditFormData] = useState({
    patient_first_name: "",
    patient_last_name: "",
    patient_age: "",
    patient_state: "",
    payer_name: "",
    claim_amount: "",
    disease_activity: "",
  })

  // Regenerate modal state
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false)
  const [regenerateAcknowledged, setRegenerateAcknowledged] = useState(false)

  // Clipboard
  const [copied, setCopied] = useState(false)

  // Open edit modal and populate form
  const openEditModal = () => {
    if (!caseData) return
    setEditFormData({
      patient_first_name: caseData.patient_first_name || "",
      patient_last_name: caseData.patient_last_name || "",
      patient_age: caseData.patient_age?.toString() || "",
      patient_state: caseData.patient_state || "",
      payer_name: caseData.payer_name || "",
      claim_amount: caseData.claim_amount && caseData.claim_amount > 0 ? caseData.claim_amount.toLocaleString('en-US') : "",
      disease_activity: caseData.disease_activity || "",
    })
    setEditModalOpen(true)
  }

  // Save all edits from modal
  async function saveAllEdits() {
    if (!caseData) {
      console.error("No case data available")
      return
    }

    if (isSavingEdits) return

    setIsSavingEdits(true)

    try {
      if (!editFormData.patient_first_name.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "First name is required." })
        setIsSavingEdits(false)
        return
      }

      if (!editFormData.patient_last_name.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Last name is required." })
        setIsSavingEdits(false)
        return
      }

      if (!editFormData.patient_age || isNaN(parseInt(editFormData.patient_age))) {
        toast({ variant: "destructive", title: "Validation Error", description: "Valid age is required." })
        setIsSavingEdits(false)
        return
      }

      if (!editFormData.patient_state.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "State is required." })
        setIsSavingEdits(false)
        return
      }

      if (!editFormData.payer_name.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Payer name is required." })
        setIsSavingEdits(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        patient_first_name: editFormData.patient_first_name.trim(),
        patient_last_name: editFormData.patient_last_name.trim(),
        patient_age: parseInt(editFormData.patient_age),
        patient_state: editFormData.patient_state.trim().toUpperCase(),
        payer_name: editFormData.payer_name.trim(),
        disease_activity: editFormData.disease_activity.trim() || "",
        metadata: {
          ...(caseData.metadata || {}),
          manually_edited: true,
        }
      }

      if (editFormData.claim_amount && editFormData.claim_amount.trim()) {
        const claimAmount = parseFloat(editFormData.claim_amount.replace(/[^0-9.]/g, ''))
        if (!isNaN(claimAmount)) {
          updateData.claim_amount = claimAmount
        }
      } else {
        updateData.claim_amount = null
      }

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error("Not authenticated. Please refresh the page and try again.")
      }

      const { data, error } = await supabase
        .from("cases")
        .update(updateData)
        .eq("id", caseData.id)
        .select()

      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(error.message || "Database update failed")
      }

      const updatedCase = data && data.length > 0 ? data[0] : { ...caseData, ...updateData }
      setCaseData(updatedCase)

      setEditModalOpen(false)

      toast({
        title: "Case Updated",
        description: "Case details have been updated successfully.",
      })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error saving case details:", error)
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error?.message || "Failed to save changes. Please try again.",
      })
    } finally {
      setIsSavingEdits(false)
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(editedOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadAsWord() {
    const blob = new Blob([editedOutput], { type: "application/msword" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${caseData?.patient_first_name}_${caseData?.patient_last_name}_documentation.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function generatePdf() {
    if (!caseData) return

    const doc = new jsPDF()
    const margin = 20
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const usableWidth = pageWidth - (margin * 2)
    let yPos = margin

    // Header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(24)
    doc.setTextColor(52, 78, 65)
    doc.text("Luma", margin, yPos + 8)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    const urlWidth = doc.getTextWidth("www.useluma.io")
    doc.text("www.useluma.io", pageWidth - margin - urlWidth, yPos + 8)

    yPos += 20

    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 15

    // Document Info
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)

    const dateStr = new Date().toLocaleDateString()
    doc.text(`Date: ${dateStr}`, margin, yPos)
    doc.text(`Patient: ${caseData.patient_first_name} ${caseData.patient_last_name}`, margin, yPos + 5)
    doc.text(`DOB/Age: ${caseData.patient_age} | State: ${caseData.patient_state}`, margin, yPos + 10)

    const payerText = `Payer: ${displayPayer || "N/A"}`
    const payerWidth = doc.getTextWidth(payerText)
    doc.text(payerText, pageWidth - margin - payerWidth, yPos)

    const idText = `Case ID: ${caseData.id.slice(0, 8)}`
    const idWidth = doc.getTextWidth(idText)
    doc.text(idText, pageWidth - margin - idWidth, yPos + 5)

    yPos += 20

    // Body Content
    doc.setFont("times", "normal")
    doc.setFontSize(10.5)

    const splitText = doc.splitTextToSize(editedOutput, usableWidth)
    const lineHeight = 5
    const textHeight = splitText.length * lineHeight
    const spaceRemaining = pageHeight - yPos - margin

    if (textHeight > spaceRemaining) {
      doc.setFontSize(9)
      const compressedSplit = doc.splitTextToSize(editedOutput, usableWidth)
      doc.text(compressedSplit, margin, yPos)
    } else {
      doc.text(splitText, margin, yPos)
    }

    // Footer
    doc.setFont("helvetica", "italic")
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text("Generated by Luma | Professional Medical Documentation", margin, pageHeight - 10)

    doc.save(`${caseData.patient_first_name}_${caseData.patient_last_name}_Medical_Necessity.pdf`)
  }

  return {
    // Edit modal
    editModalOpen,
    setEditModalOpen,
    isSavingEdits,
    editFormData,
    setEditFormData,
    openEditModal,
    saveAllEdits,

    // Regenerate modal
    regenerateModalOpen,
    setRegenerateModalOpen,
    regenerateAcknowledged,
    setRegenerateAcknowledged,

    // Clipboard & download
    copied,
    copyToClipboard,
    downloadAsWord,
    generatePdf,
  }
}
