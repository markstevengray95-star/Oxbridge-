import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync,existsSync} from "node:fs"
import {filterTeacherRoster,followUpStudents,upcomingSchoolAssignments,teacherViews} from "../lib/staff-dashboard.ts"
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8")
const students=[
 {userId:"a",displayName:"Alice",targetCourse:"Physics",targetUniversity:"Oxford",activeThisWeek:false,lastActiveAt:null,preparationScore:null,assignmentCompleted:0,assignmentTotal:2,currentPriority:null},
 {userId:"b",displayName:"Ben",targetCourse:"Law",targetUniversity:"Cambridge",activeThisWeek:false,lastActiveAt:"2026-11-10T09:00:00Z",preparationScore:65,assignmentCompleted:2,assignmentTotal:2,currentPriority:{label:"Evidence"}},
 {userId:"c",displayName:"Charlie",targetCourse:"Physics",targetUniversity:"Oxford",activeThisWeek:true,lastActiveAt:"2026-11-26T08:00:00Z",preparationScore:70,assignmentCompleted:1,assignmentTotal:2,currentPriority:null},
]
test("Teacher filters use only authorised rows and do not invent student data",()=>{
 assert.deepEqual(filterTeacherRoster(students,"pHySiCs","all").map(s=>s.userId),["a","c"])
 assert.deepEqual(filterTeacherRoster(students,"","follow-up").map(s=>s.userId),["a","b"])
 assert.deepEqual(filterTeacherRoster(students,"","active").map(s=>s.userId),["c"])
 assert.deepEqual(filterTeacherRoster(students,"","no-baseline").map(s=>s.userId),["a"])
 assert.deepEqual(filterTeacherRoster(students,"missing","all"),[])
 assert.deepEqual(teacherViews.map(f=>f.id),["all","follow-up","active","no-baseline"])
})
test("Follow-up queue is stable, bounded and contains no active students",()=>{
 assert.deepEqual(followUpStudents(students).map(s=>s.userId),["a","b"])
 assert.deepEqual(followUpStudents(students,1).map(s=>s.userId),["a"])
 assert.deepEqual(followUpStudents(students,0),[])
})
test("School due-date list sorts overdue first and excludes undated or distant items",()=>{
 const now=Date.parse("2026-11-26T10:00:00Z")
 const rows=[{id:"future",title:"Later",due_at:"2026-12-13T10:00:00Z"},{id:"next",title:"Due tomorrow",due_at:"2026-11-27T09:00:00Z"},{id:"past",title:"Overdue",due_at:"2026-11-24T09:00:00Z"},{id:"none",title:"Undated",due_at:null},{id:"bad",title:"Bad date",due_at:"not a date"}]
 assert.deepEqual(upcomingSchoolAssignments(rows,now).map(t=>t.id),["past","next"])
 assert.deepEqual(upcomingSchoolAssignments(rows,now,0).map(t=>t.id),["past"])
})
test("Teacher dashboard keeps role-scoped API, student-specific detail links and safe CSV",()=>{
 const ui=read("app/teacher-dashboard/page.tsx"),api=read("app/api/teacher/progress/route.ts")
 assert.match(ui,/fetch\("\/api\/teacher\/progress"/)
 assert.match(ui,/filterTeacherRoster\(/)
 assert.match(ui,/followUpStudents\(/)
 assert.match(ui,/teacherViews\.map/)
 assert.match(ui,/aria-pressed=\{selected\?\.userId===s.userId\}/)
 assert.match(ui,/encodeURIComponent\(selected.userId\)/)
 assert.match(ui,/students\.map\(s=>/)
 assert.match(ui,/data\.organization\.role!=="teacher"/)
 assert.match(ui,/href="#teacher-roster"/)
 assert.match(api,/loadStaffScope\(admin,userId\)/)
 assert.match(api,/schoolStaffCanSeeWholeRoster\(scope\)/)
})
test("Detailed student evidence remains protected by server authorisation",()=>{
 const policy=read("lib/school/student-tracking-access.ts")
 const detail=read("app/api/teacher/student-detail/route.ts")
 assert.match(policy,/authorizeSchoolStudentDetail\(/)
 assert.match(policy,/school_teacher_student_links/)
 assert.ok(detail.includes("authorizeSchoolStudentDetail"),"Detail endpoint must verify link before service-role reads")
})
test("School dashboard keeps core mutation routes, join codes and progress workspace",()=>{
 const ui=read("app/school-dashboard/page.tsx")
 for(const name of ["createCohort","createAssignment","deleteAssignment","exportCsv","ProgressWorkspace","cohortAssignmentSummary","assignmentSummary","join_code","post({ action:","school-targeted"])assert.ok(ui.includes(name),name)
 assert.match(ui,/upcomingSchoolAssignments\(active\.assignments\)/)
 assert.match(ui,/Detailed cohort progress analysis/)
 assert.match(ui,/Create assignment or intervention/)
 assert.match(ui,/Delete assignment/)
 assert.match(ui,/fellow-page-title/)
})
test("Admin server gate remains before account and roster queries",()=>{
 const ui=read("app/admin/page.tsx")
 const gate=ui.indexOf('if (!access.isAdmin) redirect')
 const loads=ui.indexOf('const [stats, practiceRoster] = await Promise.all')
 assert.ok(gate>=0&&loads>gate)
 assert.match(ui,/getAppAdminAccess\(userId, email\)/)
 assert.match(ui,/<AdminActionCentre \/>/)
 assert.match(ui,/practiceLogins\.slice\(0,8\)/)
})
test("A failed admin query is not represented as a zero",()=>{
 const ui=read("app/admin/page.tsx")
 assert.match(ui,/users\.error \? null/)
 assert.match(ui,/subscriptions\.error \? null/)
 assert.match(ui,/practiceRoster\.error/)
 assert.match(ui,/A dash means unavailable, not zero/)
 assert.match(ui,/role="alert"/)
})
test("All 13 existing administrator tools remain reachable",()=>{
 const actions=read("components/admin-action-centre.tsx")
 const hrefs=[...actions.matchAll(/href:"(\/[^"]+)"/g)].map(m=>m[1])
 assert.equal(hrefs.length,13)
 assert.equal(new Set(hrefs).size,hrefs.length)
 for(const href of hrefs)assert.ok(existsSync(new URL("../app"+href+"/page.tsx",import.meta.url)),"Missing admin route: "+href)
 for(const href of ["/admin/practice-access","/admin/managed-school-logins","/admin/practice-tracking","/admin/safeguarding","/admin/privacy-requests"])assert.ok(hrefs.includes(href))
 assert.match(actions,/<details/)
})
test("Staff-related pages use consistent academic theme without changing API calls",()=>{
 for(const path of ["app/teacher-dashboard/page.tsx","app/school-dashboard/page.tsx","app/admin/page.tsx","app/school-insights/page.tsx","app/school/teachers/page.tsx","app/teacher-student-progress/page.tsx","app/admin/practice-tracking/page.tsx","app/admin/practice-access/page.tsx","app/admin/managed-school-logins/page.tsx","app/school-reports/page.tsx"])assert.match(read(path),/fellow-ui/,path)
 assert.match(read("app/admin/practice-tracking/page.tsx"),/href="\/admin"/)
 assert.match(read("app/school-reports/page.tsx"),/window\.print\(\)/)
})
test("No new privileged API or client-side owner bypass is introduced",()=>{
 const clientUi=read("app/teacher-dashboard/page.tsx")+read("app/school-dashboard/page.tsx")
 assert.doesNotMatch(clientUi,/createAdminClient\(\)/)
 assert.doesNotMatch(clientUi,/service_role/)
 assert.match(read("app/admin/page.tsx"),/createAdminClient\(\)/)
 assert.match(read("app/api/teacher/progress/route.ts"),/currentSchoolUserId/)
})
