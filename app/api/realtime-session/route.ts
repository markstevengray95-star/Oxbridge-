import { createLiveSession, getLiveConfig } from "@/lib/gemini/live-session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = getLiveConfig
export const POST = createLiveSession
