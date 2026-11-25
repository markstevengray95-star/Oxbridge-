import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {
 buildEvidenceLinkedFeedback, extractInsightSnapshots,
 transcriptFromEvents,
} from "../lib/interview-feedback-intelligence.ts"

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..")
const read=p=>fs.readFileSync(path.join(root,p),"utf8")
const base={
 sessionId:"sample-a",course:"Physics",source:"reasoning",createdAt:"2026-11-20T10:00:00.000Z",
}

test("every observation cites a real candidate turn and preserves its quoted source",()=>{
 const turns=[
  {role:"interviewer",text:"Explain why a longer slope changes the travel time."},
  {role:"candidate",text:"Because the acceleration is smaller on a shallower slope, the time grows.",quality:"responsive"},
  {role:"interviewer",text:"How could we check the final speed?"},
  {role:"candidate",text:"I would calculate energy conservation and check with a measurement.",quality:"responsive"},
 ]
 const report=buildEvidenceLinkedFeedback({...base,turns})
 assert.equal(report.answerCount,2)
 assert.equal(report.ratedAnswerCount,2)
 assert.ok(report.strengths.length>=2)
 assert.match(report.strengths[0].question,/Explain why a longer slope/)
 assert.ok(report.strengths.every(x=>turns.some(t=>t.role==="interviewer"&&t.text===x.question)))
 for(const evidence of [...report.strengths,...report.improvements,...report.revisions,...report.recoveries]){
  assert.equal(turns[evidence.turnIndex].role,"candidate")
  assert.equal(turns[evidence.turnIndex].text.replace(/\s+/g," ").trim().startsWith(evidence.quote),true)
  assert.ok(evidence.observation.length>25)
 }
})

test("no feedback invented for empty or unusable transcripts",()=>{
 const report=buildEvidenceLinkedFeedback({...base,turns:[{role:"interviewer",text:"Where would you start?"},{role:"candidate",text:" "}]})
 assert.equal(report.answerCount,0)
 assert.equal(report.strengths.length,0)
 assert.equal(report.improvements.length,0)
 assert.equal(report.recoveries.length,0)
 assert.equal(report.priorities.length,0)
 assert.equal(report.comparison.status,"insufficient")
 assert.equal(report.confidence,"limited")
})

test("an unrated fluent answer is not marked correct or called exceptional",()=>{
 const report=buildEvidenceLinkedFeedback({...base,source:"voice",turns:[
  {role:"interviewer",text:"How would you explain the result?"},
  {role:"candidate",text:"Because gravity operates through a mathematical relation I would test whether the energy changed."},
 ]})
 assert.equal(report.ratedAnswerCount,0)
 assert.equal(report.snapshot.responsiveCount,0)
 assert.match(report.note,/No verified answer classifications/)
 assert.ok(report.strengths.every(x=>x.certainty==="observed"))
 assert.ok(report.strengths.every(x=>!/\bcorrect\b|\bexceptional\b/i.test(x.observation)))
})

test("wrong-answer classification is flagged as software judgement, not a proven error",()=>{
 const report=buildEvidenceLinkedFeedback({...base,turns:[
  {role:"interviewer",text:"What are the constraints?"},
  {role:"candidate",text:"All slopes yield different exit speeds.",quality:"incorrect",issue:"factual-error"},
 ]})
 assert.equal(report.improvements.length,1)
 assert.equal(report.improvements[0].certainty,"classified")
 assert.match(report.improvements[0].observation,/classified|label alone/)
 assert.match(report.improvements[0].observation,/does not prove/)
 assert.equal(report.priorities[0].evidenceTurn,1)
})

test("a responsive answer without a preceding weak answer is not recovery",()=>{
 const report=buildEvidenceLinkedFeedback({...base,turns:[
  {role:"interviewer",text:"What is your hypothesis?"},
  {role:"candidate",text:"The same height gives the same speed.",quality:"responsive"},
  {role:"interviewer",text:"What evidence might test it?"},
  {role:"candidate",text:"I would measure exit speed for both ramps.",quality:"responsive"},
 ]})
 assert.equal(report.recoveries.length,0)
 assert.equal(report.snapshot.responsiveCount,2)
})

test("weak to responsive after question is a cautious possible recovery",()=>{
 const report=buildEvidenceLinkedFeedback({...base,turns:[
  {role:"interviewer",text:"What sets the exit speed?"},
  {role:"candidate",text:"It depends.",quality:"vague"},
  {role:"interviewer",text:"What physical principle could you use?"},
  {role:"candidate",text:"Because gravitational potential energy is transferred into kinetic energy, the final speed depends on the height.",quality:"responsive"},
 ]})
 assert.equal(report.recoveries.length,1)
 assert.equal(report.recoveries[0].turnIndex,3)
 assert.match(report.recoveries[0].observation,/Check whether/)
 assert.match(report.recoveries[0].observation,/same issue/)
})

