import { createHash } from "node:crypto"

export const runtime = "nodejs"

function safeText(value: string | null, fallback: string, max = 120) {
  const text = (value ?? "").replace(/[\r\n\t]+/g, " ").trim()
  return text ? text.slice(0, max) : fallback
}

function safetyIdentifier(request: Request) {
  const raw = request.headers.get("x-oxbridge-client-id") || "anonymous-oxbridge-user"
  return createHash("sha256").update(raw).digest("hex")
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return new Response("Realtime voice is not configured", { status: 503 })

  const sdp = await request.text()
  if (!sdp.trim()) return new Response("Missing SDP offer", { status: 400 })

  const url = new URL(request.url)
  const course = safeText(url.searchParams.get("course"), "the selected course")
  const track = safeText(url.searchParams.get("track"), "the selected subject family")
  const persona = safeText(url.searchParams.get("persona"), "Socratic academic")
  const mode = safeText(url.searchParams.get("mode"), "Realistic")

  const instructions = [
    "You are conducting a formal Oxford/Cambridge-style academic practice interview for a secondary-school applicant.",
    `Course: ${course}. Subject family: ${track}. Interviewer style: ${persona}. Session mode: ${mode}.`,
    "Use professional British English and keep spoken turns concise.",
    "Ask one academic question or challenge at a time, then wait for the candidate to respond.",
    "Probe reasoning, assumptions, definitions, evidence, limiting cases, counterexamples, or transfer to a changed condition.",
    "Do not reveal the full solution or provide a model answer during the live interview.",
    "Do not say whether an answer is correct immediately; use questions to test and refine the reasoning.",
    "If the candidate changes their mind for a defensible reason, explore the revised reasoning rather than treating revision as failure.",
    "If the candidate is stuck, give a small conceptual nudge rather than solving the problem.",
    "Keep the interaction focused on academic preparation and avoid collecting personal information.",
  ].join("\n")

  const sessionConfig = JSON.stringify({
    type: "realtime",
    model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1",
    instructions,
    audio: { output: { voice: process.env.OPENAI_REALTIME_VOICE || "marin" } },
  })

  const form = new FormData()
  form.set("sdp", sdp)
  form.set("session", sessionConfig)

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Safety-Identifier": safetyIdentifier(request),
      },
      body: form,
      signal: AbortSignal.timeout(15000),
    })

    const answerSdp = await response.text()
    if (!response.ok) {
      console.error("Realtime session creation failed", response.status, answerSdp.slice(0, 500))
      return new Response("Realtime session unavailable", { status: 502 })
    }

    return new Response(answerSdp, {
      status: 200,
      headers: { "Content-Type": "application/sdp" },
    })
  } catch (error) {
    console.error("Realtime session error", error)
    return new Response("Realtime session unavailable", { status: 502 })
  }
}
