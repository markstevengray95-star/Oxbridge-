import test from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { inputSchema, reportSchema, validateReport, RUBRICS } from "../lib/writing/review.ts"

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..")
const run=(args,env)=>spawnSync(process.execPath,["scripts/phase10-release-gate.mjs",...args],{
 cwd:root,env:{...process.env,...env},encoding:"utf8",timeout:25000,
})

test("release gate validates patched lockfile and teacher access policies",()=>{
 const result=run([],{})
 assert.equal(result.status,0,result.stdout+"\n"+result.stderr)
 assert.match(result.stdout,/FELLOW RELEASE GATE PASSED/)
 assert.match(result.stdout,/Patched Zod/)
 assert.match(result.stdout,/Student activity table is private/)
 assert.match(result.stdout,/Detailed teacher reads are scoped and audited/)
})

test("production settings fail closed and never print missing secret values",()=>{
 const result=run(["--strict-env"],{
 NEXT_PUBLIC_SUPABASE_URL:"",GEMINI_API_KEY:"sensitive-never-echo-2026",
 NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS:"",E2E_TEST_MODE:"1",
 })
 assert.equal(result.status,1)
 assert.match(result.stdout,/FELLOW RELEASE GATE BLOCKED/)
 assert.match(result.stdout,/Production configuration: NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS/)
 assert.match(result.stdout,/No test login bypass enabled/)
 assert.doesNotMatch(result.stdout,/sensitive-never-echo-2026/)
})

test("live smoke is opt-in, not an external request in CI by default",()=>{
 const source=readFileSync(resolve(root,"scripts/phase10-release-gate.mjs"),"utf8")
 assert.match(source,/--live-url=/)
 assert.match(source,/if\(liveArg\)await smoke/)
 assert.match(source,/Anonymous school-detail API locked/)
})

test("Zod 4 continues to accept valid writing input and reject oversized or invalid modes",()=>{
 assert.equal(inputSchema.safeParse({mode:"essay",test:"TMUA",course:"Physics",essay:"We can test the hypothesis against independent evidence and compare the outcomes."}).success,true)
 assert.equal(inputSchema.safeParse({mode:"wrong",essay:"a".repeat(60)}).success,false)
 assert.equal(inputSchema.safeParse({mode:"essay",essay:"a".repeat(25000)}).success,false)
})

test("Zod 4 keeps exact quotations and six-criterion essay report intact",()=>{
 const source="Because the data support this inference, the conclusion follows."
 const evidence={paragraph:0,quote:"Because the data"}
 const report={
  summary:"A clear argument with a checkable explanation.",
  criteria:RUBRICS.essay.map(label=>({label,level:2,judgement:"The conclusion has a supporting claim.",evidence,action:"Test an alternative."})),
  paragraphs:[{index:0,purpose:"Explain",strength:"Provides a reason",limitation:"No counterexample",action:"Propose a test"}],
  annotations:[{evidence,kind:"reasoning",explanation:"Uses an explicit link",revision:"Add a falsification check."}],
  priorities:[{title:"Clarify principle",evidence,why:"Missing assumptions",action:"Specify constraints",successCheck:"Test predictions"}],
  questions:[{evidence,question:"What would falsify the conclusion?",purpose:"Probe assumptions"}],
  limitations:["Academic correctness is not independently verified."],
 }
 assert.equal(reportSchema.safeParse(report).success,true)
 assert.equal(validateReport(report,source,"essay").criteria.length,6)
 const fabricated={...report,annotations:[{...report.annotations[0],evidence:{paragraph:0,quote:"Invented source claim"}}]}
 assert.throws(()=>validateReport(fabricated,source,"essay"))
})
