import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {phase12QuestionBank} from "../lib/phase12-authored-bank.ts"
import {remainingExamSeconds,resumeExamDeadline,paperMarkBreakdown,retestPromptSignature,retestSectionKey,chooseFreshRetest} from "../lib/exam-session-quality.ts"
test("clock uses elapsed time, including suspended browser tabs",()=>{
 assert.equal(remainingExamSeconds(60000,0),60)
 assert.equal(remainingExamSeconds(60000,45900),15)
 assert.equal(remainingExamSeconds(60000,60001),0)
 assert.equal(remainingExamSeconds(NaN,0),0)
})
test("resume preserves real deadline without adding time",()=>{
 assert.equal(resumeExamDeadline({deadlineMs:60000,timeLeft:40,savedAt:20000},45000),60000)
 assert.equal(resumeExamDeadline({timeLeft:40,savedAt:20000},45000),60000)
 assert.equal(remainingExamSeconds(resumeExamDeadline({timeLeft:40,savedAt:20000},80000),80000),0)
 assert.equal(resumeExamDeadline({deadlineMs:60000,timeLeft:5,savedAt:20000},21000),26000)
})
test("raw marks and partial credit are separate from completion",()=>{
 const s=paperMarkBreakdown([{rawMark:1,maxMarks:1,answered:true,difficulty:"Hard"},{rawMark:1,maxMarks:2,answered:true,difficulty:"Hard"},{rawMark:0,maxMarks:1,answered:true,difficulty:"Medium"},{rawMark:0,maxMarks:2,answered:false,attempted:true},{rawMark:0,maxMarks:1,answered:false}])
 assert.equal(s.raw,2);assert.equal(s.max,7);assert.equal(s.accuracy,29);assert.equal(s.answeredAccuracy,50)
 assert.equal(s.fullyCorrect,1);assert.equal(s.partial,1);assert.equal(s.zero,1);assert.equal(s.incomplete,1);assert.equal(s.unanswered,1)
 assert.equal(s.byDifficulty.find(x=>x.label==="Hard").max,3)
})
test("missing or invalid marks do not generate a percentage",()=>{
 assert.equal(paperMarkBreakdown([]).accuracy,null)
 assert.equal(paperMarkBreakdown([{rawMark:2,maxMarks:1,answered:true}]).count,0)
 assert.equal(paperMarkBreakdown([{rawMark:0,maxMarks:1,answered:false}]).answeredAccuracy,null)
})
test("full-paper titles map to exact source sections",()=>{
 assert.equal(retestSectionKey("Paper 1 · Applications of Mathematical Knowledge"),"applications of mathematical knowledge")
 assert.equal(retestSectionKey("Section A · Argumentative Passages"),"argumentative passages")
 assert.notEqual(retestSectionKey("Mathematics 1"),retestSectionKey("Mathematics 2"))
})
const q=(id,section,prompt,test="ESAT")=>({id,section,prompt,test})
const pool=[q("a","Mathematics 1","Solve the equation x + 4 = 7"),q("b","Mathematics 1","Solve the equation x + 8 = 9"),q("c","Mathematics 1","Find the area of a circle"),q("d","Physics","Calculate the energy stored in a spring"),q("e","Mathematics 2","Prove the inequality"),q("f","Physics","State the direction of the resultant"),q("g","Physics","Solve the equation x + 2 = 5","TMUA")]
test("exclude seen IDs and number-only template variants",()=>{
 const seen=[{questionId:"a",prompt:pool[0].prompt}]
 assert.equal(retestPromptSignature(pool[0].prompt),retestPromptSignature(pool[1].prompt))
 assert.deepEqual(chooseFreshRetest(pool,"ESAT",["Mathematics 1"],seen).map(x=>x.id),["c"])
})
test("target sections are balanced, no unrelated fallback",()=>{
 assert.deepEqual(chooseFreshRetest(pool,"ESAT",["Mathematics 1","Physics"],[],3).map(x=>x.id),["a","d","c"])
 assert.deepEqual(chooseFreshRetest(pool,"ESAT",["Biology"],[]),[])
})
test("completed retests are excluded from next set",()=>{
 const first=chooseFreshRetest(pool,"ESAT",["Physics"],[],1)
 assert.deepEqual(chooseFreshRetest(pool,"ESAT",["Physics"],first.map(x=>({questionId:x.id,prompt:x.prompt}))).map(x=>x.id),["f"])
})
test("current full-paper result fields and retest records are integrated",()=>{
 const feedback=readFileSync(new URL("../lib/feedback-engine.ts",import.meta.url),"utf8")
 const page=readFileSync(new URL("../app/paper-intervention/page.tsx",import.meta.url),"utf8")
 const centre=readFileSync(new URL("../components/full-paper-centre.tsx",import.meta.url),"utf8")
 assert.match(feedback,/section\.maxMarks \?\? section\.questionCount/)
 assert.match(page,/chooseFreshRetest\(\[\.\.\.phase12QuestionBank, \.\.\.reliableFullPaperQuestionBank\]/)
 assert.match(page,/questionReview: retestOrdered\.map/)
 assert.match(centre,/remainingExamSeconds\(deadlineMs, Date\.now\(\)\)/)
 assert.match(centre,/if \(!canAnswer\(\) \|\| !question/)
 assert.match(centre,/paperMarkBreakdown\(/)
})

test("30 original reserve questions cover all five tests with valid answer keys",()=>{
 assert.equal(phase12QuestionBank.length,30)
 assert.equal(new Set(phase12QuestionBank.map(q=>q.id)).size,30)
 assert.equal(new Set(phase12QuestionBank.map(q=>q.test)).size,5)
 for(const q of phase12QuestionBank){assert.ok(q.answer>=0&&q.answer<q.options.length);assert.equal(new Set(q.options).size,q.options.length);assert.ok(q.explanation.length>20);assert.ok(q.topic)}
 assert.equal(phase12QuestionBank.find(q=>q.id==="phase12-authored-09").options[1],"1/3")
 assert.equal(phase12QuestionBank.find(q=>q.id==="phase12-authored-17").options[3],"64")
})
