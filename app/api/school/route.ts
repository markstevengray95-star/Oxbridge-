import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { effectiveTier, type SubscriptionStatus, type SubscriptionTier } from "@/lib/billing/plans"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

type ActionBody = {
  action?: "createCohort" | "joinCohort" | "createAssignment" | "updateAssignmentStatus" | "deleteAssignment"
  name?: string
  course?: string
  joinCode?: string
  cohortId?: string
  title?: string
  description?: string
  href?: string
  dueAt?: string | null
  assignmentId?: string
  status?: "not_started" | "in_progress" | "completed"
  note?: string
}

async function currentUserId() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return typeof data?.claims?.sub === "string" ? data.claims.sub : null
}

async function tierFor(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin.from("subscriptions").select("tier,status").eq("user_id", userId).maybeSingle()
  return effectiveTier((data?.tier ?? "free") as SubscriptionTier, (data?.status ?? "inactive") as SubscriptionStatus)
}

async function teacherOwns(admin: ReturnType<typeof createAdminClient>, userId: string, cohortId: string) {
  const { data } = await admin.from("school_cohorts").select("id,owner_user_id").eq("id", cohortId).maybeSingle()
  return data?.owner_user_id === userId
}

async function joinedCohorts(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: memberships } = await admin.from("school_memberships").select("cohort_id,role,joined_at").eq("user_id", userId).order("joined_at", { ascending: false })
  const ids = [...new Set((memberships ?? []).map(row => row.cohort_id))]
  if (!ids.length) return []
  const { data: cohorts } = await admin.from("school_cohorts").select("id,name,course,join_code,owner_user_id,created_at").in("id", ids)
  const byId = new Map((cohorts ?? []).map(row => [row.id, row]))
  return (memberships ?? []).map(membership => ({ ...byId.get(membership.cohort_id), role: membership.role, joined_at: membership.joined_at })).filter(item => item.id)
}

async function teacherCohortDetail(admin: ReturnType<typeof createAdminClient>, cohortId: string) {
  const [{ data: cohort }, { data: memberships }, { data: assignments }, { data: progressRows }] = await Promise.all([
    admin.from("school_cohorts").select("id,name,course,join_code,owner_user_id,created_at").eq("id", cohortId).single(),
    admin.from("school_memberships").select("user_id,role,joined_at").eq("cohort_id", cohortId).order("joined_at", { ascending: true }),
    admin.from("school_assignments").select("id,title,description,href,due_at,created_at").eq("cohort_id", cohortId).order("created_at", { ascending: false }),
    admin.from("school_assignment_progress").select("assignment_id,user_id,status,note,updated_at").eq("cohort_id", cohortId),
  ])
  const userIds = [...new Set((memberships ?? []).map(item => item.user_id))]
  const [{ data: profiles }, { data: intelligenceRows }] = userIds.length ? await Promise.all([
    admin.from("profiles").select("id,display_name,target_course,target_university,application_year").in("id", userIds),
    admin.from("student_intelligence").select("user_id,snapshot,updated_at").in("user_id", userIds),
  ]) : [{ data: [] }, { data: [] }]
  const profileById = new Map((profiles ?? []).map(item => [item.id, item]))
  const intelById = new Map((intelligenceRows ?? []).map(item => [item.user_id, item]))
  const students = (memberships ?? []).filter(item => item.role === "student").map(item => {
    const profile = profileById.get(item.user_id)
    const intel = intelById.get(item.user_id)
    const snapshot = intel?.snapshot && typeof intel.snapshot === "object" ? intel.snapshot as Record<string, unknown> : {}
    return {
      userId: item.user_id,
      displayName: profile?.display_name || "Student",
      targetCourse: profile?.target_course || null,
      targetUniversity: profile?.target_university || null,
      applicationYear: profile?.application_year || null,
      preparationScore: Number(snapshot.preparationScore ?? 0),
      interviewCount: Number(snapshot.interviewCount ?? 0),
      fullPaperCount: Number(snapshot.fullPaperCount ?? 0),
      essayCount: Number(snapshot.essayCount ?? 0),
      priority: snapshot.priority ?? null,
      strongest: snapshot.strongest ?? null,
      updatedAt: intel?.updated_at ?? null,
    }
  })
  return { cohort, students, assignments: assignments ?? [], progress: progressRows ?? [] }
}

export async function GET() {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "School cloud workspace is not configured" }, { status: 503 })
  const admin = createAdminClient()
  const [{ data: owned }, joined, tier] = await Promise.all([
    admin.from("school_cohorts").select("id,name,course,join_code,owner_user_id,created_at").eq("owner_user_id", userId).order("created_at", { ascending: false }),
    joinedCohorts(admin, userId),
    tierFor(admin, userId),
  ])
  const ownedDetails = await Promise.all((owned ?? []).map(item => teacherCohortDetail(admin, item.id)))
  const joinedDetails = await Promise.all(joined.filter(item => item.owner_user_id !== userId).map(async item => {
    const [{ data: assignments }, { data: ownProgress }] = await Promise.all([
      admin.from("school_assignments").select("id,title,description,href,due_at,created_at").eq("cohort_id", item.id).order("created_at", { ascending: false }),
      admin.from("school_assignment_progress").select("assignment_id,status,note,updated_at").eq("cohort_id", item.id).eq("user_id", userId),
    ])
    return { cohort: item, assignments: assignments ?? [], progress: ownProgress ?? [] }
  }))
  return NextResponse.json({ tier, owned: ownedDetails, joined: joinedDetails })
}

