import { NextResponse } from "next/server"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"

export const runtime = "nodejs"

const MAX_BASE64_LENGTH = 4_100_000

type RequestBody = {
  data?: string
  mimeType?: string
  fileName?: string
}

function extractText(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const candidates = (data as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ""
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue
    const content = (candidate as { content?: { parts?: unknown[] } }).content
    const parts = content?.parts
    if (!Array.isArray(parts)) continue
    const text = parts.map(part => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text?: string }).text) : "").join("\n").trim()
    if (text) return text
  }
  return ""
}

export async function POST(request: Request) {
  let body: RequestBody
  try {
    body = await request.json() as RequestBody
  } catch {
    return NextResponse.json({ error: "Invalid document request." }, { status: 400 })
  }

  const data = body.data?.trim() || ""
  const mimeType = body.mimeType?.trim() || ""
  if (mimeType !== "application/pdf") return NextResponse.json({ error: "Only PDF extraction is accepted by this endpoint." }, { status: 400 })
  if (!data || data.length > MAX_BASE64_LENGTH) return NextResponse.json({ error: "The PDF is empty or too large for direct import." }, { status: 413 })

  const keys = getGeminiApiKeyCandidates()
  if (!keys.length) return NextResponse.json({ error: "PDF extraction is unavailable because no document-analysis credential is configured. DOCX and text imports still work locally." }, { status: 503 })

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"
  const instruction = [
    "Transcribe the student's written work from this PDF into clean plain text.",
    "Preserve paragraph order, headings, equations and symbols as faithfully as plain text allows.",
    "Do not summarise, improve, correct, grade or add commentary.",
    "Ignore page numbers, repeated headers and repeated footers unless they are part of the student's argument.",
    "Return only the transcription.",
  ].join(" ")

  for (const key of keys) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key.value, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType, data } },
              { text: `${instruction}\nFile name: ${body.fileName || "written-work.pdf"}` },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 12000 },
        }),
        signal: AbortSignal.timeout(25000),
      })
      if (!response.ok) continue
      const text = extractText(await response.json() as unknown).trim()
      if (text.length >= 20) {
        return NextResponse.json({ text, provider: "gemini" }, { headers: { "Cache-Control": "no-store" } })
      }
    } catch {
      // Try the next configured credential.
    }
  }

  return NextResponse.json({ error: "The PDF could not be transcribed. Try exporting a smaller PDF, uploading DOCX, or pasting the text." }, { status: 502 })
}
