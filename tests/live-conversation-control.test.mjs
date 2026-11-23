import assert from "node:assert/strict"
import test from "node:test"
import {
  buildLiveResumePrompt,
  canSendLiveAudio,
  detectVoiceBargeIn,
  liveAudioRms,
  liveSocketErrorMessage,
  liveSpeechDetection,
  mergeLiveTranscription,
  newVoiceBargeInState,
} from "../lib/gemini/live-conversation-control.ts"

test("thoughtful turn detection gives reasoning more breathing room", () => {
  const quick = liveSpeechDetection("quick")
  const balanced = liveSpeechDetection("balanced")
  const thoughtful = liveSpeechDetection("thoughtful")
  assert.ok(thoughtful.silenceDurationMs > balanced.silenceDurationMs)
  assert.ok(balanced.silenceDurationMs > quick.silenceDurationMs)
  assert.ok(thoughtful.silenceDurationMs >= 2400)
  assert.equal(thoughtful.disabled, false)
})

test("transcripts retain cumulative updates without repeating whole sentences", () => {
  let text = mergeLiveTranscription("", "I think")
  text = mergeLiveTranscription(text, "I think gravity")
  text = mergeLiveTranscription(text, "I think gravity decreases.")
  assert.equal(text, "I think gravity decreases.")
  assert.equal(mergeLiveTranscription(text, "decreases."), "I think gravity decreases.")
})

test("incremental overlapping fragments merge with usable spacing", () => {
  let text = mergeLiveTranscription("The ball moves because", "because the force changes")
  text = mergeLiveTranscription(text, "and the acceleration changes.")
  assert.equal(text, "The ball moves because the force changes and the acceleration changes.")
})

test("an interruption needs sustained real speech while model audio is present", () => {
  let state = newVoiceBargeInState()
  for (const at of [0, 90, 180]) {
    const result = detectVoiceBargeIn(state, { rms: 0.12, nowMs: at, modelAudible: true, enabled: true })
    assert.equal(result.interrupt, false)
    state = result.state
  }
  const sustained = detectVoiceBargeIn(state, { rms: 0.12, nowMs: 300, modelAudible: true, enabled: true })
  assert.equal(sustained.interrupt, true)
  const repeated = detectVoiceBargeIn(sustained.state, { rms: 0.15, nowMs: 420, modelAudible: true, enabled: true })
  assert.equal(repeated.interrupt, false)
  const reset = detectVoiceBargeIn(repeated.state, { rms: 0, nowMs: 500, modelAudible: false, enabled: true })
  assert.equal(reset.state.triggered, false)
})

test("noise spikes and muted interruption detection cannot stop the interviewer", () => {
  let state = newVoiceBargeInState()
  state = detectVoiceBargeIn(state, { rms: 0.16, nowMs: 100, modelAudible: true, enabled: true }).state
  const quiet = detectVoiceBargeIn(state, { rms: 0.012, nowMs: 300, modelAudible: true, enabled: true })
  assert.equal(quiet.interrupt, false)
  assert.equal(quiet.state.voiceStartMs, null)
  const disabled = detectVoiceBargeIn(state, { rms: 0.5, nowMs: 1000, modelAudible: true, enabled: false })
  assert.equal(disabled.interrupt, false)
  assert.equal(disabled.state.triggered, false)
  assert.ok(liveAudioRms(new Float32Array([0.1,-0.1])) > 0.09)
  assert.equal(liveAudioRms(new Float32Array([])), 0)
})

test("backpressure bounds the microphone WebSocket send queue", () => {
  assert.equal(canSendLiveAudio(1, 0, false), true)
  assert.equal(canSendLiveAudio(1, 524287, false), true)
  assert.equal(canSendLiveAudio(1, 524288, false), false)
  assert.equal(canSendLiveAudio(0, 0, false), false)
  assert.equal(canSendLiveAudio(1, 0, true), false)
})

test("a resumable interview uses recent transcript evidence, not a new first question", () => {
  const prompt = buildLiveResumePrompt("Physics", [
    { role: "interviewer", text: "How would a ball move through the Earth?" },
    { role: "candidate", text: "Assuming uniform density, gravity depends on the radius." },
    { role: "interviewer", text: "What happens near the centre?" },
  ])
  assert.match(prompt, /Resume an interrupted Physics practice interview/)
  assert.match(prompt, /Assuming uniform density/)
  assert.match(prompt, /last interviewer question is unanswered/)
  assert.doesNotMatch(prompt, /Begin the formal interview now/)
})

test("resumable transcript context stays bounded and excludes system messages", () => {
  const prompt = buildLiveResumePrompt("Maths", [
    { role: "system", text: "Private setup instructions should never be replayed." },
    ...Array.from({ length: 100 }, (_, index) => ({
      role: index % 2 ? "candidate" : "interviewer",
      text: "Long response number " + index + " " + "x".repeat(600),
    })),
  ])
  assert.ok(prompt.length < 5000)
  assert.doesNotMatch(prompt, /Private setup instructions/)
  assert.match(prompt, /response number 99/)
  assert.doesNotMatch(prompt, /response number 1 /)
})

test("connection failures explain that recorded progress can be resumed", () => {
  assert.match(liveSocketErrorMessage(1006,"",false), /can be resumed/)
  assert.match(liveSocketErrorMessage(1013,"busy",false), /can be resumed/)
  assert.match(liveSocketErrorMessage(4000,"provider closing",true), /could not finish connecting/)
})
