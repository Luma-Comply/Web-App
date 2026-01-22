import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"
import {
  validateAgainstLCD,
  formatValidationSummary,
  LCDValidationResult,
  ChecklistEditsData,
} from "@/lib/lcd-validation"
import { WoundType } from "@/lib/lcd-requirements"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { caseId } = await request.json()

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

    // Track validation results for biologics PA
    let lcdValidationResult: LCDValidationResult | null = null
    const isBiologicsPA = caseData.doc_type === "biologics_pa"

    // --- STEP 1: RESEARCH WITH PERPLEXITY ---
    let researchContext = "No specific payer guidelines found."

    if (pp_apiKey && caseData.payer_name && caseData.payer_name !== "Unknown") {
      try {
        const docTypeLabel = getDocTypeLabel(caseData.doc_type)

        // Build comprehensive research query with all patient and case information
        const clinicalNotes = [
          caseData.disease_activity,
          caseData.prior_treatments,
          caseData.lab_values,
          caseData.diagnosis_codes?.join(", ")
        ].filter(Boolean).join("\n\n")

        console.log(`Researching payer: ${caseData.payer_name} for ${caseData.requested_medication} - Document Type: ${docTypeLabel} - State: ${caseData.patient_state} - Age: ${caseData.patient_age}`)

        // Use CTP-specific query for Biologics PA
        let researchQuery: string

        if (isBiologicsPA) {
          // Enhanced CTP/wound care specific query for LCD L35041 validation
          researchQuery = `Research current Medicare Part B LCD L35041 requirements for CTP/skin substitutes (Cellular Tissue Products):

CRITICAL AUDIT QUESTIONS (Answer all):
1. Is "${caseData.requested_medication}" on the current Novitas/Medicare covered CTP list? (LCD Attachment A)
2. What is the current LCD L35041 effective date and any changes since November 2024?
3. What are the CURRENT application limits? (Previously 4, now 8 with KX modifier for 5-8)
4. What triggers the KX modifier requirement?
5. What are the SOC failure criteria for DFU (50% area reduction rule after 4 weeks)?
6. What ABI threshold indicates ischemia (non-coverage threshold)?
7. What are current Qlarant/Novitas audit focus areas for CTPs in ${new Date().getFullYear()}?
8. Any recent OIG work plan items targeting skin substitutes?
9. What are common documentation failures causing CTP denials?

PATIENT CASE:
- CTP Product: ${caseData.requested_medication}
- Dose/Size: ${caseData.medication_dose || "Not specified"}
- State: ${caseData.patient_state}
- Payer: ${caseData.payer_name} (${caseData.payer_type})
- Patient Age: ${caseData.patient_age}

CLINICAL CONTEXT (abbreviated):
${clinicalNotes.substring(0, 1500)}

RETURN FORMAT (include all if found):
- LCD_EFFECTIVE_DATE: [date]
- PRODUCT_COVERED: [YES/NO/VERIFY]
- APPLICATION_LIMIT: [number]
- RECENT_LCD_CHANGES: [list any changes]
- AUDIT_FOCUS_AREAS: [current audit targets]
- SOC_FAILURE_CRITERIA: [specific requirements]
- DOCUMENTATION_GAPS_CAUSING_DENIALS: [common failures]
- ABI_THRESHOLD: [value]
- KX_MODIFIER_RULES: [when required]`
        } else {
          // Standard query for non-CTP cases
          researchQuery = `Research and find the specific ${docTypeLabel} criteria and requirements for the following case:

PATIENT INFORMATION:
- Age: ${caseData.patient_age} years old
- State: ${caseData.patient_state}
- Patient Name: ${caseData.patient_first_name} ${caseData.patient_last_name}
- Gender: ${caseData.patient_gender || 'Not specified'}

DOCUMENT TYPE:
${docTypeLabel}

PAYER INFORMATION:
- Payer: ${caseData.payer_name}
- Payer Type: ${caseData.payer_type}

MEDICATION REQUEST:
- Medication: ${caseData.requested_medication}
- Dose: ${caseData.medication_dose || 'Not specified'}

DIAGNOSIS CODES:
${caseData.diagnosis_codes?.join(", ") || "See clinical notes"}

CLINICAL NOTES:
${clinicalNotes || "No clinical notes provided"}

CRITICAL: Research ${caseData.payer_name}'s policy specifically for ${caseData.patient_state} state, as payer policies vary significantly by state. Find:
1. State-specific coverage criteria for ${caseData.patient_state}
2. Required diagnosis codes for this medication
3. Step therapy requirements (prior treatment failures needed)
4. Disease severity criteria
5. Age-specific considerations (patient is ${caseData.patient_age} years old)
6. Medical necessity requirements for ${docTypeLabel}
7. Any state-specific prior authorization requirements

Focus on the most current policy bulletins and clinical coverage guidelines for ${caseData.payer_name} in ${caseData.patient_state}.`
        }

        // Use CTP-specific system prompt for biologics PA
        const systemContent = isBiologicsPA
          ? "You are an expert Medicare LCD compliance researcher specializing in CTP (Cellular Tissue Products) / skin substitutes for wound care. Focus on LCD L35041 requirements, Novitas MAC policies, current audit focus areas, and documentation requirements. Be specific about coverage criteria, SOC failure requirements, and common denial reasons."
          : "You are an expert medical insurance researcher specializing in state-specific payer policies. Find the most current clinical coverage guidelines, policy bulletins, and medical necessity criteria. Pay special attention to state-specific variations as payer policies differ significantly by state (e.g., Cigna in California vs Texas). Be comprehensive, factual, and include all relevant criteria."

        const researchResponse = await fetch("https://api.perplexity.ai/chat/completions", {
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

        if (researchResponse.ok) {
          const researchData = await researchResponse.json()
          researchContext = researchData.choices[0]?.message?.content || "No research data returned."
          console.log("Perplexity Research Complete")
        } else {
          console.error("Perplexity API Error:", await researchResponse.text())
        }
      } catch (ppError) {
        console.error("Perplexity Call Failed:", ppError)
      }
    }

    // --- STEP 1.25: LCD VALIDATION FOR BIOLOGICS PA ---
    if (isBiologicsPA) {
      try {
        console.log("Running LCD L35041 validation for CTP/wound care...")

        const clinicalNotesForValidation = [
          caseData.disease_activity,
          caseData.prior_treatments,
          caseData.lab_values,
        ]
          .filter(Boolean)
          .join("\n\n")

        // Get wound type from metadata if available, otherwise auto-detect
        const woundTypeFromMeta = caseData.metadata?.wound_type as WoundType | undefined

        lcdValidationResult = await validateAgainstLCD(
          clinicalNotesForValidation,
          caseData.requested_medication || "",
          researchContext,
          woundTypeFromMeta
        )

        console.log(
          `LCD Validation Complete - Risk: ${lcdValidationResult.auditRisk.overallScore}, ` +
            `Found: ${lcdValidationResult.summary.foundCount}/${lcdValidationResult.summary.totalRequirements}`
        )

        // Store validation result in case metadata for future reference
        // Preserve existing checklist edits during regeneration
        const existingChecklistEdits = caseData.metadata?.checklist_edits as ChecklistEditsData | undefined

        await supabase
          .from("cases")
          .update({
            metadata: {
              ...caseData.metadata,
              lcd_validation: {
                run_at: new Date().toISOString(),
                risk_level: lcdValidationResult.auditRisk.overallScore,
                denial_probability: lcdValidationResult.auditRisk.estimatedDenialProbability,
                found_count: lcdValidationResult.summary.foundCount,
                missing_count: lcdValidationResult.summary.missingCount,
                detected_wound_type: lcdValidationResult.detectedWoundType,
                ctp_covered: lcdValidationResult.ctpProductCheck.covered,
              },
              // Store full validation for persistence across page loads
              lcd_validation_full: {
                riskLevel: lcdValidationResult.auditRisk.overallScore,
                denialProbability: lcdValidationResult.auditRisk.estimatedDenialProbability,
                foundCount: lcdValidationResult.summary.foundCount,
                missingCount: lcdValidationResult.summary.missingCount,
                totalRequirements: lcdValidationResult.summary.totalRequirements,
                detectedWoundType: lcdValidationResult.detectedWoundType,
                ctpCovered: lcdValidationResult.ctpProductCheck.covered,
                instantDenialTriggers: lcdValidationResult.auditRisk.instantDenialTriggers,
                veryHighRiskItems: lcdValidationResult.auditRisk.veryHighRiskItems,
                highRiskItems: lcdValidationResult.auditRisk.highRiskItems,
                checklist: lcdValidationResult.checklist,
                recommendations: lcdValidationResult.recommendations,
                perplexityFindings: lcdValidationResult.perplexityFindings,
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
    }

    // --- STEP 1.5: EXTRACT SUGGESTED FORMS ---
    try {
      console.log("Extracting suggested forms...")

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

      const formsCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: formExtractionSystemPrompt },
          { role: "user", content: formExtractionUserPrompt }
        ],
        temperature: 0.2
      })

      console.log("GPT-4o Form Extraction Response:", formsCompletion.choices[0]?.message?.content)

      let content = formsCompletion.choices[0]?.message?.content || "{}"
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

      if (suggestedForms.length > 0) {
        const formsToInsert = suggestedForms.map((form: any) => ({
          case_id: caseId,
          title: form.title,
          description: form.description,
          form_type: form.form_type,
          payer: caseData.payer_name,
          state: caseData.patient_state,
          confidence: form.confidence,
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

    // --- STEP 2: GENERATE WITH OPENAI ---

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

    // Build prompt for AI - enhanced for biologics PA with validation results
    let systemPrompt: string

    if (isBiologicsPA && lcdValidationResult) {
      // Enhanced CTP/wound care specific prompt with validation
      systemPrompt = `You are an AI assistant specialized in CTP (Cellular Tissue Products) / skin substitute prior authorization documentation for Medicare Part B.

CRITICAL CONTEXT - LCD L35041 COMPLIANCE:
This is a Biologics Prior Authorization for a CTP/skin substitute. The documentation has been validated against LCD L35041 requirements.

VALIDATION RESULTS:
- Audit Risk Level: ${lcdValidationResult.auditRisk.overallScore}
- Estimated Denial Probability: ${lcdValidationResult.auditRisk.estimatedDenialProbability}%
- CTP Product Coverage: ${lcdValidationResult.ctpProductCheck.covered ? "COVERED" : "VERIFY COVERAGE"}
- Detected Wound Type: ${lcdValidationResult.detectedWoundType || "Unknown"}
- Documentation Found: ${lcdValidationResult.summary.foundCount}/${lcdValidationResult.summary.totalRequirements}
- Missing Items: ${lcdValidationResult.summary.missingCount}
${lcdValidationResult.auditRisk.instantDenialTriggers.length > 0 ? `- INSTANT DENIAL TRIGGERS: ${lcdValidationResult.auditRisk.instantDenialTriggers.join(", ")}` : ""}
${lcdValidationResult.auditRisk.veryHighRiskItems.length > 0 ? `- VERY HIGH RISK MISSING: ${lcdValidationResult.auditRisk.veryHighRiskItems.join(", ")}` : ""}

OUTPUT FORMAT REQUIREMENTS:
1. START with the LCD L35041 Validation Summary section (formatted as shown below)
2. THEN include the Prior Authorization letter

The validation summary should appear FIRST in this format:
---
LCD L35041 VALIDATION SUMMARY

Denial Risk: [RISK LEVEL] ([X]% estimated)
LCD Effective Date: ${lcdValidationResult.perplexityFindings.lcdEffectiveDate}
Wound Type: ${lcdValidationResult.detectedWoundType || "See clinical notes"}
CTP Product: ${lcdValidationResult.ctpProductCheck.covered ? "Covered" : "Verify Coverage Required"}

Documentation Status:
- Found: ${lcdValidationResult.summary.foundCount}
- Missing: ${lcdValidationResult.summary.missingCount}
- Partial: ${lcdValidationResult.summary.partialCount}

[If there are missing high-risk items, list them with recommended language to add]

---

THEN generate the Prior Authorization letter following these rules:
- Professional, persuasive, medical-legal tone
- Clean format WITHOUT placeholders or markdown
- Extract patient name from Clinical Notes (source of truth)
- Include ALL wounds/conditions mentioned
- Reference SOC failure documentation explicitly
- Include ABI results if present
- Note wound measurements with dates

CRITICAL - PATIENT INFORMATION:
- Use patient name from Clinical Notes, not form input
- Extract ALL relevant details: wounds, measurements, lab values, ABI, vascular studies
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
    - Format: Clean, professional letter format WITHOUT placeholders, brackets, or markdown formatting.
    - DO NOT include placeholders like [Your Medical Facility's Letterhead], [Address], [City, State, ZIP Code], [Phone Number], [Date], [Date of Birth], [Insurance ID], [Patient's Address], [Your Phone Number], [Your Email Address], or [Contact Information].
    - DO NOT include special formatting characters like ** (bold), __ (underline), # (headers), or any markdown syntax.
    - DO NOT use asterisks (*) or underscores (_) for formatting.
    - Use plain text only - no markdown, no special characters for emphasis.
    - Start directly with the payer information and subject line.
    - Use actual dates, addresses, and information from the clinical notes when available.
    - If information is not available, simply omit it rather than using placeholders.

    CRITICAL - PATIENT INFORMATION ACCURACY:
    - ALWAYS extract the ACTUAL patient name from the Clinical Notes. The name in the Clinical Notes is the source of truth, not the form input.
    - If the Clinical Notes contain a different patient name than the form input, USE THE NAME FROM THE CLINICAL NOTES.
    - Extract ALL relevant patient details from notes: age, gender, location, comorbidities, diagnosis codes, lab values, test results (ABI, vascular studies, nutritional assessments).
    - Include ALL wounds/conditions mentioned in the notes, not just one.
    - Verify wound staging, measurements, and dates directly from the clinical notes.
    - Extract practice/clinic names from the notes - use the CURRENT practice name if mentioned, not closed practices.

    PROVIDER INFORMATION:
    - At the END of the letter, include provider contact information.
    - FIRST, carefully search the Clinical Notes for any doctor/provider name, clinic name, practice name, or phone number.
    - If provider information WITH a phone number is found in the notes, extract it and add it at the end of the letter in this format:
      "Sincerely,
      [Provider Name from notes]
      [Provider Title/Clinic from notes if available]
      [Phone Number from notes]"
    - If NO provider information with phone number is found in the notes, do NOT add any provider contact information at the end.
    - Only extract and use provider info that includes a phone number.`
    }

    const userPrompt = `GENERATE DOCUMENTATION FOR:

    CASE CONTEXT (Form Input - Use as reference, but Clinical Notes are source of truth):
    - Patient Form Input: ${caseData.patient_first_name} ${caseData.patient_last_name}, ${caseData.patient_age}yo ${caseData.patient_gender || ''} from ${caseData.patient_state}
    - Payer: ${caseData.payer_name} (${caseData.payer_type})
    - Medication: ${caseData.requested_medication} ${caseData.medication_dose}
    - Document Type: ${getDocTypeLabel(caseData.doc_type)}

    RESEARCHED PAYER GUIDELINES (Use this to align the letter):
    ${researchContext}
    ${userEditsContext}
    CLINICAL NOTES (PRIMARY SOURCE - Extract ALL information from here):
    ${caseData.disease_activity}
    ${caseData.prior_treatments}
    ${caseData.diagnosis_codes.join(", ")}
    ${caseData.lab_values}
    
    CRITICAL INSTRUCTIONS - EXTRACT FROM CLINICAL NOTES:
    1. PATIENT NAME: Search the Clinical Notes for the ACTUAL patient name. If you find a different name than the form input, USE THE NAME FROM THE NOTES. The clinical notes are the authoritative source.
    
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
    
    6. ACCURACY: Double-check all names, dates, measurements, and staging against what is explicitly stated in the Clinical Notes. Do not assume or infer - use only what is documented.
    
    Please write the ${getDocTypeLabel(caseData.doc_type)} now, ensuring all patient information, wound details, and provider information is extracted directly from the Clinical Notes.`

    // Generate documentation with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    })

    let documentation = completion.choices[0]?.message?.content || ""

    // Clean up placeholders and special characters
    documentation = documentation
      // Remove common placeholders
      .replace(/\[Your Medical Facility's Letterhead\]/gi, '')
      .replace(/\[Address\]/gi, '')
      .replace(/\[City, State, ZIP Code\]/gi, '')
      .replace(/\[Phone Number\]/gi, '')
      .replace(/\[Date\]/gi, '')
      .replace(/\[Date of Birth\]/gi, '')
      .replace(/\[Insurance ID\]/gi, '')
      .replace(/\[Patient's Address\]/gi, '')
      .replace(/\[Your Phone Number\]/gi, '')
      .replace(/\[Your Email Address\]/gi, '')
      .replace(/\[Contact Information\]/gi, '')
      // Remove markdown formatting (**, __, etc.)
      .replace(/\*\*/g, '') // Remove **bold**
      .replace(/\*\*/g, '') // Remove any remaining **
      .replace(/__/g, '') // Remove __underline__
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/\*/g, '') // Remove any remaining *
      .replace(/_/g, '') // Remove any remaining _
      // Remove empty lines with just brackets or placeholders
      .replace(/^\s*\[.*?\]\s*$/gm, '')
      // Clean up multiple consecutive blank lines
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace from each line
      .split('\n').map(line => line.trim()).join('\n')
      // Remove any remaining standalone brackets
      .replace(/^\s*\[\s*\]\s*$/gm, '')
      .trim()

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

    // Update remaining cases count - use team owner's pool if user is a team member
    const { data: currentUser } = await supabase
      .from("users")
      .select("team_owner_id, cases_remaining_this_month, cases_remaining")
      .eq("id", session.user.id)
      .single()

    // Determine whose cases pool to decrement (team owner's or own)
    const poolOwnerId = currentUser?.team_owner_id || session.user.id

    const { data: poolOwnerData } = await supabase
      .from("users")
      .select("cases_remaining_this_month, cases_remaining")
      .eq("id", poolOwnerId)
      .single()

    if (poolOwnerData && poolOwnerData.cases_remaining > 0) {
      await supabase
        .from("users")
        .update({
          cases_remaining_this_month: Math.max(0, (poolOwnerData.cases_remaining_this_month || 50) - 1),
          cases_remaining: Math.max(0, (poolOwnerData.cases_remaining || 50) - 1),
        })
        .eq("id", poolOwnerId)
    }

    // Build response - include validation for biologics PA
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
        perplexityFindings: LCDValidationResult["perplexityFindings"]
      }
    } = {
      success: true,
      documentation,
    }

    // Add validation results for biologics PA
    if (isBiologicsPA && lcdValidationResult) {
      response.validation = {
        riskLevel: lcdValidationResult.auditRisk.overallScore,
        denialProbability: lcdValidationResult.auditRisk.estimatedDenialProbability,
        foundCount: lcdValidationResult.summary.foundCount,
        missingCount: lcdValidationResult.summary.missingCount,
        totalRequirements: lcdValidationResult.summary.totalRequirements,
        detectedWoundType: lcdValidationResult.detectedWoundType,
        ctpCovered: lcdValidationResult.ctpProductCheck.covered,
        instantDenialTriggers: lcdValidationResult.auditRisk.instantDenialTriggers,
        veryHighRiskItems: lcdValidationResult.auditRisk.veryHighRiskItems,
        highRiskItems: lcdValidationResult.auditRisk.highRiskItems,
        checklist: lcdValidationResult.checklist,
        recommendations: lcdValidationResult.recommendations,
        perplexityFindings: lcdValidationResult.perplexityFindings,
      }
    }

    return NextResponse.json(response)
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
      return "Medical Necessity Letter"
    case "appeal":
      return "Appeal Documentation"
    default:
      return "Medical Documentation"
  }
}
