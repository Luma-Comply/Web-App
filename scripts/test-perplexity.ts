
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

async function testPerplexity() {
    console.log("Testing Perplexity API...")
    const apiKey = process.env.PERPLEXITY_API_KEY
    console.log("API Key present:", !!apiKey)

    try {
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "sonar-pro",
                messages: [
                    { role: "system", content: "Be concise." },
                    { role: "user", content: "What is current year?" }
                ],
                temperature: 0.1
            })
        })

        console.log("Status:", response.status)
        const text = await response.text()
        console.log("Body:", text)

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`)
        }

    } catch (error) {
        console.error("Failed:", error)
    }
}

testPerplexity()
