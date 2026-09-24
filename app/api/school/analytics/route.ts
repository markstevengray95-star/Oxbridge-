import { NextResponse } from "next/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { monthStartIso } from "@/lib/billing/plans"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Skill = { label?: string; score?: number; status?: string }

function numberValue(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function latestIso(values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value))
  if (!valid.length) return null
  return valid.sort((a, b) => Date.parse(b) - Date.parse(a))[0]
}

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : ""
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: "School analytics is not configured" }, { status: 503 })

  const admin = createAdminClient()
  const { data: organization } = await admin
    .from("school_organizations")
    .select("id,name,owner_user_id,join_code,seat_limit,status,created_at")
    .eq("owner_user_id", userId)
    .maybeSingle()

  if (!organization) return NextResponse.json({ error: "School owner access required" }, { status: 403 })

  const { data: members } = await admin
    .from("school_organization_members")
    .select("user_id,role,joined_at")
    .eq("organization_id", organization.id)
    .order("joined_at", { ascending: true })

  const userIds = (members ?? []).map(member => member.user_id)
  if (!userIds.length) {
    return NextResponse.json({ organization, summary: { seatsUsed: 0, seatsRemaining: organization.seat_limit, extraSeats: Math.max(0, organization.seat_limit - 5), averagePreparation: 0, activeThisWeek: 0, assignmentCompletion: 0, geminiMinutesThisMonth: 0 }, members: [] })
  }

  const [profilesResult, intelligenceResult, usageResult, cohortMembershipResult, progressResult] = await Promise.all([
    admin.from("profiles").select("id,display_name,target_university,target_course,application_year,updated_at").in("id", userIds),
    admin.from("student_intelligence").select("user_id,snapshot,updated_at").in("user_id", userIds),
    admin.from("usage_events").select("user_id,event_type,quantity,created_at").in("user_id", userIds).gte("created_at", monthStartIso()),
    admin.from("school_memberships").select("user_id,cohort_id,role,joined_at").in("user_id", userIds),
    admin.from("school_assignment_progress").select("user_id,assignment_id,status,updated_at").in("user_id", userIds),
  ])

  const profiles = profilesResult.data ?? []
  const intelligenceRows = intelligenceResult.data ?? []
  const usageRows = usageResult.data ?? []
  const cohortMemberships = cohortMembershipResult.data ?? []
  const progressRows = progressResult.data ?? []
  const cohortIds = [...new Set(cohortMemberships.map(row => row.cohort_id))]
  const { data: assignments } = cohortIds.length
    ? await admin.from("school_assignments").select("id,cohort_id").in("cohort_id", cohortIds)
    : { data: [] as Array<{ id: string; cohort_id: string }> }

  const profileById = new Map(profiles.map(profile => [profile.id, profile]))
  const intelById = new Map(intelligenceRows.map(row => [row.user_id, row]))
  const assignmentsByCohort = new Map<string, number>()
  for (const assignment of assignments ?? []) assignmentsByCohort.set(assignment.cohort_id, (assignmentsByCohort.get(assignment.cohort_id) ?? 0) + 1)

  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000

  const memberRows = await Promise.all((members ?? []).map(async member => {
    const profile = profileById.get(member.user_id)
    const intelligence = intelById.get(member.user_id)
    const snapshot = intelligence?.snapshot && typeof intelligence.snapshot === "object" ? intelligence.snapshot as Record<string, unknown> : {}
    const userUsage = usageRows.filter(row => row.user_id === member.user_id)
    const userCohorts = cohortMemberships.filter(row => row.user_id === member.user_id)
    const userProgress = progressRows.filter(row => row.user_id === member.user_id)
    const cohortSet = new Set(userCohorts.map(row => row.cohort_id))
    const assignmentTotal = [...cohortSet].reduce((total, cohortId) => total + (assignmentsByCohort.get(cohortId) ?? 0), 0)
    const assignmentCompleted = userProgress.filter(row => row.status === "completed").length
    const geminiMinutes = userUsage
      .filter(row => row.event_type === "gemini_live_reserved_minutes")
      .reduce((total, row) => total + numberValue(row.quantity), 0)
    const latestUsage = latestIso(userUsage.map(row => row.created_at))
    const latestProgress = latestIso(userProgress.map(row => row.updated_at))
    const lastActiveAt = latestIso([intelligence?.updated_at, profile?.updated_at, latestUsage, latestProgress])
    const authUser = await admin.auth.admin.getUserById(member.user_id)
    const preparationScore = numberValue(snapshot.preparationScore)

    return {
      userId: member.user_id,
      role: member.role as "owner" | "member",
      joinedAt: member.joined_at,
      displayName: profile?.display_name || authUser.data.user?.user_metadata?.display_name || "Member",
      email: authUser.data.user?.email || "",
      targetUniversity: profile?.target_university || null,
      targetCourse: profile?.target_course || null,
      applicationYear: profile?.application_year || null,
      preparationScore,
      interviewCount: numberValue(snapshot.interviewCount),
      fullPaperCount: numberValue(snapshot.fullPaperCount),
      essayCount: numberValue(snapshot.essayCount),
      priority: (snapshot.priority ?? null) as Skill | null,
      strongest: (snapshot.strongest ?? null) as Skill | null,
      cohortCount: cohortSet.size,
      assignmentCompleted,
      assignmentTotal,
      assignmentCompletion: assignmentTotal ? Math.round(assignmentCompleted / assignmentTotal * 100) : 0,
      geminiMinutesThisMonth: Math.round(geminiMinutes),
      lastActiveAt,
      activeThisWeek: Boolean(lastActiveAt && Date.parse(lastActiveAt) >= weekAgo),
    }
  }))

  const preparationValues = memberRows.map(member => member.preparationScore).filter(score => score > 0)
  const totalAssignments = memberRows.reduce((total, member) => total + member.assignmentTotal, 0)
  const completedAssignments = memberRows.reduce((total, member) => total + member.assignmentCompleted, 0)

  return NextResponse.json({
    organization,
    summary: {
      seatsUsed: memberRows.length,
      seatsRemaining: Math.max(0, organization.seat_limit - memberRows.length),
      extraSeats: Math.max(0, organization.seat_limit - 5),
      averagePreparation: preparationValues.length ? Math.round(preparationValues.reduce((a, b) => a + b, 0) / preparationValues.length) : 0,
      activeThisWeek: memberRows.filter(member => member.activeThisWeek).length,
      assignmentCompletion: totalAssignments ? Math.round(completedAssignments / totalAssignments * 100) : 0,
      geminiMinutesThisMonth: memberRows.reduce((total, member) => total + member.geminiMinutesThisMonth, 0),
    },
    members: memberRows,
  })
}
