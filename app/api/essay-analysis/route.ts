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

type OutputMode = "structured" | "json-only" | "prompt-json"
type FailureCode = "no_key" | "credential_rejected" | "rate_limited" | "model_unavailable" | "provider_unavailable" | "request_rejected" | "network" | "timeout" | "empty_response" | "invalid_response" | "unknown"

function parseJsonOutput(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error("Empty model output")

  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  try {
    return JSON.parse(unfenced)
  } catch {
    const start = unfenced.indexOf("{")
    const end = unfenced.lastIndexOf("}")
    if (start >= 0 && end > start) return JSON.parse(unfenced.slice(start, end + 1))
    throw new Error("Model output was not valid JSON")
  }
}

function generationConfig(mode: OutputMode) {
  const common = { maxOutputTokens: 20000 }

  if (mode === "structured") {
    return {
      ...common,
      responseFormat: {
        text: {
          // Raw Gemini REST uses the enum spelling here, not the IANA string.
          mimeType: "APPLICATION_JSON",
          schema: responseJsonSchema,
        },
      },
    }
  }

  if (mode === "json-only") {
    return {
      ...common,
      // Keep the documented generateContent compatibility path as a fallback.
      responseMimeType: "application/json",
      responseJsonSchema,
    }
  }

  return common
}

