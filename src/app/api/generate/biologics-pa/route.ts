
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { computeAgeTags, formatAgeTagsForPrompt, reinsertPatientName, PATIENT_PLACEHOLDER } from '@/lib/phi-utils';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const formData = await req.json();

        // Validate required fields
        if (!formData.payerName || !formData.requestedMedication || !formData.diagnosisCodes) {
            return NextResponse.json(
                { error: 'Missing required fields: payerName, requestedMedication, or diagnosisCodes' },
                { status: 400 }
            );
        }

        // STEP 1: Research with Perplexity
        const researchPrompt = `
      Find current ${formData.payerName} requirements for
      ${formData.requestedMedication} for ICD-10 ${formData.diagnosisCodes}.
      Include LCD/NCD requirements, step therapy, and documentation needed.
    `;

        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar-pro',
                messages: [{ role: 'user', content: researchPrompt }],
            }),
        });

        if (!perplexityResponse.ok) {
            const errorText = await perplexityResponse.text();
            console.error('Perplexity API Error:', errorText);
            throw new Error(`Perplexity API (Research) failed: ${perplexityResponse.statusText}`);
        }

        const researchData = await perplexityResponse.json();
        const researchContent = researchData.choices[0]?.message?.content || "No research found.";
        const citations = researchData.citations || [];

        // STEP 2: Generate with Gemini
        const generationPrompt = `
      Using these current requirements: ${researchContent}

      Generate medical necessity documentation for:
      Patient: ${PATIENT_PLACEHOLDER}
      ${formData.patientAge ? formatAgeTagsForPrompt(computeAgeTags(Number(formData.patientAge))) : 'Age Group: unknown'}
      Diagnosis: ${formData.diagnosisCodes}
      CRITICAL: Use ${PATIENT_PLACEHOLDER} as the patient name throughout. Do NOT invent any patient names or identifiers.
      Prior treatments: ${formData.priorTreatments || 'None provided'}
      Labs: ${formData.labValues || 'None provided'}
      Requesting: ${formData.requestedMedication}
      Payer: ${formData.payerName}

      Format with clear headers and compliance checklist.
    `;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: "You are a medical documentation specialist. Create compliant, professional medical necessity letters.",
        });

        const result = await model.generateContent(generationPrompt);

        // Re-insert patient name (replace [PATIENT] with actual name)
        let documentation = result.response.text() || "";
        documentation = reinsertPatientName(
            documentation,
            formData.patientFirstName || '',
            formData.patientLastName || ''
        );

        return NextResponse.json({
            documentation,
            sources: citations
        });

    } catch (error: any) {
        console.error('Generation Error:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred during generation' },
            { status: 500 }
        );
    }
}
