"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { CaseData } from "../types"
import { formatDate, toInputDateStr, addBusinessDays } from "../utils"

interface UseStatusActionsProps {
  caseData: CaseData | null
  setCaseData: (data: CaseData) => void
}

export function useStatusActions({ caseData, setCaseData }: UseStatusActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // Dialog state
  const [submittedDialogOpen, setSubmittedDialogOpen] = useState(false)
  const [approvedDialogOpen, setApprovedDialogOpen] = useState(false)
  const [deniedDialogOpen, setDeniedDialogOpen] = useState(false)
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [isSavingFollowup, setIsSavingFollowup] = useState(false)

  // Renewal state
  const [isStartingRenewal, setIsStartingRenewal] = useState(false)

  // Appeal state
  const [isCreatingAppeal, setIsCreatingAppeal] = useState(false)

  // Form state
  const [submittedForm, setSubmittedForm] = useState({
    pa_reference_number: "",
    submitted_at: toInputDateStr(new Date()),
    expected_decision_date: toInputDateStr(addBusinessDays(new Date(), 7)),
  })
  const [approvedForm, setApprovedForm] = useState({
    decision_date: toInputDateStr(new Date()),
    pa_expiration_date: "",
    pa_reference_number: "",
  })
  const [deniedForm, setDeniedForm] = useState({
    decision_date: toInputDateStr(new Date()),
    denial_category: "" as string,
    denial_reason: "",
    denial_notes: "",
  })
  const [followupDate, setFollowupDate] = useState(toInputDateStr(new Date()))

  // Dialog openers
  function openSubmittedDialog() {
    setSubmittedForm({
      pa_reference_number: caseData?.pa_reference_number || "",
      submitted_at: toInputDateStr(new Date()),
      expected_decision_date: toInputDateStr(addBusinessDays(new Date(), 7)),
    })
    setSubmittedDialogOpen(true)
  }

  function openApprovedDialog() {
    setApprovedForm({
      decision_date: toInputDateStr(new Date()),
      pa_expiration_date: "",
      pa_reference_number: caseData?.pa_reference_number || "",
    })
    setApprovedDialogOpen(true)
  }

  function openDeniedDialog() {
    setDeniedForm({
      decision_date: toInputDateStr(new Date()),
      denial_category: "",
      denial_reason: "",
      denial_notes: "",
    })
    setDeniedDialogOpen(true)
  }

  // Status handlers
  async function handleMarkAsSubmitted() {
    if (!caseData || isSavingStatus) return
    setIsSavingStatus(true)
    try {
      const { error } = await supabase
        .from("cases")
        .update({
          status: "submitted",
          pa_reference_number: submittedForm.pa_reference_number.trim() || null,
          submitted_at: new Date(submittedForm.submitted_at + "T12:00:00").toISOString(),
          expected_decision_date: submittedForm.expected_decision_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseData.id)

      if (error) throw error

      setCaseData({
        ...caseData,
        status: "submitted",
        pa_reference_number: submittedForm.pa_reference_number.trim() || null,
        submitted_at: new Date(submittedForm.submitted_at + "T12:00:00").toISOString(),
        expected_decision_date: submittedForm.expected_decision_date || null,
        updated_at: new Date().toISOString(),
      })
      setSubmittedDialogOpen(false)
      toast({ title: "Status Updated", description: "Case marked as submitted to payer." })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({ variant: "destructive", title: "Update Failed", description: error?.message || "Failed to update status." })
    } finally {
      setIsSavingStatus(false)
    }
  }

  async function handleMarkAsApproved() {
    if (!caseData || isSavingStatus) return
    if (!approvedForm.pa_expiration_date) {
      toast({ variant: "destructive", title: "Validation Error", description: "PA expiration date is required." })
      return
    }
    setIsSavingStatus(true)
    try {
      const { error } = await supabase
        .from("cases")
        .update({
          status: "approved",
          decision_date: new Date(approvedForm.decision_date + "T12:00:00").toISOString(),
          pa_expiration_date: approvedForm.pa_expiration_date,
          pa_reference_number: approvedForm.pa_reference_number.trim() || caseData.pa_reference_number,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseData.id)

      if (error) throw error

      setCaseData({
        ...caseData,
        status: "approved",
        decision_date: new Date(approvedForm.decision_date + "T12:00:00").toISOString(),
        pa_expiration_date: approvedForm.pa_expiration_date,
        pa_reference_number: approvedForm.pa_reference_number.trim() || caseData.pa_reference_number,
        updated_at: new Date().toISOString(),
      })
      setApprovedDialogOpen(false)
      toast({ title: "Status Updated", description: "Case marked as approved." })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({ variant: "destructive", title: "Update Failed", description: error?.message || "Failed to update status." })
    } finally {
      setIsSavingStatus(false)
    }
  }

  async function handleMarkAsDenied() {
    if (!caseData || isSavingStatus) return
    if (!deniedForm.denial_category) {
      toast({ variant: "destructive", title: "Validation Error", description: "Denial category is required." })
      return
    }
    if (!deniedForm.denial_reason.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Denial reason is required." })
      return
    }
    setIsSavingStatus(true)
    try {
      const { error } = await supabase
        .from("cases")
        .update({
          status: "denied",
          decision_date: new Date(deniedForm.decision_date + "T12:00:00").toISOString(),
          denial_category: deniedForm.denial_category,
          denial_reason: deniedForm.denial_reason.trim(),
          denial_notes: deniedForm.denial_notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseData.id)

      if (error) throw error

      setCaseData({
        ...caseData,
        status: "denied",
        decision_date: new Date(deniedForm.decision_date + "T12:00:00").toISOString(),
        denial_category: deniedForm.denial_category,
        denial_reason: deniedForm.denial_reason.trim(),
        denial_notes: deniedForm.denial_notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      setDeniedDialogOpen(false)
      toast({ title: "Status Updated", description: "Case marked as denied." })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast({ variant: "destructive", title: "Update Failed", description: error?.message || "Failed to update status." })
    } finally {
      setIsSavingStatus(false)
    }
  }

  async function handleMarkFollowUp() {
    if (!caseData || isSavingFollowup) return
    setIsSavingFollowup(true)
    try {
      const dateValue = new Date(followupDate + "T12:00:00").toISOString()
      const { error } = await supabase
        .from("cases")
        .update({
          followup_date: dateValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseData.id)

      if (error) throw error

      setCaseData({
        ...caseData,
        followup_date: dateValue,
        updated_at: new Date().toISOString(),
      })
      setFollowupDialogOpen(false)
      toast({ title: "Follow-Up Recorded", description: `Follow-up logged for ${formatDate(followupDate)}.` })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error saving follow-up:", error)
      toast({ variant: "destructive", title: "Save Failed", description: error?.message || "Failed to record follow-up." })
    } finally {
      setIsSavingFollowup(false)
    }
  }

  async function handleStartRenewal() {
    if (!caseData || isStartingRenewal) return
    setIsStartingRenewal(true)
    try {
      const { data, error } = await supabase
        .from("cases")
        .insert({
          user_id: caseData.user_id,
          doc_type: caseData.doc_type,
          status: "draft",
          parent_case_id: caseData.id,
          patient_first_name: caseData.patient_first_name,
          patient_last_name: caseData.patient_last_name,
          patient_age: caseData.patient_age,
          patient_state: caseData.patient_state,
          patient_gender: caseData.patient_gender,
          diagnosis_codes: caseData.diagnosis_codes,
          disease_activity: caseData.disease_activity,
          lab_values: caseData.lab_values,
          prior_treatments: caseData.prior_treatments,
          requested_medication: caseData.requested_medication,
          medication_dose: caseData.medication_dose,
          payer_type: caseData.payer_type,
          payer_name: caseData.payer_name,
          claim_amount: caseData.claim_amount,
        })
        .select("id")
        .single()

      if (error) throw error

      toast({ title: "Renewal Case Created", description: "Navigate to the new case to generate updated documentation." })
      router.push(`/cases/${data.id}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error creating renewal case:", error)
      toast({ variant: "destructive", title: "Renewal Failed", description: error?.message || "Failed to create renewal case." })
    } finally {
      setIsStartingRenewal(false)
    }
  }

  async function handleCreateAppeal() {
    if (!caseData || isCreatingAppeal) return
    setIsCreatingAppeal(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated.")

      const { data, error } = await supabase
        .from("cases")
        .insert({
          user_id: session.user.id,
          doc_type: "appeal",
          parent_case_id: caseData.id,
          status: "draft",
          patient_first_name: caseData.patient_first_name,
          patient_last_name: caseData.patient_last_name,
          patient_age: caseData.patient_age,
          patient_state: caseData.patient_state,
          patient_gender: caseData.patient_gender,
          diagnosis_codes: caseData.diagnosis_codes,
          disease_activity: caseData.disease_activity,
          lab_values: caseData.lab_values,
          prior_treatments: caseData.prior_treatments,
          requested_medication: caseData.requested_medication,
          medication_dose: caseData.medication_dose,
          payer_type: caseData.payer_type,
          payer_name: caseData.payer_name,
          claim_amount: caseData.claim_amount,
          metadata: {
            creation_method: "appeal_from_denied",
            original_case_id: caseData.id,
            original_denial_category: caseData.denial_category,
            original_denial_reason: caseData.denial_reason,
          },
        })
        .select("id")
        .single()

      if (error) throw error
      toast({ title: "Appeal Created", description: "Navigating to appeal case..." })
      router.push(`/cases/${data.id}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error creating appeal:", error)
      toast({ variant: "destructive", title: "Appeal Failed", description: error?.message || "Failed to create appeal case." })
    } finally {
      setIsCreatingAppeal(false)
    }
  }

  return {
    // Dialog state
    submittedDialogOpen,
    setSubmittedDialogOpen,
    approvedDialogOpen,
    setApprovedDialogOpen,
    deniedDialogOpen,
    setDeniedDialogOpen,
    followupDialogOpen,
    setFollowupDialogOpen,
    isSavingStatus,
    isSavingFollowup,

    // Renewal / Appeal
    isStartingRenewal,
    isCreatingAppeal,

    // Form state
    submittedForm,
    setSubmittedForm,
    approvedForm,
    setApprovedForm,
    deniedForm,
    setDeniedForm,
    followupDate,
    setFollowupDate,

    // Dialog openers
    openSubmittedDialog,
    openApprovedDialog,
    openDeniedDialog,

    // Handlers
    handleMarkAsSubmitted,
    handleMarkAsApproved,
    handleMarkAsDenied,
    handleMarkFollowUp,
    handleStartRenewal,
    handleCreateAppeal,
  }
}
