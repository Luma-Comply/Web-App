import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { checkRateLimit } from "@/lib/rate-limit-middleware"
import {
  validateAgainstLCD,
  LCDValidationResult,
  ChecklistEditsData,
} from "@/lib/lcd-validation"
import { WoundType, icd10ToWoundType } from "@/lib/lcd-requirements"
import { getMACInfo, isWiserActiveForSkinSubs } from "@/lib/mac-jurisdictions"
import { validateMedicalNecessity, MedicalNecessityValidationResult } from "@/lib/validation/medical-necessity-validation"
import { validateAppeal, AppealValidationResult } from "@/lib/validation/appeal-validation"
import { computeAgeTags, formatAgeTagsForPrompt, reinsertPatientName, PATIENT_PLACEHOLDER } from "@/lib/phi-utils"
import { getCachedResearch, cacheResearch } from "@/lib/research-cache"
import { ratchetMergeValidation } from "@/lib/validation/ratchet-merge"
import type { ChecklistCategory } from "@/lib/validation/validation-types"

// Unified validation result type for all doc types
type ValidationResult = LCDValidationResult | MedicalNecessityValidationResult | AppealValidationResult

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

// Timeout helper for Gemini calls (SDK doesn't support AbortSignal)
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ])
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, { limit: 10, windowMs: 60_000 })
  if (rateLimitResponse) return rateLimitResponse

  const encoder = new TextEncoder()

  // Use TransformStream for better flushing behavior
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  // Helper to send and flush events immediately
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendEvent = async (data: any) => {
    console.log('[SSE] Sending event:', JSON.stringify(data).substring(0, 200))
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  // Run generation in background (don't await)
  ;(async () => {
    let caseId: string | null = null
    try {
      const body = await request.json()
      caseId = body.caseId

      if (!caseId) {
        await sendEvent({ error: "Case ID is required" })
        await writer.close()
        return
      }

      // --- PHASE: loading_case ---
      await sendEvent({ phase: 'loading_case' })

      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        await sendEvent({ error: "Unauthorized" })
        await writer.close()
        return
      }

      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("*")
        .eq("id", caseId)
        .eq("user_id", session.user.id)
        .single()

      if (caseError || !caseData) {
        await sendEvent({ error: "Case not found" })
        await writer.close()
        return
      }

      // Mark case as generating so polling can detect when complete
      await supabase
        .from("cases")
        .update({ status: "generating" })
        .eq("id", caseId)

      const pp_apiKey = process.env.PERPLEXITY_API_KEY
      let validationResult: ValidationResult | null = null
      const isBiologicsPA = caseData.doc_type === "biologics_pa"
      const isMedicalNecessity = caseData.doc_type === "medical_necessity"
      const isAppeal = caseData.doc_type === "appeal"

      // --- PHASE: researching ---
      await sendEvent({ phase: 'researching' })

      let researchContext = "No specific payer guidelines found."

      // Format all ICD-10 codes for prompts (supports multi-code)
      const formatIcd10ForPrompt = (): string => {
        const codes = caseData.metadata?.icd10_codes as Array<{ code: string; description: string }> | undefined
        if (codes && codes.length > 0) {
          return codes.map((c: { code: string; description: string }) => `${c.code} — ${c.description}`).join("; ")
        }
        if (caseData.metadata?.icd10_code) {
          return `${caseData.metadata.icd10_code} — ${caseData.metadata.icd10_description || caseData.metadata.icd10_code}`
        }
        return caseData.diagnosis_codes?.join(", ") || "See clinical notes"
      }

      if (pp_apiKey && caseData.payer_name && caseData.payer_name !== "Unknown") {
        // Check research cache first
        const cached = await getCachedResearch(
          caseData.payer_name,
          caseData.requested_medication || "",
          caseData.patient_state || "",
          caseData.doc_type || ""
        ).catch(() => null)

        if (cached) {
          researchContext = cached.research_result
          console.log('[SSE] Using cached research, length:', researchContext.length)
        } else {
          try {
            const docTypeLabel = getDocTypeLabel(caseData.doc_type)
            const clinicalNotes = [
              caseData.disease_activity,
              caseData.prior_treatments,
              caseData.lab_values,
              caseData.diagnosis_codes?.join(", ")
            ].filter(Boolean).join("\n\n")

            // Get state-specific MAC information
            const macInfo = getMACInfo(caseData.patient_state)
            const isWiserState = isWiserActiveForSkinSubs(caseData.patient_state)
            const lcdNumber = macInfo?.lcdPolicyNumber || "L35041"

            let researchQuery: string
            if (isBiologicsPA) {
              researchQuery = `Research current Medicare Part B LCD ${lcdNumber} requirements for CTP/skin substitutes:

STATE-SPECIFIC MAC INFO:
- State: ${caseData.patient_state}
- MAC: ${macInfo?.macName || "Unknown"} (${macInfo?.jurisdiction || "Unknown"})
- LCD: ${lcdNumber}
${isWiserState ? `- WISeR Pilot: YES - PA processed by ${macInfo?.aiVendor}` : "- WISeR Pilot: NO"}

PATIENT CASE:
- ICD-10: ${formatIcd10ForPrompt()}
- CTP Product: ${caseData.requested_medication}
- Payer: ${caseData.payer_name}
CLINICAL CONTEXT: ${clinicalNotes.substring(0, 1500)}

Find for LCD ${lcdNumber} (${macInfo?.macName || "this MAC"}): LCD effective date, product coverage on THIS MAC's list, application limits, SOC failure criteria, ABI thresholds, debridement requirements, common denial reasons.`
            } else {
              researchQuery = `Research ${docTypeLabel} criteria for ${caseData.payer_name} in ${caseData.patient_state}:
Diagnosis: ${formatIcd10ForPrompt()}
Medication: ${caseData.requested_medication}
Patient: ${formatAgeTagsForPrompt(computeAgeTags(caseData.patient_age))}
Clinical context: ${clinicalNotes.substring(0, 1000)}

Find: coverage criteria, step therapy requirements, medical necessity requirements, and relevant clinical society guideline recommendations (NCCN, ACR, AAD, AGA, EULAR, AAN as applicable) including guideline name, edition/year, recommendation strength, and where the requested medication falls in the treatment algorithm.`
            }

            // Add 20 second timeout to prevent hanging
            const abortController = new AbortController()
            const timeoutId = setTimeout(() => {
              console.log('[SSE] Perplexity timeout - aborting')
              abortController.abort()
            }, 20000)
            console.log('[SSE] Starting Perplexity research call...')

            // Build state-aware system prompt for biologics PA
            const systemPrompt = isBiologicsPA
              ? `You are a Medicare LCD compliance researcher for CTP/skin substitutes. The patient is in ${caseData.patient_state} under ${macInfo?.macName || "Medicare"} (${macInfo?.jurisdiction || "unknown"}). Research LCD ${lcdNumber} requirements SPECIFIC to this MAC.${isWiserState ? ` This is a WISeR pilot state - PA processed by ${macInfo?.aiVendor}.` : ""}`
              : "You are a medical insurance researcher specializing in payer policies. In addition to payer-specific criteria, always research and cite relevant clinical society practice guidelines (NCCN, ACR, AAD, AGA, EULAR, AAN, etc.) that support the requested treatment. Include the guideline name, year/edition, and recommendation strength."

            const researchResponse = await fetch("https://api.perplexity.ai/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${pp_apiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "sonar-pro",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: researchQuery }
                ],
                temperature: 0.1
              }),
              signal: abortController.signal
            })

            clearTimeout(timeoutId)
            console.log('[SSE] Perplexity response status:', researchResponse.status)

            if (researchResponse.ok) {
              const researchData = await researchResponse.json()
              researchContext = researchData.choices[0]?.message?.content || "No research data returned."
              console.log('[SSE] Perplexity research completed, length:', researchContext.length)

              // Cache the research result (fire-and-forget)
              cacheResearch(
                caseData.payer_name,
                caseData.requested_medication || "",
                caseData.patient_state || "",
                caseData.doc_type || "",
                researchContext,
                researchData.citations || []
              ).catch(() => {})
            }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (ppError: any) {
            if (ppError.name === 'AbortError') {
              console.error("[SSE] Perplexity Call Timed Out after 20s")
            } else {
              console.error("[SSE] Perplexity Call Failed:", ppError)
            }
            // Continue with default context - don't block generation
          }
        }
      }
      console.log('[SSE] Research phase complete, moving to validating...')

      // --- PARALLEL PHASE: validation + form extraction + chat loading ---
      // These three are independent after research — run them concurrently
      await sendEvent({ phase: 'validating' })

      const clinicalNotesForValidation = [
        caseData.disease_activity,
        caseData.prior_treatments,
        caseData.lab_values,
      ].filter(Boolean).join("\n\n")

      const normalizeConfidence = (conf: string | undefined): 'high' | 'medium' | 'low' => {
        const normalized = (conf || '').toLowerCase().trim()
        if (normalized === 'high') return 'high'
        if (normalized === 'medium' || normalized === 'med') return 'medium'
        if (normalized === 'low') return 'low'
        return 'medium'
      }

      // Task 1: Validation
      const validationTask = (async () => {
        if (isBiologicsPA) {
          const primaryCode = (caseData.metadata?.icd10_codes as Array<{ code: string }> | undefined)?.[0]?.code
            || (caseData.metadata?.icd10_code as string | undefined)
          const woundTypeFromMeta = primaryCode
            ? icd10ToWoundType(primaryCode)
            : (caseData.metadata?.wound_type as WoundType | undefined)

          return await validateAgainstLCD(
            clinicalNotesForValidation,
            caseData.requested_medication || "",
            researchContext,
            woundTypeFromMeta,
            caseData.patient_state
          )
        } else if (isMedicalNecessity) {
          return await validateMedicalNecessity(
            clinicalNotesForValidation,
            caseData.requested_medication || "",
            researchContext,
            caseData.payer_name
          )
        } else if (isAppeal) {
          return await validateAppeal(
            clinicalNotesForValidation,
            caseData.requested_medication || "",
            researchContext,
            undefined,
            caseData.payer_name
          )
        }
        return null
      })().catch(err => {
        console.error("Validation Error:", err)
        return null
      })

      // Task 2: Form extraction (Gemini call)
      const formExtractionTask = (async () => {
        const formExtractionPrompt = `Identify REQUIRED forms based on payer research. Return JSON only: {"forms": [{"title": string, "description": string, "form_type": string, "confidence": string}]}

Research: ${researchContext.substring(0, 2000)}
Payer: ${caseData.payer_name}
Medication: ${caseData.requested_medication}`

        const formModel = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })

        const formResult = await withTimeout(
          formModel.generateContent(formExtractionPrompt),
          30000,
          'Form extraction'
        )
        let content = formResult.response.text() || "{}"
        content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "")

        const formsOutput = JSON.parse(content)
        const suggestedForms = formsOutput.forms || []

        if (suggestedForms.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const formsToInsert = suggestedForms.map((form: any) => ({
            case_id: caseId,
            title: form.title || 'Untitled Document',
            description: form.description || '',
            form_type: form.form_type || 'other',
            payer: caseData.payer_name,
            state: caseData.patient_state,
            confidence: normalizeConfidence(form.confidence),
            download_url: null,
            is_external: false,
            source_snippets: [],
            created_at: new Date().toISOString()
          }))

          await supabase.from("case_suggested_forms").delete().eq("case_id", caseId)
          await supabase.from("case_suggested_forms").insert(formsToInsert)
        }
      })().catch(formError => {
        console.error("Error extracting forms:", formError)
      })

      // Chat messages intentionally excluded from generation — chat is for
      // exploration/ideation; checklist edits are the structured improvement channel.

      // Task 4: Summarize long clinical notes (only if > 5K chars)
      const rawClinicalNotes = [
        caseData.disease_activity || '',
        caseData.prior_treatments || '',
        caseData.lab_values || '',
      ].join('\n\n').trim()

      const clinicalSummaryTask = (async () => {
        if (rawClinicalNotes.length <= 5000) return rawClinicalNotes

        console.log(`[SSE] Clinical notes are ${rawClinicalNotes.length} chars, summarizing...`)
        const summaryModel = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
        })

        const summaryResult = await withTimeout(
          summaryModel.generateContent(
            `Summarize these clinical notes for a prior authorization letter. Preserve ALL clinically relevant details: diagnoses, wound measurements, prior treatments and their outcomes, lab values, disease activity scores, failed therapies, and treatment timeline. Be concise but miss nothing medically important.\n\n${rawClinicalNotes}`
          ),
          20000,
          'Clinical notes summary'
        )
        const summary = summaryResult.response.text() || ""
        console.log(`[SSE] Summarized ${rawClinicalNotes.length} chars → ${summary.length} chars`)
        return summary
      })().catch(err => {
        console.error("Clinical summary failed, using truncated notes:", err)
        return rawClinicalNotes.substring(0, 6000)
      })

      // Await all four in parallel
      const [validationSettled, , clinicalNotesSummary] = await Promise.all([
        validationTask,
        formExtractionTask,
        clinicalSummaryTask,
      ])
      validationResult = validationSettled as ValidationResult | null
      await sendEvent({ phase: 'extracting_forms' })

      // --- PHASE: generating ---
      await sendEvent({ phase: 'generating' })

      // Build checklist edits context - include user's notes and addressed items
      let checklistEditsContext = ""
      const existingChecklistEdits = caseData.metadata?.checklist_edits as ChecklistEditsData | undefined
      if (existingChecklistEdits?.edits && validationResult) {
        const editEntries = Object.entries(existingChecklistEdits.edits)
        if (editEntries.length > 0) {
          const editsForPrompt: string[] = []

          // Find the item labels from the validation checklist
          const allItems = validationResult.checklist.flatMap(cat => cat.items)

          for (const [itemId, edit] of editEntries) {
            const item = allItems.find(i => i.id === itemId)
            const itemLabel = item?.label || itemId

            if (edit.marked_addressed && edit.user_notes) {
              editsForPrompt.push(`- "${itemLabel}": ADDRESSED by provider. Notes: "${edit.user_notes}"`)
            } else if (edit.marked_addressed) {
              editsForPrompt.push(`- "${itemLabel}": ADDRESSED by provider`)
            } else if (edit.user_notes) {
              editsForPrompt.push(`- "${itemLabel}": Provider notes: "${edit.user_notes}"`)
            }
          }

          if (editsForPrompt.length > 0) {
            checklistEditsContext = `\nPROVIDER CHECKLIST UPDATES (incorporate these into the documentation):\n${editsForPrompt.join('\n')}\n`
          }
        }
      }

      const guidelineConcordanceInstruction = `
GUIDELINE CONCORDANCE:
When the researched guidelines include clinical society recommendations (NCCN, ACR, AAD, AGA, EULAR, AAN, etc.), include a "Clinical Guideline Support" paragraph in the letter that names the specific guideline and edition/year, states where the requested medication falls in the treatment algorithm, cites the recommendation strength and evidence level if available, and explains how the patient's clinical presentation aligns with guideline-recommended indications. Do NOT fabricate guideline citations — only cite guidelines that appear in the researched data.`

      const systemContext = validationResult
        ? `You are an AI for ${isBiologicsPA ? 'CTP prior authorization' : isMedicalNecessity ? 'medical necessity letter' : 'appeal letter'} documentation. Generate professional medical documentation.
Validation: Risk ${validationResult.auditRisk.overallScore}, ${validationResult.summary.foundCount}/${validationResult.summary.totalRequirements} requirements met.
${!isBiologicsPA ? guidelineConcordanceInstruction : ''}
CRITICAL: Use ${PATIENT_PLACEHOLDER} as the patient name throughout. Do NOT invent or extract any patient names, dates of birth, or specific identifiers. Use generalized timeframes.`
        : `You are an AI for medical documentation. Generate professional, persuasive prior authorization letters.
${guidelineConcordanceInstruction}
CRITICAL: Use ${PATIENT_PLACEHOLDER} as the patient name throughout. Do NOT invent or extract any patient names, dates of birth, or specific identifiers. Use generalized timeframes.`

      const fullPrompt = `${systemContext}

Generate ${getDocTypeLabel(caseData.doc_type)} for:
Diagnosis: ${formatIcd10ForPrompt()}
Patient: ${PATIENT_PLACEHOLDER}, Age: ${caseData.patient_age}, ${formatAgeTagsForPrompt(computeAgeTags(caseData.patient_age))}, ${caseData.patient_state}
Payer: ${caseData.payer_name}
Medication: ${caseData.requested_medication}

RESEARCH: ${researchContext.substring(0, 3000)}
${checklistEditsContext}
CLINICAL NOTES: ${clinicalNotesSummary}

Generate a professional, persuasive prior authorization letter.

FORMAT RULES:
- Plain text only — no markdown, no bold (**), no headers (#), no brackets [].
- NEVER use square brackets [] anywhere in the output.
- NEVER include empty or placeholder fields. If you don't have data for a field, DO NOT include that line. No "Date: ", no "Policy Number: ", no "Clinic Name: ", no "Contact Phone: ", no "NPI: ", no "Tax ID: ", etc.
- DO NOT include a header block with fields like Date, Policy Number, Clinic Name, Contact Phone, Contact Fax, Referring Provider, Age Group, Medicare Eligible, Credentials, Tax ID, etc.
- DO NOT include a "RECOMMENDED SUPPORTING DOCUMENTS" section.
- The letter should begin with the payer name, then "Prior Authorization Department" or "Attention: Prior Authorization Department", then "Subject:" line, then "Patient:" line, then "Age: ${caseData.patient_age}" line, then the letter body starting with "Dear...".
- For the Age line, use the NUMERIC age (e.g., "Age: 81"), NOT the age group label like "geriatric".
- NEVER include a "Date of Birth" or "DOB" line.
- NEVER include a "Medicare ID" or "Insurance ID" line.
- NEVER include "Age Group:", "Medicare Eligible:", or "Credentials:" lines.
- Do NOT invent provider names, credentials, or contact information. If provider info is in the clinical notes or in PROVIDER CHECKLIST UPDATES, use that. If not, end with just "Sincerely," and nothing else.
- If provider checklist updates are provided above, incorporate that information into the letter.`

      const docModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 16384,
        }
      })

      let documentation = ""
      try {
        const docResult = await withTimeout(
          docModel.generateContent(fullPrompt),
          120000,
          'Documentation generation'
        )
        documentation = docResult.response.text() || ""
      } catch (firstAttemptError) {
        console.error('[SSE] Doc generation failed, retrying once...', firstAttemptError)
        const docResult = await withTimeout(
          docModel.generateContent(fullPrompt),
          120000,
          'Documentation generation (retry)'
        )
        documentation = docResult.response.text() || ""
      }

      // Re-insert patient name (replace [PATIENT] with actual name)
      documentation = reinsertPatientName(documentation, caseData.patient_first_name, caseData.patient_last_name)

      // Store raw text for safety fallback (docResult not accessible outside try/catch)
      const rawDocumentation = documentation
      const rawLength = documentation.length

      documentation = documentation
        // Remove RECOMMENDED SUPPORTING DOCUMENTS section (NOT case-insensitive to avoid matching "recommended" in body)
        .replace(/\n*^RECOMMENDED SUPPORTING DOCUMENTS\b.*$[\s\S]*$/m, '')
        .replace(/\n*^Recommended Supporting Documents\b.*$[\s\S]*$/m, '')
        // Remove DOB lines — replace with Age
        .replace(/^\s*(?:Date of Birth|DOB)\s*:.*$/gim, `Age: ${caseData.patient_age}`)
        // Remove ALL square bracket content
        .replace(/\[[^\]]*\]/g, '')
        // Remove lines that are empty labels (e.g. "Date: ", "NPI: ", "Tax ID: ")
        .replace(/^\s*(?:Date|Policy Number|Clinic Name|Contact Phone|Contact Fax|Fax|Phone|NPI|Medicare ID|Insurance ID|Member ID|Referring Provider|Referring Physician|Provider Name|Provider NPI|Age Group|Medicare Eligible|Provider Contact Information|Letterhead|Tax ID|TIN|Credentials|Contact Information)\s*:?\s*$/gim, '')
        // Remove "Contact Information: , " pattern (comma with empty values)
        .replace(/^\s*Contact Information\s*:\s*,\s*$/gim, '')
        // Remove generic provider filler
        .replace(/^\s*(?:Referring (?:Provider|Physician))\s*:\s*Advanced Wound Care Provider\s*$/gim, '')
        .replace(/^\s*Advanced Wound Care Provider\s*$/gim, '')
        .replace(/^\s*Electronically Signed\s*$/gim, '')
        // Remove invented future date lines
        .replace(/^\s*Date\s*:\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}\s*$/gim, '')
        // Remove markdown formatting
        .replace(/\*\*/g, '')
        .replace(/__/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/\*/g, '')
        // Clean up multiple blank lines
        .replace(/\n{3,}/g, '\n\n')
        .split('\n').map((line: string) => line.trim()).join('\n')
        .trim()

      // Safety check: if cleanup stripped more than 70% of content, fall back to gentle cleanup
      if (documentation.length < rawLength * 0.3 && rawLength > 500) {
        console.warn(`[SSE] Aggressive cleanup removed ${Math.round((1 - documentation.length / rawLength) * 100)}% of content. Falling back.`)
        documentation = rawDocumentation
          .replace(/\[[^\]]*\]/g, '')
          .replace(/\*\*/g, '').replace(/__/g, '').replace(/#{1,6}\s/g, '').replace(/\*/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .split('\n').map((line: string) => line.trim()).join('\n')
          .trim()
      }

      const { data: savedForms } = await supabase
        .from("case_suggested_forms")
        .select("title, description, form_type, confidence")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })

      if (savedForms && savedForms.length > 0) {
        const formsSection = `


RECOMMENDED SUPPORTING DOCUMENTS

The following documents are recommended to strengthen this prior authorization request based on payer policy research:

${savedForms.map((form, index) => {
  const confidenceLabel = form.confidence === 'high' ? '[HIGH PRIORITY]' : form.confidence === 'medium' ? '[MEDIUM PRIORITY]' : '[SUGGESTED]'
  return `${index + 1}. ${form.title} ${confidenceLabel}
   ${form.description}`
}).join('\n\n')}

Note: These recommendations are based on AI analysis of current payer policies. Please verify specific requirements with the payer before submission.`

        documentation += formsSection
      }

      // --- PHASE: saving ---
      await sendEvent({ phase: 'saving' })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        generated_output: documentation,
        edited_output: documentation,
        status: "draft",
      }

      // Save validation results for all doc types
      if (validationResult) {
        const existingChecklistEdits = caseData.metadata?.checklist_edits as ChecklistEditsData | undefined
        const existingRecommendationEdits = caseData.metadata?.recommendation_edits
        const previousFull = caseData.metadata?.lcd_validation_full as { checklist?: ChecklistCategory[] } | undefined

        if (isBiologicsPA) {
          const lcdResult = validationResult as LCDValidationResult

          // Ratchet merge: prevent score regression on regeneration
          const merged = ratchetMergeValidation({
            newChecklist: lcdResult.checklist,
            previousChecklist: previousFull?.checklist,
          })
          const stillMissingIds = new Set(
            merged.checklist.flatMap(c => c.items)
              .filter(i => ["MISSING", "PARTIAL", "VIOLATION"].includes(i.status))
              .map(i => i.id)
          )
          const mergedRecs = lcdResult.recommendations.filter(
            r => !r.sourceItemId || stillMissingIds.has(r.sourceItemId)
          )

          updateData.metadata = {
            ...caseData.metadata,
            lcd_validation: {
              run_at: new Date().toISOString(),
              risk_level: merged.auditRisk.overallScore,
              denial_probability: merged.auditRisk.estimatedDenialProbability,
              found_count: merged.summary.foundCount,
              missing_count: merged.summary.missingCount,
              detected_wound_type: lcdResult.detectedWoundType,
              ctp_covered: lcdResult.ctpProductCheck.covered,
            },
            lcd_validation_full: {
              riskLevel: merged.auditRisk.overallScore,
              denialProbability: merged.auditRisk.estimatedDenialProbability,
              foundCount: merged.summary.foundCount,
              missingCount: merged.summary.missingCount,
              totalRequirements: merged.summary.totalRequirements,
              detectedWoundType: lcdResult.detectedWoundType,
              ctpCovered: lcdResult.ctpProductCheck.covered,
              instantDenialTriggers: merged.auditRisk.instantDenialTriggers,
              veryHighRiskItems: merged.auditRisk.veryHighRiskItems,
              highRiskItems: merged.auditRisk.highRiskItems,
              checklist: merged.checklist,
              recommendations: mergedRecs,
              perplexityFindings: lcdResult.perplexityFindings,
            },
            ...(existingChecklistEdits && { checklist_edits: existingChecklistEdits }),
            ...(existingRecommendationEdits && { recommendation_edits: existingRecommendationEdits }),
          }
        } else {
          // Medical Necessity and Appeal
          const merged = ratchetMergeValidation({
            newChecklist: validationResult.checklist,
            previousChecklist: previousFull?.checklist,
          })
          const stillMissingIds = new Set(
            merged.checklist.flatMap(c => c.items)
              .filter(i => ["MISSING", "PARTIAL", "VIOLATION"].includes(i.status))
              .map(i => i.id)
          )
          const mergedRecs = validationResult.recommendations.filter(
            r => !r.sourceItemId || stillMissingIds.has(r.sourceItemId)
          )

          updateData.metadata = {
            ...caseData.metadata,
            lcd_validation: {
              run_at: new Date().toISOString(),
              risk_level: merged.auditRisk.overallScore,
              denial_probability: merged.auditRisk.estimatedDenialProbability,
              found_count: merged.summary.foundCount,
              missing_count: merged.summary.missingCount,
            },
            lcd_validation_full: {
              riskLevel: merged.auditRisk.overallScore,
              denialProbability: merged.auditRisk.estimatedDenialProbability,
              foundCount: merged.summary.foundCount,
              missingCount: merged.summary.missingCount,
              totalRequirements: merged.summary.totalRequirements,
              ctpCovered: true,
              instantDenialTriggers: merged.auditRisk.instantDenialTriggers,
              veryHighRiskItems: merged.auditRisk.veryHighRiskItems,
              highRiskItems: merged.auditRisk.highRiskItems,
              checklist: merged.checklist,
              recommendations: mergedRecs,
              perplexityFindings: validationResult.perplexityFindings,
            },
            ...(existingChecklistEdits && { checklist_edits: existingChecklistEdits }),
            ...(existingRecommendationEdits && { recommendation_edits: existingRecommendationEdits }),
          }
        }
      }

      const { error: updateError } = await supabase
        .from("cases")
        .update(updateData)
        .eq("id", caseId)

      if (updateError) {
        console.error("Failed to save documentation:", updateError)
        await sendEvent({ error: "Failed to save documentation" })
        await writer.close()
        return
      }

      // Build result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = {
        success: true,
        documentation,
      }

      if (validationResult) {
        if (isBiologicsPA) {
          const lcdResult = validationResult as LCDValidationResult
          result.validation = {
            riskLevel: lcdResult.auditRisk.overallScore,
            denialProbability: lcdResult.auditRisk.estimatedDenialProbability,
            foundCount: lcdResult.summary.foundCount,
            missingCount: lcdResult.summary.missingCount,
            totalRequirements: lcdResult.summary.totalRequirements,
            detectedWoundType: lcdResult.detectedWoundType,
            ctpCovered: lcdResult.ctpProductCheck.covered,
            instantDenialTriggers: lcdResult.auditRisk.instantDenialTriggers,
            veryHighRiskItems: lcdResult.auditRisk.veryHighRiskItems,
            highRiskItems: lcdResult.auditRisk.highRiskItems,
            checklist: lcdResult.checklist,
            recommendations: lcdResult.recommendations,
            perplexityFindings: lcdResult.perplexityFindings,
          }
        } else {
          result.validation = {
            riskLevel: validationResult.auditRisk.overallScore,
            denialProbability: validationResult.auditRisk.estimatedDenialProbability,
            foundCount: validationResult.summary.foundCount,
            missingCount: validationResult.summary.missingCount,
            totalRequirements: validationResult.summary.totalRequirements,
            ctpCovered: true,
            instantDenialTriggers: validationResult.auditRisk.instantDenialTriggers,
            veryHighRiskItems: validationResult.auditRisk.veryHighRiskItems,
            highRiskItems: validationResult.auditRisk.highRiskItems,
            checklist: validationResult.checklist,
            recommendations: validationResult.recommendations,
            perplexityFindings: validationResult.perplexityFindings,
          }
        }
      }

      // --- COMPLETE ---
      console.log('[SSE] Generation complete, sending result...')
      await sendEvent({ complete: true, result })
      await writer.write(encoder.encode("data: [DONE]\n\n"))
      await writer.close()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error in generate stream:", error)

      // Reset case status so it's not stuck at 'generating' forever
      if (caseId) {
        try {
          const supabaseCleanup = await createClient()
          await supabaseCleanup
            .from("cases")
            .update({ status: "draft" })
            .eq("id", caseId)
            .eq("status", "generating")
          console.log('[SSE] Reset case status to draft after error')
        } catch (cleanupError) {
          console.error("[SSE] Failed to reset case status:", cleanupError)
        }
      }

      try {
        await sendEvent({ error: error.message || "Generation failed" })
        await writer.close()
      } catch {
        // Writer may already be closed
      }
    }
  })()

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

function getDocTypeLabel(docType: string): string {
  switch (docType) {
    case "biologics_pa": return "Biologics Prior Authorization"
    case "medical_necessity": return "Prior Authorization Letter"
    case "appeal": return "Appeal Documentation"
    default: return "Medical Documentation"
  }
}
