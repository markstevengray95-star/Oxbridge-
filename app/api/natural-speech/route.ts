import { NextResponse } from "next/server"
import { getGeminiApiKeyCandidates, hasGeminiApiKey } from "@/lib/gemini/api-key"

export const runtime = "nodejs"

type GeminiVoice = "Gacrux" | "Sulafat" | "Sadaltager" | "Kore"
type SpeechRequest = { text?: string; voice?: GeminiVoice }
type AudioBlock = { data?: unknown; mime_type?: unknown; mimeType?: unknown }

const VOICES: GeminiVoice[] = ["Gacrux", "Sulafat", "Sadaltager", "Kore"]

function cleanText(value: unknown) { return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 2200) : "" }

function findAudio(value: unknown): AudioBlock | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const direct = record.output_audio ?? record.outputAudio
  if (direct && typeof direct === "object") { const block = direct as AudioBlock; if (typeof block.data === "string" && block.data) return block }
  if (typeof record.data === "string" && (record.type === "audio" || typeof record.mime_type === "string" || typeof record.mimeType === "string")) return record as AudioBlock
  for (const child of Object.values(record)) {
    if (Array.isArray(child)) { for (const item of child) { const found = findAudio(item); if (found) return found } }
    else if (child && typeof child === "object") { const found = findAudio(child); if (found) return found }
  }
  return null
}

function styleFor(voice: GeminiVoice) {
  if (voice === "Kore") return "firm, precise British university academic; calm but probing; measured pace; restrained intonation"
  if (voice === "Sulafat") return "warm, conversational British university academic; thoughtful, unhurried, natural small pauses"
  if (voice === "Sadaltager") return "knowledgeable, measured British university academic; analytical and composed; understated delivery"
  return "mature British university academic; natural, thoughtful and conversational; realistic pauses; no announcer tone"
}

export async function GET() {
  return NextResponse.json({ gemini: hasGeminiApiKey(), voices: VOICES, defaultVoice: "Gacrux", panelVoices: { A: "Gacrux", B: "Kore" }, model: process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts" })
}

export async function POST(request: Request) {
  let body: SpeechRequest
  try { body = await request.json() as SpeechRequest } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
  const text = cleanText(body.text)
  if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 })
  const candidates = getGeminiApiKeyCandidates()
  if (!candidates.length) return NextResponse.json({ error: "Gemini speech credentials are not configured" }, { status: 503 })

  const voice: GeminiVoice = VOICES.includes(body.voice as GeminiVoice) ? body.voice as GeminiVoice : "Gacrux"
  const model = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts"
  let lastStatus = 502

  for (const candidate of candidates) {
    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "x-goog-api-key": candidate.value, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          input: [{ type: "user_input", content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: styleFor(voice) }] }] }],
          response_format: { type: "audio", mime_type: "audio/wav" },
          generation_config: { speech_config: [{ voice }] },
        }),
        signal: AbortSignal.timeout(25000),
      })
      lastStatus = response.status
      const responseText = await response.text()
      if (!response.ok) continue
      let parsed: unknown
      try { parsed = JSON.parse(responseText) } catch { continue }
      const audio = findAudio(parsed)
      if (!audio || typeof audio.data !== "string") continue
      const bytes = Buffer.from(audio.data, "base64")
      const mime = typeof audio.mime_type === "string" ? audio.mime_type : typeof audio.mimeType === "string" ? audio.mimeType : "audio/wav"
      return new Response(bytes, { status: 200, headers: { "Content-Type": mime, "Cache-Control": "no-store", "X-Voice-Provider": "gemini", "X-Voice-Name": voice } })
    } catch { /* try the next configured credential */ }
  }

  return NextResponse.json({ error: "Gemini natural voice is unavailable", status: lastStatus }, { status: 502 })
}
