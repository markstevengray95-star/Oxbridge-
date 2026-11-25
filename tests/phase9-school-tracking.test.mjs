import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {schoolStudentMayReadDetails} from "../lib/school/student-tracking-policy.ts"
import {learningSectionPath,safeLearningSeconds,shouldRecordLearningEvent} from "../lib/school/learning-activity.ts"
import {schoolSafePagePath,schoolTestReview,schoolFeedbackExcerpt,recordedSeconds,latestRecordedAt} from "../lib/school/student-tracking-shapes.ts"

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..")
const read=p=>fs.readFileSync(path.join(root,p),"utf8")
const allowed={
  viewerId:"teacher-1",studentId:"student-1",scopeOrganizationId:"org-a",
  scopeRole:"teacher",activeOrganizationId:"org-a",organizationActive:true,
  organizationOwnerId:"owner-1",studentMemberUserId:"student-1",
  studentMemberRole:"student",studentSeatUserId:"student-1",
  studentSeatActive:true,studentStaffActive:false,linkedStudentId:"student-1",
}

test("a linked teacher can view an active student's saved records",()=>{
 assert.equal(schoolStudentMayReadDetails(allowed),true)
})
test("a teacher cannot access a student without an explicit link",()=>{
 assert.equal(schoolStudentMayReadDetails({...allowed,linkedStudentId:null}),false)
 assert.equal(schoolStudentMayReadDetails({...allowed,linkedStudentId:"student-2"}),false)
})
test("a teacher cannot view another school even if a link appears present",()=>{
 assert.equal(schoolStudentMayReadDetails({...allowed,activeOrganizationId:"org-b"}),false)
 assert.equal(schoolStudentMayReadDetails({...allowed,organizationActive:false}),false)
 assert.equal(schoolStudentMayReadDetails({...allowed,scopeOrganizationId:"org-b"}),false)
})
test("an inactive school seat or missing membership blocks every role",()=>{
 for(const role of ["owner","school_admin","teacher"]){
  assert.equal(schoolStudentMayReadDetails({...allowed,scopeRole:role,studentSeatActive:false}),false)
  assert.equal(schoolStudentMayReadDetails({...allowed,scopeRole:role,studentSeatUserId:"student-2"}),false)
  assert.equal(schoolStudentMayReadDetails({...allowed,scopeRole:role,studentMemberUserId:null}),false)
 }
})
test("school owner and school admin may view active students but never staff",()=>{
 for(const scopeRole of ["owner","school_admin"]){
  assert.equal(schoolStudentMayReadDetails({...allowed,scopeRole,linkedStudentId:null}),true)
  assert.equal(schoolStudentMayReadDetails({...allowed,scopeRole,studentStaffActive:true}),false)
  assert.equal(schoolStudentMayReadDetails({...allowed,scopeRole,studentMemberRole:"owner"}),false)
  assert.equal(schoolStudentMayReadDetails({...allowed,scopeRole,studentId:"owner-1"}),false)
 }
})
test("school staff never gain access to own student record via this endpoint",()=>{
 assert.equal(schoolStudentMayReadDetails({...allowed,viewerId:"student-1"}),false)
})

test("activity accepts only named learning sections, never arbitrary browsing",()=>{
 assert.equal(learningSectionPath("/gemini-live-next"),"/gemini-live-next")
 assert.equal(learningSectionPath("/interview-room"),"/interview-room")
 assert.equal(learningSectionPath("/test-player/test/7"),"/test-player")
 assert.equal(learningSectionPath("/student-home"),"/student-home")
 for(const bad of ["/admin","/teacher-dashboard","/account","/privacy",
  "/gemini-live-next?session=secret","/test-player#token",
  "/test-player/%31323","//interview-room","https://site.test/interview-room",
  "/interview-room/../admin",42,null,"/outside-site"]){
  assert.equal(learningSectionPath(bad),null,String(bad))
 }
})

test("heartbeat counts are capped, and page visits never gain active seconds",()=>{
 assert.equal(safeLearningSeconds("visit",30),0)
 assert.equal(safeLearningSeconds("heartbeat",999999),30)
 assert.equal(safeLearningSeconds("heartbeat",-10),0)
 assert.equal(safeLearningSeconds("heartbeat",21.9),21)
 assert.equal(safeLearningSeconds("heartbeat","30"),0)
})

