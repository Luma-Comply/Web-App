import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { computeAgeTags, formatAgeTagsForPrompt, PATIENT_PLACEHOLDER } from "@/lib/phi-utils"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

const SYSTEM_PROMPT_TEMPLATE = `You are Luma, an AI assistant helping healthcare providers create prior authorization documentation for Medicare/insurance claims.

{{CASE_CONTEXT}}

CRITICAL RULE - DO NOT ASK FOR INFORMATION YOU ALREADY HAVE:
- You already know the patient's name, age, state, diagnosis, payer, etc. from the case data above
- NEVER ask the user to provide information that's already in the case data
- When analyzing uploaded documents or images, use the case context to correlate information
- Focus on identifying GAPS and MISSING information, not re-asking for known data

YOUR GOALS:
1. Help the provider fill compliance gaps for this specific patient case
2. Accept pasted clinical notes OR uploaded documents and analyze them for compliance gaps
3. Only ask about MISSING documentation or unclear clinical details (not basic patient info)
4. Identify what's missing based on LCD requirements before generation
5. When ready, offer to generate the final documentation

HANDLING UPLOADED DOCUMENTS:
- When you see [UPLOADED DOCUMENT: filename], this is a document the user has uploaded
- Analyze the document content thoroughly for clinical information
- Cross-reference against the CASE CONTEXT above - don't ask for info you already have
- Extract additional details: wound measurements, treatment dates, progress notes, etc.
- Identify compliance gaps based on LCD requirements
- Summarize what you found and what's still missing

STYLE:
- Be concise and professional
- Ask ONE question at a time, only for information you DON'T already have
- When user pastes a note or uploads a document: analyze it, identify gaps, suggest fixes
- Use specific LCD requirements (L35041 for CTPs, etc.)
- When the case is ready for generation, end your message with: [READY_TO_GENERATE]`

