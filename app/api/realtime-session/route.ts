import { NextResponse } from "next/server"

export const runtime = "nodejs"

type GeminiVoice = "Gacrux" | "Sulafat" | "Sadaltager" | "Kore"
type SessionRequest = {
  course?: string
  track?: string
  persona?: string
  mode?: string
  voice?: GeminiVoice
}

const VOICES: GeminiVoice[] = ["Gacrux", "Sulafat", "Sadaltager", "Kore"]

function safeText(value: unknown, fallback: string, max = 120) {
  const text = typeof value === "string" ? value.replace(/[\r\n\t]+/g, " ").trim() : ""
  return text ? text.slice(0, max) : fallback
}

function extractGoogleError(text: string, fallback: string) {
  try {
    const parsed = JSON.parse(text) as { error?: { message?: unknown; status?: unknown } }
    const message = typeof parsed.error?.message === "string" ? parsed.error.message : ""
    const status = typeof parsed.error?.status === "string" ? parsed.error.status : ""
    return [message, status ? `(${status})` : ""].filter(Boolean).join(" ") || fallback
  } catch {
    return fallback
  }
}

function modeInstructions(mode: string) {
  if (mode === "Tutor") {
    return [
      "This is coached interview practice. Keep the conversation realistic, but if the candidate gets stuck, ask a smaller diagnostic question before giving any hint.",
      "Your feedback sentence may identify one concrete next reasoning move, but still do not give the solution.",
    ]
  }
  if (mode === "No-hint") {
    return [
      "Do not give hints or rescue steps. If the answer is weak, identify the exact missing justification in one sentence, then ask a probing question.",
    ]
  }
  if (mode === "Stress") {
    return [
      "Use a brisker, more formal pace and challenge unsupported claims quickly, while remaining professional and fair.",
      "Keep turns especially short and do not use praise filler.",
    ]
  }
  return [
    "Keep the tone realistic: interested but understated, with little generic praise and genuine academic challenge.",
  ]
}

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live",
    voices: VOICES,
  }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      error: "Gemini Live is not configured on this deployment. Add GEMINI_API_KEY to the Vercel server environment and redeploy.",
    }, { status: 503 })
  }

  let body: SessionRequest = {}
  try {
    body = await request.json() as SessionRequest
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const course = safeText(body.course, "the selected course")
  const track = safeText(body.track, "the selected subject family")
  const persona = safeText(body.persona, "Socratic academic")
  const mode = safeText(body.mode, "Realistic")
  const voice: GeminiVoice = VOICES.includes(body.voice as GeminiVoice) ? body.voice as GeminiVoice : "Gacrux"
  const model = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live"

  const instructions = [
    "You are conducting a realistic Oxford/Cambridge-style academic practice interview for a secondary-school applicant.",
    `Course: ${course}. Subject family: ${track}. Interviewer style: ${persona}. Session mode: ${mode}.`,
    "Sound like a real British university academic in a tutorial or admissions interview: calm, curious, understated and conversational; never like a customer-service assistant, motivational coach or announcer.",
    "Use natural spoken phrasing, varied sentence length and occasional brief conversational transitions such as 'Right' or 'Okay' only when they sound natural. Do not overuse filler words.",
    "Ask exactly one academic question or challenge at a time and listen carefully to the candidate's reasoning before responding.",
    "AFTER EVERY SUBSTANTIVE CANDIDATE ANSWER, your spoken response must have exactly two parts: sentence one is one short, specific feedback sentence grounded in what the candidate actually said; sentence two is exactly one follow-up question that develops, tests or challenges that reasoning.",
    "The first sentence must identify one concrete strength, missing justification, assumption, ambiguity, useful revision, or reasoning habit. Avoid generic praise such as 'great answer', 'excellent', or 'well done'.",
    "The second sentence must be a genuine academic follow-up, not a coaching question about feelings or confidence.",
    "If the answer is very short or unclear, the feedback sentence should name what is missing, then the follow-up should ask a smaller question that helps make the reasoning explicit.",
    "Probe assumptions, evidence, definitions, limiting cases, counterexamples, calculations, diagrams, estimates, or transfer to a changed condition depending on the course and answer.",
    "Do not reveal the full solution, provide a model answer during the interview, predict admissions outcomes, or immediately declare answers right or wrong.",
    "If the candidate revises an answer after new evidence, explicitly notice the revision in the feedback sentence and explore why it is justified.",
    ...modeInstructions(mode),
    "When the candidate asks to finish, stop the question cycle and give a concise spoken debrief: one specific reasoning strength, one weakness, one example from the conversation, and one next practice action. Then say the interview is complete.",
    "Keep the interaction focused on academic preparation and avoid collecting personal information.",
  ].join("\n")

  const now = Date.now()
  const tokenRequest = {
    uses: 1,
    newSessionExpireTime: new Date(now + 60_000).toISOString(),
    expireTime: new Date(now + 30 * 60_000).toISOString(),
    liveConnectConstraints: {
      model: `models/${model}`,
      config: {
        responseModalities: ["AUDIO"],
      },
    },
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenRequest),
      signal: AbortSignal.timeout(15000),
    })

    const text = await response.text()
    if (!response.ok) {
      console.error("Gemini ephemeral token failed", response.status, text.slice(0, 800))
      return NextResponse.json({
        error: `Gemini Live token failed: ${extractGoogleError(text, `HTTP ${response.status}`)}`,
      }, { status: 502 })
    }

    const data = JSON.parse(text) as { name?: unknown }
    const token = typeof data.name === "string" ? data.name : ""
    if (!token) {
      console.error("Gemini auth token response did not contain a token name")
      return NextResponse.json({ error: "Gemini Live token response was invalid." }, { status: 502 })
    }

    return NextResponse.json({
      token,
      model,
      voice,
      instructions,
      expiresInSeconds: 1800,
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Gemini Live token error", error)
    const message = error instanceof Error ? error.message : "Unknown server error"
    return NextResponse.json({ error: `Gemini Live could not start: ${message}` }, { status: 502 })
  }
}
