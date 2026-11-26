// Shared allowlist for native Gemini Live and generated interview speech.
// Names are fictional AI voice profiles, not real university staff.
export const interviewVoices = ["Gacrux", "Sulafat", "Sadaltager", "Kore", "Charon"] as const
export type InterviewVoice = typeof interviewVoices[number]
export const interviewVoiceProfiles: Record<InterviewVoice, { label: string; delivery: string; rate: number }> = {
  Gacrux: { label: "Dr James · calm and thoughtful", delivery: "Reflective, composed and quietly curious; measured phrasing with subtle changes in emphasis.", rate: 0.94 },
  Sulafat: { label: "Dr Eleanor · warm and approachable", delivery: "Warm but academically serious; gentle onset and conversational rhythm, without excessive reassurance.", rate: 0.96 },
  Sadaltager: { label: "Professor Williams · formal and precise", delivery: "Measured academic delivery; crisp articulation, restrained inflection and deliberate pauses around complex ideas.", rate: 0.93 },
  Kore: { label: "Professor Clarke · direct and probing", delivery: "Clear and direct, with purposeful emphasis on assumptions; firm but never hostile.", rate: 0.98 },
  Charon: { label: "Dr Morgan · analytical and curious", delivery: "Grounded, exploratory delivery; vary question intonation naturally and emphasise the important reasoning step.", rate: 0.96 },
}

export function resolveInterviewVoice(value: unknown): InterviewVoice {
  return interviewVoices.find(voice => voice === value) ?? "Gacrux"
}

export function interviewVoiceInstructions(value: unknown): string[] {
  const profile = interviewVoiceProfiles[resolveInterviewVoice(value)]
  return [
    "VOICE DELIVERY ONLY: Use a consistent, natural British English speaking accent and clear diction throughout this AI practice interview. Do not impersonate a real academic or imply university affiliation.",
    profile.delivery,
    "Keep a consistent speaker identity, pitch range and volume. Vary rhythm, stress and pitch subtly to convey academic curiosity, a precise challenge or neutral clarification. Use natural clause-length pauses; do not narrate stage directions or insert theatrical sighs, filler or laughter.",
    "Slow slightly for unfamiliar technical terms, equations and multi-step conditions, then return to normal conversational pace. Speak notation unambiguously: x squared, delta v, metres per second squared, ten to the minus three, and the sign or unit when it matters. Keep numerical values and scientific meaning unchanged.",
    "Pronounce specialised terminology accurately and clearly; do not spell words aloud unless asked. If a term or symbol is ambiguous, use a short unambiguous spoken formulation rather than guessing the student's intended meaning.",
    "Avoid sing-song cadence, repeated stock acknowledgements, exaggerated praise and scripted transitions. Respond to the actual academic point, using short spoken sentences and one question at a time.",
    "Adapt delivery to the content of the answer or an explicit request for clarification, not inferred emotion, accent, disability or personality. Voice style never overrides the selected interview mode, academic reasoning rules or student safety policy.",
  ]
}

export function preferredBritishVoices<T extends { lang: string }>(voices: readonly T[]): T[] {
  const british = voices.filter(voice => voice.lang.toLowerCase().replace(/_/g, "-") === "en-gb")
  return british.length ? british : voices.filter(voice => voice.lang.toLowerCase().startsWith("en"))
}
