import { NextResponse } from "next/server"
import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"
import { configuredWritingModels } from "@/lib/gemini/writing-model-fallback"
import { STUDENT_AI_SAFETY_POLICY } from "@/lib/ai/student-safety"
import { buildOfflineWritingReport } from "@/lib/writing/offline-review"
import { attachStrictEssayScoring, scoreStrictEssay } from "@/lib/writing/strict-score"
import { inputSchema, mechanics, reviewInstructions, responseJsonSchema, splitParagraphs, validateReport } from "@/lib/writing/review"

export const runtime = "nodejs"
export const maxDuration = 60

type GeminiResponse = {
  candidates?: {
    finishReason?: string
    content?: { parts?: { text?: string; thought?: boolean }[] }
  }[]
}

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

  const keys = getGeminiApiKeyCandidates()
  if (!keys.length) return fallback("AI review is not configured on this deployment, so the deterministic offline review was used instead. It stays evidence-anchored but is not an official admissions assessment.")

  const models = configuredWritingModels()
  const writingSystem = `${STUDENT_AI_SAFETY_POLICY}\n\n${reviewInstructions(mode)}\n\nAdditional writing-review rule: assess only the supplied academic writing. Do not infer the student's mental health, disability, personality, socioeconomic status, ethnicity, religion, sexuality, family circumstances or other sensitive traits from style, vocabulary, topic choice or performance.`
  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: writingSystem }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify({ task: test, question: prompt, course, paragraphs: paragraphs.map((text, index) => ({ index, text })) }) }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 12000,
      responseMimeType: "application/json",
      responseJsonSchema,
    },
  })

  const deadline = Date.now() + 48_000
  let attempts = 0
  let lastStatus: number | null = null

  modelLoop: for (const model of models) {
    for (const key of keys) {
      const remaining = deadline - Date.now()
      if (remaining < 2_500 || attempts >= 8) break modelLoop
      attempts += 1

      let response: Response
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": key.value, "Content-Type": "application/json" },
          body: requestBody,
          cache: "no-store",
          signal: AbortSignal.timeout(Math.min(15_000, Math.max(2_500, remaining))),
        })
      } catch (error) {
        console.warn("Gemini writing request failed before response", { model, credentialSource: key.source, error: error instanceof Error ? error.message : "unknown" })
        continue
      }

      if (!response.ok) {
        lastStatus = response.status
        const detail = await response.text().catch(() => "")
        console.warn("Gemini writing request rejected", { model, credentialSource: key.source, status: response.status, detail: detail.slice(0, 400) })

        // 400/404 normally indicate a model/endpoint mismatch, so another key
        // will not help. Move straight to the next text-generation model.
        if (response.status === 400 || response.status === 404) continue modelLoop
        continue
      }

      try {
        const data = await response.json() as GeminiResponse
        const candidate = data.candidates?.[0]
        if (candidate?.finishReason && candidate.finishReason !== "STOP") {
          console.warn("Gemini writing response incomplete", { model, finishReason: candidate.finishReason })
          continue
        }

        const output = candidate?.content?.parts?.filter(part => !part.thought).map(part => part.text ?? "").join("") || ""
        if (!output.trim()) {
          console.warn("Gemini writing response contained no usable text", { model })
          continue
        }

        let report = validateReport(JSON.parse(output), essay, mode)
        if (!prompt && mode === "essay") report.criteria[0].level = null
        if (!course && mode === "statement") report.criteria[4].level = null
        let strictScore = mode === "essay" ? scoreStrictEssay(report, prompt, essay) : null
        if (mode === "essay" && prompt) {
          const attached = attachStrictEssayScoring(report, prompt, essay)
          report = attached.report
          strictScore = attached.strictScore
        }
        return NextResponse.json({ provider: "gemini", report, strictScore, mechanics: basic, rubricVersion: 5, model })
      } catch (error) {
        console.warn("Gemini writing response could not be validated", { model, error: error instanceof Error ? error.message : "unknown" })
      }
    }
  }

  const reason = lastStatus === 401 || lastStatus === 403
    ? "The configured AI credential was rejected, so the deterministic offline review was used automatically."
    : lastStatus === 429
      ? "The AI review service is currently rate-limited, so the deterministic offline review was used automatically."
      : "The AI review service could not complete a verified response, so the deterministic offline review was used automatically."
  return fallback(reason)
}
