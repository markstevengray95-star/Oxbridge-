import { NextResponse } from "next/server"
import { getGeminiApiKeyCandidates, hasGeminiApiKey } from "@/lib/gemini/api-key"

type GeminiVoice = "Gacrux" | "Sulafat" | "Sadaltager" | "Kore"
type SessionRequest = {
  course?: string
  track?: string
  persona?: string
  mode?: string
  voice?: GeminiVoice
}

type GoogleTokenResponse = {
  name?: unknown
  authToken?: { name?: unknown }
}

type GoogleErrorResponse = {
  error?: {
    code?: unknown
    message?: unknown
    status?: unknown
  }
}

const VOICES: GeminiVoice[] = ["Gacrux", "Sulafat", "Sadaltager", "Kore"]
const DEFAULT_GEMINI_LIVE_MODEL = "gemini-3.8-live"
export const GEMINI_LIVE_REVISION = "gemini-live-2026-09-24-r7-auth-rest"

function safeText(value: unknown, fallback: string, max = 120) {
  const text = typeof value === "string" ? value.replace(/[\r\n\t]+/g, " ").trim() : ""
  return text ? text.slice(0, max) : fallback
}

function normalizeLiveModelName(value: string | undefined) {
  const raw = (value || DEFAULT_GEMINI_LIVE_MODEL).trim()
  const withoutQuery = raw.split("?", 1)[0].replace(/\/+$/, "")
  const resourceMarker = "/models/"
  const resourceIndex = withoutQuery.lastIndexOf(resourceMarker)
  const candidate = resourceIndex >= 0
    ? withoutQuery.slice(resourceIndex + resourceMarker.length)
    : withoutQuery.replace(/^models\//i, "")
  const model = candidate.replace(/^\/+|\/+$/g, "").trim()
  return model || DEFAULT_GEMINI_LIVE_MODEL
}

function parseGoogleError(text: string) {
  try {
    const parsed = JSON.parse(text) as GoogleErrorResponse
    return {
      message: typeof parsed.error?.message === "string" ? parsed.error.message : "",
      status: typeof parsed.error?.status === "string" ? parsed.error.status : "",
    }
  } catch {
    return { message: "", status: "" }
  }
}

function modeInstructions(mode: string) {
  if (mode === "Tutor") return [
    "This is coached interview practice. Keep the exchange realistic, but if the candidate gets stuck, first ask a smaller diagnostic question that exposes the missing step.",
    "A feedback sentence may identify one concrete next reasoning move, but still do not give the full solution.",
  ]
  if (mode === "No-hint") return [
    "Do not give hints, rescue steps, or leading prompts. If the reasoning is weak, identify the exact missing justification in one sentence and then ask a probing question.",
  ]
  if (mode === "Stress") return [
    "Use a brisker and more formal pace. Challenge unsupported claims quickly, while remaining professional, calm, and fair.",
    "Keep turns especially short. Do not use praise filler or theatrical hostility.",
  ]
  return ["Keep the tone realistic: interested but understated, with little generic praise and genuine academic challenge."]
}

function subjectInstructions(course: string, track: string) {
  const key = `${track} ${course}`.toLowerCase()
  if (/physics|engineering|physical|chemistry|materials|earth/.test(key)) return [
    "For quantitative science questions, value the candidate's model and assumptions as much as the final number. Ask for estimates, limiting cases, units, sketches, mechanisms, or what would change under a new condition when appropriate.",
    "Prefer problems that can be reasoned from school-level foundations rather than questions that depend on memorising obscure university content.",
  ]
  if (/math|computer|mathematics|computing/.test(key)) return [
    "For mathematical or computing questions, ask the candidate to define quantities, test small or extreme cases, justify each step, find counterexamples, generalise, or compare alternative approaches.",
    "Reward a corrected line of reasoning more than speed. Do not reveal a proof or algorithm before the candidate has had a genuine chance to construct it.",
  ]
  if (/medicine|medical|biology|biological|biochemistry|biomedical/.test(key)) return [
    "For biological or medical-science questions, probe mechanism, evidence, experimental design, data interpretation, confounders, uncertainty, and causal claims.",
    "Keep any clinical scenarios educational and non-diagnostic; the purpose is academic reasoning, not personal medical advice.",
  ]
  if (/law|history|english|classics|philosophy|humanit|language|literature|theology/.test(key)) return [
    "For humanities questions, probe definitions, textual or historical evidence, assumptions, counterarguments, alternative interpretations, and what evidence would change the candidate's view.",
    "When using a short unseen passage or proposition, make the candidate work from what is provided rather than testing prior factual recall alone.",
  ]
  if (/econom|ppe|politic|geograph|social|psycholog|sociolog|land economy/.test(key)) return [
    "For social-science questions, probe causal reasoning, assumptions, incentives, trade-offs, evidence quality, alternative explanations, and how conclusions change when conditions change.",
    "Separate descriptive claims from value judgements and ask the candidate to justify both carefully when relevant.",
  ]
  return ["Choose academically demanding questions that are answerable through reasoning from accessible foundations, then adapt the difficulty to the candidate's response."]
}

function interviewInstructions(course: string, track: string, persona: string, mode: string) {
  return [
    "You are conducting a realistic Oxford/Cambridge-style academic practice interview for a secondary-school applicant.",
    `Course: ${course}. Subject family: ${track}. Interviewer style: ${persona}. Session mode: ${mode}.`,
    "Respond unmistakably in clear British English unless the academic task itself genuinely requires another language.",
    "Sound like a real university academic in a tutorial or admissions interview: calm, curious, understated, precise, and conversational; never like a customer-service assistant, motivational coach, quiz host, or announcer.",
    "Allow the candidate time to think aloud. Never answer on their behalf or treat a brief hesitation as a completed answer. If interrupted, stop and address what they say before continuing.",
    "Ask exactly one academic question or challenge at a time. Listen closely to the candidate's reasoning and make the next move depend on what they actually said.",
    "Prefer reasoning from accessible foundations to obscure recall. Increase difficulty when the reasoning is strong and narrow the problem when the candidate is stuck.",
    ...subjectInstructions(course, track),
    "AFTER EVERY SUBSTANTIVE CANDIDATE ANSWER, your spoken response must contain exactly two substantive sentences before you stop: sentence one is one short, specific feedback sentence grounded in what the candidate actually said; sentence two is exactly one follow-up question that develops, tests, or challenges that reasoning.",
    "Do not put filler such as 'Right', 'Okay', 'Interesting', or generic praise before the feedback sentence. The first spoken sentence must itself contain the useful feedback because the client saves that sentence as the written feedback note.",
    "The feedback sentence should identify one concrete strength, missing justification, assumption, ambiguity, correction, useful revision, or reasoning habit. Avoid generic praise such as 'great answer', 'excellent', 'good job', or 'well done'.",
    "The follow-up must be a genuine academic question, not a coaching question about feelings, confidence, admissions chances, or whether the candidate wants to continue.",
    "If the answer is very short, unclear, or incorrect, do not simply announce the answer. Name the specific missing step or problematic assumption and then ask a smaller question that makes the candidate's reasoning explicit.",
    "Probe assumptions, evidence, definitions, limiting cases, counterexamples, calculations, diagrams, estimates, mechanisms, alternative interpretations, or transfer to a changed condition depending on the course and answer.",
    "Do not reveal the full solution, provide a model answer during the interview, predict admissions outcomes, or immediately declare answers right or wrong without probing the reasoning.",
    "If the candidate changes their mind after new evidence or a counterexample, explicitly recognise the revision in the feedback sentence and explore why the revised view is justified.",
    "If the candidate asks you to repeat or clarify a question, do so briefly without treating that request as a substantive answer.",
    "If the candidate asks for the answer during the interview, preserve the interview format: give at most a minimal orientation permitted by the selected mode, then return the reasoning to the candidate.",
    ...modeInstructions(mode),
    "For the opening turn, give a brief natural greeting and one challenging but accessible opening question. Do not give feedback before the candidate has answered.",
    "When the candidate asks to finish, stop the question cycle and give a concise spoken debrief: one specific reasoning strength, one specific weakness, one example from the conversation, and one next practice action. Then clearly say that the interview is complete and ask no further question.",
    "Keep the interaction focused on academic preparation and avoid collecting personal information.",
  ].join("\n")
}

async function requestEphemeralToken(apiKey: string) {
  const now = Date.now()
  const body = {
    uses: 1,
    newSessionExpireTime: new Date(now + 60_000).toISOString(),
    expireTime: new Date(now + 30 * 60_000).toISOString(),
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  })

  const text = await response.text()
  if (!response.ok) {
    const googleError = parseGoogleError(text)
    return {
      ok: false as const,
      statusCode: response.status,
      googleStatus: googleError.status,
      message: googleError.message || `HTTP ${response.status}`,
    }
  }

  let parsed: GoogleTokenResponse
  try {
    parsed = JSON.parse(text) as GoogleTokenResponse
  } catch {
    throw new Error("Gemini token provisioning returned malformed JSON.")
  }

  const token = typeof parsed.name === "string"
    ? parsed.name
    : typeof parsed.authToken?.name === "string"
      ? parsed.authToken.name
      : ""

  if (!token) throw new Error("Gemini token provisioning succeeded but did not return a token.")
  return { ok: true as const, token }
}

