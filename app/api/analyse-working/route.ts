import { NextResponse } from "next/server"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"

export const runtime = "nodejs"

const MAX_DATA_URL_CHARS = 10_000_000

function extractGeminiText(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const candidates = (data as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ""
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue
    const content = (candidate as { content?: unknown }).content
    if (!content || typeof content !== "object") continue
    const parts = (content as { parts?: unknown }).parts
    if (!Array.isArray(parts)) continue
    const text = parts.map(part => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text?: string }).text) : "").join("\n").trim()
    if (text) return text
  }
  return ""
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { image?: string; subject?: string; context?: string }
    const image = body.image?.trim() ?? ""
    if (!image.startsWith("data:image/") || image.length > MAX_DATA_URL_CHARS) return NextResponse.json({ error: "Please upload a JPG, PNG or WebP image under the supported size." }, { status: 400 })
    const match = image.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i)
    if (!match) return NextResponse.json({ error: "Please upload a valid JPG, PNG or WebP image." }, { status: 400 })

    const keys = getGeminiApiKeyCandidates()
    if (!keys.length) return NextResponse.json({ error: "Image analysis needs a Gemini server credential configured. The rest of the app still works without it." }, { status: 503 })

    const prompt = `You are an academic tutor reviewing a student's handwritten working for Oxbridge preparation.
Subject/course context: ${body.subject || "Not specified"}.
Student/context note: ${body.context || "None supplied"}.
Analyse the WORKING rather than appearance or handwriting quality. Never infer or discuss age, identity, appearance, ethnicity, health, emotion or any other personal characteristic from the image. Do not invent unreadable symbols. If something is unclear, say so.
Return concise sections with exactly these headings:
OBSERVATIONS
REASONING CHAIN
STRONG STEPS
FIRST ISSUE TO FIX
SOCRATIC FOLLOW-UP
CHECKING STRATEGY
Focus on method, assumptions, equations, diagrams, units, definitions and whether each step follows. The SOCRATIC FOLLOW-UP must be one question that helps the student repair or extend the reasoning without simply giving the final solution.`

    const model = process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash"
    let lastStatus = 502
    for (const candidate of keys) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": candidate.value, "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: match[1].toLowerCase(), data: match[2] } }] }], generationConfig: { maxOutputTokens: 900, temperature: 0.25 } }),
        signal: AbortSignal.timeout(25000),
      })
      lastStatus = response.status
      if (response.status === 401 || response.status === 403) continue
      if (!response.ok) {
        const detail = await response.text().catch(() => "")
        console.error("Gemini image analysis failed", response.status, detail.slice(0, 700))
        return NextResponse.json({ error: `Image analysis service returned ${response.status}.` }, { status: 502 })
      }
      const data = await response.json() as unknown
      const analysis = extractGeminiText(data)
      if (!analysis) return NextResponse.json({ error: "No analysis was returned." }, { status: 502 })
      return NextResponse.json({ analysis, provider: "gemini" })
    }
    return NextResponse.json({ error: `The configured Gemini credential was rejected for image analysis (${lastStatus}).` }, { status: 503 })
  } catch (error) {
    console.error("Gemini image analysis error", error)
    return NextResponse.json({ error: "The image could not be analysed." }, { status: 500 })
  }
}
