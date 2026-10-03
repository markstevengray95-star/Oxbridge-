import { NextResponse } from "next/server"
import { createLiveSession, getLiveConfig } from "@/lib/gemini/live-session-secure"
import { selectAvailableLiveModel } from "@/lib/gemini/live-model-fallback"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"
export const maxDuration = 60

export async function GET() {
  const configResponse = await getLiveConfig()
  const config = await configResponse.json() as Record<string, unknown>

  const request = new Request("http://internal/api/realtime-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      course: "Physics",
      track: "STEM",
      persona: "Socratic academic",
      mode: "Realistic",
      voice: "Gacrux",
      panel: false
    })
  })

  const sessionResponse = await createLiveSession(request)
  const session = await sessionResponse.json() as Record<string, unknown>
  const credentialSource = typeof session.credentialSource === "string" ? session.credentialSource : undefined
  const selection = sessionResponse.ok ? await selectAvailableLiveModel(credentialSource) : null

  return NextResponse.json({
    status: sessionResponse.status,
    ok: sessionResponse.ok,
    configured: config.configured ?? null,
    configuredModel: config.model ?? null,
    tokenCreated: typeof session.token === "string" && session.token.length > 0,
    sessionModel: session.model ?? null,
    voice: session.voice ?? null,
    revision: session.revision ?? null,
    errorCode: session.code ?? null,
    selectedModel: selection?.model ?? null,
    primaryModel: selection?.primaryModel ?? null,
    fallbackUsed: selection?.fallbackUsed ?? null,
    attemptedModels: selection?.attemptedModels ?? []
  }, { headers: { "Cache-Control": "no-store, max-age=0" } })
}
