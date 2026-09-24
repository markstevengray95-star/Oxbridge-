import { NextResponse } from "next/server"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const userId = typeof claims?.sub === "string" ? claims.sub : null
  const email = typeof claims?.email === "string" ? claims.email : null

  if (!userId) {
    return NextResponse.json({ isAdmin: false }, { status: 401, headers: { "Cache-Control": "no-store" } })
  }

  const access = await getAppAdminAccess(userId, email)
  return NextResponse.json(access, { headers: { "Cache-Control": "no-store" } })
}
