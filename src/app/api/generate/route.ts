import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"

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

        const researchQuery = `Research and find the specific ${docTypeLabel} criteria and requirements for the following case:

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
                content: "You are an expert medical insurance researcher specializing in state-specific payer policies. Find the most current clinical coverage guidelines, policy bulletins, and medical necessity criteria. Pay special attention to state-specific variations as payer policies differ significantly by state (e.g., Cigna in California vs Texas). Be comprehensive, factual, and include all relevant criteria."
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

    // Build prompt for AI
    const systemPrompt = `You are an AI assistant powered by advanced internet research capabilities. Your task is to generate approval-ready medical documentation based on valid coverage criteria.
    
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

    const userPrompt = `GENERATE DOCUMENTATION FOR:
    
    CASE CONTEXT (Form Input - Use as reference, but Clinical Notes are source of truth):
    - Patient Form Input: ${caseData.patient_first_name} ${caseData.patient_last_name}, ${caseData.patient_age}yo ${caseData.patient_gender || ''} from ${caseData.patient_state}
    - Payer: ${caseData.payer_name} (${caseData.payer_type})
    - Medication: ${caseData.requested_medication} ${caseData.medication_dose}
    - Document Type: ${getDocTypeLabel(caseData.doc_type)}
    
    RESEARCHED PAYER GUIDELINES (Use this to align the letter):
    ${researchContext}
    
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

    // Update user's remaining cases count
    const { data: userData } = await supabase
      .from("users")
      .select("cases_remaining_this_month")
      .eq("id", session.user.id)
      .single()

    if (userData && userData.cases_remaining_this_month > 0) {
      await supabase
        .from("users")
        .update({
          cases_remaining_this_month: userData.cases_remaining_this_month - 1,
        })
        .eq("id", session.user.id)
    }

    return NextResponse.json({
      success: true,
      documentation,
    })
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
