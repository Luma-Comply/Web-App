import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  validateAgainstLCD,
  LCDValidationResult,
  ChecklistEditsData,
} from "@/lib/lcd-validation"
import { WoundType } from "@/lib/lcd-requirements"
import { getMACInfo, isWiserActiveForSkinSubs } from "@/lib/mac-jurisdictions"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  // Use TransformStream for better flushing behavior
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  // Helper to send and flush events immediately
  const sendEvent = async (data: any) => {
    console.log('[SSE] Sending event:', JSON.stringify(data).substring(0, 200))
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  // Run generation in background (don't await)
  ;(async () => {
    try {
      const { caseId } = await request.json()

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

      const pp_apiKey = process.env.PERPLEXITY_API_KEY
      let lcdValidationResult: LCDValidationResult | null = null
      const isBiologicsPA = caseData.doc_type === "biologics_pa"

      // --- PHASE: researching ---
      await sendEvent({ phase: 'researching' })

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
          console.log('[SSE] Perplexity response status:', researchResponse.status)

          if (researchResponse.ok) {
            const researchData = await researchResponse.json()
            researchContext = researchData.choices[0]?.message?.content || "No research data returned."
            console.log('[SSE] Perplexity research completed, length:', researchContext.length)
          }
        } catch (ppError: any) {
          if (ppError.name === 'AbortError') {
            console.error("[SSE] Perplexity Call Timed Out after 20s")
          } else {
            console.error("[SSE] Perplexity Call Failed:", ppError)
          }
          // Continue with default context - don't block generation
        }
      }
      console.log('[SSE] Research phase complete, moving to validating...')

      // --- PHASE: validating ---
      await sendEvent({ phase: 'validating' })

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
            caseData.patient_state
          )
        } catch (validationError) {
          console.error("LCD Validation Error:", validationError)
        }
      }

      // --- PHASE: extracting_forms ---
      await sendEvent({ phase: 'extracting_forms' })

      const normalizeConfidence = (conf: string | undefined): 'high' | 'medium' | 'low' => {
        const normalized = (conf || '').toLowerCase().trim()
        if (normalized === 'high') return 'high'
        if (normalized === 'medium' || normalized === 'med') return 'medium'
        if (normalized === 'low') return 'low'
        return 'medium'
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

          await supabase.from("case_suggested_forms").delete().eq("case_id", caseId)
          await supabase.from("case_suggested_forms").insert(formsToInsert)
        }
      } catch (formError) {
        console.error("Error extracting forms:", formError)
      }

      // --- PHASE: generating ---
      await sendEvent({ phase: 'generating' })

      // Load chat messages for context
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

      // Build checklist edits context - include user's notes and addressed items
      let checklistEditsContext = ""
      const existingChecklistEdits = caseData.metadata?.checklist_edits as ChecklistEditsData | undefined
      if (existingChecklistEdits?.edits && lcdValidationResult) {
        const editEntries = Object.entries(existingChecklistEdits.edits)
        if (editEntries.length > 0) {
          const editsForPrompt: string[] = []

          // Find the item labels from the validation checklist
          const allItems = lcdValidationResult.checklist.flatMap(cat => cat.items)

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
${chatConversationContext}${checklistEditsContext}
CLINICAL NOTES: ${caseData.disease_activity || ''} ${caseData.prior_treatments || ''} ${caseData.lab_values || ''}

Generate a professional, persuasive prior authorization letter. Do not use markdown formatting like ** or #. Use plain text only. If provider checklist updates are provided above, incorporate that information into the letter.`

      const docModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
        }
      })

      const docResult = await docModel.generateContent(fullPrompt)
      let documentation = docResult.response.text() || ""

      documentation = documentation
        .replace(/\*\*/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/\*/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

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

      const updateData: any = {
        generated_output: documentation,
        edited_output: documentation,
        status: "draft",
      }

      if (isBiologicsPA && lcdValidationResult) {
        const existingChecklistEdits = caseData.metadata?.checklist_edits as ChecklistEditsData | undefined
        updateData.metadata = {
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
      console.log('[SSE] Generation complete, sending result...')
      await sendEvent({ complete: true, result })
      await writer.write(encoder.encode("data: [DONE]\n\n"))
      await writer.close()

    } catch (error: any) {
      console.error("Error in generate stream:", error)
      await sendEvent({ error: error.message || "Generation failed" })
      await writer.close()
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
    case "medical_necessity": return "Medical Necessity Letter"
    case "appeal": return "Appeal Documentation"
    default: return "Medical Documentation"
  }
}
