import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {buildAssessmentReport} from "../lib/assessment-intelligence.ts"

const now=new Date("2026-11-25T12:00:00Z")
const date=(days)=>new Date(now.getTime()-days*86400000).toISOString()
const report=(progress={},profile={course:"Physics"},coach=[])=>buildAssessmentReport(progress,profile,coach,now)
const log=(id,days,answers,reasoning,testing,extra={})=>({feedbackReport:{snapshot:{id,createdAt:date(days),course:"Physics",source:"reasoning",answerCount:answers,reasonedCount:reasoning,testedCount:testing,revisionCount:0,...extra},improvements:[{quote:"I would calculate it.",question:"What is the next step?",observation:"Check the reasoning."}]}})
const question=(id,answer="4",raw=0,max=1,section="Physics")=>({questionId:id,section,prompt:"Question "+id,answer,correctAnswer:"5",rawMark:raw,maxMarks:max})
const paper=(id,days,questionReview,test="ESAT",form=1)=>({id,test,form,date:date(days),sections:[{title:"Physics",kind:"mcq",rawMark:3,maxMarks:5},{title:"Essay",kind:"essay",rawMark:0,maxMarks:0}],questionReview})
const coach=(id,days,transfer,review=false)=>({id,skill:"Testing explanations",title:"Example "+id,date:date(days),diagnosticCorrect:false,transferCorrect:transfer,review})

test("empty and malformed data produce no fabricated scores",()=>{
 const r=report({logs:[null,{},5],fullPaperResults:[null,{id:"bad",test:"ESAT",date:"bad"}]},{})
 assert.equal(r.course,null);assert.equal(r.interviewCount,0);assert.equal(r.paperCount,0);assert.equal(r.coachCount,0);assert.equal(r.recurring.length,0)
})
test("only recent dated unique same-course same-mode interview evidence",()=>{
 const r=report({logs:[log("a",1,4,2,1),log("a",1,4,2,1),log("b",100,4,2,1),log("c",-1,4,2,1),log("d",2,4,2,1,{course:"Law"}),log("e",3,2,1,1),log("f",4,3,4,0),log("g",5,4,2,1,{source:"voice"})]})
 assert.equal(r.interviewCount,2);assert.equal(r.interviews.length,2);assert.ok(r.interviews.every(g=>g.comparison===null))
})
test("weighted two-period trend needs four valid sessions in one mode",()=>{
 const r=report({logs:[log("a",4,4,1,0),log("b",3,6,4,2),log("c",2,4,3,1),log("d",1,6,5,3)]})
 assert.deepEqual(r.interviews[0].comparison,{earlierAnswers:10,recentAnswers:10,reasoningDelta:30,testingDelta:20})
 assert.equal(r.interviews[0].examples.length,3)
})
test("invalid marks and duplicate papers are not counted as distinct evidence",()=>{
 const a=paper("a",3,[question("one"),question("one"),question("bad","2",3,1)])
 const r=report({fullPaperResults:[a,a,paper("b",1,[question("two")])]})
 assert.equal(r.paperCount,2);assert.equal(r.recurring[0].missedCount,2);assert.equal(r.recurring[0].distinctMissed,2);assert.equal(r.recurring[0].paperCount,2)
 assert.equal(r.paperTrends.length,1);assert.equal(r.paperTrends[0].points[0].accuracy,60)
})
test("same question repeated or omissions alone do not establish recurring attempted gaps",()=>{
 const r=report({fullPaperResults:[paper("a",2,[question("one"),question("omit-a","Unanswered"),question("multi","1: — · 2: —")]),paper("b",1,[question("one"),question("omit-b","Unanswered")])]})
 assert.equal(r.recurring.length,0)
})
test("partial-credit examples are retained, separate from unanswered items",()=>{
 const r=report({fullPaperResults:[paper("a",2,[question("one","Yes",1,2),question("omit","Unanswered")]),paper("b",1,[question("two"),question("correct","5",1)])]})
 const p=r.recurring[0];assert.equal(p.missedCount,2);assert.equal(p.attemptedCount,3);assert.equal(p.omittedCount,1);assert.equal(p.examples[1].raw,1);assert.equal(p.examples[1].max,2)
 assert.equal(r.next.href,"/paper-intervention")
})
test("sections and tests do not mix even with shared labels",()=>{
 const r=report({fullPaperResults:[paper("a",2,[question("one")],"ESAT"),paper("b",1,[question("two")],"TMUA")]})
 assert.equal(r.recurring.length,0);assert.equal(r.paperTrends.length,2)
})
test("diagnostics, fresh and delayed checks remain separate; latest successful check clears stale recommendation",()=>{
 const r=report({}, {},[coach("first",5,false),coach("second",3,true),coach("review",1,true,true),coach("second",3,true)])
 const g=r.coachSkills[0];assert.equal(g.completed,2);assert.equal(g.diagnosticCorrect,0);assert.equal(g.transferCorrect,1);assert.equal(g.delayedCompleted,1);assert.equal(g.delayedCorrect,1);assert.equal(r.coachCount,3);assert.equal(r.next.title,"Collect more comparable evidence")
})
test("interview testing recommendation based on at least two same-mode observations",()=>{
 assert.equal(report({logs:[log("a",2,4,3,0),log("b",1,4,2,0)]}).next.href,"/interview-room")
 assert.notEqual(report({logs:[log("a",2,4,3,0),log("b",1,4,2,1)]}).next.href,"/interview-room")
})
test("retests exclude duplicates and invalid percentages; no invented question counts",()=>{
 const a={id:"r",date:date(1),test:"UCAT",retestAccuracy:70,targets:["Quantitative Reasoning"]}
 const r=report({interventionResults:[a,a,{...a,id:"bad",retestAccuracy:200}]})
 assert.equal(r.retests.length,1);assert.equal(r.retests[0].questions,null)
})
test("route is account-scoped, no service role, no store and UI handles auth changes",()=>{
 const route=readFileSync(new URL("../app/api/assessment-report/route.ts",import.meta.url),"utf8")
 const page=readFileSync(new URL("../app/assessment-report/page.tsx",import.meta.url),"utf8")
 const shell=readFileSync(new URL("../components/personal-tutor-shell.tsx",import.meta.url),"utf8")
 assert.match(route,/auth\.getUser\(\)/);assert.match(route,/\.eq\("user_id",auth\.user\.id\)/);assert.match(route,/private, no-store/);assert.doesNotMatch(route,/createAdminClient|service_role/)
 assert.match(page,/onAuthStateChange/);assert.match(page,/generation\.current/);assert.match(page,/window\.print\(\)/);assert.match(shell,/href="\/assessment-report"/)
})
