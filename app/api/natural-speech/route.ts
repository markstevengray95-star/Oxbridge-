import { NextResponse } from "next/server"

export const runtime = "nodejs"

type GeminiVoice = "Gacrux" | "Sulafat" | "Sadaltager" | "Kore"
type SpeechRequest = { text?: string; voice?: GeminiVoice }

type AudioBlock = { data?: unknown; mime_type?: unknown; mimeType?: unknown }

const VOICES: GeminiVoice[] = ["Gacrux", "Sulafat", "Sadaltager", "Kore"]

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 2200) : ""
}

function findAudio(value: unknown): AudioBlock | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const direct = record.output_audio ?? record.outputAudio
  if (direct && typeof direct === "object") {
    const block = direct as AudioBlock
    if (typeof block.data === "string" && block.data) return block
  }
  if (typeof record.data === "string" && (record.type === "audio" || typeof record.mime_type === "string" || typeof record.mimeType === "string")) {
    return record as AudioBlock
  }
  for (const child of Object.values(record)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findAudio(item)
        if (found) return found
      }
    } else if (child && typeof child === "object") {
      const found = findAudio(child)
      if (found) return found
    }
  }
  return null
}

export async function GET() {
  return NextResponse.json({
    gemini: Boolean(process.env.GEMINI_API_KEY),
    voices: VOICES,
    defaultVoice: "Gacrux",
    model: process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts",
  })
}

export async function POST(request: Request) {
  let body: SpeechRequest
  try {
    body = await request.json() as SpeechRequest
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const text = cleanText(body.text)
  if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 503 })

  const voice: GeminiVoice = VOICES.includes(body.voice as GeminiVoice) ? body.voice as GeminiVoice : "Gacrux"
  const model = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts"
  const style = voice === "Kore"
    ? "firm, precise British university academic; calm but probing; measured pace; restrained intonation"
    : voice === "Sulafat"
      ? "warm, conversational British university academic; thoughtful, unhurried, natural small pauses"
      : voice === "Sadaltager"
        ? "knowledgeable, measured British university academic; analytical and composed; understated delivery"
        : "mature British university academic; natural, thoughtful and conversational; realistic pauses; no announcer tone"

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [{
          type: "user_input",
          content: [{
            type: "text",
            text,
            annotations: [{ type: "speech_metadata", style }],
          }],
        }],
        response_format: { type: "audio", mime_type: "audio/wav" },
        generation_config: {
          speech_config: [{ voice }],
        },
      }),
      signal: AbortSignal.timeout(25000),
    })

    const responseText = await response.text()
    if (!response.ok) {
      console.error("Gemini TTS failed", response.status, responseText.slice(0, 900))
      return NextResponse.json({ error: "Gemini natural voice is unavailable" }, { status: 502 })
    }

    let parsed: unknown
    try { parsed = JSON.parse(responseText) } catch {
      return NextResponse.json({ error: "Gemini returned an invalid audio response" }, { status: 502 })
    }
    const audio = findAudio(parsed)
    if (!audio || typeof audio.data !== "string") return NextResponse.json({ error: "Gemini returned no audio" }, { status: 502 })

    const bytes = Buffer.from(audio.data, "base64")
    const mime = typeof audio.mime_type === "string" ? audio.mime_type : typeof audio.mimeType === "string" ? audio.mimeType : "audio/wav"
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "no-store",
        "X-Voice-Provider": "gemini",
        "X-Voice-Name": voice,
      },
    })
  } catch (error) {
    console.error("Gemini TTS error", error)
    return NextResponse.json({ error: "Gemini natural voice is unavailable" }, { status: 502 })
  }
}
