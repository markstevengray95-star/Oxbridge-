import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { coachPacks,chooseCoachPack,gradeCoachAttempt,readCoachAttempt } from "../lib/academic-coach.ts"
const now=new Date("2026-11-25T12:00:00Z"),recent="2026-11-24T12:00:00Z"
const select=(progress={},profile={},attempts=[])=>chooseCoachPack(progress,profile,attempts,now)
const report=(overrides={})=>({feedbackReport:{snapshot:{id:"one",course:"Physics",createdAt:recent,answerCount:6,reasonedCount:5,testedCount:0,revisionCount:5,...overrides}}})
test("eight distinct exercises with two fresh questions per skill",()=>{
 assert.equal(coachPacks.length,8);assert.equal(new Set(coachPacks.map(p=>p.id)).size,8)
 for(const p of coachPacks){assert.notEqual(p.diagnostic.prompt,p.transfer.prompt);assert.equal(new Set(p.diagnostic.options).size,3);assert.equal(new Set(p.transfer.options).size,3);assert.ok(p.diagnostic.correct>=0&&p.diagnostic.correct<=2);assert.ok(p.transfer.correct>=0&&p.transfer.correct<=2)}
})
test("missing evidence is a baseline, not a deficiency",()=>{assert.match(select().reason,/baseline/);assert.equal(select().course,null)})
test("recent same-course evidence prioritises testing",()=>{assert.equal(select({logs:[report()]},{course:"Physics"}).packId,"evidence-1")})
test("other course, stale, future or thin evidence is not used",()=>{
 for(const log of [report({course:"Law"}),report({createdAt:"2025-11-20"}),report({createdAt:"2026-11-26"}),report({answerCount:2})])assert.match(select({logs:[log]},{course:"Physics"}).reason,/baseline/)
})
test("quantitative evidence needs enough attempted items and valid low accuracy",()=>{
 const row={date:recent,sections:[{title:"Quantitative Reasoning",attempted:9,accuracy:40}]}
 assert.equal(select({fullPaperResults:[row]}).packId,"quantitative-1")
 assert.match(select({fullPaperResults:[{...row,sections:[{title:"Mathematics",attempted:2,accuracy:40}]}]}).reason,/baseline/)
})
test("server grading distinguishes diagnosis from fresh transfer",()=>{
 const p=coachPacks[0];const a=gradeCoachAttempt(p.id,(p.diagnostic.correct+1)%3,p.transfer.correct,now)
 assert.equal(a.diagnosticCorrect,false);assert.equal(a.transferCorrect,true)
 assert.equal(gradeCoachAttempt(p.id,"1",0,now),null);assert.equal(gradeCoachAttempt(p.id,1,3,now),null);assert.equal(gradeCoachAttempt("invented",1,2,now),null)
})
test("failed fresh check triggers a different example in that skill",()=>{
 const p=coachPacks.find(p=>p.id==="revision-1"),a=gradeCoachAttempt(p.id,p.diagnostic.correct,(p.transfer.correct+1)%3,now)
 assert.equal(select({}, {}, [a]).packId,"revision-2");assert.match(select({}, {}, [a]).reason,/previous fresh-question/)
})
test("completed exercises are never selected again",()=>{
 const done=coachPacks.map(p=>gradeCoachAttempt(p.id,p.diagnostic.correct,p.transfer.correct,now));assert.equal(select({}, {}, done).packId,null)
})
test("saved rows must match a known pack and validated boolean results",()=>{
 const a=gradeCoachAttempt("inference-1",1,0,now);assert.deepEqual(readCoachAttempt(a,"inference-1"),a)
 assert.equal(readCoachAttempt(a,"inference-2"),null);assert.equal(readCoachAttempt({...a,transferCorrect:"true"},"inference-1"),null)
})
test("route requires verified account and scopes reads; no service-role client",()=>{
 const route=readFileSync(new URL("../app/api/academic-coach/route.ts",import.meta.url),"utf8")
 assert.match(route,/auth\.getUser\(\)/);assert.match(route,/\.eq\("user_id",auth\.user\.id\)/);assert.match(route,/user_id:auth\.user\.id/);assert.match(route,/ignoreDuplicates:true/);assert.doesNotMatch(route,/createAdminClient|service_role/)
})
test("coach UI is in shared tutor shell with save failure retry",()=>{
 const shell=readFileSync(new URL("../components/personal-tutor-shell.tsx",import.meta.url),"utf8")
 const ui=readFileSync(new URL("../components/academic-coach.tsx",import.meta.url),"utf8")
 assert.match(shell,/<AcademicCoach \/>/);assert.match(ui,/Try a fresh question/);assert.match(ui,/Connection failed/);assert.match(ui,/onAuthStateChange/)
})
