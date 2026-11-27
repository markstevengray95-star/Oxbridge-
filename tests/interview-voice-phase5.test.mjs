import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { subjectInterviewPathway, subjectPathwayList } from "../lib/subject-interview-pathways.ts"
import { liveAcademicFollowUpInstructions, buildLiveFollowUpReview } from "../lib/gemini/live-academic-followups.ts"

test("every existing academic pathway has all ten live questioning strategies", () => {
  assert.equal(subjectPathwayList().length,17)
  for (const pathway of subjectPathwayList()) {
    const prompt = liveAcademicFollowUpInstructions(pathway).join("\n")
    assert.ok(prompt.includes(pathway.label))
    for (const strategy of ["clarify","justify","verify","revision","assumption","prediction","alternative","stress-test","transfer","synthesis"]) assert.ok(prompt.includes(strategy+": "))
    assert.doesNotMatch(prompt,/\{\{claim\}\}/)
    assert.ok(!prompt.includes(pathway.opening.reasoningGuide))
  }
})

test("course-specific prompts distinguish physics from history and medicine", () => {
  const physics = liveAcademicFollowUpInstructions(subjectInterviewPathway("Physics","physical")).join(" ")
  const history = liveAcademicFollowUpInstructions(subjectInterviewPathway("History","humanities")).join(" ")
  const medicine = liveAcademicFollowUpInstructions(subjectInterviewPathway("Medicine","life")).join(" ")
  assert.match(physics,/dimensional analysis/)
  assert.match(history,/interpretative judgement/)
  assert.match(medicine,/Medicine/)
  assert.notEqual(physics,history)
  assert.notEqual(physics,medicine)
})

test("academic follow-ups prioritise unresolved reasoning and avoid invented misconceptions", () => {
  const prompt = liveAcademicFollowUpInstructions(subjectInterviewPathway("Mathematics")).join(" ")
  assert.match(prompt,/An unresolved claim takes priority/)
  assert.match(prompt,/Do not manufacture a misconception/)
  assert.match(prompt,/one spoken question at a time/)
  assert.match(prompt,/Respect the support cap/)
})

test("review identifies visible links and distinguishes question types without marks", () => {
  const report=buildLiveFollowUpReview([
    {role:"interviewer",text:"What changes when the slope is longer?"},
    {role:"candidate",text:"Acceleration decreases while the final velocity stays the same."},
    {role:"interviewer",text:"How would you verify the acceleration and final velocity?"},
    {role:"candidate",text:"I can calculate both."},
    {role:"interviewer",text:"What if the surface friction changes?"},
  ])
  assert.equal(report.followUps,2)
  assert.equal(report.visibleTermLinks,1)
  assert.equal(report.moves.verification,1)
  assert.equal(report.moves.assumption,1)
  assert.equal(report.possibleRepeats,0)
})

test("repetitions are flagged unless the student requests a repeat", () => {
  const q="How would you check the acceleration and final velocity?"
  const report=buildLiveFollowUpReview([
    {role:"interviewer",text:q},
    {role:"candidate",text:"Could you repeat that?"},
    {role:"interviewer",text:q},
    {role:"candidate",text:"I would use the equations of motion."},
    {role:"interviewer",text:q},
  ])
  assert.equal(report.followUps,2)
  assert.equal(report.possibleRepeats,1)
  assert.equal(report.observations[0].possibleRepeat,false)
  assert.equal(report.observations[1].possibleRepeat,true)
})

test("missing responses and non-question remarks do not manufacture follow-ups", () => {
  const report=buildLiveFollowUpReview([{role:"interviewer",text:"What is your argument?"},{role:"system",text:"internal event"},{role:"interviewer",text:"Why?"},{role:"candidate",text:"A claim."},{role:"interviewer",text:"Thank you."}])
  assert.equal(report.followUps,0)
  assert.equal(report.visibleTermLinks,0)
  assert.deepEqual(report.observations,[])
})

test("both live routes apply subject-specific policy and persist the review", () => {
  for (const path of ["lib/gemini/live-session.ts","lib/gemini/live-session-secure.ts"]) assert.ok(readFileSync(path,"utf8").includes("liveAcademicFollowUpInstructions(subjectInterviewPathway(course, track))"))
  for (const path of ["app/gemini-live-next/page.tsx","components/gemini-live-interview-experience.tsx"]) {
    const source=readFileSync(path,"utf8")
    assert.ok(source.includes("followUpReview: buildLiveFollowUpReview"))
    assert.ok(source.includes("<LiveAcademicFollowUpReview"))
  }
})
