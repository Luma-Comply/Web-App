"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Autocomplete } from "@/components/ui/autocomplete"
import { searchPayers } from "@/lib/payers"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Send, ThumbsUp, ThumbsDown, Bell, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react"
import type { CaseData, LCDValidationState } from "../types"
import { DENIAL_CATEGORIES } from "../types"
import type { ChecklistEdit } from "@/lib/lcd-validation"

interface CaseDialogsProps {
  caseData: CaseData

  // Edit Case Dialog
  editModalOpen: boolean
  setEditModalOpen: (open: boolean) => void
  isSavingEdits: boolean
  editFormData: {
    patient_first_name: string
    patient_last_name: string
    patient_age: string
    patient_state: string
    payer_name: string
    claim_amount: string
    disease_activity: string
  }
  setEditFormData: (data: CaseDialogsProps["editFormData"]) => void
  saveAllEdits: () => void

  // Regenerate Dialog
  regenerateModalOpen: boolean
  setRegenerateModalOpen: (open: boolean) => void
  regenerateAcknowledged: boolean
  setRegenerateAcknowledged: (ack: boolean) => void
  onRegenerate: () => void
  lcdValidation: LCDValidationState | null
  checklistEdits: Record<string, ChecklistEdit>

  // Submitted Dialog
  submittedDialogOpen: boolean
  setSubmittedDialogOpen: (open: boolean) => void
  submittedForm: {
    pa_reference_number: string
    submitted_at: string
    expected_decision_date: string
  }
  setSubmittedForm: (form: CaseDialogsProps["submittedForm"]) => void
  handleMarkAsSubmitted: () => void
  isSavingStatus: boolean

  // Approved Dialog
  approvedDialogOpen: boolean
  setApprovedDialogOpen: (open: boolean) => void
  approvedForm: {
    decision_date: string
    pa_expiration_date: string
    pa_reference_number: string
  }
  setApprovedForm: (form: CaseDialogsProps["approvedForm"]) => void
  handleMarkAsApproved: () => void

  // Denied Dialog
  deniedDialogOpen: boolean
  setDeniedDialogOpen: (open: boolean) => void
  deniedForm: {
    decision_date: string
    denial_category: string
    denial_reason: string
    denial_notes: string
  }
  setDeniedForm: (form: CaseDialogsProps["deniedForm"]) => void
  handleMarkAsDenied: () => void

  // Follow-Up Dialog
  followupDialogOpen: boolean
  setFollowupDialogOpen: (open: boolean) => void
  followupDate: string
  setFollowupDate: (date: string) => void
  handleMarkFollowUp: () => void
  isSavingFollowup: boolean
}

