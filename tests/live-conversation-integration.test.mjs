import assert from "node:assert/strict"
import test from "node:test"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = relative => fs.readFileSync(path.join(root, relative), "utf8")
const liveNext = read("app/gemini-live-next/page.tsx")
const alternate = read("components/gemini-live-interview-experience.tsx")
const secure = read("lib/gemini/live-session-secure.ts")

test("the main interview page uses selected silence tolerance and interruption controls", () => {
  assert.match(liveNext, /automaticActivityDetection: liveSpeechDetection\(voicePace\)/)
  assert.match(liveNext, /detectVoiceBargeIn/)
  assert.match(liveNext, /canSendLiveAudio/)
  assert.match(liveNext, /allowBargeIn/)
  assert.match(liveNext, /setVoicePace/)
})

test("the main interview preserves transcripts and academic reasoning during fresh-token resume", () => {
  assert.match(liveNext, /preserveUnfinishedTranscript/)
  assert.match(liveNext, /buildLiveResumePrompt\(course, turnsRef\.current\)/)
  assert.match(liveNext, /resume: restore/)
  assert.match(liveNext, /phase === "reconnect"/)
  assert.match(liveNext, /Resume interview/)
  assert.match(liveNext, /Save & finish/)
  assert.match(liveNext, /mergeLiveTranscription/)
})

test("the secondary voice entry point shares pacing and retains transcripts on fallback", () => {
  assert.match(alternate, /automaticActivityDetection: liveSpeechDetection\(voicePace\)/)
  assert.match(alternate, /detectVoiceBargeIn/)
  assert.match(alternate, /mergeLiveTranscription/)
  assert.match(alternate, /Preserved voice transcript/)
  assert.match(alternate, /switchToFallback/)
})

test("the secure Gemini Live prompt no longer enforces a rigid feedback script", () => {
  assert.match(secure, /resume\?: boolean/)
  assert.match(secure, /resume = body\.resume === true/)
  assert.match(secure, /resuming after a technical disconnection/i)
  assert.match(secure, /respond naturally in one to three concise sentences/i)
  assert.doesNotMatch(secure, /AFTER EVERY SUBSTANTIVE CANDIDATE ANSWER, your spoken response must contain exactly two/)
})
