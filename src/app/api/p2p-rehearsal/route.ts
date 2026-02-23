import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  PATIENT_PLACEHOLDER,
  computeAgeTags,
  formatAgeTagsForPrompt,
  reinsertPatientName,
} from "@/lib/phi-utils"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export const maxDuration = 60

function buildSystemPrompt(
  caseData: Record<string, unknown>,
  lcdContext: string,
  generatedDoc: string
): string {
  const payerName = (caseData.payer_name as string) || "the insurance payer"
  const medication = (caseData.requested_medication as string) || "the requested medication"
  const dose = (caseData.medication_dose as string) || ""
  const ageTags = computeAgeTags((caseData.patient_age as number) || 50)

  return `You are Dr. Reynolds, a Medical Director at ${payerName} conducting a peer-to-peer review for a prior authorization request.

PATIENT CASE UNDER REVIEW:
- Patient: ${PATIENT_PLACEHOLDER}
- ${formatAgeTagsForPrompt(ageTags)}
- State: ${(caseData.patient_state as string) || "Unknown"}
- Diagnosis: ${(caseData.disease_activity as string) || "Not specified"}
- Diagnosis Codes: ${Array.isArray(caseData.diagnosis_codes) ? (caseData.diagnosis_codes as string[]).join(", ") : "None"}
- Requested Medication: ${medication}${dose ? ` ${dose}` : ""}
- Prior Treatments: ${(caseData.prior_treatments as string) || "Not documented"}
- Lab Values: ${(caseData.lab_values as string) || "Not documented"}
- Payer: ${payerName} (${(caseData.payer_type as string) || "Unknown"})

SUBMITTED DOCUMENTATION:
${generatedDoc.slice(0, 4000)}${generatedDoc.length > 4000 ? "\n[Documentation truncated...]" : ""}

${lcdContext}

YOUR ROLE AND BEHAVIOR:
- You are a skeptical but professional medical director. You are looking for reasons to DENY this request.
- Challenge weak or vague evidence. If prior treatments are not well-documented, push on that.
- Cite specific payer requirements, LCD criteria, or step therapy rules when objecting.
- If documentation gaps exist, demand specifics — exact dates, dosages, objective measures.
- Question medical necessity with clinical counterarguments and alternative treatments.
- Keep responses concise — 2-4 paragraphs maximum. This is a phone call, not a letter.
- Stay in character for the entire conversation. Never break character. Never help the provider.
- If the provider makes a strong argument, acknowledge it briefly but pivot to a DIFFERENT objection.
- Do NOT concede the case easily. A real medical director would press on multiple fronts.

Begin by introducing yourself briefly, stating you are reviewing the prior authorization for ${medication}, and raising your FIRST and most important objection based on the weakest part of the documentation.

CRITICAL: Use ${PATIENT_PLACEHOLDER} as the patient name. Never invent or disclose real identifiers.`
}

