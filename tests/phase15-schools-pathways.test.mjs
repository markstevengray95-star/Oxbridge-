import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {studentSummary,assignmentSummary,cohortAssignmentSummary,progressCsv} from "../lib/school/progress.ts"
import {preparationPlan,requirementFreshness} from "../lib/preparation-pathway.ts"
const now=Date.parse("2026-11-25T12:00:00Z")
const student=id=>({userId:id,displayName:id,preparationScore:0,interviewCount:0,fullPaperCount:0,essayCount:0})
const all={id:"all",title:"Common",description:"",href:"/tutor"}
const individual={id:"target",title:"Private target",description:"",href:"/tutor",target_user_id:"A",submission_required:true,due_at:"2026-11-24"}
const detail={cohort:{name:"Test"},students:[student("A"),student("B")],assignments:[all,individual],progress:[{assignment_id:"all",user_id:"B",status:"completed"},{assignment_id:"target",user_id:"B",status:"completed",note:"invalid"}]}
test("individual assignment is excluded from other pupils and their denominator",()=>{assert.equal(studentSummary(detail,detail.students[1],now).tasks.length,1);assert.equal(studentSummary(detail,detail.students[1],now).percent,100)})
test("cross-pupil completion does not count",()=>{assert.deepEqual(assignmentSummary(detail,individual),{eligible:1,done:0,percent:0})})
test("cohort metrics use assigned pupil-task pairs",()=>{const s=cohortAssignmentSummary(detail,now);assert.equal(s.assigned,3);assert.equal(s.completed,1);assert.equal(s.percent,33);assert.equal(s.targetedOverdue,1)})
test("reflection and completion remain separate",()=>{const s=cohortAssignmentSummary({...detail,progress:[...detail.progress,{assignment_id:"target",user_id:"A",status:"completed",note:"Review working"}]},now);assert.equal(s.targetedCompleted,1);assert.equal(s.targetedWithReflection,1)})
test("unassigned pupil is not included in targeted CSV row",()=>{const csv=progressCsv(detail,now);assert.ok(!csv.split("\r\n").some(l=>l.startsWith('"B"')&&l.includes("Private target")))})
test("no assignments means no manufactured completion percent",()=>{assert.equal(cohortAssignmentSummary({...detail,assignments:[]},now).percent,null)})
test("pathway respects weekly budget and has distinct subject activity",()=>{const a=preparationPlan("Physics","exploring",90,false),b=preparationPlan("Law","exploring",90,false);assert.ok(a.plannedMinutes<=90);assert.notEqual(a.subject,b.subject);assert.notEqual(a.tasks.find(t=>t.id==="exploration").detail,b.tasks.find(t=>t.id==="exploration").detail)})
test("test preparation is conditional on official confirmation",()=>{assert.ok(!preparationPlan("Physics","pretest",90,false).tasks.some(t=>t.id==="test"));assert.ok(preparationPlan("Physics","pretest",90,true).tasks.some(t=>t.id==="test"))})
test("interview and post-interview stages choose different priorities",()=>{assert.equal(preparationPlan("Law","interview",60,false).tasks[0].id,"interview");assert.equal(preparationPlan("Law","postinterview",60,false).tasks[0].id,"review")})
test("future entry years and stale reference are not treated as verified",()=>{assert.equal(requirementFreshness(2027,now),"reference-only");assert.equal(requirementFreshness(2028,now),"unverified-year");assert.equal(requirementFreshness(2027,now+100*86400000),"review-due")})
test("targeted server checks membership, owner and recipient",()=>{const s=readFileSync(new URL("../app/api/school-targeted/route.ts",import.meta.url),"utf8");assert.match(s,/cohort\?\.owner_user_id !== userId/);assert.match(s,/membership\?\.role !== "student"/);assert.match(s,/target_user_id\.is\.null,target_user_id\.eq/);assert.match(s,/private, no-store/)})
test("student completion checks assignment target, membership and reflection",()=>{const s=readFileSync(new URL("../app/api/school/route.ts",import.meta.url),"utf8");assert.match(s,/membership\?\.role!=="student"/);assert.match(s,/assignment\.target_user_id!==userId/);assert.match(s,/status==="completed"&&assignment\.submission_required&&!note/)})
