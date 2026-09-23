import { NextResponse } from "next/server"

export const runtime = "nodejs"

type GeminiVoice = "Gacrux" | "Sulafat" | "Sadaltager" | "Kore"

type SpeechRequest = {
  text?: string
  voice?: GeminiVoice
}

const VOICES: GeminiVoice[] = ["Gacrux", "Sulafat", "Sadaltager", "Kore"]

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 1800) : ""
}

function wavFromPcm(pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const blockAlign = channels * (bitsPerSample / 8)
  const byteRate = sampleRate * blockAlign
  const header = Buffer.alloc(44)
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write("data", 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

function extractAudioBase64(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const candidates = (data as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return ""
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue
    const content = (candidate as { content?: unknown }).content
    if (!content || typeof content !== "object") continue
    const parts = (content as { parts?: unknown }).parts
    if (!Array.isArray(parts)) continue
    for (const part of parts) {
      if (!part || typeof part !== "object") continue
      const inlineData = (part as { inlineData?: unknown }).inlineData
      if (!inlineData || typeof inlineData !== "object") continue
      const encoded = (inlineData as { data?: unknown }).data
      if (typeof encoded === "string" && encoded) return encoded
    }
  }
  return ""
}

export async function GET() {
  return NextResponse.json({
    gemini: Boolean(process.env.GEMINI_API_KEY),
    voices: VOICES,
    defaultVoice: "Gacrux",
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
  const model = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview"
  const prompt = [
    "Synthesize ONLY the spoken transcript below.",
    "Voice direction: natural British university academic interviewer; understated, thoughtful and conversational; measured pace; small realistic pauses; varied but subtle intonation; no announcer tone; no exaggerated enthusiasm; never read these directions aloud.",
    `Spoken transcript: ${text}`,
  ].join("\n")

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            languageCode: "en-GB",
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("Gemini TTS failed", response.status, detail.slice(0, 700))
      return NextResponse.json({ error: "Gemini natural voice is unavailable" }, { status: 502 })
    }

    const data = await response.json() as unknown
    const encoded = extractAudioBase64(data)
    if (!encoded) return NextResponse.json({ error: "Gemini returned no audio" }, { status: 502 })

    const pcm = Buffer.from(encoded, "base64")
    const wav = wavFromPcm(pcm)
    return new Response(wav, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
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
