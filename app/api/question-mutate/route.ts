import { NextResponse } from "next/server"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"
import { auditQuestionQuality, mutationInstruction, type ExamQuestionLike } from "@/lib/exam-intelligence"

export const runtime = "nodejs"

type RequestBody = {
  question?: ExamQuestionLike
  target?: "same" | "harder" | "far-transfer"
}

type GeneratedQuestion = ExamQuestionLike & {
  skill?: string
  changeSummary?: string
  independentCheck?: string
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

function parseJson<T>(text: string): T | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try { return JSON.parse(cleaned.slice(start, end + 1)) as T } catch { return null }
}

async function ask(key: string, model: string, prompt: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.25, maxOutputTokens: 2600 } }),
    signal: AbortSignal.timeout(22000),
  })
  if (!response.ok) return ""
  return extractText(await response.json() as unknown)
}

function validateGenerated(value: GeneratedQuestion | null, source: ExamQuestionLike) {
  if (!value?.prompt?.trim() || !Array.isArray(value.options) || value.options.length < 4 || typeof value.answer !== "number") return null
  if (value.answer < 0 || value.answer >= value.options.length) return null
  if (!value.explanation?.trim()) return null
  const question: GeneratedQuestion = {
    ...value,
    id: value.id?.trim() || `mutated-${source.id}-${Date.now()}`,
    test: source.test,
    section: source.section,
    difficulty: value.difficulty || source.difficulty,
  }
  const blocking = auditQuestionQuality(question).filter(item => item.severity === "block")
  return blocking.length ? null : question
}

export async function POST(request: Request) {
  let body: RequestBody
  try { body = await request.json() as RequestBody } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }) }
  const source = body.question
  if (!source?.prompt?.trim() || !source.options?.length || typeof source.answer !== "number") return NextResponse.json({ error: "A complete source question is required." }, { status: 400 })
  const target = body.target || "same"
  const keys = getGeminiApiKeyCandidates()
  if (!keys.length) return NextResponse.json({ configured: false, error: "Adaptive mutation requires the configured Gemini service. The bank question sequence remains available." }, { status: 503 })
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash"
  const sourceJson = JSON.stringify(source)
  const generationPrompt = [
    "You are creating an ORIGINAL admissions-test practice question. Do not reproduce copyrighted past-paper wording.",
    mutationInstruction(source, target),
    "Return JSON only with keys: id, prompt, options, answer, explanation, difficulty, skill, changeSummary.",
    "answer must be a zero-based option index. Use 4 or 5 plausible options. Avoid longest-answer clues and obviously absurd distractors.",
    "The explanation must establish why the marked answer follows and why the closest distractor fails.",
    `Source practice question for structure only: ${sourceJson}`,
  ].join("\n")

  for (const candidate of keys) {
    try {
      const generated = validateGenerated(parseJson<GeneratedQuestion>(await ask(candidate.value, model, generationPrompt)), source)
      if (!generated) continue
      const verificationPrompt = [
        "Solve this multiple-choice question independently. Do NOT assume the supplied marked answer is correct.",
        "Return JSON only: {answer:number, reasoning:string, ambiguous:boolean, ambiguityReason:string}.",
        JSON.stringify({ prompt: generated.prompt, options: generated.options }),
      ].join("\n")
      const verification = parseJson<{ answer?: number; reasoning?: string; ambiguous?: boolean; ambiguityReason?: string }>(await ask(candidate.value, model, verificationPrompt))
      const independentAnswer = typeof verification?.answer === "number" ? verification.answer : -1
      const verified = independentAnswer === generated.answer && verification?.ambiguous !== true
      if (!verified) continue
      const findings = auditQuestionQuality(generated)
      return NextResponse.json({
        configured: true,
        verified: true,
        question: { ...generated, independentCheck: verification?.reasoning?.trim().slice(0, 900) || "Independent solver agreed with the key." },
        qualityFindings: findings,
      }, { headers: { "Cache-Control": "no-store" } })
    } catch {
      // Try the next configured key.
    }
  }
  return NextResponse.json({ error: "A mutation was generated but could not pass independent solution and quality checks. The original bank question should be used instead." }, { status: 502 })
}