test("duplicate heartbeats and visits are suppressed for rapid repeated calls",()=>{
 const now=Date.parse("2026-11-24T12:00:30Z")
 const prev={page_path:"/interview-room",event_kind:"heartbeat",occurred_at:"2026-11-24T12:00:10Z"}
 assert.equal(shouldRecordLearningEvent(prev,{page_path:"/interview-room",event_kind:"heartbeat"},now),false)
 assert.equal(shouldRecordLearningEvent(prev,{page_path:"/test-player",event_kind:"heartbeat"},now),true)
 assert.equal(shouldRecordLearningEvent(prev,{page_path:"/interview-room",event_kind:"visit"},now),true)
 assert.equal(shouldRecordLearningEvent({...prev,occurred_at:"2026-11-24T11:59:00Z"},{page_path:"/interview-room",event_kind:"heartbeat"},now),true)
})

test("teacher-visible history never includes query strings or dynamic route IDs",()=>{
 assert.equal(schoolSafePagePath("/test-player/8390?token=private"),"/test-player")
 assert.equal(schoolSafePagePath("/interview-room#private"),"/interview-room")
 assert.equal(schoolSafePagePath("https://external.test/private"),null)
 assert.equal(schoolSafePagePath("//admin/keys"),null)
})

test("test answers are whitelisted and source payload metadata is not leaked",()=>{
 const sample={
  questionReview:[{questionId:"Q1",prompt:"Calculate the acceleration",answer:"2 m/s²",
    correctAnswer:"2.0 m/s²",correct:true,rawMark:3,maxMarks:3,
    explanation:"Use the gradient.",secretTeacherNote:"private-note",userEmail:"pupil@example.test"}],
  api_token:"secret-token",medical_notes:"not school assessment information",
 }
 const result=schoolTestReview(sample)
 assert.equal(result.length,1)
 assert.equal(result[0].answer,"2 m/s²")
 assert.equal(result[0].rawMark,3)
 assert.equal("api_token" in result[0],false)
 assert.equal("userEmail" in result[0],false)
 assert.equal("medical_notes" in result[0],false)
})
test("teacher feedback only exposes selected practice summaries",()=>{
 const review=schoolFeedbackExcerpt({score:78,source:"history_cloud_mirror",
  feedbackReport:{priorities:[{target:"Reasoning",task:"Check the assumption",unsafeSecret:"x"}],unsafeSecret:"y"},
  mockSession:{status:"Partial mock",targetMinutes:25},internal_token:"secret"})
 assert.deepEqual(Object.keys(review).sort(),["practiceStatus","practiceTargetMinutes","priorities","score","source"].sort())
 assert.equal(review.priorities[0].target,"Reasoning")
 assert.equal("unsafeSecret" in review.priorities[0],false)
})
test("durations, dates and malformed telemetry are safely bounded",()=>{
 assert.equal(recordedSeconds(123.8),123)
 assert.equal(recordedSeconds(1000000),86400)
 assert.equal(recordedSeconds(-500),0)
 assert.equal(latestRecordedAt([null,"bad","2026-11-20T10:00:00Z","2026-11-21T12:00:00Z"]),"2026-11-21T12:00:00Z")
})

