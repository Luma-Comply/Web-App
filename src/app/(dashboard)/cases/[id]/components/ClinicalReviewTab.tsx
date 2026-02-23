"use client"

import { createClient } from "@/lib/supabase/client"
import { FileText, Image, Download, FileWarning } from "lucide-react"
import type { CaseData, LCDValidationState, UploadedDoc } from "../types"

interface ClinicalReviewTabProps {
  caseData: CaseData
  lcdValidation: LCDValidationState | null
  uploadedDocs: UploadedDoc[]
}

export function ClinicalReviewTab({ caseData, lcdValidation, uploadedDocs }: ClinicalReviewTabProps) {
  const supabase = createClient()

  const missingItems = lcdValidation?.checklist
    ?.flatMap(cat => cat.items.filter(i => i.status === "MISSING" || i.status === "VIOLATION"))
    .slice(0, 10) ?? []

  return (
    <div className="space-y-6">
      {/* Patient Clinical Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-sans font-semibold text-dark-bg mb-4">Clinical Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-dark-bg/40 uppercase tracking-wide mb-1">Diagnosis Codes</p>
            <div className="flex flex-wrap gap-1.5">
              {Array.isArray(caseData.diagnosis_codes) && caseData.diagnosis_codes.length > 0
                ? caseData.diagnosis_codes.map((code, i) => (
                    <span key={i} className="text-sm px-2 py-0.5 rounded bg-gray-100 text-dark-bg font-mono">{code}</span>
                  ))
                : <p className="text-sm text-gray-400">—</p>
              }
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-dark-bg/40 uppercase tracking-wide mb-1">Medication</p>
            <p className="text-sm text-dark-bg">
              {caseData.requested_medication || "—"}
              {caseData.medication_dose && <span className="text-gray-500 ml-1">({caseData.medication_dose})</span>}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-medium text-dark-bg/40 uppercase tracking-wide mb-1">Disease Activity / Clinical Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{caseData.disease_activity || "—"}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-medium text-dark-bg/40 uppercase tracking-wide mb-1">Lab Values</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{caseData.lab_values || "—"}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-medium text-dark-bg/40 uppercase tracking-wide mb-1">Prior Treatments</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{caseData.prior_treatments || "—"}</p>
          </div>
        </div>
      </div>

      {/* Payer Requirements Gap */}
      {missingItems.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-3">
            <FileWarning className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-sans font-semibold text-dark-bg">Payer Requirements Gap</h2>
          </div>
          <ul className="space-y-2">
            {missingItems.map((item, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <span>
                  {item.label}
                  {item.suggestion && (
                    <span className="text-dark-bg/40 ml-1">— {item.suggestion}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Uploaded Documents */}
      {uploadedDocs.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-sans font-semibold text-dark-bg mb-3">Uploaded Documents</h2>
          <div className="space-y-2">
            {uploadedDocs.map((doc, index) => (
              <button
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors w-full text-left group"
                title={doc.storagePath ? `Download ${doc.filename}` : doc.filename}
                onClick={async () => {
                  if (!doc.storagePath) return
                  const { data } = await supabase.storage
                    .from('case-documents')
                    .createSignedUrl(doc.storagePath, 60, { download: doc.filename })
                  if (data?.signedUrl) {
                    window.open(data.signedUrl, '_blank')
                  }
                }}
              >
                {["png", "jpg", "jpeg"].includes(doc.fileType) ? (
                  <Image className="h-4 w-4 text-gray-500 flex-shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                )}
                <span className="text-sm text-gray-700 truncate flex-1">{doc.filename}</span>
                {doc.storagePath && (
                  <Download className="h-3.5 w-3.5 text-gray-400 group-hover:text-dark-bg transition-colors flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
