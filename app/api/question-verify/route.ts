import { NextResponse } from "next/server"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"
import { auditQuestionQuality, type ExamQuestionLike } from "@/lib/exam-intelligence"

export const runtime = "nodejs"

type RequestBody = { question?: ExamQuestionLike }
type SolverResult = { answer?: number; reasoning?: string; ambiguous?: boolean; ambiguityReason?: string; missingInformation?: boolean }

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

async function solve(key: string, model: string, question: ExamQuestionLike, role: "formal" | "adversarial") {
  const framing = role === "formal"
    ? "Solve carefully from first principles. Check every option and do not infer the author's intention."
    : "Act as a sceptical second marker. Try to disprove the most obvious answer, test edge cases, and look specifically for ambiguity or missing information."
  const prompt = [
    "Act as an independent admissions-test solution checker.",
    "You must solve the question WITHOUT being told the author's answer key.",
    framing,
    "Return JSON only with answer (zero-based option index), reasoning, ambiguous (boolean), ambiguityReason, missingInformation (boolean).",
    JSON.stringify({ prompt: question.prompt, options: question.options }),
  ].join("\n")
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: role === "formal" ? 0 : 0.15, maxOutputTokens: 1600 } }),
    signal: AbortSignal.timeout(18000),
  })
  if (!response.ok) return null
  return parseJson<SolverResult>(extractText(await response.json() as unknown))
}

export async function POST(request: Request) {
  let body: RequestBody
  try { body = await request.json() as RequestBody } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }) }
  const question = body.question
  if (!question?.prompt?.trim() || !question.options?.length || typeof question.answer !== "number") return NextResponse.json({ error: "A complete multiple-choice question is required." }, { status: 400 })
  const structural = auditQuestionQuality(question)
  const blockingStructural = structural.some(item => item.severity === "block")
  const keys = getGeminiApiKeyCandidates()
  if (!keys.length) return NextResponse.json({ configured: false, structural, verified: null, message: "Local structural audit completed. Independent solving needs the configured Gemini service." })
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"

  for (const key of keys) {
    try {
      const first = await solve(key.value, model, question, "formal")
      const second = await solve(key.value, model, question, "adversarial")
      if (!first || !second || typeof first.answer !== "number" || typeof second.answer !== "number") continue
      const consensus = first.answer === second.answer
      const agrees = consensus && first.answer === question.answer
      const ambiguous = Boolean(first.ambiguous || second.ambiguous)
      const missingInformation = Boolean(first.missingInformation || second.missingInformation)
      const verified = agrees && !ambiguous && !missingInformation && !blockingStructural
      return NextResponse.json({
        configured: true,
        verified,
        consensus,
        agreesWithStoredKey: agrees,
        independentAnswers: [first.answer, second.answer],
        storedAnswer: question.answer,
        ambiguous,
        missingInformation,
        reasoning: [first.reasoning, second.reasoning].filter(Boolean).map(value => String(value).trim().slice(0, 900)),
        ambiguityReason: [first.ambiguityReason, second.ambiguityReason].filter(Boolean).map(value => String(value).trim().slice(0, 500)).join(" · "),
        structural,
        verificationNote: consensus ? "Two independent solver roles agreed on the answer." : "Independent solver roles disagreed; the question should not be treated as verified.",
      }, { headers: { "Cache-Control": "no-store" } })
    } catch {
      // Try next configured key.
    }
  }
  return NextResponse.json({ structural, verified: null, error: "Independent solvers were unavailable. Local structural checks are shown instead." }, { status: 502 })
}
