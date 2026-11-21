import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Only in-app paths are recorded. Never store URLs, search parameters or page content.
export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "Tracking unavailable." }, { status: 503 })
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null
  if (!userId) return new NextResponse(null, { status: 204 })

  const admin = createAdminClient()
  const { data: managed, error: managedError } = await admin.from("practice_access_accounts")
    .select("user_id,active,expires_at")
    .eq("user_id", userId)
    .eq("account_type", "student")
    .maybeSingle()

  if (managedError) return NextResponse.json({ error: "Practice account lookup failed." }, { status: 503 })
  if (!managed?.active || (managed.expires_at && Date.parse(managed.expires_at) <= Date.now())) {
    return new NextResponse(null, { status: 204 })
  }

  let supplied: unknown
  try { supplied = await request.json() } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }) }
  const payload = supplied && typeof supplied === "object" && !Array.isArray(supplied) ? supplied as Record<string, unknown> : {}
  const candidate = payload.pagePath
  if (typeof candidate !== "string" || !/^\/[a-zA-Z0-9/_-]*$/.test(candidate) || candidate.length > 160 || candidate.startsWith("//")) {
    return NextResponse.json({ error: "Invalid in-app path." }, { status: 400 })
  }

  // Prevent duplicate re-renders and repeated pings filling the event table.
  const { data: latest, error: latestError } = await admin.from("fellow_practice_activity_events")
    .select("page_path,occurred_at")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latestError) return NextResponse.json({ error: "Tracking unavailable." }, { status: 503 })
  if (latest?.page_path === candidate && Date.now() - Date.parse(latest.occurred_at) < 45_000) {
    return NextResponse.json({ ok: true, duplicate: true }, { headers: { "Cache-Control": "no-store" } })
  }
  const { error } = await admin.from("fellow_practice_activity_events").insert({ user_id: userId, page_path: candidate })
  if (error) return NextResponse.json({ error: "Tracking save failed." }, { status: 503 })
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
}
