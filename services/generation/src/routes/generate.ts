import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { authMiddleware } from '../middleware/auth.js'
import { createAuthClient, createServiceClient } from '../lib/supabase.js'
import {
  validateAgainstLCD,
  LCDValidationResult,
  ChecklistEditsData,
} from '@/lib/lcd-validation'
import { WoundType, icd10ToWoundType } from '@/lib/lcd-requirements'
import { getMACInfo, isWiserActiveForSkinSubs } from '@/lib/mac-jurisdictions'
import { validateMedicalNecessity, MedicalNecessityValidationResult } from '@/lib/validation/medical-necessity-validation'
import { validateAppeal, AppealValidationResult } from '@/lib/validation/appeal-validation'
import { computeAgeTags, formatAgeTagsForPrompt, reinsertPatientName, PATIENT_PLACEHOLDER } from '@/lib/phi-utils'

// Unified validation result type for all doc types
type ValidationResult = LCDValidationResult | MedicalNecessityValidationResult | AppealValidationResult

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Timeout helper for Gemini calls (SDK doesn't support AbortSignal)
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ])
}

function getDocTypeLabel(docType: string): string {
  switch (docType) {
    case 'biologics_pa': return 'Biologics Prior Authorization'
    case 'medical_necessity': return 'Prior Authorization Letter'
    case 'appeal': return 'Appeal Documentation'
    default: return 'Medical Documentation'
  }
}

export const generateRoute = new Hono()

