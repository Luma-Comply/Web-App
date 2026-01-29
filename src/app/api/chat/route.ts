import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `You are Luma, an AI assistant helping healthcare providers create prior authorization documentation for Medicare/insurance claims.

YOUR GOALS:
1. Understand what the provider is trying to accomplish today
2. Accept pasted clinical notes OR uploaded documents and analyze them for compliance gaps
3. Ask about available documentation (one question at a time)
4. Identify what's missing before generation
5. When ready, offer to generate the final documentation

HANDLING UPLOADED DOCUMENTS:
- When you see [UPLOADED DOCUMENT: filename], this is a document the user has uploaded
- Analyze the document content thoroughly for clinical information
- Extract key details: patient info, diagnoses, treatments, lab values, wound measurements, etc.
- Identify compliance gaps based on LCD requirements
- Summarize what you found and what's still missing

STYLE:
- Be concise and professional
- Ask ONE question at a time
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

    // Verify user owns the case
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("id, user_id")
      .eq("id", caseId)
      .eq("user_id", session.user.id)
      .single()

    if (caseError || !caseData) {
      return new Response(
        JSON.stringify({ error: "Case not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

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

    // Build conversation history for OpenAI
    const conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ]

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
            content: `[UPLOADED DOCUMENT: ${filename}]\n\n${truncatedText}${extractedText.length > 15000 ? "\n\n[Document truncated due to length...]" : ""}`,
          })
        }
      } else if (msg.role === "user" || msg.role === "assistant") {
        conversationHistory.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    console.log(`[Chat API] Total messages in history: ${conversationHistory.length}`)

    // Add the current user message
    conversationHistory.push({ role: "user", content: message })

    // Create streaming response
    const encoder = new TextEncoder()
    let fullResponse = ""

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: conversationHistory,
            temperature: 0.7,
            stream: true,
          })

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || ""
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
  } catch (error: any) {
    console.error("Error in chat API:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
