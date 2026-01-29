import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  validateAgainstLCD,
  LCDValidationResult,
  ChecklistEditsData,
} from "@/lib/lcd-validation"
import { WoundType } from "@/lib/lcd-requirements"
import { getMACInfo, buildStateSpecificContext, isWiserActiveForSkinSubs } from "@/lib/mac-jurisdictions"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

// Helper to send SSE events
function sendEvent(controller: ReadableStreamDefaultController, encoder: TextEncoder, data: any) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { caseId } = await request.json()

        if (!caseId) {
          sendEvent(controller, encoder, { error: "Case ID is required" })
          controller.close()
          return
        }

        // --- PHASE: loading_case ---
        sendEvent(controller, encoder, { phase: 'loading_case' })

        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          sendEvent(controller, encoder, { error: "Unauthorized" })
          controller.close()
          return
        }

        const { data: caseData, error: caseError } = await supabase
          .from("cases")
          .select("*")
          .eq("id", caseId)
          .eq("user_id", session.user.id)
          .single()

        if (caseError || !caseData) {
          sendEvent(controller, encoder, { error: "Case not found" })
          controller.close()
          return
        }

        const pp_apiKey = process.env.PERPLEXITY_API_KEY
        let lcdValidationResult: LCDValidationResult | null = null
        const isBiologicsPA = caseData.doc_type === "biologics_pa"

        // --- PHASE: researching ---
        sendEvent(controller, encoder, { phase: 'researching' })

        let researchContext = "No specific payer guidelines found."

        if (pp_apiKey && caseData.payer_name && caseData.payer_name !== "Unknown") {
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
- CTP Product: ${caseData.requested_medication}
- Payer: ${caseData.payer_name}
CLINICAL CONTEXT: ${clinicalNotes.substring(0, 1500)}

Find for LCD ${lcdNumber} (${macInfo?.macName || "this MAC"}): LCD effective date, product coverage on THIS MAC's list, application limits, SOC failure criteria, ABI thresholds, debridement requirements, common denial reasons.`
            } else {
              researchQuery = `Research ${docTypeLabel} criteria for ${caseData.payer_name} in ${caseData.patient_state}:
Medication: ${caseData.requested_medication}
Patient: ${caseData.patient_age}yo
Clinical context: ${clinicalNotes.substring(0, 1000)}

Find: coverage criteria, step therapy requirements, medical necessity requirements.`
            }

            // Add 30 second timeout to prevent hanging
            const abortController = new AbortController()
            const timeoutId = setTimeout(() => abortController.abort(), 30000)

            // Build state-aware system prompt for biologics PA
            const systemPrompt = isBiologicsPA
              ? `You are a Medicare LCD compliance researcher for CTP/skin substitutes. The patient is in ${caseData.patient_state} under ${macInfo?.macName || "Medicare"} (${macInfo?.jurisdiction || "unknown"}). Research LCD ${lcdNumber} requirements SPECIFIC to this MAC.${isWiserState ? ` This is a WISeR pilot state - PA processed by ${macInfo?.aiVendor}.` : ""}`
              : "You are a medical insurance researcher specializing in payer policies."

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

            if (researchResponse.ok) {
              const researchData = await researchResponse.json()
              researchContext = researchData.choices[0]?.message?.content || "No research data returned."
            }
          } catch (ppError: any) {
            if (ppError.name === 'AbortError') {
              console.error("Perplexity Call Timed Out after 30s")
            } else {
              console.error("Perplexity Call Failed:", ppError)
            }
            // Continue with default context - don't block generation
          }
        }

        // --- PHASE: validating ---
        sendEvent(controller, encoder, { phase: 'validating' })

        if (isBiologicsPA) {
          try {
            const clinicalNotesForValidation = [
              caseData.disease_activity,
              caseData.prior_treatments,
              caseData.lab_values,
            ].filter(Boolean).join("\n\n")

            const woundTypeFromMeta = caseData.metadata?.wound_type as WoundType | undefined

            lcdValidationResult = await validateAgainstLCD(
              clinicalNotesForValidation,
              caseData.requested_medication || "",
              researchContext,
              woundTypeFromMeta,
              caseData.patient_state // For policy change detection
            )

            // Store validation in metadata
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
                  ...(existingChecklistEdits && { checklist_edits: existingChecklistEdits }),
                },
              })
              .eq("id", caseId)
          } catch (validationError) {
            console.error("LCD Validation Error:", validationError)
          }
        }

        // --- PHASE: extracting_forms ---
        sendEvent(controller, encoder, { phase: 'extracting_forms' })

        // Normalize confidence value to match DB constraint
        const normalizeConfidence = (conf: string | undefined): 'high' | 'medium' | 'low' => {
          const normalized = (conf || '').toLowerCase().trim()
          if (normalized === 'high') return 'high'
          if (normalized === 'medium' || normalized === 'med') return 'medium'
          if (normalized === 'low') return 'low'
          return 'medium' // Default to medium if unknown
        }

        try {
          const formExtractionPrompt = `Identify REQUIRED forms based on payer research. Return JSON only: {"forms": [{"title": string, "description": string, "form_type": string, "confidence": string}]}

Research: ${researchContext.substring(0, 2000)}
Payer: ${caseData.payer_name}
Medication: ${caseData.requested_medication}`

          const formModel = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json"
            }
          })

          const formResult = await formModel.generateContent(formExtractionPrompt)
          let content = formResult.response.text() || "{}"
          content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "")

          const formsOutput = JSON.parse(content)
          const suggestedForms = formsOutput.forms || []

          if (suggestedForms.length > 0) {
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

            // Delete old suggested forms for this case (cleanup on regeneration)
            await supabase.from("case_suggested_forms").delete().eq("case_id", caseId)

            await supabase.from("case_suggested_forms").insert(formsToInsert)
          }
        } catch (formError) {
          console.error("Error extracting forms:", formError)
        }

        // --- PHASE: generating ---
        sendEvent(controller, encoder, { phase: 'generating' })

        // Load chat context
        let chatConversationContext = ""
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
            chatConversationContext = `\nCHAT CONTEXT:\n${relevantMessages}\n`
          }
        }

        // Build prompts (simplified for streaming version)
        const systemContext = isBiologicsPA && lcdValidationResult
          ? `You are an AI for CTP prior authorization documentation. Generate professional medical documentation.
LCD Validation: Risk ${lcdValidationResult.auditRisk.overallScore}, ${lcdValidationResult.summary.foundCount}/${lcdValidationResult.summary.totalRequirements} requirements met.`
          : `You are an AI for medical documentation. Generate professional, persuasive prior authorization letters.`

        const fullPrompt = `${systemContext}

Generate ${getDocTypeLabel(caseData.doc_type)} for:
Patient: ${caseData.patient_first_name} ${caseData.patient_last_name}, ${caseData.patient_age}yo, ${caseData.patient_state}
Payer: ${caseData.payer_name}
Medication: ${caseData.requested_medication}

RESEARCH: ${researchContext.substring(0, 3000)}
${chatConversationContext}
CLINICAL NOTES: ${caseData.disease_activity || ''} ${caseData.prior_treatments || ''} ${caseData.lab_values || ''}

Generate a professional, persuasive prior authorization letter. Do not use markdown formatting like ** or #. Use plain text only.`

        const docModel = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 3000,
          }
        })

        const docResult = await docModel.generateContent(fullPrompt)
        let documentation = docResult.response.text() || ""

        // Clean up formatting
        documentation = documentation
          .replace(/\*\*/g, '')
          .replace(/#{1,6}\s/g, '')
          .replace(/\*/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim()

        // Fetch suggested forms and append to documentation
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
        sendEvent(controller, encoder, { phase: 'saving' })

        // Update case
        const { error: updateError } = await supabase
          .from("cases")
          .update({
            generated_output: documentation,
            edited_output: documentation,
            status: "draft",
          })
          .eq("id", caseId)

        if (updateError) {
          sendEvent(controller, encoder, { error: "Failed to save documentation" })
          controller.close()
          return
        }

        // Handle credits
        const isFromChatMode = caseData.status === 'chat'
        const isRegeneration = caseData.status !== 'chat' && !!caseData.generated_output

        if (isFromChatMode || isRegeneration) {
          const { data: currentUser } = await supabase
            .from("users")
            .select("team_owner_id, cases_remaining")
            .eq("id", session.user.id)
            .single()

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
        }

        // Build result
        const result: any = {
          success: true,
          documentation,
        }

        if (isBiologicsPA && lcdValidationResult) {
          result.validation = {
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

        // --- COMPLETE ---
        sendEvent(controller, encoder, { complete: true, result })
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()

      } catch (error: any) {
        console.error("Error in generate stream:", error)
        sendEvent(controller, encoder, { error: error.message || "Generation failed" })
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}

function getDocTypeLabel(docType: string): string {
  switch (docType) {
    case "biologics_pa": return "Biologics Prior Authorization"
    case "medical_necessity": return "Medical Necessity Letter"
    case "appeal": return "Appeal Documentation"
    default: return "Medical Documentation"
  }
}
