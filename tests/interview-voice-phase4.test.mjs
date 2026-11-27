import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { liveSupportLevels, permittedLiveSupport, liveAdaptiveSupportInstructions, observedLiveSupport, buildLiveEngagementReport } from "../lib/gemini/live-adaptive-support.ts"

test("support ladder has five ordered stages with mode-specific caps", () => {
  assert.deepEqual(liveSupportLevels.map(item => item.level), [0,1,2,3,4])
  assert.equal(permittedLiveSupport("No-hint"), 0)
  assert.equal(permittedLiveSupport("Stress"), 1)
  assert.equal(permittedLiveSupport("Realistic"), 2)
  assert.equal(permittedLiveSupport("Tutor"), 4)
  assert.equal(permittedLiveSupport(undefined), 2)
})

test("adaptive support distinguishes thinking time and genuine attempts without inferring emotion", () => {
  for (const mode of ["No-hint", "Stress", "Realistic", "Tutor"]) {
    const prompt = liveAdaptiveSupportInstructions(mode).join(" ")
    assert.ok(prompt.includes("level " + permittedLiveSupport(mode)))
    assert.match(prompt, /Never infer emotions/)
    assert.match(prompt, /Do not give an unsolicited hint after a silence/)
    assert.match(prompt, /move up one level/)
    assert.match(prompt, /return to the original problem/)
    assert.match(prompt, /not an admissions prediction or automatic penalty/)
  }
})

test("only explicitly signalled interviewer hints are recognised", () => {
  assert.equal(observedLiveSupport("A small hint: consider the force."), 1)
  assert.equal(observedLiveSupport("B: Try a simpler example: use two particles."), 2)
  assert.equal(observedLiveSupport("One intermediate step: substitute the expression."), 3)
  assert.equal(observedLiveSupport("The underlying principle is: conservation of energy."), 4)
  assert.equal(observedLiveSupport("What does conservation mean?"), null)
  assert.equal(observedLiveSupport("I can give you a hint if you ask."), null)
})

test("transcript review separates requests, reasoning, revisions and actual hint cues", () => {
  const report = buildLiveEngagementReport([
    {role:"system",text:"A small hint: ignore this non-spoken event."},
    {role:"interviewer",text:"What happens to the force?"},
    {role:"candidate",text:"Could you repeat the question?"},
    {role:"interviewer",text:"What happens if distance doubles?"},
    {role:"candidate",text:"I'm not sure. Could you give me a hint?"},
    {role:"interviewer",text:"A small hint: consider the distance. What follows?"},
    {role:"candidate",text:"It decreases because the distance increases."},
    {role:"interviewer",text:"How much does it decrease?"},
    {role:"candidate",text:"I now think it is a quarter because of the inverse square law."},
  ],"No-hint")
  assert.equal(report.candidateTurns, 4)
  assert.equal(report.interviewerTurns, 4)
  assert.equal(report.clarificationRequests, 1)
  assert.equal(report.helpRequests, 1)
  assert.equal(report.explicitUncertaintyTurns, 1)
  assert.equal(report.revisionTurns, 1)
  assert.equal(report.reasoningLinks, 2)
  assert.equal(report.longestReasoningSequence, 2)
  assert.equal(report.followUpQuestionTurns, 3)
  assert.equal(report.supportEvents.length, 1)
  assert.equal(report.supportEvents[0].aboveModeCap, true)
  assert.ok(report.candidateEstimatedSeconds > 0)
})

test("missing transcripts do not invent speaking time or hints", () => {
  const report = buildLiveEngagementReport([{role:"system",text:"internal event"}], "Tutor")
  assert.equal(report.candidateEstimatedSeconds, null)
  assert.equal(report.interviewerEstimatedSeconds, null)
  assert.deepEqual(report.supportEvents, [])
})

test("both live paths apply the ladder and persist the evidence report", () => {
  for (const path of ["lib/gemini/live-session.ts","lib/gemini/live-session-secure.ts"]) {
    assert.ok(readFileSync(path,"utf8").includes("...liveAdaptiveSupportInstructions(mode)"))
  }
  for (const path of ["app/gemini-live-next/page.tsx","components/gemini-live-interview-experience.tsx"]) {
    const source = readFileSync(path,"utf8")
    assert.ok(source.includes("engagementReport: buildLiveEngagementReport"))
    assert.ok(source.includes("<LiveEngagementReview"))
    assert.ok(source.includes("permittedLiveSupport(mode)"))
  }
})
