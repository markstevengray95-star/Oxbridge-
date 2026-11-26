import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {buildProgressRecords,progressTotals} from "../lib/progress-hub.ts"
const interview={id:"cloud-int-1",source_ref:"old-int-1",summary:"Reasoning in mechanics",course:"Physics",created_at:"2026-11-24T12:00:00Z",interview_turns:[{turn_index:1,role:"candidate",content:"I would compare the moments.",feedback:"Explain the pivot."},{turn_index:0,role:"interviewer",content:"How would you balance this beam?"}]}
const paper={id:"cloud-test-1",source_ref:"device-paper-1",test:"ESAT",title:"ESAT mock",completed_at:"2026-11-23T12:00:00Z",raw_score:9,max_raw_marks:20,payload:{questionReview:[{prompt:"What is the force?",answer:["3 N","4 N"],correctAnswer:"4 N",rawMark:0,maxMarks:1}]}}
const progress={logs:[{id:"old-int-1",title:"Interview Room · Physics",events:["Interviewer: How would you balance this beam?"]},{id:"new-local-1",title:"Reasoning Interview · Physics",date:"2026-11-25T12:00:00Z",events:["Interviewer: Explain your argument.","Candidate: My assumption is..."]}],fullPaperResults:[{id:"device-paper-1",title:"ESAT mock",questionReview:[]},{id:"older-paper",test:"TMUA",date:"2026-11-22T12:00:00Z",rawScore:5,maxRawMarks:10,questionReview:[{prompt:"Solve x",answer:"3",correctAnswer:"3",rawMark:1,maxMarks:1}]}],essayAnalyses:[{id:"essay-1",test:"LNAT",prompt:"Should public transport be free?",date:"2026-11-26T00:00:00Z",essay:"It could be free but requires funding.",report:{summary:"The argument needs a clearer counterargument.",priorities:[{title:"Improve evaluation",action:"Develop the funding objection."}]}}]}
test("cloud and synced-device records are deduplicated by source refs",()=>{
 const rows=buildProgressRecords([interview],[paper],progress)
 assert.equal(rows.length,5)
 assert.equal(rows.filter(r=>r.kind==="interview").length,2)
 assert.equal(rows.filter(r=>r.kind==="test").length,2)
})
test("events and exam questions remain accessible without inventing a common ability grade",()=>{
 const rows=buildProgressRecords([interview],[paper],progress)
 const i=rows.find(r=>r.id==="interview:cloud-int-1")
 assert.equal(i?.transcript[0].speaker,"Interviewer")
 assert.equal(i?.transcript[1].speaker,"You")
 assert.equal(i?.score,null)
 const t=rows.find(r=>r.id==="test:cloud-test-1")
 assert.deepEqual(t?.score,{raw:9,max:20})
 assert.equal(t?.questions[0].answer,"3 N; 4 N")
})
test("writing excerpts, feedback and chronological order are preserved",()=>{
 const rows=buildProgressRecords([interview],[paper],progress)
 assert.equal(rows[0].kind,"writing")
 assert.match(rows[0].summary,/funding/i)
 assert.match(rows[0].original??"",/requires funding/)
 assert.ok(rows[0].feedback.some(x=>/funding objection/.test(x)))
})
test("unavailable record sources do not display fabricated zero counts",()=>{
 const rows=buildProgressRecords([interview],[paper],progress)
 assert.equal(progressTotals(rows,{interviews:false,tests:true,writing:false}).interviews,null)
 assert.equal(progressTotals(rows,{interviews:false,tests:true,writing:false}).writing,null)
 assert.equal(progressTotals(rows,{interviews:false,tests:true,writing:false}).tests,2)
})
test("invalid score is not shown as a meaningful mark",()=>{
 const result=buildProgressRecords([],[{...paper,id:"bad",source_ref:"",raw_score:40,max_raw_marks:20}],{})
 assert.equal(result[0].score,null)
})
test("limits bound long text and deep question arrays without silent full-record claims",()=>{
 const many=Array.from({length:130},(_,i)=>({prompt:"Q"+i,answer:"a"}))
 const rows=buildProgressRecords([],[{...paper,payload:{questionReview:many}}],{essayAnalyses:[{id:"very-long",essay:"x".repeat(12000)}]})
 assert.equal(rows.find(r=>r.kind==="test")?.questions.length,120)
 assert.equal(rows.find(r=>r.kind==="test")?.truncated,true)
 assert.equal(rows.find(r=>r.kind==="writing")?.original?.length,10000)
 assert.equal(rows.find(r=>r.kind==="writing")?.originalTruncated,true)
})
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8")
test("overview API authenticates and independently owner-scopes all three data sources",()=>{
 const s=read("app/api/progress-hub/route.ts")
 assert.match(s,/auth.getUser\(\)/)
 assert.equal((s.match(/\.eq\("user_id",userId\)/g)||[]).length,3)
 assert.match(s,/private, no-store/)
 assert.doesNotMatch(s,/createAdminClient/)
})
test("client resets on account switch and drops stale responses",()=>{
 const s=read("components/student-progress-hub.tsx")
 assert.match(s,/onAuthStateChange/)
 assert.match(s,/currentUser!==user/)
 assert.match(s,/generation!==token/)
 assert.match(s,/abort\?\.abort\(\)/)
 assert.doesNotMatch(s,/localStorage/)
})
test("primary Progress navigation mounts unified records rather than a second tool catalogue",()=>{
 const s=read("app/study/[area]/page.tsx")
 assert.match(s,/if\(section.id==="progress"\)return <StudentProgressHub\/>/)
 assert.match(read("components/student-progress-hub.tsx"),/Original writing excerpt/)
 assert.match(read("components/student-progress-hub.tsx"),/Question-by-question responses/)
 assert.match(read("components/student-progress-hub.tsx"),/Interview transcript/)
})
