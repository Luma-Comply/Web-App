import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit-middleware"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(req: NextRequest) {
  const rateLimitResponse = await checkRateLimit(req, {
    limit: 30,
    windowMs: 60_000,
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { auditId, itemLabel, itemSuggestion, itemGuidance, itemStatus } =
      await req.json()

    if (!auditId || !itemLabel) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      )
    }

    // Fetch audit data (RLS ensures ownership)
    const { data: auditData, error: dbError } = await supabase
      .from("audits")
      .select(
        "diagnosis_codes, requested_medication, medication_dose, payer_type, payer_name, patient_state, clinical_notes, doc_type",
      )
      .eq("id", auditId)
      .eq("user_id", session.user.id)
      .single()

    if (dbError || !auditData) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 })
    }

    const prompt = buildPrompt(
      auditData,
      itemLabel,
      itemSuggestion,
      itemGuidance,
      itemStatus,
    )

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
    })

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    return NextResponse.json({ suggestion: text })
  } catch (error) {
    console.error("Audit checklist action generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 },
    )
  }
}

interface AuditFields {
  diagnosis_codes: string[] | null
  requested_medication: string | null
  medication_dose: string | null
  payer_type: string | null
  payer_name: string | null
  patient_state: string | null
  clinical_notes: string | null
  doc_type: string | null
}

function buildPrompt(
  auditData: AuditFields,
  itemLabel: string,
  itemSuggestion: string | undefined,
  itemGuidance: string | undefined,
  itemStatus: string,
): string {
  const diagCodes = Array.isArray(auditData.diagnosis_codes)
    ? auditData.diagnosis_codes.join(", ")
    : "Not specified"

  // Truncate clinical notes to avoid token limits
  const clinicalExcerpt = (auditData.clinical_notes || "Not provided").substring(0, 4000)

  return `You are a medical documentation specialist helping a healthcare provider improve their clinical documentation for audit compliance with a ${auditData.payer_name || auditData.payer_type || "insurance"} payer.

CLINICAL CONTEXT:
- Diagnosis Codes: ${diagCodes}
- Clinical Documentation (excerpt): ${clinicalExcerpt}
- Requested Medication: ${auditData.requested_medication || "Not specified"}
- Medication Dose: ${auditData.medication_dose || "Not specified"}
- State: ${auditData.patient_state || "Not specified"}

AUDIT CHECKLIST REQUIREMENT:
- Requirement: ${itemLabel}
- Current Status: ${itemStatus}
${itemSuggestion ? `- Brief Suggestion: ${itemSuggestion}` : ""}
${itemGuidance ? `- Audit Guidance: ${itemGuidance}` : ""}

TASK:
Write comprehensive, copy-ready clinical documentation text that the provider can paste directly into their medical records or prior authorization letter to satisfy this specific audit requirement.

RULES:
1. Use the patient's actual clinical data provided above — reference specific diagnosis codes, lab values, treatments, and medications where relevant.
2. Write in professional clinical language appropriate for a prior authorization submission.
3. Be specific and detailed — include relevant clinical reasoning that supports medical necessity.
4. Do NOT include any dates of birth, medical record numbers, social security numbers, or other HIPAA identifiers. Use relative time references (e.g., "over the past 4 weeks" not specific dates).
5. Do NOT include headers, titles, or labels — just the documentation text itself.
6. Keep the text focused on THIS specific requirement only.
7. Aim for 2-4 paragraphs of substantive clinical documentation.
8. If the clinical data is insufficient to fully address the requirement, write what you can and note "[Provider to confirm: specific detail needed]" for any gaps.

Write the documentation text now:`
}
