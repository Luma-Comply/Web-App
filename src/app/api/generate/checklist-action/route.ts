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

    const { caseId, itemLabel, itemSuggestion, itemGuidance, itemStatus } =
      await req.json()

    if (!caseId || !itemLabel) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      )
    }

    // Fetch case data (RLS ensures ownership)
    const { data: caseData, error: dbError } = await supabase
      .from("cases")
      .select(
        "diagnosis_codes, disease_activity, lab_values, prior_treatments, requested_medication, medication_dose, payer_type, payer_name, doc_type, patient_age, patient_state, patient_gender",
      )
      .eq("id", caseId)
      .single()

    if (dbError || !caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    const prompt = buildPrompt(
      caseData,
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
    console.error("Checklist action generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 },
    )
  }
}

interface CaseFields {
  diagnosis_codes: string[]
  disease_activity: string
  lab_values: string
  prior_treatments: string
  requested_medication: string
  medication_dose: string
  payer_type: string
  payer_name: string
  doc_type: string
  patient_age: number
  patient_state: string
  patient_gender: string | null
}

function buildPrompt(
  caseData: CaseFields,
  itemLabel: string,
  itemSuggestion: string | undefined,
  itemGuidance: string | undefined,
  itemStatus: string,
): string {
  const diagCodes = Array.isArray(caseData.diagnosis_codes)
    ? caseData.diagnosis_codes.join(", ")
    : caseData.diagnosis_codes || "Not specified"

  return `You are a medical documentation specialist helping a healthcare provider write prior authorization documentation for a ${caseData.payer_name || caseData.payer_type || "insurance"} payer.

PATIENT CONTEXT:
- Age: ${caseData.patient_age} years old
- State: ${caseData.patient_state}
- Gender: ${caseData.patient_gender || "Not specified"}
- Diagnosis Codes: ${diagCodes}
- Clinical Notes / Disease Activity: ${caseData.disease_activity || "Not provided"}
- Lab Values: ${caseData.lab_values || "Not provided"}
- Prior Treatments: ${caseData.prior_treatments || "Not provided"}
- Requested Medication: ${caseData.requested_medication || "Not specified"}
- Medication Dose: ${caseData.medication_dose || "Not specified"}
- Document Type: ${caseData.doc_type}

CHECKLIST REQUIREMENT:
- Requirement: ${itemLabel}
- Current Status: ${itemStatus}
${itemSuggestion ? `- Brief Suggestion: ${itemSuggestion}` : ""}
${itemGuidance ? `- LCD Guidance: ${itemGuidance}` : ""}

TASK:
Write comprehensive, copy-ready clinical documentation text that the provider can paste directly into their medical records or prior authorization letter to satisfy this specific requirement.

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