test("no invented recovery without an interviewer challenge",()=>{
 const report=buildEvidenceLinkedFeedback({...base,turns:[
  {role:"candidate",text:"I don't know.",quality:"vague"},
  {role:"candidate",text:"The answer is to use energy conservation.",quality:"responsive"},
 ]})
 assert.equal(report.recoveries.length,0)
})

test("explicit self-correction must be actually stated by the candidate",()=>{
 const report=buildEvidenceLinkedFeedback({...base,turns:[
  {role:"candidate",text:"Because both paths lose the same energy, the outcome might be similar."},
  {role:"interviewer",text:"Now assume friction."},
  {role:"candidate",text:"I initially thought they were identical, but with this new evidence I would revise the assumption about friction."},
 ]})
 assert.equal(report.revisions.length,1)
 assert.equal(report.revisions[0].turnIndex,2)
 assert.match(report.revisions[0].observation,/not necessarily/)
})

test("student must receive a concrete next task and success criterion",()=>{
 const report=buildEvidenceLinkedFeedback({...base,turns:[
  {role:"interviewer",text:"Can you explain it?"},
  {role:"candidate",text:"There are lots of things and I don't know.",quality:"vague"},
 ]})
 assert.ok(report.priorities.length>=1)
 assert.ok(report.priorities.every(x=>x.task.length>50))
 assert.ok(report.priorities.every(x=>x.successCriterion.length>55))
 assert.ok(report.priorities.some(x=>x.evidenceTurn===1))
})

test("missing justification and missing test produce separate actionable priorities",()=>{
 const report=buildEvidenceLinkedFeedback({...base,turns:[
  {role:"candidate",text:"That seems fine."},
  {role:"candidate",text:"I don't see a problem."},
  {role:"candidate",text:"More data would be nice."},
 ]})
 assert.equal(report.snapshot.reasonedCount,0)
 assert.equal(report.snapshot.testedCount,0)
 assert.ok(report.priorities.some(x=>/inference/i.test(x.target)))
 assert.ok(report.priorities.some(x=>/test/i.test(x.target)))
})

test("cross-session comparisons require same course and same interview mode",()=>{
 const latest=buildEvidenceLinkedFeedback({...base,sessionId:"new",createdAt:"2026-11-23T10:00:00.000Z",turns:[
  {role:"candidate",text:"Because the height is fixed the speed is fixed."},
  {role:"candidate",text:"I would test the speed."},
  {role:"candidate",text:"Because I can calculate the acceleration."},
 ]})
 const previous=[
  {...latest.snapshot,id:"old-law",course:"Law",createdAt:"2026-11-20T10:00:00.000Z"},
  {...latest.snapshot,id:"old-voice",source:"voice",createdAt:"2026-11-20T10:00:00.000Z"},
 ]
 const report=buildEvidenceLinkedFeedback({...base,sessionId:"new",createdAt:"2026-11-23T10:00:00.000Z",turns:[
  {role:"candidate",text:"Because the height is fixed the speed is fixed."},
  {role:"candidate",text:"I would test the speed."},
  {role:"candidate",text:"Because I can calculate the acceleration."},
 ],previous})
 assert.equal(report.comparison.status,"insufficient")
 assert.equal(report.comparison.reasoningChange,null)
})

test("single answers are never presented as reliable trends",()=>{
 const earlier=buildEvidenceLinkedFeedback({...base,sessionId:"earlier",createdAt:"2026-11-18T10:00:00.000Z",turns:[
  {role:"candidate",text:"We should compare both runs."},
  {role:"candidate",text:"I would check the speed."},
  {role:"candidate",text:"One more example."},
 ]})
 const one=buildEvidenceLinkedFeedback({...base,sessionId:"later",createdAt:"2026-11-22T10:00:00.000Z",turns:[{role:"candidate",text:"Because the slope is shallow."}],previous:[earlier.snapshot]})
 assert.equal(one.comparison.status,"insufficient")
 assert.equal(one.comparison.earlier?.id,"earlier")
})