generateRoute.post('/stream', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const accessToken = c.get('accessToken')
  const { caseId } = await c.req.json()

  if (!caseId) {
    return c.json({ error: 'Case ID is required' }, 400)
  }

  return streamSSE(c, async (stream) => {
    const sendEvent = async (data: any) => {
      console.log('[SSE] Sending event:', JSON.stringify(data).substring(0, 200))
      await stream.writeSSE({ data: JSON.stringify(data) })
    }

    try {
      // --- PHASE: loading_case ---
      await sendEvent({ phase: 'loading_case' })

      const authSupabase = createAuthClient(accessToken)
      const serviceSupabase = createServiceClient()

      const { data: caseData, error: caseError } = await authSupabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('user_id', userId)
        .single()

      if (caseError || !caseData) {
        await sendEvent({ error: 'Case not found' })
        return
      }

      // Mark case as generating so polling can detect when complete
      await serviceSupabase
        .from('cases')
        .update({ status: 'generating' })
        .eq('id', caseId)

      const pp_apiKey = process.env.PERPLEXITY_API_KEY
      let validationResult: ValidationResult | null = null
      const isBiologicsPA = caseData.doc_type === 'biologics_pa'
      const isMedicalNecessity = caseData.doc_type === 'medical_necessity'
      const isAppeal = caseData.doc_type === 'appeal'

      // --- PHASE: researching ---
      await sendEvent({ phase: 'researching' })

      let researchContext = 'No specific payer guidelines found.'

      // Format all ICD-10 codes for prompts (supports multi-code)
      const formatIcd10ForPrompt = (): string => {
        const codes = caseData.metadata?.icd10_codes as Array<{ code: string; description: string }> | undefined
        if (codes && codes.length > 0) {
          return codes.map((c: { code: string; description: string }) => `${c.code} — ${c.description}`).join('; ')
        }
        if (caseData.metadata?.icd10_code) {
          return `${caseData.metadata.icd10_code} — ${caseData.metadata.icd10_description || caseData.metadata.icd10_code}`
        }
        return caseData.diagnosis_codes?.join(', ') || 'See clinical notes'
      }

      if (pp_apiKey && caseData.payer_name && caseData.payer_name !== 'Unknown') {
        try {
          const docTypeLabel = getDocTypeLabel(caseData.doc_type)
          const clinicalNotes = [
            caseData.disease_activity,
            caseData.prior_treatments,
            caseData.lab_values,
            caseData.diagnosis_codes?.join(', ')
          ].filter(Boolean).join('\n\n')

          // Get state-specific MAC information
          const macInfo = getMACInfo(caseData.patient_state)
          const isWiserState = isWiserActiveForSkinSubs(caseData.patient_state)
          const lcdNumber = macInfo?.lcdPolicyNumber || 'L35041'

          let researchQuery: string
          if (isBiologicsPA) {
            researchQuery = `Research current Medicare Part B LCD ${lcdNumber} requirements for CTP/skin substitutes:

STATE-SPECIFIC MAC INFO:
- State: ${caseData.patient_state}
- MAC: ${macInfo?.macName || 'Unknown'} (${macInfo?.jurisdiction || 'Unknown'})
- LCD: ${lcdNumber}
${isWiserState ? `- WISeR Pilot: YES - PA processed by ${macInfo?.aiVendor}` : '- WISeR Pilot: NO'}

PATIENT CASE:
- ICD-10: ${formatIcd10ForPrompt()}
- CTP Product: ${caseData.requested_medication}
- Payer: ${caseData.payer_name}
CLINICAL CONTEXT: ${clinicalNotes.substring(0, 1500)}

Find for LCD ${lcdNumber} (${macInfo?.macName || 'this MAC'}): LCD effective date, product coverage on THIS MAC's list, application limits, SOC failure criteria, ABI thresholds, debridement requirements, common denial reasons.`
          } else {
            researchQuery = `Research ${docTypeLabel} criteria for ${caseData.payer_name} in ${caseData.patient_state}:
Diagnosis: ${formatIcd10ForPrompt()}
Medication: ${caseData.requested_medication}
Patient: ${formatAgeTagsForPrompt(computeAgeTags(caseData.patient_age))}
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
            ? `You are a Medicare LCD compliance researcher for CTP/skin substitutes. The patient is in ${caseData.patient_state} under ${macInfo?.macName || 'Medicare'} (${macInfo?.jurisdiction || 'unknown'}). Research LCD ${lcdNumber} requirements SPECIFIC to this MAC.${isWiserState ? ` This is a WISeR pilot state - PA processed by ${macInfo?.aiVendor}.` : ''}`
            : 'You are a medical insurance researcher specializing in payer policies.'

          const researchResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${pp_apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'sonar-pro',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: researchQuery }
              ],
              temperature: 0.1
            }),
            signal: abortController.signal
          })

          clearTimeout(timeoutId)
          console.log('[SSE] Perplexity response status:', researchResponse.status)

          if (researchResponse.ok) {
            const researchData = await researchResponse.json()
            researchContext = researchData.choices[0]?.message?.content || 'No research data returned.'
            console.log('[SSE] Perplexity research completed, length:', researchContext.length)
          }
        } catch (ppError: any) {
          if (ppError.name === 'AbortError') {
            console.error('[SSE] Perplexity Call Timed Out after 20s')
          } else {
            console.error('[SSE] Perplexity Call Failed:', ppError)
          }
          // Continue with default context - don't block generation
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
      ].filter(Boolean).join('\n\n')

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
            caseData.requested_medication || '',
            researchContext,
            woundTypeFromMeta,
            caseData.patient_state
          )
        } else if (isMedicalNecessity) {
          return await validateMedicalNecessity(
            clinicalNotesForValidation,
            caseData.requested_medication || '',
            researchContext,
            caseData.payer_name
          )
        } else if (isAppeal) {
          return await validateAppeal(
            clinicalNotesForValidation,
            caseData.requested_medication || '',
            researchContext,
            undefined,
            caseData.payer_name
          )
        }
        return null
      })().catch(err => {
        console.error('Validation Error:', err)
        return null
      })

      // Task 2: Form extraction (Gemini call)
      const formExtractionTask = (async () => {
        const formExtractionPrompt = `Identify REQUIRED forms based on payer research. Return JSON only: {"forms": [{"title": string, "description": string, "form_type": string, "confidence": string}]}

Research: ${researchContext.substring(0, 2000)}
Payer: ${caseData.payer_name}
Medication: ${caseData.requested_medication}`

        const formModel = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        })

        const formResult = await withTimeout(
          formModel.generateContent(formExtractionPrompt),
          30000,
          'Form extraction'
        )
        let content = formResult.response.text() || '{}'
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')

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

          await serviceSupabase.from('case_suggested_forms').delete().eq('case_id', caseId)
          await serviceSupabase.from('case_suggested_forms').insert(formsToInsert)
        }
      })().catch(formError => {
        console.error('Error extracting forms:', formError)
      })

      // Task 3: Load chat messages
      const chatTask = (async () => {
        const { data: chatMessages } = await authSupabase
          .from('case_messages')
          .select('role, content')
          .eq('case_id', caseId)
          .order('created_at', { ascending: true })

        if (chatMessages && chatMessages.length > 0) {
          const relevantMessages = chatMessages
            .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
            .map((msg) => `${msg.role === 'user' ? 'Provider' : 'Luma'}: ${msg.content}`)
            .join('\n\n')

          if (relevantMessages) {
            return `\nCHAT CONTEXT:\n${relevantMessages}\n`
          }
        }
        return ''
      })()

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
          model: 'gemini-2.5-flash',
          generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
        })

        const summaryResult = await withTimeout(
          summaryModel.generateContent(
            `Summarize these clinical notes for a prior authorization letter. Preserve ALL clinically relevant details: diagnoses, wound measurements, prior treatments and their outcomes, lab values, disease activity scores, failed therapies, and treatment timeline. Be concise but miss nothing medically important.\n\n${rawClinicalNotes}`
          ),
          20000,
          'Clinical notes summary'
        )
        const summary = summaryResult.response.text() || ''
        console.log(`[SSE] Summarized ${rawClinicalNotes.length} chars → ${summary.length} chars`)
        return summary
      })().catch(err => {
        console.error('Clinical summary failed, using truncated notes:', err)
        return rawClinicalNotes.substring(0, 6000)
      })

      // Await all four in parallel
      const [validationSettled, , chatConversationContext, clinicalNotesSummary] = await Promise.all([
        validationTask,
        formExtractionTask,
        chatTask,
        clinicalSummaryTask,
      ])
      validationResult = validationSettled as ValidationResult | null
      await sendEvent({ phase: 'extracting_forms' })

      // --- PHASE: generating ---
      await sendEvent({ phase: 'generating' })

      // Build checklist edits context - include user's notes and addressed items
      let checklistEditsContext = ''
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

      const systemContext = validationResult
        ? `You are an AI for ${isBiologicsPA ? 'CTP prior authorization' : isMedicalNecessity ? 'medical necessity letter' : 'appeal letter'} documentation. Generate professional medical documentation.
Validation: Risk ${validationResult.auditRisk.overallScore}, ${validationResult.summary.foundCount}/${validationResult.summary.totalRequirements} requirements met.
CRITICAL: Use ${PATIENT_PLACEHOLDER} as the patient name throughout. Do NOT invent or extract any patient names, dates of birth, or specific identifiers. Use generalized timeframes.`
        : `You are an AI for medical documentation. Generate professional, persuasive prior authorization letters.
CRITICAL: Use ${PATIENT_PLACEHOLDER} as the patient name throughout. Do NOT invent or extract any patient names, dates of birth, or specific identifiers. Use generalized timeframes.`

      const fullPrompt = `${systemContext}

Generate ${getDocTypeLabel(caseData.doc_type)} for:
Diagnosis: ${formatIcd10ForPrompt()}
Patient: ${PATIENT_PLACEHOLDER}, ${formatAgeTagsForPrompt(computeAgeTags(caseData.patient_age))}, ${caseData.patient_state}
Payer: ${caseData.payer_name}
Medication: ${caseData.requested_medication}

RESEARCH: ${researchContext.substring(0, 3000)}
${chatConversationContext}${checklistEditsContext}
CLINICAL NOTES: ${clinicalNotesSummary}

Generate a professional, persuasive prior authorization letter. Do not use markdown formatting like ** or #. Use plain text only. If provider checklist updates are provided above, incorporate that information into the letter.`

      const docModel = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
        }
      })

      let documentation = ''
      try {
        const docResult = await withTimeout(
          docModel.generateContent(fullPrompt),
          120000,
          'Documentation generation'
        )
        documentation = docResult.response.text() || ''
      } catch (firstAttemptError) {
        console.error('[SSE] Doc generation failed, retrying once...', firstAttemptError)
        const docResult = await withTimeout(
          docModel.generateContent(fullPrompt),
          120000,
          'Documentation generation (retry)'
        )
        documentation = docResult.response.text() || ''
      }

      // Re-insert patient name (replace [PATIENT] with actual name)
      documentation = reinsertPatientName(documentation, caseData.patient_first_name, caseData.patient_last_name)

      documentation = documentation
        .replace(/\*\*/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/\*/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

      const { data: savedForms } = await serviceSupabase
        .from('case_suggested_forms')
        .select('title, description, form_type, confidence')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })

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
        status: 'draft',
      }

      // Save validation results for all doc types
      if (validationResult) {
        const existingChecklistEditsForSave = caseData.metadata?.checklist_edits as ChecklistEditsData | undefined

        if (isBiologicsPA) {
          const lcdResult = validationResult as LCDValidationResult
          updateData.metadata = {
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
            ...(existingChecklistEditsForSave && { checklist_edits: existingChecklistEditsForSave }),
          }
        } else {
          // Medical Necessity and Appeal
          updateData.metadata = {
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
              ctpCovered: true,
              instantDenialTriggers: validationResult.auditRisk.instantDenialTriggers,
              veryHighRiskItems: validationResult.auditRisk.veryHighRiskItems,
              highRiskItems: validationResult.auditRisk.highRiskItems,
              checklist: validationResult.checklist,
              recommendations: validationResult.recommendations,
              perplexityFindings: validationResult.perplexityFindings,
            },
            ...(existingChecklistEditsForSave && { checklist_edits: existingChecklistEditsForSave }),
          }
        }
      }

      const { error: updateError } = await serviceSupabase
        .from('cases')
        .update(updateData)
        .eq('id', caseId)

      if (updateError) {
        console.error('Failed to save documentation:', updateError)
        await sendEvent({ error: 'Failed to save documentation' })
        return
      }

      // Build result
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
      await stream.writeSSE({ data: '[DONE]' })

    } catch (error: any) {
      console.error('Error in generate stream:', error)

      // Reset case status using service client
      if (caseId) {
        try {
          const cleanupClient = createServiceClient()
          await cleanupClient
            .from('cases')
            .update({ status: 'draft' })
            .eq('id', caseId)
            .eq('status', 'generating')
          console.log('[SSE] Reset case status to draft after error')
        } catch (cleanupError) {
          console.error('[SSE] Failed to reset case status:', cleanupError)
        }
      }

      try {
        await sendEvent({ error: error.message || 'Generation failed' })
      } catch {
        // Stream may already be closed
      }
    }
  })
})
