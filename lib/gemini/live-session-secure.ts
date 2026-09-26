import { NextResponse } from "next/server"
import { getGeminiApiKeyCandidates, hasGeminiApiKey } from "@/lib/gemini/api-key"
import { STUDENT_AI_SAFETY_POLICY } from "@/lib/ai/student-safety"

type GeminiVoice = "Gacrux" | "Sulafat" | "Sadaltager" | "Kore"
type SessionRequest = { course?: string; track?: string; persona?: string; mode?: string; voice?: GeminiVoice; material?: string; preparationNotes?: string; focus?: string; panel?: boolean }
type GoogleTokenResponse = { name?: unknown; authToken?: { name?: unknown } }
type GoogleErrorResponse = { error?: { code?: unknown; message?: unknown; status?: unknown } }

const VOICES: GeminiVoice[] = ["Gacrux", "Sulafat", "Sadaltager", "Kore"]
const DEFAULT_GEMINI_LIVE_MODEL = "gemini-3.8-live"
export const GEMINI_LIVE_REVISION = "gemini-live-2026-09-26-r10-answer-quality-gate"

function safeText(value: unknown, fallback: string, max = 120) {
  const text = typeof value === "string" ? value.replace(/[\r\n\t]+/g, " ").trim() : ""
  return text ? text.slice(0, max) : fallback
}
function safeLongText(value: unknown, max = 6000) { const text = typeof value === "string" ? value.trim() : ""; return text.slice(0, max) }
function normalizeLiveModelName(value: string | undefined) {
  const raw = (value || DEFAULT_GEMINI_LIVE_MODEL).trim()
  const withoutQuery = raw.split("?", 1)[0].replace(/\/+$/, "")
  const resourceMarker = "/models/"
  const resourceIndex = withoutQuery.lastIndexOf(resourceMarker)
  const candidate = resourceIndex >= 0 ? withoutQuery.slice(resourceIndex + resourceMarker.length) : withoutQuery.replace(/^models\//i, "")
  const model = candidate.replace(/^\/+|\/+$/g, "").trim()
  return model || DEFAULT_GEMINI_LIVE_MODEL
}
function parseGoogleError(text: string) { try { const parsed = JSON.parse(text) as GoogleErrorResponse; return { message: typeof parsed.error?.message === "string" ? parsed.error.message : "", status: typeof parsed.error?.status === "string" ? parsed.error.status : "" } } catch { return { message: "", status: "" } } }

function modeInstructions(mode: string) {
  if (mode === "Tutor") return ["This is coached interview practice. Keep the exchange realistic, but if the candidate gets stuck, first ask a smaller diagnostic question that exposes the missing step.", "A feedback sentence may identify one concrete next reasoning move, but still do not give the full solution."]
  if (mode === "No-hint") return ["Do not give hints, rescue steps, or leading prompts. If the reasoning is weak, identify the exact missing justification in one sentence and then ask a probing question."]
  if (mode === "Stress") return ["Use a brisker and more formal pace. Challenge unsupported claims quickly, while remaining professional, calm, and fair.", "Keep turns especially short. Do not use praise filler or theatrical hostility."]
  return ["Keep the tone realistic: interested but understated, with little generic praise and genuine academic challenge."]
}
function subjectInstructions(course: string, track: string) {
  const key = `${track} ${course}`.toLowerCase()
  if (/physics|engineering|physical|chemistry|materials|earth/.test(key)) return ["For quantitative science questions, value the candidate's model and assumptions as much as the final number. Ask for estimates, limiting cases, units, sketches, mechanisms, or what would change under a new condition when appropriate.", "Prefer problems that can be reasoned from school-level foundations rather than questions that depend on memorising obscure university content."]
  if (/math|computer|mathematics|computing/.test(key)) return ["For mathematical or computing questions, ask the candidate to define quantities, test small or extreme cases, justify each step, find counterexamples, generalise, or compare alternative approaches.", "Reward a corrected line of reasoning more than speed. Do not reveal a proof or algorithm before the candidate has had a genuine chance to construct it."]
  if (/medicine|medical|biology|biological|biochemistry|biomedical/.test(key)) return ["For biological or medical-science questions, probe mechanism, evidence, experimental design, data interpretation, confounders, uncertainty, and causal claims.", "Keep any clinical scenarios educational and non-diagnostic; the purpose is academic reasoning, not personal medical advice."]
  if (/law|history|english|classics|philosophy|humanit|language|literature|theology/.test(key)) return ["For humanities questions, probe definitions, textual or historical evidence, assumptions, counterarguments, alternative interpretations, and what evidence would change the candidate's view.", "When using a short unseen passage or proposition, make the candidate work from what is provided rather than testing prior factual recall alone."]
  if (/econom|ppe|politic|geograph|social|psycholog|sociolog|land economy/.test(key)) return ["For social-science questions, probe causal reasoning, assumptions, incentives, trade-offs, evidence quality, alternative explanations, and how conclusions change when conditions change.", "Separate descriptive claims from value judgements and ask the candidate to justify both carefully when relevant."]
  return ["Choose academically demanding questions that are answerable through reasoning from accessible foundations, then adapt the difficulty to the candidate's response."]
}

function interviewInstructions(course: string, track: string, persona: string, mode: string, material: string, preparationNotes: string, focus: string, panel: boolean) {
  const contextInstructions = material ? ["The candidate has been given unseen pre-interview material. Use it actively rather than ignoring it.", `UNSEEN MATERIAL: ${material}`, preparationNotes ? `CANDIDATE PREPARATION NOTES: ${preparationNotes}` : "The candidate supplied no preparation notes.", "Begin by asking the candidate to interpret, question or defend something from the material. Do not supply an authoritative interpretation first."] : []
  const focusInstructions = focus ? [`DELAYED RETEST FOCUS: ${focus}`, "Test this reasoning habit naturally in a different problem. Do not tell the candidate the exact weakness before they have attempted the task."] : []
  const panelInstructions = panel ? ["This is a two-interviewer simulation. Alternate academic roles between Interviewer A and Interviewer B on successive substantive model turns.", "Interviewer A should usually develop the candidate's line of reasoning. Interviewer B should usually test assumptions, counterexamples or alternative interpretations.", "Prefix every substantive response with exactly 'A:' or 'B:' so the client can render two distinct interviewer roles. Keep the usual one-feedback-sentence plus one-follow-up-question structure after the prefix."] : []

  return [
    STUDENT_AI_SAFETY_POLICY,
    "You are conducting a realistic Oxford/Cambridge-style academic practice interview for a secondary-school applicant.",
    `Course: ${course}. Subject family: ${track}. Interviewer style: ${persona}. Session mode: ${mode}.`,
    "Respond unmistakably in clear British English unless the academic task itself genuinely requires another language.",
    "Sound like a real university academic in a tutorial or admissions interview: calm, curious, understated, precise, and conversational; never like a customer-service assistant, motivational coach, quiz host, or announcer.",
    "Allow the candidate time to think aloud. Never answer on their behalf or treat a brief hesitation as a completed answer. If interrupted, stop and address what they say before continuing.",
    "Ask exactly one academic question or challenge at a time. Listen closely to the candidate's reasoning and make the next move depend on what they actually said.",
    "Use a branching interview strategy: deepen strong reasoning, challenge unsupported assumptions, repair one missing step when stuck, clarify ambiguous definitions, or transfer the idea to a changed condition. Never follow a fixed script when the candidate's reasoning suggests a better branch.",
    "BEFORE EVERY FOLLOW-UP, silently classify the candidate's latest substantive answer as RESPONSIVE, PARTIAL, VAGUE, IRRELEVANT, or INCORRECT. This classification is internal and must control the next interview move.",
    "RESPONSIVE means it directly answers the current question well enough to justify deeper challenge, even if the candidate uses a different valid route or interpretation.",
    "PARTIAL means it addresses the task and contains something useful, but a necessary step, condition, justification, calculation, definition, or part of the question is missing.",
    "VAGUE means it is too general, non-committal, unsupported, or imprecise to reveal a usable academic claim or reasoning step.",
    "IRRELEVANT means the material may be true or interesting but does not answer the question that was actually asked.",
    "INCORRECT means there is a clear factual, mathematical, logical, textual, or stimulus-based error. Do not call a defensible interpretation or debatable judgement incorrect merely because it differs from your preferred answer.",
    "If the answer is INCORRECT, do not praise it and do not advance the topic. The feedback sentence must identify the exact suspect claim, step, sign, unit, relationship, inference, or misuse of evidence without revealing the full solution. Then ask one focused repair question or present one counterexample that makes the candidate re-check that step.",
    "If the answer is VAGUE, stay on the same issue. The feedback sentence should state what is too general, and the question should demand one specific mechanism, definition, example, calculation, piece of evidence, or explicit reasoning step.",
    "If the answer is IRRELEVANT, say plainly but professionally that it does not answer the question asked, restate the precise task in a short phrase, and ask one focused question that brings the candidate back to it.",
    "If the answer is PARTIAL, acknowledge only the valid fragment and probe the missing step. Never imply the whole answer is correct.",
    "Only if the answer is RESPONSIVE may you increase difficulty, change a condition, introduce a new counterexample, or move to a new dimension of the discussion.",
    "If you are uncertain whether a claim is genuinely wrong, classify it as PARTIAL and test it rather than falsely asserting an error.",
    "Never let answer length, confident delivery, technical vocabulary, or stock reasoning words substitute for correctness, specificity, or relevance.",
    "For quantitative work, actively check the candidate's stated result against their reasoning: signs, units, orders of magnitude, proportional relationships, arithmetic, definitions, and whether the conclusion follows from the stated assumptions.",
    "For humanities, law and social sciences, distinguish factual/logical mistakes from legitimate alternative interpretations. Challenge unsupported readings, contradictions, misuse of evidence or failure to answer the task without pretending reasonable disagreement is factual error.",
    "Prefer reasoning from accessible foundations to obscure recall. Increase difficulty when the reasoning is strong and narrow the problem when the candidate is stuck.",
    ...subjectInstructions(course, track),
    ...contextInstructions,
    ...focusInstructions,
    ...panelInstructions,
    "AFTER EVERY SUBSTANTIVE CANDIDATE ANSWER, your spoken response must contain exactly two substantive sentences before you stop: sentence one is one short, specific feedback sentence grounded in what the candidate actually said; sentence two is exactly one follow-up question that develops, tests, repairs, or challenges that reasoning.",
    "Do not put filler such as 'Right', 'Okay', 'Interesting', or generic praise before the feedback sentence. The first spoken sentence must itself contain the useful feedback because the client saves that sentence as the written feedback note.",
    "The feedback sentence should identify one concrete academic strength, missing justification, assumption, ambiguity, correction, relevance problem, useful revision, or reasoning habit. Do not infer personality, confidence, anxiety, mental state, disability or other sensitive characteristics from speech, pauses, camera input, handwriting or performance.",
    "The follow-up must be a genuine academic question, not a coaching question about feelings, confidence, admissions chances, or whether the candidate wants to continue.",
    "If the answer is very short, unclear, wrong, or off-topic, do not simply announce the answer. Identify the precise academic problem in one sentence and then ask a smaller repair question that makes the candidate do the reasoning.",
    "Probe assumptions, evidence, definitions, limiting cases, counterexamples, calculations, diagrams, estimates, mechanisms, alternative interpretations, or transfer to a changed condition depending on the course and answer.",
    "If the client tells you that a camera snapshot or whiteboard has been analysed, treat that analysis only as evidence about visible academic working. Do not infer emotion, health, disability, identity, attractiveness, socioeconomic background or other personal traits from appearance or behaviour.",
    "Do not reveal the full solution, provide a model answer during the interview, or predict admissions outcomes. When a claim is clearly wrong, challenge the exact error rather than giving the correct answer away.",
    "If the candidate changes their mind after new evidence or a counterexample, explicitly recognise the academic revision in the feedback sentence and explore why the revised view is justified.",
    "If the candidate asks you to repeat or clarify a question, do so briefly without treating that request as a substantive answer.",
    "If the candidate asks for the answer during the interview, preserve the interview format: give at most a minimal orientation permitted by the selected mode, then return the reasoning to the candidate.",
    ...modeInstructions(mode),
    "For the opening turn, give a brief natural greeting and one challenging but accessible opening question. Do not give feedback before the candidate has answered.",
    "When the candidate asks to finish, stop the question cycle and give a concise spoken debrief: one specific reasoning strength, one specific academic weakness, one example from the conversation, and one next practice action. Then clearly say that the interview is complete and ask no further question.",
    "Keep the interaction focused on academic preparation and do not collect unnecessary personal information.",
  ].join("\n")
}

async function requestEphemeralToken(apiKey: string) {
  const now = Date.now()
  const body = { uses: 1, newSessionExpireTime: new Date(now + 60_000).toISOString(), expireTime: new Date(now + 30 * 60_000).toISOString() }
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", { method: "POST", headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000), cache: "no-store" })
  const text = await response.text()
  if (!response.ok) { const googleError = parseGoogleError(text); return { ok: false as const, statusCode: response.status, googleStatus: googleError.status, message: googleError.message || `HTTP ${response.status}` } }
  let parsed: GoogleTokenResponse
  try { parsed = JSON.parse(text) as GoogleTokenResponse } catch { throw new Error("Gemini token provisioning returned malformed JSON.") }
  const token = typeof parsed.name === "string" ? parsed.name : typeof parsed.authToken?.name === "string" ? parsed.authToken.name : ""
  if (!token) throw new Error("Gemini token provisioning succeeded but did not return a token.")
  return { ok: true as const, token }
}

async function createEphemeralTokenFromConfiguredKeys() {
  const candidates = getGeminiApiKeyCandidates()
  let lastCredentialError = ""
  for (const candidate of candidates) {
    const result = await requestEphemeralToken(candidate.value)
    if (result.ok) return { token: result.token, credentialSource: candidate.source }
    if (result.statusCode === 401 || result.statusCode === 403 || result.googleStatus === "UNAUTHENTICATED") { console.warn(`Gemini rejected ${candidate.source} while provisioning a Live token: ${result.googleStatus || result.statusCode}`); lastCredentialError = result.message; continue }
    if (result.statusCode === 429) { const error = new Error("Gemini Live is temporarily at its usage limit. Please try again shortly."); error.name = "GeminiQuotaError"; throw error }
    throw new Error(`Gemini Live token provisioning failed: ${result.message}`)
  }
  const error = new Error(lastCredentialError ? "The deployment has a Gemini credential configured, but Google rejected it. The server must use a valid Gemini Developer API key as the raw environment value; OAuth access tokens and previously issued ephemeral tokens will not work here." : "Gemini Live is not configured on this deployment. Add a valid server-side Gemini Developer API key and redeploy.")
  error.name = "GeminiAuthenticationError"
  throw error
}

export async function getLiveConfig() {
  return NextResponse.json({ configured: hasGeminiApiKey(), model: normalizeLiveModelName(process.env.GEMINI_LIVE_MODEL), voices: VOICES, revision: GEMINI_LIVE_REVISION }, { headers: { "Cache-Control": "no-store" } })
}

export async function createLiveSession(request: Request) {
  if (!hasGeminiApiKey()) return NextResponse.json({ error: "Gemini Live is not configured on this deployment. Add a server-side Gemini API key and redeploy.", code: "GEMINI_KEY_MISSING", revision: GEMINI_LIVE_REVISION }, { status: 503, headers: { "Cache-Control": "no-store" } })
  let body: SessionRequest = {}
  try { body = await request.json() as SessionRequest } catch { return NextResponse.json({ error: "Invalid request body", code: "INVALID_REQUEST", revision: GEMINI_LIVE_REVISION }, { status: 400 }) }
  const course = safeText(body.course, "the selected course")
  const track = safeText(body.track, "the selected subject family", 80)
  const persona = safeText(body.persona, "Socratic academic", 80)
  const mode = safeText(body.mode, "Realistic", 40)
  const material = safeLongText(body.material, 6000)
  const preparationNotes = safeLongText(body.preparationNotes, 2500)
  const focus = safeLongText(body.focus, 800)
  const panel = Boolean(body.panel)
  const voice: GeminiVoice = VOICES.includes(body.voice as GeminiVoice) ? body.voice as GeminiVoice : "Gacrux"
  const model = normalizeLiveModelName(process.env.GEMINI_LIVE_MODEL)
  try {
    const { token, credentialSource } = await createEphemeralTokenFromConfiguredKeys()
    return NextResponse.json({ token, model, voice, instructions: interviewInstructions(course, track, persona, mode, material, preparationNotes, focus, panel), expiresInSeconds: 1800, revision: GEMINI_LIVE_REVISION, credentialSource }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Gemini Live session error", error)
    const message = error instanceof Error ? error.message : "Unknown server error"
    const errorName = error instanceof Error ? error.name : ""
    const authError = errorName === "GeminiAuthenticationError"
    const quotaError = errorName === "GeminiQuotaError"
    return NextResponse.json({ error: message, code: authError ? "GEMINI_AUTH_INVALID" : quotaError ? "GEMINI_QUOTA" : "GEMINI_TOKEN_FAILED", revision: GEMINI_LIVE_REVISION }, { status: authError ? 503 : quotaError ? 429 : 502, headers: { "Cache-Control": "no-store" } })
  }
}
