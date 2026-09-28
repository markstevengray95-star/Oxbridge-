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

type ValidatedGeneratedQuestion = GeneratedQuestion & {
  prompt: string
  options: string[]
  answer: number
  explanation: string
}

type SolverResult = { answer?: number; reasoning?: string; ambiguous?: boolean; ambiguityReason?: string; missingInformation?: boolean }

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

async function ask(key: string, model: string, prompt: string, temperature = 0.25) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: 2600 } }),
    signal: AbortSignal.timeout(22000),
  })
  if (!response.ok) return ""
  return extractText(await response.json() as unknown)
}

function validateGenerated(value: GeneratedQuestion | null, source: ExamQuestionLike): ValidatedGeneratedQuestion | null {
  if (!value?.prompt?.trim() || !Array.isArray(value.options) || value.options.length < 4 || typeof value.answer !== "number") return null
  if (value.answer < 0 || value.answer >= value.options.length) return null
  if (!value.explanation?.trim()) return null
  const question: ValidatedGeneratedQuestion = {
    ...value,
    id: value.id?.trim() || `mutated-${source.id}-${Date.now()}`,
    test: source.test,
    section: source.section,
    difficulty: value.difficulty || source.difficulty,
    prompt: value.prompt.trim(),
    options: value.options,
    answer: value.answer,
    explanation: value.explanation.trim(),
  }
  const blocking = auditQuestionQuality(question).filter(item => item.severity === "block")
  return blocking.length ? null : question
}

async function independentSolve(key: string, model: string, generated: ValidatedGeneratedQuestion, role: "formal" | "adversarial") {
  const verificationPrompt = [
    "Solve this multiple-choice question independently. Do NOT assume the supplied marked answer is correct.",
    role === "formal"
      ? "Work from first principles and check each plausible option."
      : "Act as a sceptical second marker: try to disprove the obvious answer, test edge cases, ambiguity and missing information.",
    "Return JSON only: {answer:number, reasoning:string, ambiguous:boolean, ambiguityReason:string, missingInformation:boolean}.",
    JSON.stringify({ prompt: generated.prompt, options: generated.options }),
  ].join("\n")
  return parseJson<SolverResult>(await ask(key, model, verificationPrompt, role === "formal" ? 0 : 0.15))
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
      const first = await independentSolve(candidate.value, model, generated, "formal")
      const second = await independentSolve(candidate.value, model, generated, "adversarial")
      if (!first || !second || typeof first.answer !== "number" || typeof second.answer !== "number") continue
      const consensus = first.answer === second.answer
      const agrees = consensus && first.answer === generated.answer
      const safe = agrees && first.ambiguous !== true && second.ambiguous !== true && first.missingInformation !== true && second.missingInformation !== true
      if (!safe) continue
      const findings = auditQuestionQuality(generated)
      if (findings.some(item => item.severity === "block")) continue
      return NextResponse.json({
        configured: true,
        verified: true,
        consensus: true,
        question: {
          ...generated,
          independentCheck: `Two independent solver roles agreed on option ${generated.answer + 1}. ${[first.reasoning, second.reasoning].filter(Boolean).map(value => String(value).trim().slice(0, 450)).join(" | ")}`.slice(0, 1000),
        },
        qualityFindings: findings,
        verification: { independentAnswers: [first.answer, second.answer], ambiguous: false, missingInformation: false },
      }, { headers: { "Cache-Control": "no-store" } })
    } catch {
      // Try the next configured key.
    }
  }
  return NextResponse.json({ error: "A mutation was generated but could not pass dual independent solution consensus and quality checks. The original bank question should be used instead." }, { status: 502 })
}