function deploymentEnvironment() {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown"
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
  const keys = getGeminiApiKeyCandidates()
  const models = configuredWritingModels()
  const environment = deploymentEnvironment()
  const scoreFor = (report: ReturnType<typeof validateReport>) => mode === "essay" ? scoreStrictEssay(report, prompt, essay) : null

  let attempts = 0
  let lastStatus: number | null = null
  let lastFailure: FailureCode = "unknown"
  let lastModel: string | null = null
  let lastCredentialSource: string | null = null
  let lastOutputMode: OutputMode | null = null

  const diagnostic = (code: FailureCode = lastFailure) => ({
    code,
    environment,
    keyVariablesDetected: keys.map(key => key.source),
    attemptedModels: models,
    attempts,
    lastStatus,
    lastModel,
    lastCredentialSource,
    lastOutputMode,
  })

  const fallback = (message: string, code: FailureCode = lastFailure) => {
    try {
      const local = validateReport(buildOfflineWritingReport({ essay, mode, prompt, course, test }), essay, mode)
      return NextResponse.json({ provider: "local", report: local, strictScore: scoreFor(local), mechanics: basic, message, diagnostic: diagnostic(code), rubricVersion: 5 })
    } catch (error) {
      console.error("Offline writing review failed validation", { error: error instanceof Error ? error.message : "unknown" })
      return NextResponse.json({ provider: "local", report: null, strictScore: null, mechanics: basic, message: `${message} The offline substantive review could not be verified, so only mechanical checks are shown.`, diagnostic: diagnostic(code), rubricVersion: 5 })
    }
  }

  if (!keys.length) {
    lastFailure = "no_key"
    return fallback(`This ${environment} deployment cannot see a Gemini API key. Add GEMINI_API_KEY (or GOOGLE_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY) to this same Vercel project's ${environment === "production" ? "Production" : environment} environment and redeploy before testing again.`, "no_key")
  }

  const writingSystem = `${STUDENT_AI_SAFETY_POLICY}\n\n${reviewInstructions(mode)}\n\nAdditional writing-review rule: assess only the supplied academic writing. Do not infer the student's mental health, disability, personality, socioeconomic status, ethnicity, religion, sexuality, family circumstances or other sensitive traits from style, vocabulary, topic choice or performance.`
  const userPayload = JSON.stringify({
    task: test,
    question: prompt,
    course,
    paragraphs: paragraphs.map((text, index) => ({ index, text })),
    requiredTopLevelKeys: ["summary", "criteria", "paragraphs", "annotations", "priorities", "questions", "limitations"],
    // This also guides the non-structured fallback modes so they cannot guess a
    // looser shape with missing criterion/evidence fields.
    responseSchema: responseJsonSchema,
  })

  const deadline = Date.now() + 48_000
  const outputModes = ["structured", "json-only", "prompt-json"] as const

  modelLoop: for (const model of models) {
    keyLoop: for (const key of keys) {
      for (const outputMode of outputModes) {
        const remaining = deadline - Date.now()
        if (remaining < 2_500 || attempts >= 18) break modelLoop
        attempts += 1
        lastModel = model
        lastCredentialSource = key.source
        lastOutputMode = outputMode

        const payloadText = outputMode === "prompt-json"
          ? `${userPayload}\n\nReturn only one valid JSON object that follows responseSchema exactly. Include every required nested field. Do not use Markdown fences or add commentary outside the JSON.`
          : userPayload

        const requestBody = JSON.stringify({
          systemInstruction: { parts: [{ text: writingSystem }] },
          contents: [{ role: "user", parts: [{ text: payloadText }] }],
          generationConfig: generationConfig(outputMode),
        })

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
          const message = error instanceof Error ? error.message : "unknown"
          lastStatus = null
          lastFailure = /timeout|aborted/i.test(message) ? "timeout" : "network"
          console.warn("Gemini writing request failed before response", { model, outputMode, credentialSource: key.source, error: message })
          // A transport timeout is unlikely to be fixed by changing the response
          // format on the same model. Move on immediately so a responsive backup
          // model still has enough of the Vercel function budget to complete.
          if (lastFailure === "timeout") continue modelLoop
          continue
        }

        if (!response.ok) {
          lastStatus = response.status
          if (response.status === 401 || response.status === 403) lastFailure = "credential_rejected"
          else if (response.status === 408) lastFailure = "timeout"
          else if (response.status === 429) lastFailure = "rate_limited"
          else if (response.status === 404) lastFailure = "model_unavailable"
          else if (response.status >= 500) lastFailure = "provider_unavailable"
          else if (response.status >= 400) lastFailure = "request_rejected"
          else lastFailure = "unknown"

          const detail = await response.text().catch(() => "")
          console.warn("Gemini writing request rejected", { model, outputMode, credentialSource: key.source, status: response.status, detail: detail.slice(0, 400) })

          if (response.status === 401 || response.status === 403) continue keyLoop
          if (response.status === 404 || response.status === 408 || response.status === 429 || response.status >= 500) continue modelLoop
          if (response.status >= 400) {
            if (outputMode !== "prompt-json") continue
            continue modelLoop
          }
          continue
        }

        try {
          const data = await response.json() as GeminiResponse
          const candidate = data.candidates?.[0]
          const output = candidate?.content?.parts?.filter(part => !part.thought).map(part => part.text ?? "").join("") || ""
          if (!output.trim()) {
            lastFailure = "empty_response"
            console.warn("Gemini writing response contained no usable text", { model, outputMode, finishReason: candidate?.finishReason })
            continue
          }

          let report = validateReport(parseJsonOutput(output), essay, mode)
          if (!prompt && mode === "essay") report.criteria[0].level = null
          if (!course && mode === "statement") report.criteria[4].level = null
          let strictScore = mode === "essay" ? scoreStrictEssay(report, prompt, essay) : null
          if (mode === "essay" && prompt) {
            const attached = attachStrictEssayScoring(report, prompt, essay)
            report = validateReport(attached.report, essay, mode)
            strictScore = attached.strictScore
          }
          return NextResponse.json({ provider: "gemini", report, strictScore, mechanics: basic, rubricVersion: 5, model })
        } catch (error) {
          lastFailure = "invalid_response"
          console.warn("Gemini writing response could not be validated", { model, outputMode, error: error instanceof Error ? error.message : "unknown" })
        }
      }
    }
  }

  const variable = lastCredentialSource ? ` The deployment detected ${lastCredentialSource}.` : ""
  const reason = lastFailure === "credential_rejected"
    ? `The Gemini API key is present, but Google rejected it${lastStatus ? ` with HTTP ${lastStatus}` : ""}.${variable} Check that the key belongs to a Google AI project with Gemini API access and that any API/application restrictions allow this Vercel deployment.`
    : lastFailure === "rate_limited"
      ? `The Gemini API key is present, but Google is rate-limiting it (HTTP 429).${variable} The route also tried the configured backup models before using the offline review.`
      : lastFailure === "model_unavailable"
        ? `The Gemini API key is present, but the configured model (${lastModel || models[0]}) is not available to this Google AI project.${variable} The route tried the remaining supported writing models before using the offline review.`
        : lastFailure === "provider_unavailable"
          ? `Gemini is temporarily returning a server error${lastStatus ? ` (HTTP ${lastStatus})` : ""} for ${lastModel || "the writing model"}.${variable} The route moved to backup Gemini models before using the offline review.`
          : lastFailure === "request_rejected"
            ? `The Gemini API key is present, but Google rejected the analysis request configuration${lastStatus ? ` (HTTP ${lastStatus})` : ""}.${variable} The route retried with progressively simpler JSON output modes and backup models before using the offline review.`
            : lastFailure === "invalid_response"
              ? `Gemini responded, but its report did not pass ScholarBridge's evidence/JSON verification, so the deterministic offline review was used instead.${variable}`
              : lastFailure === "empty_response"
                ? `Gemini accepted the request but returned no usable report text, so the deterministic offline review was used instead.${variable}`
                : lastFailure === "timeout"
                  ? `The Vercel function could reach Gemini, but the AI request timed out before a verified report completed.${variable}`
                  : lastFailure === "network"
                    ? `The Vercel function could not complete its connection to the Gemini API.${variable}`
                    : `The Gemini review could not complete a verified response${lastStatus ? ` (HTTP ${lastStatus})` : ""}.${variable}`

  return fallback(reason)
}