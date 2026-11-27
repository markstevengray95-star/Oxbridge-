import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {buildAdvancedVoiceReview} from "../lib/gemini/advanced-voice-review.ts"
import {buildEvidenceLinkedFeedback} from "../lib/interview-feedback-intelligence.ts"
const turns=[
 {role:"interviewer",text:"What happens to acceleration?"},
 {role:"candidate",text:"Acceleration falls because the force decreases."},
 {role:"interviewer",text:"A small hint: consider the mass as well."},
 {role:"candidate",text:"I now think the assumption is constant mass. I would check the force."},
 {role:"interviewer",text:"What if the mass changes?"},
 {role:"candidate",text:"Could also use another explanation."}
]
const feedback=(input=turns)=>buildEvidenceLinkedFeedback({sessionId:"test",course:"Physics",source:"voice",turns:input,createdAt:"2026-11-27T10:00:00Z"})
test("review has all seven academic dimensions and does not award knowledge or independence marks",()=>{
 const result=buildAdvancedVoiceReview("Physics",turns,feedback())
 assert.equal(result.dimensions.length,7)
 assert.equal(result.responseCount,3)
 assert.equal(result.dimensions.find(d=>d.key==="knowledge").status,"Review required")
 assert.equal(result.dimensions.find(d=>d.key==="knowledge").count,null)
 assert.equal(result.dimensions.find(d=>d.key==="independence").status,"Not established")
})
test("annotations retain original turn number, excerpt, question and explicit support",()=>{
 const result=buildAdvancedVoiceReview("Physics",turns,feedback())
 assert.equal(result.annotations[0].turn,2)
 assert.equal(result.annotations[0].excerpt,turns[1].text)
 assert.equal(result.annotations[0].question,turns[0].text)
 assert.equal(result.annotations[0].priorHint,null)
 assert.equal(result.annotations[1].priorHint,1)
 assert.ok(result.annotations[1].signals.includes("adaptability"))
 assert.equal(result.annotations[2].priorHint,null)
})
test("three specific practice targets include success criteria",()=>{
 const result=buildAdvancedVoiceReview("Physics",turns,feedback())
 assert.equal(result.targets.length,3)
 assert.equal(new Set(result.targets.map(t=>t.title)).size,3)
 assert.ok(result.targets.every(t=>t.task&&t.criterion))
})
test("empty transcripts never imply observed ability or generate evidence-linked targets",()=>{
 const result=buildAdvancedVoiceReview("Physics",[],feedback([]))
 assert.equal(result.responseCount,0)
 assert.equal(result.annotations.length,0)
 assert.equal(result.targets.length,0)
 assert.ok(result.dimensions.every(d=>d.status!=="Observed signal"))
})
test("both live routes display and persist advanced review",()=>{
 for(const path of ["app/gemini-live-next/page.tsx","components/gemini-live-interview-experience.tsx"]){
  const src=readFileSync(path,"utf8")
  assert.match(src,/AdvancedVoiceInterviewReview/)
  assert.match(src,/advancedVoiceReview:\s*buildAdvancedVoiceReview/)
  assert.match(src,/extractInsightSnapshots\(logs.filter/)
 }
})
test("optional cloud review cannot delay initial local saving",()=>{
 const src=readFileSync("components/gemini-live-interview-experience.tsx","utf8")
 const finish=src.slice(src.indexOf("async function finishInterview"),src.indexOf("function reset()",src.indexOf("async function finishInterview")))
 assert.ok(finish.indexOf("localStorage.setItem")>=0)
 assert.ok(finish.indexOf("localStorage.setItem")<finish.indexOf('fetch("/api/interview-feedback"'))
 assert.match(finish,/reviewGeneration!==reviewGenerationRef.current/)
})
