import { NextResponse } from "next/server"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"

export const runtime = "nodejs"

type RequestBody = { title?: string; course?: string; work?: string }

function parseJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim()
  try { return JSON.parse(cleaned) as Record<string, unknown> } catch { return null }
}

function extractText(data: unknown) {
  const candidates = data && typeof data === "object" ? (data as { candidates?: unknown }).candidates : null
  if (!Array.isArray(candidates)) return ""
  for (const candidate of candidates) {
    const parts = candidate && typeof candidate === "object" ? (candidate as { content?: { parts?: unknown[] } }).content?.parts ?? [] : []
    const text = parts.map(part => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text?: string }).text) : "").join("").trim()
    if (text) return text
  }
  return ""
}

function localAnalysis(work: string) {
  const paragraphs = work.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean)
  const opening = paragraphs[0]?.slice(0, 260) || "No opening claim detected."
  return {
    summary: "This practice defence identifies claims, assumptions and evidence so you can rehearse explaining your own work under questioning.",
    claims: [opening, ...paragraphs.slice(1, 3).map(item => item.slice(0, 220))].slice(0, 3),
    assumptions: ["Which premise does your argument rely on most strongly?", "What would make your conclusion weaker or no longer apply?"],
    evidenceQuestions: ["Which piece of evidence carries the most weight, and why?", "What evidence would count against your position?"],
    defenceQuestions: ["Summarise the central claim without using the wording of the original piece.", "What is the strongest objection to your argument?", "Which part of the work would you now revise after further study?", "How would your conclusion change if one key assumption failed?"],
    openingQuestion: "What is the most important claim in this piece, and what is the shortest chain of reasoning that supports it?",
  }
}

export async function POST(request: Request) {
  let body: RequestBody
  try { body = await request.json() as RequestBody } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
  const work = (body.work || "").trim().slice(0, 18000)
  if (work.length < 80) return NextResponse.json({ error: "Add more of the written work before analysing it." }, { status: 400 })
  const fallback = localAnalysis(work)
  const keys = getGeminiApiKeyCandidates()
  if (!keys.length) return NextResponse.json({ analysis: fallback, provider: "local" })

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"
  const system = `You are an academic interview tutor helping a student defend their OWN written work. Do not grade admissions chances and do not invent facts outside the text. Return ONLY JSON with this shape: {"summary":string,"claims":string[],"assumptions":string[],"evidenceQuestions":string[],"defenceQuestions":string[],"openingQuestion":string}. Identify 3-5 defensible claims, 2-4 hidden assumptions, 3-5 evidence-testing questions and 6-8 interview questions. Questions should probe reasoning, limitations, counterarguments and how the author would revise the piece now. Be specific to the supplied work.`
  const user = `Title: ${body.title || "Untitled written work"}\nCourse: ${body.course || "Unspecified"}\n\nWritten work:\n${work}`

  for (const key of keys) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key.value, "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: 0.25, maxOutputTokens: 2600, responseMimeType: "application/json" } }),
        signal: AbortSignal.timeout(22000),
      })
      if (!response.ok) continue
      const parsed = parseJson(extractText(await response.json() as unknown))
      if (parsed && Array.isArray(parsed.defenceQuestions)) return NextResponse.json({ analysis: parsed, provider: "gemini" })
    } catch { /* try another configured credential */ }
  }
  return NextResponse.json({ analysis: fallback, provider: "local", degraded: true })
}