export function CaseDialogs(props: CaseDialogsProps) {
  const {
    // caseData intentionally not destructured — available via props if needed
    editModalOpen, setEditModalOpen, isSavingEdits, editFormData, setEditFormData, saveAllEdits,
    regenerateModalOpen, setRegenerateModalOpen, regenerateAcknowledged, setRegenerateAcknowledged, onRegenerate, lcdValidation, checklistEdits,
    submittedDialogOpen, setSubmittedDialogOpen, submittedForm, setSubmittedForm, handleMarkAsSubmitted, isSavingStatus,
    approvedDialogOpen, setApprovedDialogOpen, approvedForm, setApprovedForm, handleMarkAsApproved,
    deniedDialogOpen, setDeniedDialogOpen, deniedForm, setDeniedForm, handleMarkAsDenied,
    followupDialogOpen, setFollowupDialogOpen, followupDate, setFollowupDate, handleMarkFollowUp, isSavingFollowup,
  } = props

  // Collect addressed checklist items for regenerate dialog
  const addressedItems: { id: string; label: string; notes?: string }[] = []
  if (lcdValidation?.checklist && checklistEdits) {
    lcdValidation.checklist.forEach((category) => {
      category.items.forEach((item) => {
        const edit = checklistEdits[item.id]
        if (edit?.marked_addressed) {
          addressedItems.push({
            id: item.id,
            label: item.label,
            notes: edit.user_notes,
          })
        }
      })
    })
  }

  const hasAddressedItems = addressedItems.length > 0

  return (
    <>
      {/* Edit Case Details Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Case Details</DialogTitle>
            <DialogDescription>
              Update patient information, payer details, and clinical notes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  value={editFormData.patient_first_name}
                  onChange={(e) => setEditFormData({ ...editFormData, patient_first_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  value={editFormData.patient_last_name}
                  onChange={(e) => setEditFormData({ ...editFormData, patient_last_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={editFormData.patient_age}
                  onChange={(e) => setEditFormData({ ...editFormData, patient_age: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={editFormData.patient_state}
                  onChange={(e) => setEditFormData({ ...editFormData, patient_state: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="payer">Payer</Label>
                <Autocomplete
                  id="payer"
                  value={editFormData.payer_name}
                  onValueChange={(value) => setEditFormData({ ...editFormData, payer_name: value })}
                  onSearch={searchPayers}
                  placeholder="Start typing... e.g. Traditional Medicare, Blue Cross"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="claim-amount">Claim Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <Input
                    id="claim-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="50,000.00"
                    className="pl-7"
                    value={editFormData.claim_amount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, '')
                      const parts = raw.split('.')
                      const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw
                      const [intPart, decPart] = sanitized.split('.')
                      const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      const display = decPart !== undefined ? `${formatted}.${decPart}` : formatted
                      setEditFormData({ ...editFormData, claim_amount: display })
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="clinical-notes">Clinical Details</Label>
                <Textarea
                  id="clinical-notes"
                  rows={8}
                  value={editFormData.disease_activity}
                  onChange={(e) => setEditFormData({ ...editFormData, disease_activity: e.target.value })}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={isSavingEdits}>
              Cancel
            </Button>
            <Button onClick={saveAllEdits} disabled={isSavingEdits}>
              {isSavingEdits ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation Modal */}
      <Dialog open={regenerateModalOpen} onOpenChange={(open) => {
        setRegenerateModalOpen(open)
        if (open) {
          setRegenerateAcknowledged(false)
        }
      }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Regenerate Documentation?</DialogTitle>
            <DialogDescription>
              Your current documentation will be replaced with a new version incorporating the latest payer research, your chat conversations with Luma, and any checklist updates.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-sage-light/30 border border-sage-medium/30 rounded-lg">
              <RefreshCw className="w-5 h-5 text-mint flex-shrink-0" />
              <p className="text-sm text-gray-700">
                This will re-run payer research and generate updated documentation based on all your inputs.
              </p>
            </div>

            {hasAddressedItems && (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Addressed Checklist Items:</p>
                  <div className="max-h-40 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-3">
                    {addressedItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-mint flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-gray-700">{item.label}</p>
                          {item.notes && (
                            <p className="text-gray-500 text-xs mt-0.5 italic">&quot;{item.notes}&quot;</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      The addressed items listed above will be incorporated into the regenerated documentation as if they are met criteria.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={regenerateAcknowledged}
                    onChange={(e) => setRegenerateAcknowledged(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-mint focus:ring-mint cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    I acknowledge that the addressed items listed above will be included in the regenerated documentation. I confirm that the information I&apos;ve provided is accurate and I take responsibility for its clinical validity.
                  </span>
                </label>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={onRegenerate}
              className="bg-dark-bg hover:bg-dark-bg/90"
              disabled={hasAddressedItems && !regenerateAcknowledged}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Submitted Dialog */}
      <Dialog open={submittedDialogOpen} onOpenChange={setSubmittedDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Mark as Submitted</DialogTitle>
            <DialogDescription>
              Record that this prior authorization has been submitted to the payer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pa-ref-number">PA Reference Number</Label>
              <Input
                id="pa-ref-number"
                placeholder="Optional — payer tracking number"
                value={submittedForm.pa_reference_number}
                onChange={(e) => setSubmittedForm({ ...submittedForm, pa_reference_number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="submitted-date">Submission Date</Label>
                <Input
                  id="submitted-date"
                  type="date"
                  value={submittedForm.submitted_at}
                  onChange={(e) => setSubmittedForm({ ...submittedForm, submitted_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected-date">Expected Decision</Label>
                <Input
                  id="expected-date"
                  type="date"
                  value={submittedForm.expected_decision_date}
                  onChange={(e) => setSubmittedForm({ ...submittedForm, expected_decision_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmittedDialogOpen(false)} disabled={isSavingStatus}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsSubmitted} disabled={isSavingStatus} className="bg-blue-600 hover:bg-blue-700">
              {isSavingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {isSavingStatus ? "Saving..." : "Mark as Submitted"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Approved Dialog */}
      <Dialog open={approvedDialogOpen} onOpenChange={setApprovedDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Mark as Approved</DialogTitle>
            <DialogDescription>
              Record the payer&apos;s approval of this prior authorization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approved-decision-date">Decision Date</Label>
              <Input
                id="approved-decision-date"
                type="date"
                value={approvedForm.decision_date}
                onChange={(e) => setApprovedForm({ ...approvedForm, decision_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pa-expiration">
                PA Expiration Date <span className="text-coral">*</span>
              </Label>
              <Input
                id="pa-expiration"
                type="date"
                value={approvedForm.pa_expiration_date}
                onChange={(e) => setApprovedForm({ ...approvedForm, pa_expiration_date: e.target.value })}
              />
              <p className="text-xs text-dark-bg/50">Biologics PAs typically expire in 6-12 months</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approved-pa-ref">PA Reference Number</Label>
              <Input
                id="approved-pa-ref"
                placeholder="Payer tracking number"
                value={approvedForm.pa_reference_number}
                onChange={(e) => setApprovedForm({ ...approvedForm, pa_reference_number: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovedDialogOpen(false)} disabled={isSavingStatus}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsApproved} disabled={isSavingStatus} className="bg-green-600 hover:bg-green-700">
              {isSavingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
              {isSavingStatus ? "Saving..." : "Mark as Approved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Denied Dialog */}
      <Dialog open={deniedDialogOpen} onOpenChange={setDeniedDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Mark as Denied</DialogTitle>
            <DialogDescription>
              Record the payer&apos;s denial and capture details for potential appeal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="denied-decision-date">Decision Date</Label>
              <Input
                id="denied-decision-date"
                type="date"
                value={deniedForm.decision_date}
                onChange={(e) => setDeniedForm({ ...deniedForm, decision_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="denial-category">
                Denial Category <span className="text-coral">*</span>
              </Label>
              <select
                id="denial-category"
                value={deniedForm.denial_category}
                onChange={(e) => setDeniedForm({ ...deniedForm, denial_category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Select denial category"
              >
                <option value="">Select a category...</option>
                {DENIAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="denial-reason">
                Denial Reason <span className="text-coral">*</span>
              </Label>
              <Input
                id="denial-reason"
                placeholder="Specific reason from payer"
                value={deniedForm.denial_reason}
                onChange={(e) => setDeniedForm({ ...deniedForm, denial_reason: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="denial-notes">Additional Notes</Label>
              <Textarea
                id="denial-notes"
                rows={3}
                placeholder="Optional — any additional context or notes"
                value={deniedForm.denial_notes}
                onChange={(e) => setDeniedForm({ ...deniedForm, denial_notes: e.target.value })}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeniedDialogOpen(false)} disabled={isSavingStatus}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsDenied}
              disabled={isSavingStatus}
              className="bg-coral hover:bg-coral/90 text-white"
            >
              {isSavingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
              {isSavingStatus ? "Saving..." : "Mark as Denied"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Follow-Up Dialog */}
      <Dialog open={followupDialogOpen} onOpenChange={setFollowupDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Follow-Up</DialogTitle>
            <DialogDescription>
              Log that you contacted the payer regarding this prior authorization.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="followup-date">Follow-Up Date</Label>
              <Input
                id="followup-date"
                type="date"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowupDialogOpen(false)} disabled={isSavingFollowup}>
              Cancel
            </Button>
            <Button onClick={handleMarkFollowUp} disabled={isSavingFollowup} className="bg-blue-600 hover:bg-blue-700">
              {isSavingFollowup ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
              {isSavingFollowup ? "Saving..." : "Record Follow-Up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