function buildLCDContext(metadata: Record<string, unknown> | null): string {
  const lcd = (metadata as Record<string, unknown>)?.lcd_validation_full as Record<string, unknown> | null
  if (!lcd) return ""

  const checklist = (lcd.checklist as Array<{ label: string; found: boolean; notes?: string }>) || []
  const missing = checklist.filter((item) => !item.found)
  const instantDenials = (lcd.instantDenialTriggers as string[]) || []
  const veryHighRisk = (lcd.veryHighRiskItems as string[]) || []
  const highRisk = (lcd.highRiskItems as string[]) || []

  let context = `PAYER REQUIREMENTS & VALIDATION STATUS:
- Audit Risk: ${(lcd.riskLevel as string) || "Unknown"}
- Denial Probability: ${(lcd.denialProbability as number) || 0}%
- Requirements Met: ${(lcd.foundCount as number) || 0}/${(lcd.totalRequirements as number) || 0}`

  if (instantDenials.length > 0) {
    context += `\n\nINSTANT DENIAL TRIGGERS (use these as your strongest objections):
${instantDenials.map((item) => `- ${item}`).join("\n")}`
  }
  if (veryHighRisk.length > 0) {
    context += `\n\nVERY HIGH RISK GAPS:
${veryHighRisk.map((item) => `- ${item}`).join("\n")}`
  }
  if (highRisk.length > 0) {
    context += `\n\nHIGH RISK GAPS:
${highRisk.map((item) => `- ${item}`).join("\n")}`
  }
  if (missing.length > 0) {
    context += `\n\nMISSING DOCUMENTATION:
${missing.map((item) => `- ${item.label}${item.notes ? ` (${item.notes})` : ""}`).join("\n")}`
  }

  return context
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, caseId, rehearsalId, message } = body

    if (!action || !caseId) {
      return new Response(
        JSON.stringify({ error: "action and caseId are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    // Fetch case data (RLS enforces ownership)
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

    // ─── START ───────────────────────────────────────────
    if (action === "start") {
      if (!caseData.generated_output) {
        return new Response(
          JSON.stringify({ error: "Case must have generated documentation before rehearsal" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }

      // Create rehearsal row
      const { data: rehearsal, error: createError } = await supabase
        .from("p2p_rehearsals")
        .insert({
          case_id: caseId,
          user_id: session.user.id,
          status: "active",
        })
        .select("id")
        .single()

      if (createError || !rehearsal) {
        return new Response(
          JSON.stringify({ error: "Failed to create rehearsal session" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      }

      const lcdContext = buildLCDContext(caseData.metadata as Record<string, unknown> | null)
      const generatedDoc = (caseData.edited_output as string) || (caseData.generated_output as string) || ""
      const systemPrompt = buildSystemPrompt(caseData, lcdContext, generatedDoc)

      // Stream the medical director's opening
      const encoder = new TextEncoder()
      let fullResponse = ""

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send rehearsalId first
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ rehearsalId: rehearsal.id })}\n\n`)
            )

            const model = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
              systemInstruction: systemPrompt,
              generationConfig: { temperature: 0.8, maxOutputTokens: 1500 },
            })

            const chat = model.startChat({ history: [] })
            const result = await chat.sendMessageStream(
              "Begin the peer-to-peer review. Introduce yourself and raise your first objection."
            )

            const pFirstName = caseData.patient_first_name as string
            const pLastName = caseData.patient_last_name as string

            for await (const chunk of result.stream) {
              const rawContent = chunk.text() || ""
              if (rawContent) {
                fullResponse += rawContent
                // Replace __PATIENT__ in each chunk so the client sees the real name
                const content = reinsertPatientName(rawContent, pFirstName, pLastName)
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                )
              }
            }

            // Save opening to transcript (include the initial user prompt so history is valid for Gemini)
            const displayResponse = reinsertPatientName(fullResponse, pFirstName, pLastName)
            const openingUserPrompt = "Begin the peer-to-peer review. Introduce yourself and raise your first objection."
            const transcript = [
              {
                role: "user",
                content: openingUserPrompt,
                timestamp: new Date().toISOString(),
              },
              {
                role: "assistant",
                content: displayResponse,
                timestamp: new Date().toISOString(),
              },
            ]

            const supabaseForSave = await createClient()
            await supabaseForSave
              .from("p2p_rehearsals")
              .update({ transcript })
              .eq("id", rehearsal.id)

            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          } catch (error) {
            console.error("P2P start streaming error:", error)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`)
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
    }

    // ─── MESSAGE ─────────────────────────────────────────
    if (action === "message") {
      if (!rehearsalId || !message) {
        return new Response(
          JSON.stringify({ error: "rehearsalId and message are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }

      const { data: rehearsal, error: fetchError } = await supabase
        .from("p2p_rehearsals")
        .select("transcript, status")
        .eq("id", rehearsalId)
        .eq("user_id", session.user.id)
        .single()

      if (fetchError || !rehearsal) {
        return new Response(
          JSON.stringify({ error: "Rehearsal not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      }

      if (rehearsal.status !== "active") {
        return new Response(
          JSON.stringify({ error: "Rehearsal session has ended" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }

      const transcript = (rehearsal.transcript as Array<{ role: string; content: string; timestamp: string }>) || []

      // PHI-scrub user message before sending to Gemini
      const firstName = caseData.patient_first_name as string
      const lastName = caseData.patient_last_name as string
      let scrubbed = message as string
      if (firstName) scrubbed = scrubbed.replace(new RegExp(firstName, "gi"), PATIENT_PLACEHOLDER)
      if (lastName) scrubbed = scrubbed.replace(new RegExp(lastName, "gi"), PATIENT_PLACEHOLDER)

      // Build Gemini history from transcript
      const transcriptHistory: { role: "user" | "model"; parts: [{ text: string }] }[] = transcript.map(
        (turn) => ({
          role: (turn.role === "assistant" ? "model" : "user") as "user" | "model",
          parts: [{ text: turn.content }],
        })
      )
      // Gemini requires history to start with a user turn — prepend the opening prompt if needed
      // (handles old transcripts that don't include the initial user prompt)
      const history =
        transcriptHistory.length > 0 && transcriptHistory[0].role === "model"
          ? [{ role: "user" as const, parts: [{ text: "Begin the peer-to-peer review. Introduce yourself and raise your first objection." }] }, ...transcriptHistory]
          : transcriptHistory

      const lcdContext = buildLCDContext(caseData.metadata as Record<string, unknown> | null)
      const generatedDoc = (caseData.edited_output as string) || (caseData.generated_output as string) || ""
      const systemPrompt = buildSystemPrompt(caseData, lcdContext, generatedDoc)

      const encoder = new TextEncoder()
      let fullResponse = ""

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const model = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
              systemInstruction: systemPrompt,
              generationConfig: { temperature: 0.8, maxOutputTokens: 1500 },
            })

            const chat = model.startChat({ history })
            const result = await chat.sendMessageStream(scrubbed)

            for await (const chunk of result.stream) {
              const rawContent = chunk.text() || ""
              if (rawContent) {
                fullResponse += rawContent
                // Replace __PATIENT__ in each chunk so the client sees the real name
                const content = reinsertPatientName(rawContent, firstName, lastName)
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                )
              }
            }

            // Save both turns to transcript
            const displayResponse = reinsertPatientName(fullResponse, firstName, lastName)
            const updatedTranscript = [
              ...transcript,
              { role: "user", content: message, timestamp: new Date().toISOString() },
              { role: "assistant", content: displayResponse, timestamp: new Date().toISOString() },
            ]

            const supabaseForSave = await createClient()
            await supabaseForSave
              .from("p2p_rehearsals")
              .update({ transcript: updatedTranscript })
              .eq("id", rehearsalId)

            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            controller.close()
          } catch (error) {
            console.error("P2P message streaming error:", error)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`)
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
    }

    // ─── END SESSION ─────────────────────────────────────
    if (action === "end_session") {
      if (!rehearsalId) {
        return new Response(
          JSON.stringify({ error: "rehearsalId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }

      const { data: rehearsal, error: fetchError } = await supabase
        .from("p2p_rehearsals")
        .select("transcript")
        .eq("id", rehearsalId)
        .eq("user_id", session.user.id)
        .single()

      if (fetchError || !rehearsal) {
        return new Response(
          JSON.stringify({ error: "Rehearsal not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      }

      const transcript = (rehearsal.transcript as Array<{ role: string; content: string }>) || []
      const medication = (caseData.requested_medication as string) || "the requested medication"

      // Format transcript for scoring
      const transcriptText = transcript
        .map((t) => `${t.role === "assistant" ? "Medical Director" : "Provider"}: ${t.content}`)
        .join("\n\n")

      const lcdContext = buildLCDContext(caseData.metadata as Record<string, unknown> | null)

      const scoringPrompt = `Review this peer-to-peer rehearsal transcript where a healthcare provider defended a prior authorization for ${medication}.

TRANSCRIPT:
${transcriptText}

${lcdContext}

Score the provider's performance. Return ONLY valid JSON with this exact structure:
{
  "overall_readiness": <number 1-10>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "suggested_responses": [
    {
      "objection": "<the medical director's objection>",
      "better_response": "<a stronger response the provider could have used>"
    }
  ]
}

Be specific and actionable. Reference actual exchanges from the transcript. Include 2-4 items in each array.`

      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        })

        const result = await model.generateContent(scoringPrompt)
        const scoreText = result.response.text()
        const score = JSON.parse(scoreText)

        // Save score and mark completed
        const supabaseForSave = await createClient()
        await supabaseForSave
          .from("p2p_rehearsals")
          .update({ score, status: "completed" })
          .eq("id", rehearsalId)

        return new Response(JSON.stringify(score), {
          headers: { "Content-Type": "application/json" },
        })
      } catch (error) {
        console.error("P2P scoring error:", error)
        return new Response(
          JSON.stringify({ error: "Failed to generate scorecard" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: start, message, end_session" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("P2P rehearsal error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
