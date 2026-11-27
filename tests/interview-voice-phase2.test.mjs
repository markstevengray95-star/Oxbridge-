import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { buildLiveResumePrompt, detectVoiceBargeIn, interruptedLiveTurn, liveConversationInstructions, newVoiceBargeInState, updateLiveNoiseFloor } from "../lib/gemini/live-conversation-control.ts"

test("late model audio is suppressed until the interrupted generation completes", () => {
  let state = interruptedLiveTurn(false, { interrupted: true })
  assert.deepEqual(state, { discardOutput: true, suppressing: true })
  state = interruptedLiveTurn(state.suppressing, {})
  assert.equal(state.discardOutput, true)
  state = interruptedLiveTurn(state.suppressing, { turnComplete: true })
  assert.deepEqual(state, { discardOutput: true, suppressing: false })
  assert.deepEqual(interruptedLiveTurn(state.suppressing, {}), { discardOutput: false, suppressing: false })
  assert.deepEqual(interruptedLiveTurn(false, { interrupted: true, turnComplete: true }), { discardOutput: true, suppressing: false })
  assert.deepEqual(interruptedLiveTurn(true, { turnComplete: true }), { discardOutput: true, suppressing: false })
})

test("noise calibration is bounded, does not learn speech or playback, and allows quieter interruptions", () => {
  let floor = 0.015
  for (let i = 0; i < 100; i++) floor = updateLiveNoiseFloor(floor, 0.005, false)
  assert.ok(floor >= 0.005 && floor < 0.007)
  assert.equal(updateLiveNoiseFloor(floor, 0.2, false), floor)
  assert.equal(updateLiveNoiseFloor(floor, 0.04, true), floor)
  let state = newVoiceBargeInState()
  for (const nowMs of [0, 100, 200]) {
    const next = detectVoiceBargeIn(state, { rms: 0.06, nowMs, modelAudible: true, enabled: true, noiseFloor: floor })
    assert.equal(next.interrupt, false)
    state = next.state
  }
  assert.equal(detectVoiceBargeIn(state, { rms: 0.06, nowMs: 300, modelAudible: true, enabled: true, noiseFloor: floor }).interrupt, true)
  assert.equal(detectVoiceBargeIn(newVoiceBargeInState(), { rms: 0.06, nowMs: 300, modelAudible: true, enabled: true, noiseFloor: 0.035 }).state.voiceStartMs, null)
})

test("reconnection retains the original academic problem and the latest reasoning", () => {
  const turns = [{ role: "interviewer", text: "Original problem: derive the orbit relation." }, ...Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "interviewer" : "candidate", text: "Reasoning step " + i }))]
  const prompt = buildLiveResumePrompt("Physics", turns)
  assert.match(prompt, /Original interview opening/)
  assert.match(prompt, /derive the orbit relation/)
  assert.match(prompt, /Reasoning step 19/)
  assert.doesNotMatch(prompt, /Reasoning step 0\b/)
})

test("conversation instructions distinguish thinking, clarification, revision and substantive answers", () => {
  const prompt = liveConversationInstructions.join(" ")
  for (const phrase of ["time to think", "clarification request alone", "corrected claim", "do not guess", "never invent"]) assert.ok(prompt.includes(phrase))
  for (const path of ["lib/gemini/live-session.ts", "lib/gemini/live-session-secure.ts"]) assert.ok(readFileSync(path, "utf8").includes("...liveConversationInstructions"))
})

test("both live clients process student transcription before discarding interrupted model output", () => {
  for (const path of ["app/gemini-live-next/page.tsx", "components/gemini-live-interview-experience.tsx"]) {
    const source = readFileSync(path, "utf8")
    const gate = source.indexOf("const interruption = interruptedLiveTurn(")
    assert.ok(gate > source.indexOf("content.inputTranscription?.text"))
    assert.ok(source.indexOf("if (interruption.discardOutput)", gate) > gate)
    assert.ok(source.includes("modelTurnActiveRef.current"))
    assert.ok(source.includes("updateLiveNoiseFloor(noiseFloorRef.current"))
    assert.ok(source.includes("interimInputTranscription"))
  }
})
