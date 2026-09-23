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

function upstreamMessage(text: string, fallback: string) {
  try {
    const parsed = JSON.parse(text) as { error?: { message?: unknown; code?: unknown } }
    const message = typeof parsed.error?.message === "string" ? parsed.error.message : ""
    const code = typeof parsed.error?.code === "string" ? parsed.error.code : ""
    return [message, code ? `(${code})` : ""].filter(Boolean).join(" ") || fallback
  } catch {
    return fallback
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response("OpenAI Realtime is not configured on this deployment. Add OPENAI_API_KEY to the server environment and redeploy.", { status: 503 })
  }

  const sdp = await request.text()
  if (!sdp.trim()) return new Response("Missing SDP offer", { status: 400 })

  const url = new URL(request.url)
  const course = safeText(url.searchParams.get("course"), "the selected course")
  const track = safeText(url.searchParams.get("track"), "the selected subject family")
  const persona = safeText(url.searchParams.get("persona"), "Socratic academic")
  const mode = safeText(url.searchParams.get("mode"), "Realistic")
  const model = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1"
  const voice = process.env.OPENAI_REALTIME_VOICE || "marin"

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

  const session = {
    type: "realtime",
    model,
    instructions,
    output_modalities: ["audio"],
    audio: {
      input: {
        turn_detection: {
          type: "semantic_vad",
          eagerness: "low",
          create_response: true,
          interrupt_response: true,
        },
      },
      output: { voice, speed: 0.98 },
    },
  }

  try {
    const tokenResponse = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": safetyIdentifier(request),
      },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 120 },
        session,
      }),
      signal: AbortSignal.timeout(15000),
    })

    const tokenText = await tokenResponse.text()
    if (!tokenResponse.ok) {
      console.error("Realtime client-secret creation failed", tokenResponse.status, tokenText.slice(0, 800))
      return new Response(`OpenAI Realtime token failed: ${upstreamMessage(tokenText, `HTTP ${tokenResponse.status}`)}`, { status: 502 })
    }

    const tokenData = JSON.parse(tokenText) as { value?: unknown }
    const ephemeralKey = typeof tokenData.value === "string" ? tokenData.value : ""
    if (!ephemeralKey) {
      console.error("Realtime client-secret response did not contain a value")
      return new Response("OpenAI Realtime token response was invalid.", { status: 502 })
    }

    const callResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp",
      },
      body: sdp,
      signal: AbortSignal.timeout(20000),
    })

    const answerSdp = await callResponse.text()
    if (!callResponse.ok) {
      console.error("Realtime SDP connection failed", callResponse.status, answerSdp.slice(0, 800))
      return new Response(`OpenAI Realtime connection failed: ${upstreamMessage(answerSdp, `HTTP ${callResponse.status}`)}`, { status: 502 })
    }

    if (!answerSdp.trim().startsWith("v=")) {
      console.error("Realtime returned a non-SDP response", answerSdp.slice(0, 800))
      return new Response("OpenAI Realtime returned an invalid SDP answer.", { status: 502 })
    }

    return new Response(answerSdp, {
      status: 200,
      headers: {
        "Content-Type": "application/sdp",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Realtime session error", error)
    const message = error instanceof Error ? error.message : "Unknown server error"
    return new Response(`OpenAI Realtime could not start: ${message}`, { status: 502 })
  }
}
