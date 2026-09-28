import { NextResponse } from "next/server"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"
import { auditQuestionQuality, type ExamQuestionLike } from "@/lib/exam-intelligence"

export const runtime = "nodejs"

type RequestBody = { question?: ExamQuestionLike }

function extractText(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const candidates = (data as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ""
  for (const candidate of candidates) {
    const content = candidate && typeof candidate === "object" ? (candidate as { content?: { parts?: unknown[] } }).content : undefined
    if (!Array.isArray(content?.parts)) continue
    const text = content.parts.map(part => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text?: string }).text) : "").join("\n").trim()
    if (text) return text
  }
  return ""
}

function parseJson<T>(text: string): T | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try { return JSON.parse(cleaned.slice(start, end + 1)) as T } catch { return null }
}

export async function POST(request: Request) {
  let body: RequestBody
  try { body = await request.json() as RequestBody } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }) }
  const question = body.question
  if (!question?.prompt?.trim() || !question.options?.length || typeof question.answer !== "number") return NextResponse.json({ error: "A complete multiple-choice question is required." }, { status: 400 })
  const structural = auditQuestionQuality(question)
  const keys = getGeminiApiKeyCandidates()
  if (!keys.length) return NextResponse.json({ configured: false, structural, verified: null, message: "Local structural audit completed. Independent solving needs the configured Gemini service." })
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"
  const prompt = [
    "Act as an independent admissions-test solution checker.",
    "You must solve the question WITHOUT being told the author's answer key.",
    "Return JSON only with answer (zero-based option index), reasoning, ambiguous (boolean), ambiguityReason, missingInformation (boolean).",
    JSON.stringify({ prompt: question.prompt, options: question.options }),
  ].join("\n")
  for (const key of keys) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key.value, "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 1600 } }),
        signal: AbortSignal.timeout(18000),
      })
      if (!response.ok) continue
      const solved = parseJson<{ answer?: number; reasoning?: string; ambiguous?: boolean; ambiguityReason?: string; missingInformation?: boolean }>(extractText(await response.json() as unknown))
      if (!solved || typeof solved.answer !== "number") continue
      const agrees = solved.answer === question.answer
      return NextResponse.json({
        configured: true,
        verified: agrees && solved.ambiguous !== true && solved.missingInformation !== true,
        agreesWithStoredKey: agrees,
        independentAnswer: solved.answer,
        storedAnswer: question.answer,
        ambiguous: Boolean(solved.ambiguous),
        missingInformation: Boolean(solved.missingInformation),
        reasoning: solved.reasoning?.trim().slice(0, 1000) || "",
        ambiguityReason: solved.ambiguityReason?.trim().slice(0, 600) || "",
        structural,
      }, { headers: { "Cache-Control": "no-store" } })
    } catch {
      // Try next key.
    }
  }
  return NextResponse.json({ structural, verified: null, error: "Independent solver was unavailable. Local structural checks are shown instead." }, { status: 502 })
}
