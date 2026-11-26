import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {admissionsTests,practiceOptions,centreDestination,selectedTest,validAdmissionsTest,nextUnansweredIndex,safeRecentPapers} from "../lib/admissions-centre.ts"

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8")

test("five existing test choices each have four distinct modes",()=>{
 assert.deepEqual(admissionsTests,["TMUA","ESAT","TARA","LNAT","UCAT"])
 assert.deepEqual(practiceOptions.map(p=>p.id),["mock","topic","adaptive","review"])
 assert.ok(practiceOptions.every(m=>m.title&&m.description&&m.duration))
})
test("all tests route to existing engines with test preserved",()=>{
 const routes={mock:"/full-papers",topic:"/admissions-challenges",adaptive:"/adaptive-paper",review:"/paper-intervention"}
 for(const mode of practiceOptions)for(const testName of admissionsTests){
  const value=centreDestination(mode.id,testName)
  const url=new URL(value,"https://example.invalid")
  assert.equal(url.pathname,routes[mode.id])
  assert.equal(url.searchParams.get("test"),testName)
  assert.equal(selectedTest(url.search),testName)
 }
})
test("unrecognised tests and injection attempts are ignored",()=>{
 for(const value of [null,"","SATS","ESAT/../admin","TMUA?next=/admin","<script>","ucat","UCAT%0A"])assert.equal(validAdmissionsTest(value),null)
 assert.equal(selectedTest("?test=UCAT&test=TMUA"),"UCAT")
 assert.equal(selectedTest("?test=https://example.com"),null)
})
test("next unanswered cycles forward without selecting the current question",()=>{
 assert.equal(nextUnansweredIndex([true,false,true,false],0),1)
 assert.equal(nextUnansweredIndex([true,false,true,false],1),3)
 assert.equal(nextUnansweredIndex([false,true,true,true],3),0)
 assert.equal(nextUnansweredIndex([true,true,true],2),null)
 assert.equal(nextUnansweredIndex([true,false,true],1),null)
 assert.equal(nextUnansweredIndex([],0),null)
 assert.equal(nextUnansweredIndex([false,true],99),null)
})
test("recent paper summaries reject invalid marks and duplicates",()=>{
 const recent=safeRecentPapers([{id:"1",test:"ESAT",title:"Form 1",completed_at:"2026-11-25T08:00:00Z",raw_score:8,max_raw_marks:12},{id:"1",test:"ESAT",title:"Duplicate",raw_score:12,max_raw_marks:12},{id:"2",test:"TMUA",raw_score:24,max_raw_marks:20},{id:"3",test:"unknown",raw_score:0,max_raw_marks:10}])
 assert.equal(recent.length,2)
 assert.deepEqual({score:recent[0].score,maxMarks:recent[0].maxMarks},{score:8,maxMarks:12})
 assert.equal(recent[1].score,null)
 assert.equal(recent[1].title,"TMUA practice paper")
})
test("recent result size is limited and malformed input is safe",()=>{
 const input=Array.from({length:25},(_,i)=>({id:"id-"+i,test:"LNAT",title:"T".repeat(400),raw_score:0,max_raw_marks:10}))
 assert.equal(safeRecentPapers(input).length,5)
 assert.equal(safeRecentPapers(input)[0].title.length,120)
 assert.deepEqual(safeRecentPapers({}),[])
})
test("primary test navigation uses one centre, not duplicated tool catalogue",()=>{
 const source=read("app/study/[area]/page.tsx")
 assert.match(source,/if\(section.id==="tests"\)return <AdmissionsTestCentre\/>/)
 const screen=read("components/admissions-test-centre.tsx")
 assert.match(screen,/practiceOptions\.map/)
 assert.match(screen,/admissionsTests\.map/)
 assert.match(screen,/centreDestination\(mode,test\)/)
 assert.match(screen,/<details/)
 assert.match(screen,/Recent test results/)
})
test("all entry routes honour safe chosen test without rewriting existing banks",()=>{
 for(const path of ["components/full-paper-centre.tsx","app/advanced-practice/page.tsx","app/adaptive-paper/page.tsx","app/admissions-challenges/page.tsx","app/paper-intervention/page.tsx"]){
  const source=read(path)
  assert.match(source,/selectedTest\(window.location.search\)/)
 }
})
test("retest uses the chosen test and shows an honest missing-paper state",()=>{
 const source=read("app/paper-intervention/page.tsx")
 assert.match(source,/\.find\(p=>!requestedTest\|\|p\.test===requestedTest\)/)
 assert.match(source,/No saved \$\{requestedTest\} mock found/)
 assert.match(source,/if \(!loaded\)/)
 assert.match(source,/chooseFreshRetest/)
})
test("full paper retains timed sections, autosave, flags and marking",()=>{
 const source=read("components/full-paper-centre.tsx")
 for(const marker of ["remainingExamSeconds","resumeExamDeadline","DRAFT_KEY","toggleFlag","finishSection(false)","paperMarkBreakdown","isYesNoStatementQuestion","questionRawMark","setStatementResponse"])assert.ok(source.includes(marker),marker)
 assert.match(source,/Next unanswered/)
 assert.match(source,/nextUnansweredIndex/)
 assert.match(source,/role="timer"/)
 assert.match(source,/aria-pressed/)
 assert.match(source,/Question-by-question review/)
 assert.match(source,/Return to Test Centre/)
})
test("recent paper API authenticates and scopes queries by account",()=>{
 const api=read("app/api/admissions-centre/route.ts")
 assert.match(api,/auth\.getUser\(\)/)
 assert.match(api,/\.eq\("user_id",auth\.user\.id\)/)
 assert.match(api,/\.limit\(5\)/)
 assert.match(api,/private, no-store/)
 assert.doesNotMatch(api,/createAdminClient/)
})
