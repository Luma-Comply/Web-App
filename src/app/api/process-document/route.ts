import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import mammoth from "mammoth";
import { createClient } from "@supabase/supabase-js";
// @ts-ignore
import PDFParser from "pdf2json";

// --- Configuration ---
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = ['pdf', 'docx'];
const PDF_PARSE_TIMEOUT = 30000; // 30 seconds
const COORD_SCALE_FACTOR = 16; // Standard letter is 612 points / 38.25 pdf2json units = 16

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const sensitivePatterns = [
  { name: "SSN", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: "Date", regex: /\b\d{1,2}\/\d{1,2}\/(?:\d{4}|\d{2})\b/g },
  { name: "DOB", regex: /(?:dob|date of birth)[\s:]*(\d{1,2}\/\d{1,2}\/\d{2,4})/gi }
];

// --- Helper Functions ---

/**
 * Safely decodes URI components with multiple fallbacks
 */
function safeDecodeText(text: string): string {
  if (!text) return "";
  try {
    return decodeURIComponent(text);
  } catch (e) {
    // Fallback 1: Try to decode manually common patterns
    try {
      return text.replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      });
    } catch (e2) {
      // Fallback 2: Return raw text
      return text;
    }
  }
}

/**
 * Safely extracts text from various pdf2json item structures
 */
function extractTextFromItem(textItem: any): string {
  if (!textItem) return "";
  try {
    if (textItem.R && Array.isArray(textItem.R) && textItem.R[0] && textItem.R[0].T) {
      return safeDecodeText(textItem.R[0].T);
    }
    if (textItem.text) return textItem.text;
    if (textItem.T) return safeDecodeText(textItem.T);
    return "";
  } catch (e) {
    return "";
  }
}

/**
 * Type guard to safely get pages from potentially varying pdf2json structure
 */
function getPdfPages(pdfData: any): any[] | null {
  if (!pdfData) return null;
  if (pdfData.formImage && Array.isArray(pdfData.formImage.Pages)) {
    return pdfData.formImage.Pages;
  }
  if (Array.isArray(pdfData.Pages)) {
    return pdfData.Pages;
  }
  if (Array.isArray(pdfData.pages)) {
    return pdfData.pages;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const warnings: string[] = [];

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    // 1. Validation
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 50MB limit" }, { status: 400 });
    }

    const fileType = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    let extractedText = "";
    let redactedBuffer: Buffer | null = null;
    let redactedCount = 0;

    // 2. Processing
    if (fileType === 'pdf') {
      try {
        // Parse PDF with Timeout
        const pdfParser = new PDFParser();
        const parsePromise = new Promise((resolve, reject) => {
          pdfParser.on("pdfParser_dataError", (err: any) => reject(new Error(err.parserError)));
          pdfParser.on("pdfParser_dataReady", (data: any) => resolve(data));
          pdfParser.parseBuffer(buffer);
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("PDF parsing timed out")), PDF_PARSE_TIMEOUT)
        );

        const pdfData: any = await Promise.race([parsePromise, timeoutPromise]);
        extractedText = pdfParser.getRawTextContent() || "";

        // Redaction Logic
        const pagesData = getPdfPages(pdfData);

        if (pagesData) {
          const pdfDoc = await PDFDocument.load(buffer);
          const pages = pdfDoc.getPages();

          pagesData.forEach((pageData: any, pageIndex: number) => {
            if (pageIndex >= pages.length) return;

            const pdfLibPage = pages[pageIndex];
            const { height: pageHeight } = pdfLibPage.getSize();

            if (pageData.Texts && Array.isArray(pageData.Texts)) {
              pageData.Texts.forEach((textItem: any) => {
                const rawText = extractTextFromItem(textItem);
                if (!rawText) return;

                let shouldRedact = false;
                for (const p of sensitivePatterns) {
                  p.regex.lastIndex = 0; // Reset regex state
                  if (p.regex.test(rawText)) {
                    shouldRedact = true;
                    redactedCount++;
                    break;
                  }
                }

                if (shouldRedact) {
                  // Coordinates 
                  // pdf2json (units) -> pdf-lib (points)
                  // Origin: pdf2json (Top-Left) -> pdf-lib (Bottom-Left)
                  const x = (textItem.x || 0) * COORD_SCALE_FACTOR;
                  const y = (textItem.y || 0) * COORD_SCALE_FACTOR;
                  const w = (textItem.w || 0) * COORD_SCALE_FACTOR;
                  const h = 12; // Fixed height for redaction bar

                  pdfLibPage.drawRectangle({
                    x: x,
                    y: pageHeight - y - h,
                    width: w * 1.2, // Slight padding
                    height: h,
                    color: rgb(0, 0, 0),
                  });
                }
              });
            }
          });

          const savedBytes = await pdfDoc.save();
          redactedBuffer = Buffer.from(savedBytes);
        } else {
          warnings.push("Could not parse PDF structure for redaction. Only text extracted.");
        }

      } catch (pdfError: any) {
        console.error("PDF Processing Error:", pdfError);
        warnings.push(`PDF processing failed: ${pdfError.message}. Using raw file.`);
        // Fallback: Don't fail completely, just skip redaction/extraction
      }

    } else if (fileType === 'docx') {
      try {
        const result = await mammoth.extractRawText({ buffer: buffer });
        extractedText = result.value;
        if (result.messages && result.messages.length > 0) {
          result.messages.forEach(m => warnings.push(`Docx warning: ${m.message}`));
        }
      } catch (docxError: any) {
        warnings.push(`Docx extraction failed: ${docxError.message}`);
      }
    }

    // 3. Storage & Database
    const timestamp = Date.now();
    const originalPath = `${userId}/${timestamp}-${safeName}`;

    try {
      await supabase.storage.from('case-documents').upload(originalPath, buffer, {
        contentType: file.type, upsert: false
      });
    } catch (storageError: any) {
      throw new Error(`Failed to upload original file: ${storageError.message}`);
    }

    let redactedPath = null;
    if (redactedBuffer) {
      redactedPath = `${userId}/${timestamp}-REDACTED-${safeName}`;
      try {
        await supabase.storage.from('case-documents').upload(redactedPath, redactedBuffer, {
          contentType: 'application/pdf', upsert: false
        });
      } catch (redactedError: any) {
        warnings.push("Failed to save redacted copy to storage.");
        redactedPath = null;
      }
    }

    // 4. DB Record
    if (userId) {
      try {
        await supabase.from('case_documents').insert({
          user_id: userId,
          file_path: originalPath,
          file_type: fileType,
          original_name: file.name,
          is_redacted: !!redactedPath
        });
      } catch (dbError: any) {
        warnings.push("Failed to create database record for document.");
        // We don't throw here to ensure the client gets the file path back
      }
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      originalPath: originalPath,
      redactedPath: redactedPath,
      redactedCount: redactedCount,
      fileName: file.name,
      fileSize: file.size,
      fileType: fileType,
      warnings: warnings.length > 0 ? warnings : undefined
    });

  } catch (error: any) {
    console.error("Critical Processing Error:", error);
    return NextResponse.json(
      { error: "Failed to process document", details: error.message },
      { status: 500 }
    );
  }
}
