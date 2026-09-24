import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createLiveSession, getLiveConfig } from "@/lib/gemini/live-session-secure"
import { releaseGeminiReservation, reserveGeminiSession } from "@/lib/billing/usage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = getLiveConfig

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  const userId = typeof claims?.sub === "string" ? claims.sub : null
  const email = typeof claims?.email === "string" ? claims.email : null

  if (!userId) {
    return NextResponse.json({
      error: "Sign in to use Gemini Live interviews.",
      code: "AUTH_REQUIRED",
    }, { status: 401, headers: { "Cache-Control": "no-store" } })
  }

  let reservationId: string | null = null

  try {
    const quota = await reserveGeminiSession(userId, email)
    reservationId = quota.reservationId

    if (!quota.allowed) {
      return NextResponse.json({
        error: `You have used this month's Gemini Live allowance (${quota.state.limitMinutes} minutes). Upgrade your plan or wait until the monthly allowance resets.`,
        code: "GEMINI_QUOTA_EXCEEDED",
        quota: quota.state,
      }, { status: 429, headers: { "Cache-Control": "no-store" } })
    }

    const response = await createLiveSession(request)

    if (!response.ok) {
      await releaseGeminiReservation(reservationId)
      reservationId = null
    }

    return response
  } catch (error) {
    await releaseGeminiReservation(reservationId)
    console.error("Gemini Live billing gate failed", error)
    return NextResponse.json({
      error: "Gemini Live could not start because account usage could not be verified.",
      code: "BILLING_GATE_ERROR",
    }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
