import { NextResponse } from "next/server"

export const runtime = "nodejs"

type Provider = "openai" | "elevenlabs-secondary"
type OpenAIVoice = "marin" | "cedar"

type SpeechRequest = {
  text?: string
  provider?: Provider
  voice?: OpenAIVoice
}

const ELEVENLABS_DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb" // George premade voice

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 1800) : ""
}

export async function GET() {
  return NextResponse.json({
    openai: Boolean(process.env.OPENAI_API_KEY),
    elevenlabsSecondary: Boolean(process.env.ELEVENLABS_SECONDARY_API_KEY),
    openaiVoices: ["marin", "cedar"],
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

  const provider: Provider = body.provider === "elevenlabs-secondary" ? "elevenlabs-secondary" : "openai"

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 })

    const voice: OpenAIVoice = body.voice === "cedar" ? "cedar" : "marin"
    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice,
          input: text,
          instructions: "Speak as a natural British academic interviewer. Calm, thoughtful and conversational. Use varied intonation, short natural pauses, and a measured pace. Avoid sounding like an announcer, assistant, or scripted narrator. Do not over-emphasise words and do not sound overly enthusiastic.",
          response_format: "mp3",
        }),
        signal: AbortSignal.timeout(20000),
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => "")
        console.error("OpenAI TTS failed", response.status, detail.slice(0, 500))
        return NextResponse.json({ error: "OpenAI natural voice is unavailable" }, { status: 502 })
      }

      const audio = await response.arrayBuffer()
      return new Response(audio, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
          "X-Voice-Provider": "openai",
          "X-Voice-Name": voice,
        },
      })
    } catch (error) {
      console.error("OpenAI TTS error", error)
      return NextResponse.json({ error: "OpenAI natural voice is unavailable" }, { status: 502 })
    }
  }

  const apiKey = process.env.ELEVENLABS_SECONDARY_API_KEY
  if (!apiKey) return NextResponse.json({ error: "ELEVENLABS_SECONDARY_API_KEY is not configured" }, { status: 503 })

  const voiceId = process.env.ELEVENLABS_SECONDARY_VOICE_ID || ELEVENLABS_DEFAULT_VOICE
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: 0.46,
          similarity_boost: 0.82,
          style: 0.12,
          use_speaker_boost: true,
          speed: 0.96,
        },
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("Secondary ElevenLabs TTS failed", response.status, detail.slice(0, 500))
      return NextResponse.json({ error: "Secondary ElevenLabs voice is unavailable" }, { status: 502 })
    }

    const audio = await response.arrayBuffer()
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Voice-Provider": "elevenlabs-secondary",
      },
    })
  } catch (error) {
    console.error("Secondary ElevenLabs TTS error", error)
    return NextResponse.json({ error: "Secondary ElevenLabs voice is unavailable" }, { status: 502 })
  }
}
