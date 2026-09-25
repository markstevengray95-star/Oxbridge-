import { NextResponse } from "next/server"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"
import { STUDENT_AI_SAFETY_POLICY } from "@/lib/ai/student-safety"
import { buildOfflineWritingReport } from "@/lib/writing/offline-review"
import { attachStrictEssayScoring, scoreStrictEssay } from "@/lib/writing/strict-score"
import { inputSchema, mechanics, reviewInstructions, responseJsonSchema, splitParagraphs, validateReport } from "@/lib/writing/review"

export const runtime = "nodejs"
export const maxDuration = 60
export async function POST(request: Request) {
  let raw: unknown
  try { raw = await request.json() } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }) }
  const parsed = inputSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid writing request." }, { status: 400 })
  const { essay, mode, prompt, course, test } = parsed.data
  const paragraphs = splitParagraphs(essay)
  if (paragraphs.length > 40) return NextResponse.json({ error: "Please review up to 40 paragraphs at a time." }, { status: 400 })
  const basic = mechanics(essay)
  const scoreFor = (report: ReturnType<typeof validateReport>) => mode === "essay" ? scoreStrictEssay(report, prompt, essay) : null
  const fallback = (message: string) => {
    try {
      const local = validateReport(buildOfflineWritingReport({ essay, mode, prompt, course, test }), essay, mode)
      return NextResponse.json({ provider: "local", report: local, strictScore: scoreFor(local), mechanics: basic, message, rubricVersion: 5 })
    } catch {
      return NextResponse.json({ provider: "local", report: null, strictScore: null, mechanics: basic, message: `${message} The offline substantive review could not be verified, so only mechanical checks are shown.`, rubricVersion: 5 })
    }
  }
  const key = getGeminiApiKeyCandidates()[0]?.value
  if (!key) return fallback("AI review is not configured on this deployment, so the deterministic offline review was used instead. It stays evidence-anchored but is not an official admissions assessment.")
  try {
    const model = process.env.GEMINI_WRITING_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash"
    const writingSystem = `${STUDENT_AI_SAFETY_POLICY}\n\n${reviewInstructions(mode)}\n\nAdditional writing-review rule: assess only the supplied academic writing. Do not infer the student's mental health, disability, personality, socioeconomic status, ethnicity, religion, sexuality, family circumstances or other sensitive traits from style, vocabulary, topic choice or performance.`
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: writingSystem }] }, contents: [{ role: "user", parts: [{ text: JSON.stringify({ task: test, question: prompt, course, paragraphs: paragraphs.map((text, index) => ({ index, text })) }) }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 12000, responseMimeType: "application/json", responseJsonSchema } }), signal: AbortSignal.timeout(50000),
    })
    if (!response.ok) return fallback("The AI review is temporarily unavailable, so the deterministic offline review was used automatically.")
    const data = await response.json() as { candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[] }
    const candidate = data.candidates?.[0]
    if (candidate?.finishReason !== "STOP") return fallback("The AI response was incomplete, so no partial AI judgement was shown. The deterministic offline review was used instead.")
    const output = candidate.content?.parts?.filter(p => !p.thought).map(p => p.text ?? "").join("") || ""
    let report = validateReport(JSON.parse(output), essay, mode)
    if (!prompt && mode === "essay") report.criteria[0].level = null
    if (!course && mode === "statement") report.criteria[4].level = null
    let strictScore = mode === "essay" ? scoreStrictEssay(report, prompt, essay) : null
    if (mode === "essay" && prompt) {
      const attached = attachStrictEssayScoring(report, prompt, essay)
      report = attached.report
      strictScore = attached.strictScore
    }
    return NextResponse.json({ provider: "gemini", report, strictScore, mechanics: basic, rubricVersion: 5 })
  } catch {
    return fallback("The AI review timed out or could not be verified against the draft, so the deterministic offline review was used instead.")
  }
}
