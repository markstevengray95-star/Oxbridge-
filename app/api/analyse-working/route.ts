import { NextResponse } from "next/server"

export const runtime = "nodejs"

const MAX_DATA_URL_CHARS = 10_000_000

function extractOutput(data: unknown) {
  const obj = data as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }
  if (obj.output_text?.trim()) return obj.output_text.trim()
  for (const item of obj.output ?? []) for (const part of item.content ?? []) if (part.type === "output_text" && part.text?.trim()) return part.text.trim()
  return ""
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { image?: string; subject?: string; context?: string }
    const image = body.image?.trim() ?? ""
    if (!image.startsWith("data:image/") || image.length > MAX_DATA_URL_CHARS) return NextResponse.json({ error: "Please upload a JPG, PNG or WebP image under the supported size." }, { status: 400 })
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: "Image analysis needs OPENAI_API_KEY configured on the server. The rest of the app still works without it." }, { status: 503 })

    const prompt = `You are an academic tutor reviewing a student's handwritten working for Oxbridge preparation.
Subject/course context: ${body.subject || "Not specified"}.
Student/context note: ${body.context || "None supplied"}.
Analyse the WORKING rather than appearance or handwriting quality. Do not invent unreadable symbols. If something is unclear, say so.
Return concise sections with exactly these headings:
OBSERVATIONS
REASONING CHAIN
STRONG STEPS
FIRST ISSUE TO FIX
SOCRATIC FOLLOW-UP
CHECKING STRATEGY
Focus on method, assumptions, equations, diagrams, units, definitions and whether each step follows. The SOCRATIC FOLLOW-UP must be one question that helps the student repair or extend the reasoning without simply giving the final solution.`

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-luna",
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: image, detail: "high" }] }],
        max_output_tokens: 900,
      }),
    })
    if (!response.ok) return NextResponse.json({ error: `Image analysis service returned ${response.status}.` }, { status: 502 })
    const data = await response.json()
    const analysis = extractOutput(data)
    if (!analysis) return NextResponse.json({ error: "No analysis was returned." }, { status: 502 })
    return NextResponse.json({ analysis })
  } catch {
    return NextResponse.json({ error: "The image could not be analysed." }, { status: 500 })
  }
}