test("private teacher endpoint checks school scope before any transcript query",()=>{
 const src=read("app/api/teacher/student-detail/route.ts")
 assert.match(src,/authorizeSchoolStudentDetail/)
 assert.match(src,/if\(!authorized\)return error\(/)
 assert.match(src,/fellow_school_student_access_audit/)
 assert.match(src,/if\(audit.error\)return error\(/)
 assert.match(src,/\.from\("interview_turns"\)/)
 assert.ok(src.indexOf("if(audit.error)")<src.indexOf('.from("interview_turns")'))
 assert.match(src,/\.eq\("user_id",target\)/)
 assert.match(src,/Cache-Control":"private, no-store/)
 assert.match(src,/Vary":"Cookie/)
 assert.doesNotMatch(src,/getAppAdminAccess/)
})
test("verified server policy ties users to org membership, seats and actual links",()=>{
 const src=read("lib/school/student-tracking-access.ts")
 assert.match(src,/school_organization_members/)
 assert.match(src,/school_seat_entitlements/)
 assert.match(src,/school_teacher_student_links/)
 assert.match(src,/school_staff_roles/)
 assert.match(src,/schoolStudentMayReadDetails/)
 assert.match(src,/uuidPattern\.test\(studentId\)/)
})
test("the client cannot supply an arbitrary teacher or organization ID",()=>{
 const api=read("app/api/teacher/student-detail/route.ts")
 assert.match(api,/loadStaffScope\(admin,actorId\)/)
 assert.match(api,/currentSchoolUserId\(\)/)
 assert.doesNotMatch(api,/searchParams\.get\("organizationId"\)/)
 assert.doesNotMatch(api,/searchParams\.get\("teacherId"\)/)
 assert.match(read("app/teacher-student-progress/page.tsx"),/encodeURIComponent\(id\)/)
})
test("school telemetry is restricted to authenticated eligible learners",()=>{
 const api=read("app/api/learning/activity/route.ts")
 assert.match(api,/getClaims\(\)/)
 assert.match(api,/eligibleLearner\(admin,userId\)/)
 assert.match(api,/school_organization_members/)
 assert.match(api,/school_staff_roles/)
 assert.match(api,/expires_at/)
 assert.match(api,/shouldRecordLearningEvent/)
 assert.match(api,/Invalid request origin/)
})
test("client records learning time only when tab is visible, excluding query strings",()=>{
 const tracker=read("components/learning-activity-tracker.tsx")
 assert.match(tracker,/document\.hidden/)
 assert.match(tracker,/learningSectionPath\(pathname\)/)
 assert.match(tracker,/heartbeat/)
 assert.match(tracker,/activeSeconds/)
 const older=read("components/orbits-telemetry.tsx")
 assert.match(older,/schoolSafePagePath\(pathname\)/)
 assert.doesNotMatch(older,/page_path: pathname/)
 assert.doesNotMatch(older,/pathname \+ location.search/)
})
test("Gemini Live Next, panel transcripts and duration are imported to user-owned cloud tables",()=>{
 const mirror=read("components/history-cloud-mirror.tsx")
 const sync=read("components/cloud-progress-sync.tsx")
 assert.match(mirror,/gemini live next/i)
 assert.match(sync,/Gemini Live Next/)
 assert.match(sync,/Interviewer\(\?:/)
 assert.match(mirror,/savedDuration/)
 assert.match(mirror,/mockSession: mock/)
 assert.match(mirror,/\.eq\("user_id",\s*userId\)/)
 assert.match(sync,/\.eq\("user_id", userId\)/)
})
test("school access and learner activity tables are RLS-protected and service-only",()=>{
 const sql=read("supabase/migrations/20261124_fellow_school_tracking_events_and_access_audit.sql")
 assert.match(sql,/create table if not exists public.fellow_learning_activity_events/)
 assert.match(sql,/create table if not exists public.fellow_school_student_access_audit/)
 assert.match(sql,/enable row level security/g)
 assert.match(sql,/revoke all on table public\.fellow_learning_activity_events from public,anon,authenticated/)
 assert.match(sql,/revoke all on table public\.fellow_school_student_access_audit from public,anon,authenticated/)
})
test("teacher dashboard and privacy export are connected to new tracking",()=>{
 assert.match(read("app/teacher-dashboard/page.tsx"),/\/teacher-student-progress\?studentId=/)
 assert.match(read("app/api/teacher/progress/route.ts"),/schoolStaffCanSeeWholeRoster/)
 assert.match(read("app/api/privacy/export/route.ts"),/fellow_learning_activity_events/)
 assert.match(read("app/api/privacy/export/route.ts"),/fellow_school_student_access_audit/)
 assert.match(read("app/privacy/page.tsx"),/visible-tab time estimates/)
 assert.match(read("app/layout.tsx"),/LearningActivityTracker/)
})


test("standard voice and typed interviews persist duration instead of reporting zero",()=>{
 const voice=read("app/gemini-live-next/page.tsx")
 const formal=read("components/advanced-interview-experience.tsx")
 const reasoning=read("components/reasoning-interview-experience-v2.tsx")
 const mirror=read("components/history-cloud-mirror.tsx")
 const sync=read("components/cloud-progress-sync.tsx")
 assert.match(voice,/durationSeconds: duration/)
 assert.match(formal,/durationSeconds: Math\.max/)
 assert.match(reasoning,/durationSeconds:mockStartRef/)
 assert.match(mirror,/optionalInteger\(log\.durationSeconds\)/)
 assert.match(sync,/explicitDuration/)
})


test("cloud importers preserve multiple paragraphs in interview transcripts",()=>{
 const mirror=read("components/history-cloud-mirror.tsx")
 const cloud=read("components/cloud-progress-sync.tsx")
 assert.ok(mirror.includes("([\\s\\S]+)"))
 assert.ok(cloud.includes("([\\s\\S]+)"))
})