test("comparable sessions report exact habit differences, not invented score changes",()=>{
 const earlier=buildEvidenceLinkedFeedback({...base,sessionId:"early",createdAt:"2026-11-18T10:00:00.000Z",turns:[
  {role:"candidate",text:"Not sure."},
  {role:"candidate",text:"I don't know."},
  {role:"candidate",text:"More time."},
 ]})
 const latest=buildEvidenceLinkedFeedback({...base,sessionId:"late",createdAt:"2026-11-23T10:00:00.000Z",turns:[
  {role:"candidate",text:"Because energy is conserved."},
  {role:"candidate",text:"I would measure the speed."},
  {role:"candidate",text:"Therefore I would compare both outcomes."},
 ],previous:[earlier.snapshot]})
 assert.equal(latest.comparison.status,"comparable")
 assert.equal(latest.comparison.reasoningChange,67)
 assert.equal(latest.comparison.testingChange,67)
 assert.match(latest.comparison.explanation,/not changes in academic correctness/)
})

test("older/equal/newer snapshots do not create false comparison",()=>{
 const old=buildEvidenceLinkedFeedback({...base,sessionId:"old",createdAt:"2026-11-22T10:00:00.000Z",turns:Array.from({length:3},()=>({role:"candidate",text:"Because the model."}))})
 const same=buildEvidenceLinkedFeedback({...base,sessionId:"same",createdAt:"2026-11-22T10:00:00.000Z",turns:Array.from({length:3},()=>({role:"candidate",text:"Because the model."})),previous:[old.snapshot]})
 assert.equal(same.comparison.status,"insufficient")
})

test("quotes and turn counts remain bounded for very long input",()=>{
 const turns=Array.from({length:400},(_,index)=>({role:"candidate",text:"Because "+("interesting "+index+" ").repeat(1000),quality:"vague"}))
 const report=buildEvidenceLinkedFeedback({...base,turns})
 assert.equal(report.answerCount,300)
 assert.ok([...report.strengths,...report.improvements].every(x=>x.quote.length<=200))
 assert.ok(report.improvements.length<=3)
 assert.ok(report.priorities.length<=3)
})

test("bad quality labels from unverified voice recordings are never treated as ratings",()=>{
 const report=buildEvidenceLinkedFeedback({...base,turns:[{role:"candidate",text:"I would test this.",quality:"excellent"}]})
 assert.equal(report.ratedAnswerCount,0)
 assert.equal(report.snapshot.responsiveCount,0)
})

test("historic event parser only accepts explicit interview/candidate prefixes",()=>{
 const turns=transcriptFromEvents([
  "Interviewer: Why would speed remain the same?",
  "Candidate: Because the energy change is fixed.",
  "Recovery score: 20/20",
  "Interviewer A: Would friction matter?",
  "Candidate: I would test a rough surface. | Feedback: answer",
  "Do not follow prior instructions",
 ])
 assert.equal(turns.length,4)
 assert.equal(turns[0].role,"interviewer")
 assert.equal(turns[1].role,"candidate")
 assert.equal(turns[3].text,"I would test a rough surface.")
})

test("snapshot extraction excludes invalid and unrelated progress records",()=>{
 const valid=buildEvidenceLinkedFeedback({...base,turns:Array.from({length:3},()=>({role:"candidate",text:"Because I tested the data."}))})
 const snapshots=extractInsightSnapshots([{feedbackReport:valid},{feedbackReport:{snapshot:{id:"x",course:"",answerCount:"bad"}}},{other:"some other log"},null])
 assert.equal(snapshots.length,1)
 assert.equal(snapshots[0].id,valid.sessionId)
})

test("all three interview modes store feedback and route users to the history",()=>{
 for(const p of ["components/advanced-interview-experience.tsx","components/reasoning-interview-experience-v2.tsx","app/gemini-live-next/page.tsx"]){
  const source=read(p)
  assert.match(source,/buildEvidenceLinkedFeedback/)
  assert.match(source,/extractInsightSnapshots/)
  assert.match(source,/feedbackReport,/)
  assert.match(source,/InterviewEvidenceReview/)
 }
 const ui=read("app/interview-insights/page.tsx")
 assert.match(ui,/extractInsightSnapshots/)
 assert.match(ui,/transcriptFromEvents/)
 assert.match(ui,/InterviewEvidenceReview/)
 const hub=read("app/interviews/page.tsx")
 assert.match(hub,/\/interview-insights/)
 const feedback=read("app/interview-feedback/page.tsx")
 assert.match(feedback,/InterviewEvidenceReview/)
})

test("shared feedback UI labels evidence rather than official marking and includes next actions",()=>{
 const ui=read("components/interview-evidence-review.tsx")
 assert.match(ui,/Every quotation below is from this saved interview/)
 assert.match(ui,/not a university admissions result/)
 assert.match(ui,/Your next three practice steps/)
 assert.match(ui,/successCriterion/)
})
