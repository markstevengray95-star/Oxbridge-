import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAppAdminAccess } from "@/lib/auth/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : ""
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null
  if (!userId) return null
  const access = await getAppAdminAccess(userId, email)
  return access.isAdmin ? { userId, email } : null
}

export async function GET() {
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const admin = createAdminClient()
  const { data, error } = await admin.from("human_review_orders").select("id,user_id,status,source_type,title,notes,reviewer_name,feedback,metadata,created_at,updated_at").order("created_at", { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data ?? [] }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: Request) {
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  let body: { id?: string; status?: string; reviewerName?: string; feedback?: string } = {}
  try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }) }
  const id = String(body.id || "")
  const allowed = new Set(["paid","queued","in_review","completed","cancelled","refunded"])
  const status = allowed.has(String(body.status || "")) ? String(body.status) : "in_review"
  if (!id) return NextResponse.json({ error: "Missing review order" }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin.from("human_review_orders").update({
    status,
    reviewer_name: String(body.reviewerName || "").trim().slice(0, 120) || null,
    feedback: String(body.feedback || "").trim().slice(0, 8000) || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
