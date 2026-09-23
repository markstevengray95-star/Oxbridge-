import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null
  const requestedNext = requestUrl.searchParams.get("next") || "/account"
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/account"

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  const errorUrl = new URL("/login", requestUrl.origin)
  errorUrl.searchParams.set("error", "Email confirmation link is invalid or has expired. Please sign in or request a new confirmation email.")
  return NextResponse.redirect(errorUrl)
}