async function createEphemeralTokenFromConfiguredKeys() {
  const candidates = getGeminiApiKeyCandidates()
  let lastCredentialError = ""

  for (const candidate of candidates) {
    const result = await requestEphemeralToken(candidate.value)
    if (result.ok) return { token: result.token, credentialSource: candidate.source }

    if (result.statusCode === 401 || result.statusCode === 403 || result.googleStatus === "UNAUTHENTICATED") {
      console.warn(`Gemini rejected ${candidate.source} while provisioning a Live token: ${result.googleStatus || result.statusCode}`)
      lastCredentialError = result.message
      continue
    }

    if (result.statusCode === 429) {
      const error = new Error("Gemini Live is temporarily at its usage limit. Please try again shortly.")
      error.name = "GeminiQuotaError"
      throw error
    }

    throw new Error(`Gemini Live token provisioning failed: ${result.message}`)
  }

  const error = new Error(lastCredentialError
    ? "The deployment has a Gemini credential configured, but Google rejected it. The server must use a valid Gemini Developer API key as the raw environment value; OAuth access tokens and previously issued ephemeral tokens will not work here."
    : "Gemini Live is not configured on this deployment. Add a valid server-side Gemini Developer API key and redeploy.")
  error.name = "GeminiAuthenticationError"
  throw error
}

