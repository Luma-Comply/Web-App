import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  validateAgainstLCD,
  LCDValidationResult,
  ChecklistEditsData,
  PerplexityFindings,
} from "@/lib/lcd-validation"
import { ResearchFindings } from "@/lib/validation/validation-types"
import { WoundType, icd10ToWoundType } from "@/lib/lcd-requirements"
import { getMACInfo, buildStateSpecificContext, isWiserActiveForSkinSubs } from "@/lib/mac-jurisdictions"
import { validateMedicalNecessity, MedicalNecessityValidationResult } from "@/lib/validation/medical-necessity-validation"
import { validateAppeal, AppealValidationResult } from "@/lib/validation/appeal-validation"
import { computeAgeTags, formatAgeTagsForPrompt, reinsertPatientName, PATIENT_PLACEHOLDER } from "@/lib/phi-utils"
import { getCachedResearch, cacheResearch } from "@/lib/research-cache"

// Unified validation result type for all doc types
type ValidationResult = LCDValidationResult | MedicalNecessityValidationResult | AppealValidationResult

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const { caseId, chatContext } = await request.json()

    if (!caseId) {
      return NextResponse.json({ error: "Case ID is required" }, { status: 400 })
    }

    // Get Supabase client
    const supabase = await createClient()

    // Get user session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get case data
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .eq("user_id", session.user.id)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    const pp_apiKey = process.env.PERPLEXITY_API_KEY

    // Track validation results for all doc types
    let validationResult: ValidationResult | null = null
    const isBiologicsPA = caseData.doc_type === "biologics_pa"
    const isMedicalNecessity = caseData.doc_type === "medical_necessity"
    const isAppeal = caseData.doc_type === "appeal"

    // --- STEP 1: RESEARCH WITH PERPLEXITY ---
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
        console.log("Using cached research, length:", researchContext.length)
      } else {
      try {
        const docTypeLabel = getDocTypeLabel(caseData.doc_type)

        // Build comprehensive research query with all patient and case information
        const clinicalNotes = [
          caseData.disease_activity,
          caseData.prior_treatments,
          caseData.lab_values,
          caseData.diagnosis_codes?.join(", ")
        ].filter(Boolean).join("\n\n")

        console.log(`Researching payer: ${caseData.payer_name} for ${caseData.requested_medication} - Document Type: ${docTypeLabel} - State: ${caseData.patient_state}`)

        // Use CTP-specific query for Biologics PA
        let researchQuery: string

        if (isBiologicsPA) {
          // Get state-specific MAC information
          const macInfo = getMACInfo(caseData.patient_state)
          const stateContext = buildStateSpecificContext(caseData.patient_state)
          const isWiserState = isWiserActiveForSkinSubs(caseData.patient_state)
          const lcdNumber = macInfo?.lcdPolicyNumber || "L35041"

          // Enhanced CTP/wound care specific query with state-specific MAC info
          researchQuery = `Research current Medicare Part B LCD ${lcdNumber} requirements for CTP/skin substitutes (Cellular Tissue Products):

${stateContext}

CRITICAL: This patient is in ${caseData.patient_state}. Research the SPECIFIC LCD requirements for ${macInfo?.macName || "their MAC"} (Jurisdiction ${macInfo?.jurisdiction || "unknown"}).
${isWiserState ? `\nIMPORTANT: ${caseData.patient_state} is a WISeR pilot state. Prior Authorization will be processed by ${macInfo?.aiVendor}. Documentation must meet AI review standards.` : ""}

CRITICAL AUDIT QUESTIONS (Answer all for LCD ${lcdNumber}):
1. Is "${caseData.requested_medication}" on the current ${macInfo?.macName || "Medicare"} covered CTP list? (LCD Attachment A for ${lcdNumber})
2. What is the current LCD ${lcdNumber} effective date and any changes since November 2024?
3. What are the CURRENT application limits for ${macInfo?.macName || "this MAC"}? (Check for 8 application limit with KX modifier for 5-8)
4. What triggers the KX modifier requirement under ${lcdNumber}?
5. What are the SOC failure criteria for the patient's wound type (50% area reduction rule after 4 weeks)?
6. What ABI threshold indicates ischemia (non-coverage threshold) for ${macInfo?.macName || "this MAC"}?
7. What are current audit focus areas for CTPs under ${macInfo?.macName || "this MAC"} in ${new Date().getFullYear()}?
8. Any recent OIG work plan items targeting skin substitutes?
9. What are common documentation failures causing CTP denials under LCD ${lcdNumber}?
10. What specific debridement and vascular testing requirements does ${macInfo?.macName || "this MAC"} require?

PATIENT CASE:
- ICD-10: ${formatIcd10ForPrompt()}
- CTP Product: ${caseData.requested_medication}
- Dose/Size: ${caseData.medication_dose || "Not specified"}
- State: ${caseData.patient_state}
- MAC: ${macInfo?.macName || "Unknown"} (${macInfo?.jurisdiction || "Unknown"})
- LCD: ${lcdNumber}
- Payer: ${caseData.payer_name} (${caseData.payer_type})
- ${formatAgeTagsForPrompt(computeAgeTags(caseData.patient_age))}
- WISeR Pilot State: ${isWiserState ? "YES - PA Required" : "NO"}

CLINICAL CONTEXT (abbreviated):
${clinicalNotes.substring(0, 1500)}

RETURN FORMAT (include all if found):
- MAC_JURISDICTION: ${macInfo?.jurisdiction || "[identify]"}
- LCD_POLICY_NUMBER: ${lcdNumber}
- LCD_EFFECTIVE_DATE: [date]
- PRODUCT_COVERED: [YES/NO/VERIFY] (check ${macInfo?.macName || "MAC"} covered list)
- APPLICATION_LIMIT: [number]
- RECENT_LCD_CHANGES: [list any changes specific to ${lcdNumber}]
- AUDIT_FOCUS_AREAS: [current audit targets for ${macInfo?.macName || "this MAC"}]
- SOC_FAILURE_CRITERIA: [specific requirements]
- DOCUMENTATION_GAPS_CAUSING_DENIALS: [common failures]
- ABI_THRESHOLD: [value]
- KX_MODIFIER_RULES: [when required]
- DEBRIDEMENT_REQUIREMENTS: [specific to ${macInfo?.macName || "MAC"}]
- VASCULAR_TESTING_REQUIREMENTS: [specific to ${macInfo?.macName || "MAC"}]`
        } else {
          // Standard query for non-CTP cases
          researchQuery = `Research and find the specific ${docTypeLabel} criteria and requirements for the following case:

PATIENT INFORMATION:
- ${formatAgeTagsForPrompt(computeAgeTags(caseData.patient_age))}
- State: ${caseData.patient_state}
- Gender: ${caseData.patient_gender || 'Not specified'}

DOCUMENT TYPE:
${docTypeLabel}

PAYER INFORMATION:
- Payer: ${caseData.payer_name}
- Payer Type: ${caseData.payer_type}

MEDICATION REQUEST:
- Medication: ${caseData.requested_medication}
- Dose: ${caseData.medication_dose || 'Not specified'}

DIAGNOSIS:
${formatIcd10ForPrompt()}

CLINICAL NOTES:
${clinicalNotes || "No clinical notes provided"}

CRITICAL: Research ${caseData.payer_name}'s policy specifically for ${caseData.patient_state} state, as payer policies vary significantly by state. Find:
1. State-specific coverage criteria for ${caseData.patient_state}
2. Required diagnosis codes for this medication
3. Step therapy requirements (prior treatment failures needed)
4. Disease severity criteria
5. Age-group-specific considerations (${computeAgeTags(caseData.patient_age).age_group} patient${computeAgeTags(caseData.patient_age).is_medicare_eligible ? ', Medicare eligible' : ''})
6. Medical necessity requirements for ${docTypeLabel}
7. Any state-specific prior authorization requirements
8. Clinical society guideline recommendations (e.g., NCCN, ACR, AAD, AGA, EULAR, AAN as applicable to the diagnosis) — include guideline name, edition/year, and where the requested medication falls in the treatment algorithm
9. Strength of recommendation and level of evidence from applicable clinical society guidelines

Focus on the most current policy bulletins and clinical coverage guidelines for ${caseData.payer_name} in ${caseData.patient_state}.`
        }

        // Use CTP-specific system prompt for biologics PA with state-specific MAC info
        const macInfoForPrompt = getMACInfo(caseData.patient_state)
        const systemContent = isBiologicsPA
          ? `You are an expert Medicare LCD compliance researcher specializing in CTP (Cellular Tissue Products) / skin substitutes for wound care.

CRITICAL: The patient is in ${caseData.patient_state}, which falls under ${macInfoForPrompt?.macName || "Medicare"} (Jurisdiction ${macInfoForPrompt?.jurisdiction || "unknown"}).
Research the SPECIFIC LCD ${macInfoForPrompt?.lcdPolicyNumber || "L35041"} requirements for THIS MAC - different MACs have different LCD policy numbers and requirements.

${isWiserActiveForSkinSubs(caseData.patient_state) ? `IMPORTANT: ${caseData.patient_state} is a WISeR pilot state (2026). Prior Authorization is processed by ${macInfoForPrompt?.aiVendor}. Claims without PA go to 100% pre-payment review.` : ""}

Focus on: LCD requirements specific to this MAC, covered product list, current audit focus areas, debridement requirements, vascular testing thresholds, and documentation requirements. Be specific about coverage criteria, SOC failure requirements, and common denial reasons for this specific MAC jurisdiction.`
          : "You are an expert medical insurance researcher specializing in state-specific payer policies. Find the most current clinical coverage guidelines, policy bulletins, and medical necessity criteria. Pay special attention to state-specific variations as payer policies differ significantly by state (e.g., Cigna in California vs Texas). In addition to payer-specific criteria, always research and cite relevant clinical society practice guidelines (NCCN, ACR, AAD, AGA, EULAR, AAN, etc.) that support the requested treatment. Include the guideline name, year/edition, and recommendation strength. Be comprehensive, factual, and include all relevant criteria."

        // Retry with exponential backoff for rate limits (429)
        const maxRetries = 3
        let researchResponse: Response | null = null
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          researchResponse = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${pp_apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "sonar-pro",
              messages: [
                {
                  role: "system",
                  content: systemContent
                },
                {
                  role: "user",
                  content: researchQuery
                }
              ],
              temperature: 0.1
            })
          })

          if (researchResponse.status !== 429) break
          const backoffMs = 1000 * Math.pow(2, attempt) // 1s, 2s, 4s
          console.log(`Perplexity rate limited (429), retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise(r => setTimeout(r, backoffMs))
        }

        if (researchResponse?.ok) {
          const researchData = await researchResponse.json()
          researchContext = researchData.choices[0]?.message?.content || "No research data returned."
          console.log("Perplexity Research Complete")

          // Cache the research result (fire-and-forget)
          cacheResearch(
            caseData.payer_name,
            caseData.requested_medication || "",
            caseData.patient_state || "",
            caseData.doc_type || "",
            researchContext,
            researchData.citations || []
          ).catch(() => {})
        } else {
          console.error("Perplexity API Error:", researchResponse ? await researchResponse.text() : "No response")
        }
      } catch (ppError) {
        console.error("Perplexity Call Failed:", ppError)
      }
      } // end else (no cache hit)
    }

    // --- STEP 1.25: DOCUMENT VALIDATION (ALL DOC TYPES) ---
    const clinicalNotesForValidation = [
      caseData.disease_activity,
      caseData.prior_treatments,
      caseData.lab_values,
    ]
      .filter(Boolean)
      .join("\n\n")

    // Preserve existing checklist edits during regeneration
    const existingChecklistEdits = caseData.metadata?.checklist_edits as ChecklistEditsData | undefined

    if (isBiologicsPA) {
      try {
        console.log("Running LCD L35041 validation for CTP/wound care...")

        // Get wound type: resolve from primary ICD-10 code, fall back to legacy wound_type, then auto-detect
        const primaryCode = (caseData.metadata?.icd10_codes as Array<{ code: string }> | undefined)?.[0]?.code
          || (caseData.metadata?.icd10_code as string | undefined)
        const woundTypeFromMeta = primaryCode
          ? icd10ToWoundType(primaryCode)
          : (caseData.metadata?.wound_type as WoundType | undefined)

        validationResult = await validateAgainstLCD(
          clinicalNotesForValidation,
          caseData.requested_medication || "",
          researchContext,
          woundTypeFromMeta,
          caseData.patient_state // For policy change detection
        )

        const lcdResult = validationResult as LCDValidationResult
        console.log(
          `LCD Validation Complete - Risk: ${lcdResult.auditRisk.overallScore}, ` +
            `Found: ${lcdResult.summary.foundCount}/${lcdResult.summary.totalRequirements}`
        )

        // Store validation result in case metadata for future reference
        await supabase
          .from("cases")
          .update({
            metadata: {
              ...caseData.metadata,
              lcd_validation: {
                run_at: new Date().toISOString(),
                risk_level: lcdResult.auditRisk.overallScore,
                denial_probability: lcdResult.auditRisk.estimatedDenialProbability,
                found_count: lcdResult.summary.foundCount,
                missing_count: lcdResult.summary.missingCount,
                detected_wound_type: lcdResult.detectedWoundType,
                ctp_covered: lcdResult.ctpProductCheck.covered,
              },
              // Store full validation for persistence across page loads
              lcd_validation_full: {
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
              },
              // Preserve checklist edits during regeneration
              ...(existingChecklistEdits && { checklist_edits: existingChecklistEdits }),
            },
          })
          .eq("id", caseId)
      } catch (validationError) {
        console.error("LCD Validation Error:", validationError)
        // Continue without validation - don't block generation
      }
    } else if (isMedicalNecessity) {
      try {
        console.log("Running Medical Necessity validation...")

        validationResult = await validateMedicalNecessity(
          clinicalNotesForValidation,
          caseData.requested_medication || "",
          researchContext,
          caseData.payer_name
        )

        console.log(
          `Medical Necessity Validation Complete - Risk: ${validationResult.auditRisk.overallScore}, ` +
            `Found: ${validationResult.summary.foundCount}/${validationResult.summary.totalRequirements}`
        )

        // Store validation result in case metadata
        await supabase
          .from("cases")
          .update({
            metadata: {
              ...caseData.metadata,
              lcd_validation: {
                run_at: new Date().toISOString(),
                risk_level: validationResult.auditRisk.overallScore,
                denial_probability: validationResult.auditRisk.estimatedDenialProbability,
                found_count: validationResult.summary.foundCount,
                missing_count: validationResult.summary.missingCount,
              },
              lcd_validation_full: {
                riskLevel: validationResult.auditRisk.overallScore,
                denialProbability: validationResult.auditRisk.estimatedDenialProbability,
                foundCount: validationResult.summary.foundCount,
                missingCount: validationResult.summary.missingCount,
                totalRequirements: validationResult.summary.totalRequirements,
                ctpCovered: true, // Not applicable for medical necessity
                instantDenialTriggers: validationResult.auditRisk.instantDenialTriggers,
                veryHighRiskItems: validationResult.auditRisk.veryHighRiskItems,
                highRiskItems: validationResult.auditRisk.highRiskItems,
                checklist: validationResult.checklist,
                recommendations: validationResult.recommendations,
                perplexityFindings: validationResult.perplexityFindings,
              },
              ...(existingChecklistEdits && { checklist_edits: existingChecklistEdits }),
            },
          })
          .eq("id", caseId)
      } catch (validationError) {
        console.error("Medical Necessity Validation Error:", validationError)
      }
    } else if (isAppeal) {
      try {
        console.log("Running Appeal validation...")

        validationResult = await validateAppeal(
          clinicalNotesForValidation,
          caseData.requested_medication || "",
          researchContext,
          undefined, // denialContext - could be extracted from notes in future
          caseData.payer_name
        )

        console.log(
          `Appeal Validation Complete - Risk: ${validationResult.auditRisk.overallScore}, ` +
            `Found: ${validationResult.summary.foundCount}/${validationResult.summary.totalRequirements}`
        )

        // Store validation result in case metadata
        await supabase
          .from("cases")
          .update({
            metadata: {
              ...caseData.metadata,
              lcd_validation: {
                run_at: new Date().toISOString(),
                risk_level: validationResult.auditRisk.overallScore,
                denial_probability: validationResult.auditRisk.estimatedDenialProbability,
                found_count: validationResult.summary.foundCount,
                missing_count: validationResult.summary.missingCount,
              },
              lcd_validation_full: {
                riskLevel: validationResult.auditRisk.overallScore,
                denialProbability: validationResult.auditRisk.estimatedDenialProbability,
                foundCount: validationResult.summary.foundCount,
                missingCount: validationResult.summary.missingCount,
                totalRequirements: validationResult.summary.totalRequirements,
                ctpCovered: true, // Not applicable for appeals
                instantDenialTriggers: validationResult.auditRisk.instantDenialTriggers,
                veryHighRiskItems: validationResult.auditRisk.veryHighRiskItems,
                highRiskItems: validationResult.auditRisk.highRiskItems,
                checklist: validationResult.checklist,
                recommendations: validationResult.recommendations,
                perplexityFindings: validationResult.perplexityFindings,
              },
              ...(existingChecklistEdits && { checklist_edits: existingChecklistEdits }),
            },
          })
          .eq("id", caseId)
      } catch (validationError) {
        console.error("Appeal Validation Error:", validationError)
      }
    }

    // --- STEP 1.5: EXTRACT SUGGESTED FORMS ---
    try {
      console.log("Extracting suggested forms...")

      // Delete old suggested forms for this case (cleanup on regeneration)
      const { error: deleteFormsError } = await supabase
        .from("case_suggested_forms")
        .delete()
        .eq("case_id", caseId)

      if (deleteFormsError) {
        console.error("Error deleting old suggested forms:", deleteFormsError)
      } else {
        console.log("Cleared old suggested forms for regeneration")
      }

      const formExtractionSystemPrompt = `You are an expert in medical insurance administration. Your goal is to identify REQUIRED and SUGGESTED forms based on provided payer research and case details.
      
      Analyze the provided RESEARCH CONTEXT and CASE DETAILS.
      Identify specific forms, documents, or evidence types that the payer likely requires or suggests.
      
      Return a JSON object with a single key "forms" containing an array of objects. Each object must have:
      - title: string (Formal name of the form or document)
      - description: string (Why it is needed/suggested based on the policy)
      - form_type: string (Enum-like: "prior_auth", "medical_necessity", "labs", "imaging", "wastage", "clinical_notes", "other")
      - confidence: string ("high", "medium", "low")
      - source_snippet: string (Quote from the research context supporting this suggestion)
      
      Do NOT makeup specific form numbers (like CMS-1500) unless explicitly mentioned in the research. Generalize if unsure (e.g. "Prescription History" instead of a specific form ID).`

      const formExtractionUserPrompt = `
      RESEARCH CONTEXT:
      ${researchContext}

      CASE DETAILS:
      Payer: ${caseData.payer_name}
      Medication: ${caseData.requested_medication}
      State: ${caseData.patient_state}
      `

      const formModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })

      const formResult = await formModel.generateContent(`${formExtractionSystemPrompt}\n\n${formExtractionUserPrompt}`)

      console.log("Gemini Form Extraction Response:", formResult.response.text())

      let content = formResult.response.text() || "{}"
      // Strip markdown code blocks if present
      content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "")

      let formsOutput
      try {
        formsOutput = JSON.parse(content)
      } catch (e) {
        console.error("Failed to parse form extraction JSON:", e)
        formsOutput = {}
      }

      const suggestedForms = formsOutput.forms || []

      // Normalize confidence value to match DB constraint
      const normalizeConfidence = (conf: string | undefined): 'high' | 'medium' | 'low' => {
        const normalized = (conf || '').toLowerCase().trim()
        if (normalized === 'high') return 'high'
        if (normalized === 'medium' || normalized === 'med') return 'medium'
        if (normalized === 'low') return 'low'
        return 'medium' // Default to medium if unknown
      }

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
          // We don't have direct URLs yet, would need a separate search or mapping
          download_url: null,
          is_external: false,
          source_snippets: form.source_snippet ? [form.source_snippet] : [],
          created_at: new Date().toISOString()
        }))

        const { error: formsInsertError } = await supabase
          .from("case_suggested_forms")
          .insert(formsToInsert)

        if (formsInsertError) {
          console.error("Error inserting suggested forms:", formsInsertError)
        } else {
          console.log(`Inserted ${suggestedForms.length} suggested forms`)
        }
      }

    } catch (formError) {
      console.error("Error extracting/saving forms:", formError)
    }

    // --- STEP 2: GENERATE WITH GEMINI ---

    // Build user edits context from checklist edits (if any)
    let userEditsContext = ""
    const existingEdits = caseData.metadata?.checklist_edits as ChecklistEditsData | undefined
    if (existingEdits?.edits) {
      const editsWithNotes = Object.values(existingEdits.edits).filter(
        (edit) => edit.user_notes && edit.user_notes.trim()
      )
      if (editsWithNotes.length > 0) {
        userEditsContext = `
USER NOTES/CLARIFICATIONS (Incorporate these into the documentation):
${editsWithNotes.map((edit) => `- ${edit.item_id}: ${edit.user_notes}`).join("\n")}

IMPORTANT: The user has provided specific notes and clarifications above. Make sure to incorporate these details into the generated documentation where relevant.
`
      }
    }

    // Build chat context from conversation history (if provided)
    let chatConversationContext = ""
    if (chatContext && Array.isArray(chatContext) && chatContext.length > 0) {
      // Extract relevant information from chat messages
      const relevantMessages = chatContext
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((msg: any) => `${msg.role === 'user' ? 'Provider' : 'Luma'}: ${msg.content}`)
        .join("\n\n")

      if (relevantMessages) {
        chatConversationContext = `
CHAT CONVERSATION CONTEXT:
The following is the conversation between the provider and Luma AI assistant that led to this generation request. Use any clinical information, clarifications, or context provided in this conversation:

${relevantMessages}

END OF CHAT CONTEXT
`
      }
    }

    // Also load chat messages from database if chatContext not provided
    if (!chatConversationContext) {
      const { data: chatMessages } = await supabase
        .from("case_messages")
        .select("role, content")
        .eq("case_id", caseId)
        .order("created_at", { ascending: true })

      if (chatMessages && chatMessages.length > 0) {
        const relevantMessages = chatMessages
          .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
          .map((msg) => `${msg.role === 'user' ? 'Provider' : 'Luma'}: ${msg.content}`)
          .join("\n\n")

        if (relevantMessages) {
          chatConversationContext = `
CHAT CONVERSATION CONTEXT:
The following is the conversation between the provider and Luma AI assistant that led to this generation request. Use any clinical information, clarifications, or context provided in this conversation:

${relevantMessages}

END OF CHAT CONTEXT
`
        }
      }
    }

    // Build prompt for AI - enhanced for biologics PA with validation results
    let systemPrompt: string

    if (isBiologicsPA && validationResult) {
      const lcdResult = validationResult as LCDValidationResult
      // Enhanced CTP/wound care specific prompt with validation
      systemPrompt = `You are an AI assistant specialized in CTP (Cellular Tissue Products) / skin substitute prior authorization documentation for Medicare Part B.

CRITICAL CONTEXT - LCD L35041 COMPLIANCE:
This is a Biologics Prior Authorization for a CTP/skin substitute. The documentation has been validated against LCD L35041 requirements.

VALIDATION RESULTS:
- Audit Risk Level: ${lcdResult.auditRisk.overallScore}
- Estimated Denial Probability: ${lcdResult.auditRisk.estimatedDenialProbability}%
- CTP Product Coverage: ${lcdResult.ctpProductCheck.covered ? "COVERED" : "VERIFY COVERAGE"}
- Detected Wound Type: ${lcdResult.detectedWoundType || "Unknown"}
- Documentation Found: ${lcdResult.summary.foundCount}/${lcdResult.summary.totalRequirements}
- Missing Items: ${lcdResult.summary.missingCount}
${lcdResult.auditRisk.instantDenialTriggers.length > 0 ? `- INSTANT DENIAL TRIGGERS: ${lcdResult.auditRisk.instantDenialTriggers.join(", ")}` : ""}
${lcdResult.auditRisk.veryHighRiskItems.length > 0 ? `- VERY HIGH RISK MISSING: ${lcdResult.auditRisk.veryHighRiskItems.join(", ")}` : ""}

OUTPUT FORMAT REQUIREMENTS:
1. START with the LCD L35041 Validation Summary section (formatted as shown below)
2. THEN include the Prior Authorization letter

The validation summary should appear FIRST in this format:
---
LCD L35041 VALIDATION SUMMARY

Denial Risk: [RISK LEVEL] ([X]% estimated)
LCD Effective Date: ${lcdResult.perplexityFindings.lcdEffectiveDate}
Wound Type: ${lcdResult.detectedWoundType || "See clinical notes"}
CTP Product: ${lcdResult.ctpProductCheck.covered ? "Covered" : "Verify Coverage Required"}

Documentation Status:
- Found: ${lcdResult.summary.foundCount}
- Missing: ${lcdResult.summary.missingCount}
- Partial: ${lcdResult.summary.partialCount}

[If there are missing high-risk items, list them with recommended language to add]

---

THEN generate the Prior Authorization letter following these rules:
- Professional, persuasive, medical-legal tone
- Clean format WITHOUT placeholders or markdown (except ${PATIENT_PLACEHOLDER} for the patient name)
- Use ${PATIENT_PLACEHOLDER} as the patient name throughout the letter. Do NOT invent or extract any patient names.
- Do NOT invent any patient identifiers, dates of birth, or specific dates. Use generalized timeframes.
- Include ALL wounds/conditions mentioned
- Reference SOC failure documentation explicitly
- Include ABI results if present
- Note wound measurements with dates

CRITICAL - PATIENT INFORMATION:
- Use ${PATIENT_PLACEHOLDER} as the patient name. Do NOT extract or invent any names.
- Extract ALL relevant clinical details: wounds, measurements, lab values, ABI, vascular studies
- Verify staging and dates from notes`
    } else {
      // Standard prompt for non-CTP cases
      systemPrompt = `You are an AI assistant powered by advanced internet research capabilities. Your task is to generate approval-ready medical documentation based on valid coverage criteria.

    CRITICAL INPUTS:
    1. **RESEARCHED GUIDELINES**: Real-time policy data found for this specific payer. Use this to structure your arguments.
    2. **CLINICAL NOTES**: The raw patient history provided by the user.

    OUTPUT REQUIREMENTS:
    - Synthesize the Clinical Notes to prove the patient meets the Researched Guidelines.
    - If the patient meets criteria, explicitly state how (e.g., "Patient meets step therapy requirement having failed Methotrexate...").
    - If specific criteria are missing from the notes, highlight them as "Needed Information".
    - Tone: Professional, persuasive, medical-legal.
    - Format: Clean, professional letter. Plain text only — no markdown, no bold, no headers, no brackets.
    - NEVER use square brackets [] anywhere.
    - NEVER include empty or placeholder fields. If you don't have data for a field, DO NOT include that line at all. No "Date: ", no "Policy Number: ", no "Clinic Name: ", no "Contact Phone: ", no "NPI: ", etc. Just skip those lines entirely.
    - DO NOT include a header block with fields like Date, Policy Number, Clinic Name, Contact Phone, Contact Fax, Referring Provider, Age Group, Medicare Eligible, etc. These are NOT part of the letter format.
    - DO NOT include a "RECOMMENDED SUPPORTING DOCUMENTS" section.
    - The letter should begin with ONLY:
      Line 1: The payer name (e.g., "Medicare Part B" or "Novitas Solutions")
      Line 2: "Prior Authorization Department" (if applicable)
      Then a blank line, then "Subject:" line, then "Patient:" line with the patient name, then "Age:" line, then diagnosis codes, then "Dear Reviewer," and the letter body.
    - If information is not available, omit it completely. Do not leave empty labels.

    GUIDELINE CONCORDANCE:
    When the researched guidelines include clinical society recommendations (NCCN, ACR, AAD, AGA, EULAR, AAN, etc.), include a "Clinical Guideline Support" paragraph in the letter that:
    - Names the specific guideline and edition/year
    - States where the requested medication falls in the treatment algorithm
    - Cites the recommendation strength and evidence level if available
    - Explains how the patient's clinical presentation aligns with guideline-recommended indications
    Do NOT fabricate guideline citations. Only cite guidelines that appear in the researched data.

    CRITICAL - PATIENT INFORMATION:
    - Use ${PATIENT_PLACEHOLDER} as the patient name throughout the letter. Do NOT extract or invent any patient names from the Clinical Notes or elsewhere.
    - NEVER include a "Date of Birth" or "DOB" line in any form. No generalized DOB, no age group DOB, no placeholder DOB. Instead, write "Age: ${caseData.patient_age}" if age is needed.
    - NEVER include a "Medicare ID" or "Insurance ID" line. We do not collect these for HIPAA Safe Harbor compliance.
    - Do NOT invent any patient identifiers, dates of birth, or specific dates. Use generalized timeframes (e.g., "approximately 10 months" not "January 15, 2025").
    - Extract ALL relevant clinical details from notes: comorbidities, diagnosis codes, lab values, test results (ABI, vascular studies, nutritional assessments).
    - Include ALL wounds/conditions mentioned in the notes, not just one.
    - Verify wound staging, measurements, and dates directly from the clinical notes.
    - Extract practice/clinic names from the notes - use the CURRENT practice name if mentioned, not closed practices.

    PROVIDER INFORMATION:
    - At the END of the letter, close with "Sincerely," followed by provider information.
    - FIRST, carefully search the Clinical Notes for any doctor/provider name, clinic name, practice name, or phone number.
    - If provider information WITH a phone number is found in the notes, extract and include the actual name, title, and phone number.
    - If NO provider information with phone number is found in the notes, end with just "Sincerely," and nothing else. Do NOT add placeholder text like "Advanced Wound Care Provider" or generic titles.
    - NEVER use square brackets for provider info. Either use the actual data from the notes or omit the line entirely.`
    }

    const userPrompt = `GENERATE DOCUMENTATION FOR:

    CASE CONTEXT (Form Input - Use as reference, but Clinical Notes are source of truth):
    - Document Type: ${getDocTypeLabel(caseData.doc_type)}
    - Diagnosis: ${formatIcd10ForPrompt()}
    - Patient: ${PATIENT_PLACEHOLDER}, Age: ${caseData.patient_age}, ${formatAgeTagsForPrompt(computeAgeTags(caseData.patient_age))}, ${caseData.patient_gender || ''} from ${caseData.patient_state}
    - Payer: ${caseData.payer_name} (${caseData.payer_type})
    - Medication: ${caseData.requested_medication} ${caseData.medication_dose}

    RESEARCHED PAYER GUIDELINES (Use this to align the letter):
    ${researchContext}
    ${userEditsContext}
    ${chatConversationContext}
    CLINICAL NOTES (PRIMARY SOURCE - Extract ALL information from here):
    ${caseData.disease_activity}
    ${caseData.prior_treatments}
    ${caseData.diagnosis_codes.join(", ")}
    ${caseData.lab_values}
    
    CRITICAL INSTRUCTIONS - EXTRACT FROM CLINICAL NOTES:
    1. PATIENT NAME: Use ${PATIENT_PLACEHOLDER} as the patient name throughout. Do NOT extract or invent any patient names. Do NOT use any names found in clinical notes.

    2. PRACTICE/CLINIC NAME: Extract the CURRENT practice or clinic name from the notes. If notes mention a practice closure or transfer, use the CURRENT/ACTIVE practice name.
    
    3. ALL WOUNDS/CONDITIONS: Include ALL wounds, conditions, or diagnoses mentioned in the notes, not just one. Provide details for each (staging, measurements, location, dates).
    
    4. CLINICAL DETAILS: Extract and include:
       - Exact wound measurements and staging from notes
       - Lab values, test results (ABI, vascular studies, nutritional assessments)
       - Treatment history with specific dates
       - Response to treatment (percentage improvements, size reductions)
       - All comorbidities mentioned
    
    5. PROVIDER INFORMATION:
       - Search ALL the Clinical Notes for provider/doctor information
       - Look for: doctor names, provider names, clinic names, practice names, phone numbers, contact information
       - If you find provider name AND phone number together in the notes, extract and add it at the end in this format:
         "Sincerely,
         [Provider Name from notes]
         [Provider Title/Clinic from notes if available]
         [Phone Number from notes]"
       - If NO provider information with phone number is found anywhere in the notes, end the letter WITHOUT adding any provider contact information.
       - Only use provider info that includes a phone number.
    
    6. ACCURACY: Double-check all measurements and staging against what is explicitly stated in the Clinical Notes. Do not assume or infer - use only what is documented. Do NOT invent dates, identifiers, or patient names.
    
    Please write the ${getDocTypeLabel(caseData.doc_type)} now, ensuring all patient information, wound details, and provider information is extracted directly from the Clinical Notes.`

    // Generate documentation with Gemini
    const docModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      }
    })

    const docResult = await docModel.generateContent(userPrompt)

    let documentation = docResult.response.text() || ""

    // Re-insert patient name (replace [PATIENT] with actual name)
    documentation = reinsertPatientName(documentation, caseData.patient_first_name, caseData.patient_last_name)

    // Store raw length for safety check
    const rawLength = documentation.length

    // Clean up placeholders and special characters
    documentation = documentation
      // Remove the entire "RECOMMENDED SUPPORTING DOCUMENTS" section if present
      // MUST be on its own line (^ anchor with m flag) and NOT case-insensitive to avoid matching "recommended" in body text
      .replace(/\n*^RECOMMENDED SUPPORTING DOCUMENTS\b.*$[\s\S]*$/m, '')
      .replace(/\n*^Recommended Supporting Documents\b.*$[\s\S]*$/m, '')
      // Remove DOB lines in any form — replace with Age
      .replace(/^\s*(?:Date of Birth|DOB)\s*:.*$/gim, `Age: ${caseData.patient_age}`)
      // NUCLEAR: Remove ALL square bracket content
      .replace(/\[[^\]]*\]/g, '')
      // Remove any line that is a label with empty or whitespace-only value (e.g. "Date: ", "NPI: ", "Clinic Name: ")
      .replace(/^\s*(?:Date|Policy Number|Clinic Name|Contact Phone|Contact Fax|Fax|Phone|NPI|Medicare ID|Insurance ID|Member ID|Referring Provider|Referring Physician|Provider Name|Provider NPI|Age Group|Medicare Eligible|Provider Contact Information|Letterhead)\s*:?\s*$/gim, '')
      // Remove "Advanced Wound Care Provider" generic filler (standalone or after label)
      .replace(/^\s*(?:Referring (?:Provider|Physician))\s*:\s*Advanced Wound Care Provider\s*$/gim, '')
      .replace(/^\s*Advanced Wound Care Provider\s*$/gim, '')
      // Remove "Electronically Signed" filler
      .replace(/^\s*Electronically Signed\s*$/gim, '')
      // Remove invented future date lines
      .replace(/^\s*Date\s*:\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}\s*$/gim, '')
      // Remove markdown formatting
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\*/g, '')
      // Clean up multiple consecutive blank lines
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace from each line
      .split('\n').map(line => line.trim()).join('\n')
      .trim()

    // Safety check: if cleanup stripped more than 70% of content, something went wrong
    // Fall back to gentle cleanup only (just brackets and markdown)
    if (documentation.length < rawLength * 0.3 && rawLength > 500) {
      console.warn(`[generate] Aggressive cleanup removed ${Math.round((1 - documentation.length / rawLength) * 100)}% of content. Falling back to gentle cleanup.`)
      documentation = (docResult.response.text() || "")
      documentation = reinsertPatientName(documentation, caseData.patient_first_name, caseData.patient_last_name)
      documentation = documentation
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\*\*/g, '').replace(/__/g, '').replace(/#{1,6}\s/g, '').replace(/\*/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n').map(line => line.trim()).join('\n')
        .trim()
    }

    // Post-process: Check if provider info with phone number was added
    // Look for phone number pattern in the last 500 characters (signature area)
    const lastSection = documentation.slice(-500)
    const hasPhoneNumber = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\(\d{3}\)\s?\d{3}[-.]?\d{4}/.test(lastSection)

    // If no phone number found in signature area, add user's default info
    if (!hasPhoneNumber) {
      // Get user's profile information for default signature
      const { data: userProfile } = await supabase
        .from("users")
        .select("practice_name, specialty")
        .eq("id", session.user.id)
        .single()

      // Add default signature if user has practice info
      if (userProfile?.practice_name) {
        const defaultSignature = `\n\nSincerely,\n${userProfile.practice_name}${userProfile.specialty ? `\n${userProfile.specialty}` : ''}`
        documentation += defaultSignature
      }
    }

    // Fetch suggested forms and append to documentation
    const { data: suggestedForms } = await supabase
      .from("case_suggested_forms")
      .select("title, description, form_type, confidence")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })

    if (suggestedForms && suggestedForms.length > 0) {
      const formsSection = `


RECOMMENDED SUPPORTING DOCUMENTS

The following documents are recommended to strengthen this prior authorization request based on payer policy research:

${suggestedForms.map((form, index) => {
  const confidenceLabel = form.confidence === 'high' ? '[HIGH PRIORITY]' : form.confidence === 'medium' ? '[MEDIUM PRIORITY]' : '[SUGGESTED]'
  return `${index + 1}. ${form.title} ${confidenceLabel}
   ${form.description}`
}).join('\n\n')}

Note: These recommendations are based on AI analysis of current payer policies. Please verify specific requirements with the payer before submission.`

      documentation += formsSection
    }

    // Update case with generated documentation
    const { error: updateError } = await supabase
      .from("cases")
      .update({
        generated_output: documentation,
        edited_output: documentation,
      })
      .eq("id", caseId)

    if (updateError) {
      console.error("Error updating case:", updateError)
      return NextResponse.json(
        { error: "Failed to save documentation" },
        { status: 500 }
      )
    }

    // Update status from 'chat' to 'draft' on first generation
    if (caseData.status === 'chat') {
      await supabase
        .from("cases")
        .update({ status: "draft" })
        .eq("id", caseId)
    }

    // Build response - include validation for all doc types
    const response: {
      success: boolean
      documentation: string
      validation?: {
        riskLevel: string
        denialProbability: number
        foundCount: number
        missingCount: number
        totalRequirements: number
        detectedWoundType?: string
        ctpCovered: boolean
        instantDenialTriggers: string[]
        veryHighRiskItems: string[]
        highRiskItems: string[]
        checklist: LCDValidationResult["checklist"]
        recommendations: LCDValidationResult["recommendations"]
        perplexityFindings: PerplexityFindings | ResearchFindings  // LCD uses PerplexityFindings, others use ResearchFindings
      }
    } = {
      success: true,
      documentation,
    }

    // Add validation results for all doc types that have validation
    if (validationResult) {
      if (isBiologicsPA) {
        const lcdResult = validationResult as LCDValidationResult
        response.validation = {
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
        // Medical Necessity and Appeal share the same response structure (without CTP-specific fields)
        // Cast to access perplexityFindings - all validation result types have it
        const genericResult = validationResult as MedicalNecessityValidationResult | AppealValidationResult
        response.validation = {
          riskLevel: genericResult.auditRisk.overallScore,
          denialProbability: genericResult.auditRisk.estimatedDenialProbability,
          foundCount: genericResult.summary.foundCount,
          missingCount: genericResult.summary.missingCount,
          totalRequirements: genericResult.summary.totalRequirements,
          ctpCovered: true, // Not applicable, always true for non-CTP
          instantDenialTriggers: genericResult.auditRisk.instantDenialTriggers,
          veryHighRiskItems: genericResult.auditRisk.veryHighRiskItems,
          highRiskItems: genericResult.auditRisk.highRiskItems,
          checklist: genericResult.checklist,
          recommendations: genericResult.recommendations,
          perplexityFindings: genericResult.perplexityFindings,
        }
      }
    }

    return NextResponse.json(response)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error generating documentation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate documentation" },
      { status: 500 }
    )
  }
}

function getDocTypeLabel(docType: string): string {
  switch (docType) {
    case "biologics_pa":
      return "Biologics Prior Authorization"
    case "medical_necessity":
      return "Prior Authorization Letter"
    case "appeal":
      return "Appeal Documentation"
    default:
      return "Medical Documentation"
  }
}
