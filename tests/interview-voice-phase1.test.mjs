import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { interviewVoices, interviewVoiceProfiles, resolveInterviewVoice, interviewVoiceInstructions, preferredBritishVoices } from "../lib/gemini/interview-voice-profiles.ts"

test("five distinct fictional voice profiles with a safe default", () => {
  assert.equal(interviewVoices.length, 5)
  assert.equal(new Set(interviewVoices).size, 5)
  assert.equal(new Set(interviewVoices.map(voice => interviewVoiceProfiles[voice].label)).size, 5)
  for (const voice of interviewVoices) {
    assert.equal(resolveInterviewVoice(voice), voice)
    assert.ok(interviewVoiceProfiles[voice].rate >= 0.9 && interviewVoiceProfiles[voice].rate <= 1.05)
    const prompt = interviewVoiceInstructions(voice).join(" ")
    for (const phrase of ["British English", "consistent speaker identity", "technical terms", "one question at a time", "never overrides", "not inferred emotion"]) assert.ok(prompt.includes(phrase), phrase)
    assert.ok(prompt.includes(interviewVoiceProfiles[voice].delivery))
  }
  for (const input of [null, undefined, {}, "unsupported", "__proto__", "charon"]) assert.equal(resolveInterviewVoice(input), "Gacrux")
})

test("prefer British browser voices, with graceful English fallback", () => {
  const us = { lang: "en-US" }, uk = { lang: "en-GB" }, fr = { lang: "fr-FR" }
  assert.deepEqual(preferredBritishVoices([us, fr, uk]), [uk])
  assert.deepEqual(preferredBritishVoices([fr, us]), [us])
  assert.deepEqual(preferredBritishVoices([fr]), [])
  assert.deepEqual(preferredBritishVoices([]), [])
})

test("live clients and servers share the voice registry without changing transport", () => {
  for (const path of ["lib/gemini/live-session.ts", "lib/gemini/live-session-secure.ts"]) {
    const source = readFileSync(path, "utf8")
    assert.ok(source.includes("resolveInterviewVoice(body.voice)"))
    assert.ok(source.includes("...interviewVoiceInstructions(voice)"))
    assert.ok(source.includes("instructions: interviewInstructions(course, track, persona, mode, voice"))
  }
  for (const path of ["components/gemini-live-interview-experience.tsx", "app/gemini-live-next/page.tsx"]) {
    const source = readFileSync(path, "utf8")
    assert.ok(source.includes("interviewVoiceProfiles[item].label"))
    assert.ok(source.includes("prebuiltVoiceConfig"))
    assert.ok(source.includes("automaticActivityDetection: liveSpeechDetection(voicePace)"))
  }
  assert.ok(readFileSync("app/api/natural-speech/route.ts", "utf8").includes("interviewVoiceInstructions(voice)"))
})