export async function getLiveConfig() {
  return NextResponse.json({
    configured: hasGeminiApiKey(),
    model: normalizeLiveModelName(process.env.GEMINI_LIVE_MODEL),
    voices: VOICES,
    revision: GEMINI_LIVE_REVISION,
  }, { headers: { "Cache-Control": "no-store" } })
}

export async function createLiveSession(request: Request) {
  if (!hasGeminiApiKey()) {
    return NextResponse.json({
      error: "Gemini Live is not configured on this deployment. Add a server-side Gemini API key and redeploy.",
      code: "GEMINI_KEY_MISSING",
      revision: GEMINI_LIVE_REVISION,
    }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }

  let body: SessionRequest = {}
  try {
    body = await request.json() as SessionRequest
  } catch {
    return NextResponse.json({ error: "Invalid request body", code: "INVALID_REQUEST", revision: GEMINI_LIVE_REVISION }, { status: 400 })
  }

  const course = safeText(body.course, "the selected course")
  const track = safeText(body.track, "the selected subject family", 80)
  const persona = safeText(body.persona, "Socratic academic", 80)
  const mode = safeText(body.mode, "Realistic", 40)
  const voice: GeminiVoice = VOICES.includes(body.voice as GeminiVoice) ? body.voice as GeminiVoice : "Gacrux"
  const model = normalizeLiveModelName(process.env.GEMINI_LIVE_MODEL)

  try {
    const { token, credentialSource } = await createEphemeralTokenFromConfiguredKeys()
    return NextResponse.json({
      token,
      model,
      voice,
      instructions: interviewInstructions(course, track, persona, mode),
      expiresInSeconds: 1800,
      revision: GEMINI_LIVE_REVISION,
      credentialSource,
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Gemini Live session error", error)
    const message = error instanceof Error ? error.message : "Unknown server error"
    const errorName = error instanceof Error ? error.name : ""
    const authError = errorName === "GeminiAuthenticationError"
    const quotaError = errorName === "GeminiQuotaError"
    return NextResponse.json({
      error: message,
      code: authError ? "GEMINI_AUTH_INVALID" : quotaError ? "GEMINI_QUOTA" : "GEMINI_TOKEN_FAILED",
      revision: GEMINI_LIVE_REVISION,
    }, { status: authError ? 503 : quotaError ? 429 : 502, headers: { "Cache-Control": "no-store" } })
  }
}
