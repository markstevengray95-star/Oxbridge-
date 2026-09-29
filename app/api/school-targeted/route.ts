import { NextResponse } from "next/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

type TargetedBody = {
  action?: "createTargetedAssignment"
  cohortId?: string
  targetUserId?: string
  title?: string
  description?: string
  href?: string
  dueAt?: string | null
  taskType?: "general" | "paper" | "interview" | "essay" | "defence" | "reading" | "other"
  submissionRequired?: boolean
}

async function currentUserId() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null
}

function safeHref(value?: string) {
  const href = (value || "/tutor").trim()
  return href.startsWith("/") && !href.startsWith("//") ? href.slice(0, 300) : "/tutor"
}

export async function GET() {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "School cloud workspace is not configured" }, { status: 503 })

  const admin = createAdminClient()
  const { data: memberships, error: membershipError } = await admin
    .from("school_memberships")
    .select("cohort_id,role,joined_at")
    .eq("user_id", userId)
    .eq("role", "student")
    .order("joined_at", { ascending: false })

  if (membershipError) return NextResponse.json({ error: "Could not load classroom memberships" }, { status: 500 })

  const joined = await Promise.all((memberships ?? []).map(async membership => {
    const [{ data: cohort }, { data: assignments }, { data: progress }] = await Promise.all([
      admin.from("school_cohorts").select("id,name,course,join_code,owner_user_id,created_at").eq("id", membership.cohort_id).maybeSingle(),
      admin.from("school_assignments")
        .select("id,title,description,href,due_at,created_at,target_user_id,task_type,submission_required")
        .eq("cohort_id", membership.cohort_id)
        .or(`target_user_id.is.null,target_user_id.eq.${userId}`)
        .order("created_at", { ascending: false }),
      admin.from("school_assignment_progress")
        .select("assignment_id,status,note,updated_at")
        .eq("cohort_id", membership.cohort_id)
        .eq("user_id", userId),
    ])
    return cohort ? { cohort: { ...cohort, role: "student" }, assignments: assignments ?? [], progress: progress ?? [] } : null
  }))

  return NextResponse.json({ joined: joined.filter(Boolean) })
}

export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "School cloud workspace is not configured" }, { status: 503 })

  let body: TargetedBody
  try { body = await request.json() as TargetedBody } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }) }
  if (body.action !== "createTargetedAssignment") return NextResponse.json({ error: "Unsupported action" }, { status: 400 })

  const cohortId = body.cohortId || ""
  const targetUserId = body.targetUserId || ""
  const title = (body.title || "").trim().slice(0, 160)
  if (!cohortId || !targetUserId || !title) return NextResponse.json({ error: "Cohort, student and title are required" }, { status: 400 })

  const admin = createAdminClient()
  const [{ data: cohort }, { data: membership }] = await Promise.all([
    admin.from("school_cohorts").select("owner_user_id").eq("id", cohortId).maybeSingle(),
    admin.from("school_memberships").select("role").eq("cohort_id", cohortId).eq("user_id", targetUserId).maybeSingle(),
  ])
  if (cohort?.owner_user_id !== userId) return NextResponse.json({ error: "Teacher access required" }, { status: 403 })
  if (membership?.role !== "student") return NextResponse.json({ error: "Target student is not in this cohort" }, { status: 400 })

  const { data, error } = await admin.from("school_assignments").insert({
    cohort_id: cohortId,
    created_by: userId,
    target_user_id: targetUserId,
    title,
    description: (body.description || "").trim().slice(0, 2500),
    href: safeHref(body.href),
    due_at: body.dueAt || null,
    task_type: body.taskType || "general",
    submission_required: Boolean(body.submissionRequired),
  }).select("id").single()

  if (error || !data) return NextResponse.json({ error: "Could not create targeted assignment" }, { status: 500 })
  return NextResponse.json({ ok: true, assignment: data })
}
