
import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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
      ${formData.requestedMedication} for ${formData.diagnosisCodes}.
      Include LCD/NCD requirements, step therapy, and documentation needed.
    `;

        // Perplexity uses OpenAI-compatible API structure
        // We use fetch here to avoid instantiating another OpenAI client if not needed,
        // or we could use the openai client with a different base URL.
        // Fetch is explicit and simple for this single call.
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

        // STEP 2: Generate with ChatGPT-4o
        const generationPrompt = `
      Using these current requirements: ${researchContent}
      
      Generate medical necessity documentation for:
      Patient: ${formData.patientFirstName || 'Unknown'} ${formData.patientLastName || 'Unknown'}
      Age: ${formData.patientAge || 'Unknown'}
      Diagnosis: ${formData.diagnosisCodes}
      Prior treatments: ${formData.priorTreatments || 'None provided'}
      Labs: ${formData.labValues || 'None provided'}
      Requesting: ${formData.requestedMedication}
      Payer: ${formData.payerName}
      
      Format with clear headers and compliance checklist.
    `;

        const documentation = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a medical documentation specialist. Create compliant, professional medical necessity letters." },
                { role: "user", content: generationPrompt }
            ]
        });

        return NextResponse.json({
            documentation: documentation.choices[0].message.content,
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
