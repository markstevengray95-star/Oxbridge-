import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null
  const code = requestUrl.searchParams.get("code")
  const requestedNext = requestUrl.searchParams.get("next") || "/account"
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/account"
  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(next, requestUrl.origin))
  } else if (code) {
    const flowId = requestUrl.searchParams.get("sb_flow_id")
    const { error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined)
    if (!error) return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  const errorUrl = new URL("/login", requestUrl.origin)
  errorUrl.searchParams.set("error", "This authentication link is invalid or has expired. Request a new confirmation or password-reset email and try again.")
  return NextResponse.redirect(errorUrl)
}