export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "School cloud workspace is not configured" }, { status: 503 })
  let body: ActionBody
  try { body = await request.json() as ActionBody } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }) }
  const admin = createAdminClient()

  if (body.action === "createCohort") {
    if (await tierFor(admin, userId) !== "school") return NextResponse.json({ error: "School plan required" }, { status: 403 })
    const name = (body.name ?? "").trim().slice(0, 120)
    if (!name) return NextResponse.json({ error: "Cohort name required" }, { status: 400 })
    let created: { id: string; join_code: string } | null = null
    for (let attempt = 0; attempt < 4 && !created; attempt++) {
      const joinCode = randomBytes(4).toString("hex").toUpperCase()
      const { data, error } = await admin.from("school_cohorts").insert({ owner_user_id: userId, name, course: (body.course ?? "").trim().slice(0, 120) || null, join_code: joinCode }).select("id,join_code").single()
      if (!error && data) created = data
    }
    if (!created) return NextResponse.json({ error: "Could not create cohort" }, { status: 500 })
    await admin.from("school_memberships").upsert({ cohort_id: created.id, user_id: userId, role: "teacher" }, { onConflict: "cohort_id,user_id" })
    return NextResponse.json({ ok: true, cohort: created })
  }

  if (body.action === "joinCohort") {
    const joinCode = (body.joinCode ?? "").replace(/\s+/g, "").toUpperCase().slice(0, 20)
    if (!joinCode) return NextResponse.json({ error: "Join code required" }, { status: 400 })
    const { data: cohort } = await admin.from("school_cohorts").select("id,name,owner_user_id").eq("join_code", joinCode).maybeSingle()
    if (!cohort) return NextResponse.json({ error: "Join code not found" }, { status: 404 })
    const role = cohort.owner_user_id === userId ? "teacher" : "student"
    const { error } = await admin.from("school_memberships").upsert({ cohort_id: cohort.id, user_id: userId, role }, { onConflict: "cohort_id,user_id" })
    if (error) return NextResponse.json({ error: "Could not join cohort" }, { status: 500 })
    return NextResponse.json({ ok: true, cohort: { id: cohort.id, name: cohort.name }, role })
  }

  if (body.action === "createAssignment") {
    const cohortId = body.cohortId ?? ""
    if (!cohortId || !(await teacherOwns(admin, userId, cohortId))) return NextResponse.json({ error: "Teacher access required" }, { status: 403 })
    if (await tierFor(admin, userId) !== "school") return NextResponse.json({ error: "School plan required" }, { status: 403 })
    const title = (body.title ?? "").trim().slice(0, 160)
    if (!title) return NextResponse.json({ error: "Assignment title required" }, { status: 400 })
    const href = (body.href ?? "/tutor").trim()
    const safeHref = href.startsWith("/") && !href.startsWith("//") ? href.slice(0, 300) : "/tutor"
    const { data, error } = await admin.from("school_assignments").insert({ cohort_id: cohortId, created_by: userId, title, description: (body.description ?? "").trim().slice(0, 2500), href: safeHref, due_at: body.dueAt || null }).select("id").single()
    if (error) return NextResponse.json({ error: "Could not create assignment" }, { status: 500 })
    return NextResponse.json({ ok: true, assignment: data })
  }

  if (body.action === "updateAssignmentStatus") {
    const assignmentId = body.assignmentId ?? ""
    const { data: assignment } = await admin.from("school_assignments").select("id,cohort_id").eq("id", assignmentId).maybeSingle()
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    const { data: membership } = await admin.from("school_memberships").select("id").eq("cohort_id", assignment.cohort_id).eq("user_id", userId).maybeSingle()
    if (!membership) return NextResponse.json({ error: "Cohort membership required" }, { status: 403 })
    const status = body.status && ["not_started", "in_progress", "completed"].includes(body.status) ? body.status : "in_progress"
    const { error } = await admin.from("school_assignment_progress").upsert({ assignment_id: assignmentId, cohort_id: assignment.cohort_id, user_id: userId, status, note: (body.note ?? "").trim().slice(0, 1200), updated_at: new Date().toISOString() }, { onConflict: "assignment_id,user_id" })
    if (error) return NextResponse.json({ error: "Could not update assignment" }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === "deleteAssignment") {
    const assignmentId = body.assignmentId ?? ""
    const { data: assignment } = await admin.from("school_assignments").select("id,cohort_id").eq("id", assignmentId).maybeSingle()
    if (!assignment || !(await teacherOwns(admin, userId, assignment.cohort_id))) return NextResponse.json({ error: "Teacher access required" }, { status: 403 })
    await admin.from("school_assignments").delete().eq("id", assignmentId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
