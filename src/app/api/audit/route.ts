import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateForAudit } from "@/lib/validation/audit-validation"
import { getCachedResearch, cacheResearch } from "@/lib/research-cache"
import { computeAgeTags, formatAgeTagsForPrompt } from "@/lib/phi-utils"

interface AuditRequestBody {
  caseId?: string
  manualInput?: {
    patientFirstName?: string
    patientLastName?: string
    patientAge?: number
    diagnosisCodes: string[]
    requestedMedication: string
    medicationDose: string
    payerName: string
    payerType: string
    patientState: string
    docType: string
    clinicalNotes: string
  }
  documentTexts?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AuditRequestBody

    // Auth check
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Resolve input data from case or manual entry
    let medication = ""
    let medicationDose = ""
    let payerName = ""
    let payerType = ""
    let patientState = ""
    let docType = "medical_necessity"
    let clinicalNotes = ""
    let diagnosisCodes: string[] = []
    let caseId: string | null = null
    let patientAge: number | undefined
    let patientFirstName = ""
    let patientLastName = ""

    if (body.caseId) {
      // Pull data from existing case
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("*")
        .eq("id", body.caseId)
        .eq("user_id", session.user.id)
        .single()

      if (caseError || !caseData) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 })
      }

      caseId = caseData.id
      patientFirstName = caseData.patient_first_name || ""
      patientLastName = caseData.patient_last_name || ""
      medication = caseData.requested_medication || ""
      medicationDose = caseData.medication_dose || ""
      payerName = caseData.payer_name || ""
      payerType = caseData.payer_type || ""
      patientState = caseData.patient_state || ""
      docType = caseData.doc_type || "medical_necessity"
      patientAge = caseData.patient_age
      diagnosisCodes = caseData.diagnosis_codes || []

      // Aggregate clinical notes from case fields
      clinicalNotes = [
        caseData.generated_output || caseData.edited_output,
        caseData.disease_activity ? `Disease Activity: ${caseData.disease_activity}` : "",
        caseData.lab_values ? `Lab Values: ${caseData.lab_values}` : "",
        caseData.prior_treatments ? `Prior Treatments: ${caseData.prior_treatments}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    } else if (body.manualInput) {
      patientFirstName = body.manualInput.patientFirstName || ""
      patientLastName = body.manualInput.patientLastName || ""
      medication = body.manualInput.requestedMedication || ""
      medicationDose = body.manualInput.medicationDose || ""
      payerName = body.manualInput.payerName || ""
      payerType = body.manualInput.payerType || ""
      patientState = body.manualInput.patientState || ""
      docType = body.manualInput.docType || "medical_necessity"
      clinicalNotes = body.manualInput.clinicalNotes || ""
      diagnosisCodes = body.manualInput.diagnosisCodes || []
      patientAge = body.manualInput.patientAge ?? undefined
    } else {
      return NextResponse.json(
        { error: "Either caseId or manualInput is required" },
        { status: 400 }
      )
    }

    // Append uploaded document text if provided
    if (body.documentTexts && body.documentTexts.length > 0) {
      const docText = body.documentTexts.join("\n\n--- DOCUMENT BREAK ---\n\n")
      clinicalNotes = clinicalNotes
        ? `${clinicalNotes}\n\n--- UPLOADED DOCUMENTS ---\n${docText}`
        : docText
    }

    if (!clinicalNotes.trim()) {
      return NextResponse.json(
        { error: "No clinical documentation provided for audit" },
        { status: 400 }
      )
    }

    // --- STEP 1: RESEARCH WITH PERPLEXITY ---
    let researchContext = "No specific payer guidelines found."
    const pp_apiKey = process.env.PERPLEXITY_API_KEY

    if (pp_apiKey && payerName && payerName !== "Unknown" && medication) {
      // Check cache first
      const cached = await getCachedResearch(
        payerName,
        medication,
        patientState,
        docType
      ).catch(() => null)

      if (cached) {
        researchContext = cached.research_result
      } else {
        try {
          const ageContext = patientAge
            ? formatAgeTagsForPrompt(computeAgeTags(patientAge))
            : "Age: Not specified"

          const researchQuery = `Research current coverage criteria and audit requirements for:

PAYER: ${payerName} (${payerType})
MEDICATION: ${medication}${medicationDose ? ` - ${medicationDose}` : ""}
STATE: ${patientState}
DIAGNOSIS CODES: ${diagnosisCodes.join(", ") || "Not specified"}
PATIENT: ${ageContext}

Find:
1. Coverage criteria for this medication
2. Step therapy / prior treatment requirements
3. Documentation requirements for audit compliance
4. Common denial reasons and audit flags
5. JW/JZ modifier requirements if applicable
6. Recent policy changes or audit focus areas`

          const maxRetries = 3
          let researchResponse: Response | null = null
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            researchResponse = await fetch(
              "https://api.perplexity.ai/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${pp_apiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "sonar-pro",
                  messages: [
                    {
                      role: "system",
                      content:
                        "You are an expert medical insurance auditor researching documentation compliance requirements. Find current payer-specific criteria, audit focus areas, and common documentation deficiencies that lead to claim denials.",
                    },
                    { role: "user", content: researchQuery },
                  ],
                  temperature: 0.1,
                }),
              }
            )

            if (researchResponse.status !== 429) break
            const backoffMs = 1000 * Math.pow(2, attempt)
            await new Promise((r) => setTimeout(r, backoffMs))
          }

          if (researchResponse?.ok) {
            const researchData = await researchResponse.json()
            researchContext =
              researchData.choices[0]?.message?.content ||
              "No research data returned."

            // Cache research result (fire-and-forget)
            cacheResearch(
              payerName,
              medication,
              patientState,
              docType,
              researchContext,
              researchData.citations || []
            ).catch(() => {})
          }
        } catch (ppError) {
          console.error("[Audit] Perplexity research failed:", ppError)
        }
      }
    }

    // --- STEP 2: VALIDATE WITH GEMINI ---
    const validationResult = await validateForAudit(
      clinicalNotes,
      medication,
      researchContext,
      docType,
      undefined, // uploadedDocText already merged into clinicalNotes
      payerName
    )

    // --- STEP 3: SAVE TO DATABASE ---
    const { data: audit, error: insertError } = await supabase
      .from("audits")
      .insert({
        user_id: session.user.id,
        case_id: caseId,
        patient_first_name: patientFirstName || null,
        patient_last_name: patientLastName || null,
        patient_age: patientAge || null,
        doc_type: docType,
        diagnosis_codes: diagnosisCodes,
        requested_medication: medication,
        medication_dose: medicationDose,
        payer_name: payerName,
        payer_type: payerType,
        patient_state: patientState,
        clinical_notes: clinicalNotes.substring(0, 50000), // cap storage
        audit_results: validationResult,
        risk_level: validationResult.auditRisk.overallScore,
        denial_probability: validationResult.auditRisk.estimatedDenialProbability,
        found_count: validationResult.summary.foundCount,
        missing_count: validationResult.summary.missingCount,
        total_requirements: validationResult.summary.totalRequirements,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("[Audit] Failed to save audit:", insertError)
      // Still return results even if save fails
      return NextResponse.json({
        auditId: null,
        results: validationResult,
      })
    }

    return NextResponse.json({
      auditId: audit.id,
      results: validationResult,
    })
  } catch (error) {
    console.error("[Audit] Unexpected error:", error)
    return NextResponse.json(
      { error: "Failed to run audit" },
      { status: 500 }
    )
  }
}
