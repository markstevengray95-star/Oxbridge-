import { NextResponse } from "next/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { currentSchoolUserId, loadStaffScope, uuidPattern } from "@/lib/school/teacher-access"
import { authorizeSchoolStudentDetail } from "@/lib/school/student-tracking-access"
import { latestRecordedAt, recordedSeconds, schoolFeedbackExcerpt, schoolSafePagePath, schoolTestReview } from "@/lib/school/student-tracking-shapes"

export const runtime="nodejs"
export const dynamic="force-dynamic"
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"}
function error(message:string,status:number){
  return NextResponse.json({error:message},{status,headers})
}
function safeText(value:unknown,max=160){
  return typeof value==="string"?value.slice(0,max):null
}
function finite(value:unknown,min=0,max=100){
  const n=Number(value)
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):0
}

/** Sensitive transcripts and marks: never use the platform-wide admin route. */
export async function GET(request:Request){
  const actorId=await currentSchoolUserId()
  if(!actorId)return error("Sign in required.",401)
  if(!hasSupabaseAdminConfig())return error("School tracking is not configured.",503)
  const target=new URL(request.url).searchParams.get("studentId")||""
  if(!uuidPattern.test(target))return error("Select a valid student.",400)

  const admin=createAdminClient()
  try{
    const scope=await loadStaffScope(admin,actorId)
    if(!scope)return error("Active school staff access required.",403)
    const authorized=await authorizeSchoolStudentDetail(admin,scope,target)
    if(!authorized)return error("This student is not assigned to your authorized school view.",403)
    const audit=await admin.from("fellow_school_student_access_audit").insert({
      organization_id:authorized.organizationId,viewer_user_id:actorId,
      student_user_id:target,resource:"student_detail",
    })
    if(audit.error)return error("School access audit is not configured; detailed records are unavailable.",503)

    const [profile,managed,auth,tests,sessions,usage,navigation,learning,state] = await Promise.all([
      admin.from("profiles").select("id,display_name,target_course,target_university,application_year").eq("id",target).maybeSingle(),
      admin.from("practice_access_accounts").select("username,display_name,active,expires_at,account_type").eq("user_id",target).maybeSingle(),
      admin.auth.admin.getUserById(target),
      admin.from("test_results").select("id,source_ref,test,title,completed_at,raw_score,max_raw_marks,total_questions,accuracy,duration_seconds,payload")
        .eq("user_id",target).order("completed_at",{ascending:false}).limit(60),
      admin.from("interview_sessions").select("id,course,duration_seconds,summary,overall_feedback,created_at,updated_at")
        .eq("user_id",target).order("created_at",{ascending:false}).limit(40),
      admin.from("orbits_usage_sessions").select("page_path,active_seconds,started_at,last_seen_at,device_class")
        .eq("user_id",target).eq("app","fellow").order("last_seen_at",{ascending:false}).limit(250),
      admin.from("fellow_practice_activity_events").select("page_path,occurred_at")
        .eq("user_id",target).order("occurred_at",{ascending:false}).limit(100),
      admin.from("fellow_learning_activity_events").select("page_path,event_kind,active_seconds,occurred_at")
        .eq("user_id",target).order("occurred_at",{ascending:false}).limit(300),
      admin.from("user_state").select("state_key,state_value,updated_at")
        .eq("user_id",target).eq("state_key","oxbridge-tutor-progress-v2").maybeSingle(),
    ])
    // No partial mark/transcript responses if a core data query failed.
    if(profile.error||tests.error||sessions.error)return error("Could not load the student's saved school results.",503)
    if(!profile.data)return error("This school student has no accessible learner profile.",404)

    const interviewIds=(sessions.data??[]).map(row=>row.id)
    const turns=interviewIds.length
      ? await admin.from("interview_turns")
        .select("id,session_id,turn_index,role,content,feedback,created_at")
        .eq("user_id",target).in("session_id",interviewIds)
        .order("created_at",{ascending:false}).limit(1000)
      : {data:[],error:null}
    if(turns.error)return error("Could not load authorized interview transcripts.",503)

    const rows=turns.data??[]
    const bySession=new Map<string,typeof rows>()
    for(const row of rows){
      if(row.role!=="candidate"&&row.role!=="interviewer")continue
      const group=bySession.get(row.session_id)||[]
      group.push(row)
      bySession.set(row.session_id,group)
    }
    const savedTests=(tests.data??[]).map(item=>({
      id:item.id,test:safeText(item.test,120),title:safeText(item.title,160),
      completedAt:item.completed_at,rawScore:finite(item.raw_score,0,10000),
      maxRawMarks:item.max_raw_marks===null?null:finite(item.max_raw_marks,0,10000),
      totalQuestions:finite(item.total_questions,0,500),accuracy:finite(item.accuracy,0,100),
      durationSeconds:item.duration_seconds===null?null:recordedSeconds(item.duration_seconds),
      review:schoolTestReview(item.payload),
    }))
    const savedInterviews=(sessions.data??[]).map(item=>({
      id:item.id,course:safeText(item.course,120),summary:safeText(item.summary,200),
      createdAt:item.created_at,durationSeconds:recordedSeconds(item.duration_seconds),
      feedback:schoolFeedbackExcerpt(item.overall_feedback),
      turns:(bySession.get(item.id)||[]).sort((a,b)=>a.turn_index-b.turn_index).slice(0,200).map(turn=>({
        turnIndex:turn.turn_index,role:turn.role,content:safeText(turn.content,5000)||"",
        feedback:safeText(turn.feedback,1200),createdAt:turn.created_at,
      })),
    }))
    const usageSessions=usage.error?[]:(usage.data??[]).map(row=>({
      page:schoolSafePagePath(row.page_path),startedAt:row.started_at,lastSeenAt:row.last_seen_at,
      activeSeconds:recordedSeconds(row.active_seconds),deviceClass:safeText(row.device_class,25),
    }))
    const schoolEvents=learning.error?[]:(learning.data??[]).map(row=>({
      page:schoolSafePagePath(row.page_path),kind:row.event_kind,
      activeSeconds:recordedSeconds(row.active_seconds),at:row.occurred_at,
    }))
    const practiceEvents=navigation.error?[]:(navigation.data??[]).map(row=>({
      page:schoolSafePagePath(row.page_path),kind:"visit" as const,activeSeconds:0,at:row.occurred_at,
    }))
    const eventFeed=[...schoolEvents,...practiceEvents]
      .filter(x=>x.page).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,120)
    const heartbeatSeconds=schoolEvents.filter(e=>e.kind==="heartbeat").reduce((sum,e)=>sum+e.activeSeconds,0)
    const legacySeconds=usageSessions.reduce((sum,e)=>sum+e.activeSeconds,0)
    // The two sources overlap; never sum them, as that overstates activity.
    const estimatedActiveSeconds=heartbeatSeconds>0?heartbeatSeconds:legacySeconds
    const lastSignInAt=auth.data?.user?.last_sign_in_at||null
    const lastActiveAt=latestRecordedAt([
      lastSignInAt,...savedTests.map(t=>t.completedAt),
      ...savedInterviews.map(i=>i.createdAt),
      ...usageSessions.map(i=>i.lastSeenAt),
      ...eventFeed.map(i=>i.at),
      state.data?.updated_at,
    ])
    const accuracy=savedTests.length?Math.round(savedTests.reduce((sum,t)=>sum+t.accuracy,0)/savedTests.length):null
    const practiceState=state.error?{}:state.data?.state_value&&typeof state.data.state_value==="object"&&!Array.isArray(state.data.state_value)
      ? state.data.state_value as Record<string,unknown> : {}
    const attempts=Array.isArray(practiceState.practiceAttempts)?practiceState.practiceAttempts.length:0

    return NextResponse.json({
      student:{
        userId:target,displayName:profile.data.display_name||managed.data?.display_name||"Student",
        username:managed.data?.account_type==="student"?managed.data.username:null,
        managedPractice:managed.data?.account_type==="student",
        accessActive:managed.data?.account_type==="student"?Boolean(managed.data.active):null,
        targetCourse:profile.data.target_course,targetUniversity:profile.data.target_university,
        applicationYear:profile.data.application_year,
      },
      school:{name:scope.organizationName,role:scope.role,assignedByTeacher:authorized.assignedByTeacher},
      summary:{
        lastSignInAt,lastActiveAt,testsCompleted:savedTests.length,
        averageAccuracy:accuracy,interviewCount:savedInterviews.length,
        transcriptTurns:rows.filter(row=>row.role!=="system").length,
        candidateResponses:rows.filter(row=>row.role==="candidate").length,
        interviewSeconds:savedInterviews.reduce((sum,item)=>sum+item.durationSeconds,0),
        estimatedActiveSeconds,activitySessions:usageSessions.length,
        savedPracticeAttempts:attempts,
        lastCloudSyncAt:state.data?.updated_at||null,
      },
      tests:savedTests,interviews:savedInterviews,
      usage:usageSessions.slice(0,100),
      activity:eventFeed,
      dataStatus:{
        liveTrackingAvailable:!learning.error,
        legacyUsageAvailable:!usage.error,
        savedPracticeAvailable:!state.error,
        incompleteHistory:Boolean(learning.error||usage.error||state.error||navigation.error),
      },
      notice:"Only account-linked work saved inside FELLOW is shown. Activity time is an estimate based on visible-tab heartbeats or usage sessions; inactive tabs, failed syncing and historic work may be absent. No external browsing, device location or private messages are monitored.",
    },{headers})
  }catch{
    return error("School tracking could not verify the requested account or load its records.",503)
  }
}
