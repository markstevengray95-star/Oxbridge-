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

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini Live is not configured on this deployment. Add GEMINI_API_KEY to the server environment and redeploy." }, { status: 503 })
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
    "Speak in natural professional British English, like a university academic rather than an assistant or announcer.",
    "Use concise spoken turns, varied but understated intonation, and allow thoughtful pauses without rushing the candidate.",
    "Ask exactly one academic question or challenge at a time, then listen carefully to the candidate's reasoning.",
    "Build follow-ups directly from what the candidate has just said. Probe assumptions, evidence, definitions, limiting cases, counterexamples, or transfer to a changed condition.",
    "Do not reveal the full solution, provide a model answer, predict admissions outcomes, or praise routine answers excessively.",
    "If the candidate is stuck, first ask a smaller guiding question rather than solving the problem.",
    "If the candidate revises an answer after new evidence, explore why the revision is justified.",
    "Keep the interaction focused on academic preparation and avoid collecting personal information.",
  ].join("\n")

  const now = Date.now()
  const tokenRequest = {
    uses: 1,
    newSessionExpireTime: new Date(now + 60_000).toISOString(),
    expireTime: new Date(now + 30 * 60_000).toISOString(),
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
      return NextResponse.json({ error: `Gemini Live token failed: ${extractGoogleError(text, `HTTP ${response.status}`)}` }, { status: 502 })
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
    }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    console.error("Gemini Live token error", error)
    const message = error instanceof Error ? error.message : "Unknown server error"
    return NextResponse.json({ error: `Gemini Live could not start: ${message}` }, { status: 502 })
  }
}
