
import OpenAI from "openai"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

async function testExtraction() {
    console.log("Testing Form Extraction...")

    const researchContext = `
  Cigna Policy for Biologics (Simplimax):
  Biologics are considered medically necessary when:
  1. Patient has failed at least one conventional therapy (e.g. Methotrexate).
  2. Diagnosis of Rheumatoid Arthritis or Psoriatic Arthritis.
  3. Pre-treatment tuberculosis (TB) screening is negative.
  
  Documentation Requirements:
  - Current clinical notes documenting diagnosis and severity.
  - History of prior DMARD failure.
  - Recent TB test results (QuantiFERON gold or PPD).
  - Hepatitis B screening results.
  - Completed Prior Authorization Form 12345.
  `

    const caseData = {
        payer_name: "Cigna",
        requested_medication: "Simplimax",
        patient_state: "Oregon"
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

    try {
        const formsCompletion = await openai.chat.completions.create({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: formExtractionSystemPrompt },
                { role: "user", content: formExtractionUserPrompt }
            ],
            temperature: 0.2
        })

        console.log("Raw Response Content:", formsCompletion.choices[0]?.message?.content)

        let content = formsCompletion.choices[0]?.message?.content || "{}"
        content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "")

        const formsOutput = JSON.parse(content)
        console.log("Parsed Output:", JSON.stringify(formsOutput, null, 2))

    } catch (error) {
        console.error("Error:", error)
    }
}

testExtraction()