export async function POST(request: NextRequest) {
  try {
    const { caseId, message } = await request.json()

    if (!caseId || !message) {
      return new Response(
        JSON.stringify({ error: "Case ID and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Get Supabase client
    const supabase = await createClient()

    // Get user session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    // Fetch full case data including patient info
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .eq("user_id", session.user.id)
      .single()

    if (caseError || !caseData) {
      return new Response(
        JSON.stringify({ error: "Case not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    // Extract LCD validation data if available
    const lcdValidation = caseData.metadata?.lcd_validation_full as {
      riskLevel?: string
      denialProbability?: number
      foundCount?: number
      missingCount?: number
      totalRequirements?: number
      detectedWoundType?: string
      ctpCovered?: boolean
      instantDenialTriggers?: string[]
      veryHighRiskItems?: string[]
      highRiskItems?: string[]
      checklist?: Array<{ id: string; label: string; found: boolean; notes?: string }>
      recommendations?: Array<{ priority: string; text: string }>
    } | null

    // Fetch suggested forms if available
    const { data: suggestedForms } = await supabase
      .from("case_suggested_forms")
      .select("title, description, form_type, confidence")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })

    // Build LCD validation context if available
    let lcdValidationContext = ""
    if (lcdValidation) {
      const missingItems = lcdValidation.checklist?.filter(item => !item.found) || []
      const instantDenials = lcdValidation.instantDenialTriggers || []
      const veryHighRisk = lcdValidation.veryHighRiskItems || []
      const highRisk = lcdValidation.highRiskItems || []

      lcdValidationContext = `
LCD VALIDATION STATUS (Documentation has been validated against LCD L35041):
- Audit Risk Level: ${lcdValidation.riskLevel || "Not assessed"}
- Denial Probability: ${lcdValidation.denialProbability || 0}%
- Documentation Found: ${lcdValidation.foundCount || 0}/${lcdValidation.totalRequirements || 0} requirements
- Detected Wound Type: ${lcdValidation.detectedWoundType || "Unknown"}
- CTP Product Coverage: ${lcdValidation.ctpCovered ? "COVERED" : "VERIFY COVERAGE"}
${instantDenials.length > 0 ? `\nINSTANT DENIAL TRIGGERS (CRITICAL - Must be addressed):
${instantDenials.map(item => `  - ${item}`).join("\n")}` : ""}
${veryHighRisk.length > 0 ? `\nVERY HIGH RISK MISSING ITEMS:
${veryHighRisk.map(item => `  - ${item}`).join("\n")}` : ""}
${highRisk.length > 0 ? `\nHIGH RISK MISSING ITEMS:
${highRisk.map(item => `  - ${item}`).join("\n")}` : ""}
${missingItems.length > 0 ? `\nMISSING DOCUMENTATION CHECKLIST:
${missingItems.map(item => `  - ${item.label}${item.notes ? ` (${item.notes})` : ""}`).join("\n")}` : ""}
`
    }

    // Build suggested forms context if available
    let suggestedFormsContext = ""
    if (suggestedForms && suggestedForms.length > 0) {
      suggestedFormsContext = `
RECOMMENDED SUPPORTING DOCUMENTS:
${suggestedForms.map(form => `- ${form.title} (${form.confidence} confidence): ${form.description}`).join("\n")}
`
    }

    // Build case context for the AI
    const caseContext = `
CURRENT CASE INFORMATION (You already have this data - DO NOT ask for it again):
- Patient: ${PATIENT_PLACEHOLDER}
- ${formatAgeTagsForPrompt(computeAgeTags(caseData.patient_age))}
- Patient State: ${caseData.patient_state}
- Patient Gender: ${caseData.patient_gender || "Not specified"}
- Diagnosis/Condition: ${caseData.disease_activity || "Not yet specified"}
- Diagnosis Codes: ${caseData.diagnosis_codes?.length ? caseData.diagnosis_codes.join(", ") : "None entered"}
- Requested Treatment: ${caseData.requested_medication || "Not specified"}
- Medication Dose: ${caseData.medication_dose || "Not specified"}
- Insurance/Payer: ${caseData.payer_name || "Not specified"} (${caseData.payer_type || "Unknown type"})
- Prior Treatments: ${caseData.prior_treatments || "Not documented"}
- Lab Values: ${caseData.lab_values || "Not documented"}
- Documentation Type: ${caseData.doc_type || "biologics_pa"}
${lcdValidationContext}${suggestedFormsContext}`.trim()

    // Load conversation history (including metadata for file uploads)
    const { data: messages, error: messagesError } = await supabase
      .from("case_messages")
      .select("role, content, metadata")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("Error loading messages:", messagesError)
      return new Response(
        JSON.stringify({ error: "Failed to load conversation history" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // Save user message before processing
    const { error: saveUserError } = await supabase
      .from("case_messages")
      .insert({
        case_id: caseId,
        role: "user" as const,
        content: message,
      })

    if (saveUserError) {
      console.error("Error saving user message:", saveUserError)
      return new Response(
        JSON.stringify({ error: "Failed to save message" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // Build the system prompt with case context
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace("{{CASE_CONTEXT}}", caseContext)

    // Build conversation history for Gemini
    const conversationHistory: { role: "user" | "model"; parts: [{ text: string }] }[] = []

    // Process messages, handling file uploads specially
    for (const msg of messages || []) {
      // Parse metadata if it's a string (Supabase sometimes returns JSONB as string)
      let metadata = msg.metadata
      if (typeof metadata === "string") {
        try {
          metadata = JSON.parse(metadata)
        } catch {
          metadata = null
        }
      }

      if (msg.role === "system" && metadata?.type === "file_upload") {
        // Include uploaded document content as a user message so the AI can see it
        const extractedText = metadata.extractedText || ""
        const filename = metadata.filename || "document"

        console.log(`[Chat API] Found uploaded document: ${filename}, text length: ${extractedText.length}`)

        if (extractedText) {
          const truncatedText = extractedText.slice(0, 15000) // Limit to avoid token overflow
          conversationHistory.push({
            role: "user",
            parts: [{ text: `[UPLOADED DOCUMENT: ${filename}]\n\n${truncatedText}${extractedText.length > 15000 ? "\n\n[Document truncated due to length...]" : ""}` }],
          })
        }
      } else if (msg.role === "user") {
        conversationHistory.push({
          role: "user",
          parts: [{ text: msg.content }],
        })
      } else if (msg.role === "assistant") {
        conversationHistory.push({
          role: "model",
          parts: [{ text: msg.content }],
        })
      }
    }

    console.log(`[Chat API] Total messages in history: ${conversationHistory.length}`)

    // Create streaming response
    const encoder = new TextEncoder()
    let fullResponse = ""

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt,
            generationConfig: {
              temperature: 0.7,
            }
          })

          const chat = model.startChat({
            history: conversationHistory,
          })

          const result = await chat.sendMessageStream(message)

          for await (const chunk of result.stream) {
            const content = chunk.text() || ""
            if (content) {
              fullResponse += content
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              )
            }
          }

          // Save assistant response after completion
          const supabaseForSave = await createClient()
          const { error: saveAssistantError } = await supabaseForSave
            .from("case_messages")
            .insert({
              case_id: caseId,
              role: "assistant" as const,
              content: fullResponse,
              metadata: {
                ready_to_generate: fullResponse.includes("[READY_TO_GENERATE]"),
              },
            })

          if (saveAssistantError) {
            console.error("Error saving assistant message:", saveAssistantError)
          }

          // Send ready_to_generate flag in final message if detected
          if (fullResponse.includes("[READY_TO_GENERATE]")) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ ready_to_generate: true })}\n\n`
              )
            )
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (error) {
          console.error("Streaming error:", error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error in chat API:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
