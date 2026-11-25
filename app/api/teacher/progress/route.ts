import { NextResponse } from "next/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { currentSchoolUserId, loadStaffScope } from "@/lib/school/teacher-access"
import { schoolStaffCanSeeWholeRoster } from "@/lib/school/student-tracking-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Skill = { label?: string; score?: number; status?: string }
const headers = { "Cache-Control":"private, no-store" }
function number(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
function latestIso(values: (string | null | undefined)[]) {
  return values.filter((value):value is string => Boolean(value))
    .sort((a,b) => Date.parse(b)-Date.parse(a))[0] ?? null
}

async function currentUserId() { return currentSchoolUserId() }

export async function GET() {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({error:"Sign in required"},{status:401,headers})
  if (!hasSupabaseAdminConfig()) return NextResponse.json({error:"School tracking is unavailable"},{status:503,headers})
  const admin = createAdminClient()
  const scope = await loadStaffScope(admin,userId)
  if (!scope) return NextResponse.json({error:"A school owner must grant you teacher access"},{status:403,headers})

  const [{data:memberRows,error:memberError}, {data:staffRows,error:staffError}, {data:links,error:linkError}] = await Promise.all([
    admin.from("school_organization_members").select("user_id,role").eq("organization_id",scope.organizationId),
    admin.from("school_staff_roles").select("user_id").eq("organization_id",scope.organizationId).eq("active",true),
    schoolStaffCanSeeWholeRoster(scope) ? Promise.resolve({data:[],error:null}) : admin.from("school_teacher_student_links")
      .select("student_user_id").eq("organization_id",scope.organizationId).eq("teacher_user_id",userId),
  ])
  if (memberError || staffError || linkError) return NextResponse.json({error:"Could not verify student links"},{status:500,headers})

  const members = (memberRows ?? []).map(x => x.user_id)
  const staffIds = new Set((staffRows ?? []).map(x => x.user_id))
  const connected = new Set(schoolStaffCanSeeWholeRoster(scope) ? members : (links ?? []).map(x => x.student_user_id))
  const ownerIds = new Set((memberRows ?? []).filter(m => m.role === "owner").map(m => m.user_id))
  const candidateIds = members.filter(id => connected.has(id) && !staffIds.has(id) && !ownerIds.has(id) && id !== scope.userId)
  if (!candidateIds.length) {
    return NextResponse.json({
      organization:{name:scope.organizationName,role:scope.role},
      summary:{assigned:0,activeThisWeek:0,averagePreparation:null,needsFollowUp:0,testsCompleted:0},
      students:[],
    },{headers})
  }

  const [seatsResult, profilesResult, intelResult, interviewsResult, testsResult, progressResult, membershipResult, usageResult] = await Promise.all([
    admin.from("school_seat_entitlements").select("user_id").eq("organization_id",scope.organizationId).eq("active",true).in("user_id",candidateIds),
    admin.from("profiles").select("id,display_name,target_course,target_university,application_year,updated_at").in("id",candidateIds),
    admin.from("student_intelligence").select("user_id,snapshot,updated_at").in("user_id",candidateIds),
    admin.from("interview_sessions").select("user_id,created_at").in("user_id",candidateIds).order("created_at",{ascending:false}).limit(2000),
    admin.from("test_results").select("user_id,accuracy,completed_at").in("user_id",candidateIds).order("completed_at",{ascending:false}).limit(5000),
    admin.from("school_assignment_progress").select("user_id,assignment_id,status,updated_at").in("user_id",candidateIds),
    admin.from("school_memberships").select("user_id,cohort_id").in("user_id",candidateIds),
    admin.from("orbits_usage_sessions").select("user_id,active_seconds,last_seen_at,started_at").in("user_id",candidateIds).eq("app","fellow").order("last_seen_at",{ascending:false}).limit(5000),
  ])
  const failed = [seatsResult,profilesResult,intelResult,interviewsResult,testsResult,progressResult,membershipResult].some(x => x.error)
  if (failed) return NextResponse.json({error:"Could not load student progress"},{status:500,headers})
  const activeIds = new Set((seatsResult.data ?? []).map(x => x.user_id))
  const studentIds = candidateIds.filter(id => activeIds.has(id))
  if (!studentIds.length) return NextResponse.json({
    organization:{name:scope.organizationName,role:scope.role},
    summary:{assigned:0,activeThisWeek:0,averagePreparation:null,needsFollowUp:0,testsCompleted:0},students:[],
  },{headers})

  // Only count assignments owned by a member of this school. Other school
  // cohorts which happen to include a student must never appear in this report.
  const {data:schoolCohorts,error:cohortError} = await admin.from("school_cohorts")
    .select("id").in("owner_user_id",members)
  if (cohortError) return NextResponse.json({error:"Could not verify school cohort access"},{status:500,headers})
  const allowedCohorts = new Set((schoolCohorts ?? []).map(x => x.id))
  const studentMemberships = (membershipResult.data ?? []).filter(x => allowedCohorts.has(x.cohort_id))
  const cohortIds = [...new Set(studentMemberships.map(x => x.cohort_id))]
  const assignmentsResult = cohortIds.length ? await admin.from("school_assignments")
    .select("id,cohort_id,target_user_id").in("cohort_id",cohortIds) : {data:[],error:null}
  if (assignmentsResult.error) return NextResponse.json({error:"Could not load school assignments"},{status:500,headers})

  const profiles = new Map((profilesResult.data ?? []).map(x => [x.id,x]))
  const intel = new Map((intelResult.data ?? []).map(x => [x.user_id,x]))
  const usage = usageResult.error ? [] : usageResult.data ?? []
  const assignments = assignmentsResult.data ?? []
  const now = Date.now()
  const weekAgo = now-7*24*60*60*1000

  const students = studentIds.map(id => {
    const profile = profiles.get(id)
    const intelligence = intel.get(id)
    const snapshot = intelligence?.snapshot && typeof intelligence.snapshot === "object" && !Array.isArray(intelligence.snapshot)
      ? intelligence.snapshot as Record<string,unknown> : {}
    const memberships = new Set(studentMemberships.filter(row => row.user_id === id).map(row => row.cohort_id))
    const studentAssignments = assignments.filter(a => memberships.has(a.cohort_id) && (!a.target_user_id || a.target_user_id === id))
    const assignedIds = new Set(studentAssignments.map(a => a.id))
    const completed = (progressResult.data ?? []).filter(p => p.user_id === id && assignedIds.has(p.assignment_id) && p.status === "completed").length
    const interviewEvents = (interviewsResult.data ?? []).filter(i => i.user_id === id)
    const completedTests = (testsResult.data ?? []).filter(t => t.user_id === id)
    const averageTestAccuracy = completedTests.length ? Math.round(completedTests.reduce((sum,t)=>sum+Math.max(0,Math.min(100,number(t.accuracy))),0)/completedTests.length) : null
    const recentProgress = (progressResult.data ?? []).filter(p => p.user_id === id).map(p => p.updated_at)
    const studentUsage = usage.filter(x=>x.user_id===id)
    const lastActiveAt = latestIso([interviewEvents[0]?.created_at,completedTests[0]?.completed_at,...recentProgress,...studentUsage.map(x=>x.last_seen_at||x.started_at)])
    const activeThisWeek = Boolean(lastActiveAt && Date.parse(lastActiveAt)>=weekAgo)
    const score = number(snapshot.preparationScore)
    return {
      userId:id,
      displayName:profile?.display_name || "Student",
      targetCourse:profile?.target_course || null,
      targetUniversity:profile?.target_university || null,
      applicationYear:profile?.application_year || null,
      preparationScore:score > 0 ? Math.min(100,Math.max(0,score)) : null,
      interviewCount:Math.max(number(snapshot.interviewCount),interviewEvents.length),
      testsCompleted:completedTests.length,
      averageTestAccuracy,
      fullPaperCount:number(snapshot.fullPaperCount),
      essayCount:number(snapshot.essayCount),
      assignmentCompleted:completed,
      assignmentTotal:studentAssignments.length,
      assignmentPercent:studentAssignments.length ? Math.round(completed/studentAssignments.length*100) : null,
      currentPriority:(snapshot.priority ?? null) as Skill | null,
      strongestArea:(snapshot.strongest ?? null) as Skill | null,
      lastActiveAt,activeThisWeek,
      recordedActiveSeconds: studentUsage.reduce((sum,item)=>sum+Math.max(0,Math.min(86400,number(item.active_seconds))),0),
      usageSessions: studentUsage.length,
    }
  }).sort((a,b) => a.displayName.localeCompare(b.displayName))

  const scores = students.map(s => s.preparationScore).filter((s):s is number => s !== null)
  return NextResponse.json({
    organization:{name:scope.organizationName,role:scope.role},
    summary:{
      assigned:students.length,
      activeThisWeek:students.filter(s => s.activeThisWeek).length,
      averagePreparation:scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null,
      needsFollowUp:students.filter(s => !s.activeThisWeek).length,
      testsCompleted:students.reduce((sum,s)=>sum+s.testsCompleted,0),
    },
    students,
    telemetryStatus:usageResult.error?"Usage telemetry could not be retrieved; activity and time may be incomplete.":"Usage is limited to saved in-app sessions and may be incomplete.",
  },{headers})
}
