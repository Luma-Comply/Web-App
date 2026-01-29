import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import mammoth from "mammoth"
// @ts-ignore
import PDFParser from "pdf2json"
import * as XLSX from 'xlsx'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ["pdf", "docx", "xlsx", "png", "jpg", "jpeg"]
const PDF_PARSE_TIMEOUT = 30000 // 30 seconds

function safeDecodeText(text: string): string {
  if (!text) return ""
  try {
    return decodeURIComponent(text)
  } catch {
    try {
      return text.replace(/%([0-9A-F]{2})/g, (_, p1) => {
        return String.fromCharCode(parseInt(p1, 16))
      })
    } catch {
      return text
    }
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()

    const timeout = setTimeout(() => {
      reject(new Error("PDF parsing timed out"))
    }, PDF_PARSE_TIMEOUT)

    pdfParser.on("pdfParser_dataError", (err: any) => {
      clearTimeout(timeout)
      reject(new Error(err.parserError))
    })

    pdfParser.on("pdfParser_dataReady", () => {
      clearTimeout(timeout)
      const text = pdfParser.getRawTextContent() || ""
      resolve(safeDecodeText(text))
    })

    pdfParser.parseBuffer(buffer)
  })
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function extractTextFromXLSX(buffer: Buffer): Promise<string> {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const results: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const csvData = XLSX.utils.sheet_to_csv(sheet)
    if (csvData.trim()) {
      results.push(`--- Sheet: ${sheetName} ---\n${csvData}`)
    }
  }

  return results.join('\n\n')
}

async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const base64 = buffer.toString("base64")

  const systemPrompt = `You are a medical image analyst specializing in wound care documentation for prior authorization.

When analyzing images, determine if it's:
1. A DOCUMENT/FORM - Extract all text, preserving structure
2. A CLINICAL PHOTO (wound, skin condition, etc.) - Provide detailed clinical analysis

For wound/clinical photos, describe:
- Wound location (anatomical site)
- Estimated wound size (length x width in cm if possible)
- Wound bed characteristics (granulation tissue %, slough %, necrotic tissue %)
- Wound edges (regular/irregular, undermining, rolled edges)
- Periwound skin condition (maceration, erythema, induration)
- Depth assessment if visible
- Signs of infection (purulent drainage, odor notes, surrounding cellulitis)
- Tissue type classification (epithelial, granulation, slough, eschar)
- Wound stage if applicable (for pressure injuries)
- Any visible measurements or rulers in the image
- Overall wound healing trajectory assessment

Be specific and clinical. This information will be used for Medicare LCD L35041 compliance documentation.`

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  })

  const result = await model.generateContent([
    "Analyze this medical image. If it's a document, extract the text. If it's a clinical photo (wound, skin condition, etc.), provide a detailed clinical assessment.",
    {
      inlineData: {
        mimeType: mimeType,
        data: base64
      }
    }
  ])

  return result.response.text() || ""
}

async function generateSummary(text: string, filename: string): Promise<string> {
  const truncatedText = text.slice(0, 8000) // Limit context for summary

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: "You are a medical document analyst. Provide a brief summary (2-3 sentences) of the uploaded document, focusing on clinically relevant information for prior authorization purposes.",
    generationConfig: {
      maxOutputTokens: 200,
    }
  })

  const result = await model.generateContent(`Summarize this document (${filename}):\n\n${truncatedText}`)

  return result.response.text() || "Document uploaded successfully."
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const caseId = formData.get("caseId") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!caseId) {
      return NextResponse.json({ error: "Case ID is required" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 })
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""
    if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}` },
        { status: 400 }
      )
    }

    // Authenticate and verify case ownership
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("id, user_id")
      .eq("id", caseId)
      .eq("user_id", session.user.id)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 })
    }

    // Process the file
    const buffer = Buffer.from(await file.arrayBuffer())
    let extractedText = ""

    console.log(`[Upload API] Processing file: ${file.name}, type: ${fileExtension}, size: ${file.size}`)

    if (fileExtension === "pdf") {
      extractedText = await extractTextFromPDF(buffer)
      console.log(`[Upload API] PDF extracted text length: ${extractedText.length}`)
    } else if (fileExtension === "docx") {
      extractedText = await extractTextFromDOCX(buffer)
      console.log(`[Upload API] DOCX extracted text length: ${extractedText.length}`)
    } else if (fileExtension === "xlsx") {
      extractedText = await extractTextFromXLSX(buffer)
      console.log(`[Upload API] XLSX extracted text length: ${extractedText.length}`)
    } else if (["png", "jpg", "jpeg"].includes(fileExtension)) {
      const mimeType = fileExtension === "jpg" ? "image/jpeg" : `image/${fileExtension}`
      extractedText = await extractTextFromImage(buffer, mimeType)
      console.log(`[Upload API] Image extracted text length: ${extractedText.length}`)
    }

    if (!extractedText || extractedText.trim().length === 0) {
      console.error(`[Upload API] WARNING: No text extracted from ${file.name}`)
    }

    // Generate summary
    const summary = await generateSummary(extractedText, file.name)
    console.log(`[Upload API] Generated summary: ${summary.substring(0, 100)}...`)

    // Save as system message with metadata
    const { error: saveError } = await supabase.from("case_messages").insert({
      case_id: caseId,
      role: "system" as const,
      content: `Document uploaded: ${file.name}\n\nSummary: ${summary}`,
      metadata: {
        type: "file_upload",
        filename: file.name,
        fileSize: file.size,
        fileType: fileExtension,
        extractedText: extractedText.slice(0, 50000), // Limit stored text
        summary,
      },
    })

    if (saveError) {
      console.error("Error saving upload message:", saveError)
      return NextResponse.json({ error: "Failed to save upload record" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      summary,
      extractedText,
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process upload" },
      { status: 500 }
    )
  }
}
