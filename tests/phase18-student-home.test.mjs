import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {homeProfile,pendingAssignments,nextHomeActivity,weeklyCount} from "../lib/student-home.ts"
const now=Date.parse("2026-11-25T12:00:00Z")
const base={profile:{course:"Physics",university:"Oxford",year:"2027"},week:{interviews:2,tests:1,coaching:0},coach:{title:"Testing explanations",reason:"Practise a fresh example.",due:false},latest:null,asOf:new Date(now).toISOString()}
const task=(id,due_at)=>({id,title:"Assignment "+id,due_at})
const school=(assignments,progress=[])=>({joined:[{assignments,progress}]})
test("No invented default subject or entry year",()=>assert.deepEqual(homeProfile({},{}),{course:null,university:null,year:null}))
test("Saved profile overrides account fallback",()=>assert.deepEqual(homeProfile({course:"Law",year:"2028"},{target_course:"Physics",target_university:"Cambridge",application_year:2027}),{course:"Law",university:"Cambridge",year:"2028"}))
test("Malformed saved profile cannot produce invalid dates or university",()=>assert.deepEqual(homeProfile({year:"unknown",university:"Other"},{}),{course:null,university:null,year:null}))
test("Assignments sorted by deadline with completed and duplicate rows excluded",()=>{const rows=pendingAssignments(school([task("later","2026-12-01"),task("done","2026-11-23"),task("early","2026-11-24"),task("early","2026-11-24"),task("undated",null)],[{assignment_id:"done",status:"completed"}]),now);assert.deepEqual(rows.map(r=>r.id),["early","later","undated"]);assert.equal(rows[0].overdue,true)})
test("Overdue school assignment wins over due review",()=>assert.equal(nextHomeActivity({...base,coach:{...base.coach,due:true}},school([task("1","2026-11-24")]),now).kind,"assignment"))
test("Imminent deadline wins",()=>assert.equal(nextHomeActivity(base,school([task("1","2026-11-26")]),now).kind,"assignment"))
test("Distant assignment does not displace scheduled coaching",()=>assert.equal(nextHomeActivity({...base,coach:{...base.coach,due:true}},school([task("1","2026-12-02")]),now).kind,"review"))
test("Missing profile prompts setup",()=>assert.equal(nextHomeActivity({...base,profile:homeProfile({}, {})},null,now).kind,"setup"))
test("Existing coach is the next activity when available",()=>assert.equal(nextHomeActivity(base,null,now).href,"/tutor#academic-coach"))
test("No coaching and no saved interviews suggests interview practice",()=>assert.equal(nextHomeActivity({...base,coach:null,week:{...base.week,interviews:0}},null,now).kind,"interview"))
test("Unavailable weekly data is not treated as zero",()=>assert.equal(nextHomeActivity({...base,coach:null,week:{...base.week,interviews:null}},null,now).kind,"progress"))
test("Weekly activity excludes stale, invalid and future entries",()=>assert.equal(weeklyCount(["2026-11-18T12:00:00Z","2026-11-25T12:00:00Z","2026-11-18T11:59:59Z","2026-11-26","bad"],now),2))
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8")
test("Home is separate, detailed Tutor retained",()=>{assert.match(read("app/student-home/page.tsx"),/StudentHomeDashboard/);assert.doesNotMatch(read("app/student-home/page.tsx"),/PersonalTutorShell/);assert.match(read("app/tutor/page.tsx"),/PersonalTutorShell/)})
test("Home API scopes cloud reads to verified account and avoids public caching",()=>{const s=read("app/api/student-home/route.ts");assert.match(s,/auth.getUser\(\)/);assert.match(s,/\.eq\("user_id",userId\)/);assert.match(s,/private, no-store/);assert.doesNotMatch(s,/createAdminClient/)})
test("Client clears previous account and rejects stale fetches",()=>{const s=read("components/student-home-dashboard.tsx");assert.match(s,/next!==currentUser/);assert.match(s,/setSummary\(null\);setSchool\(null\)/);assert.match(s,/generation===version/);assert.doesNotMatch(s,/localStorage/)})
test("Classroom failures are distinct from empty classroom",()=>{assert.match(read("app/api/school-targeted/route.ts"),/cohortError\|\|assignmentError\|\|progressError/);assert.match(read("components/student-home-dashboard.tsx"),/schoolStatus==="unavailable"/)})
