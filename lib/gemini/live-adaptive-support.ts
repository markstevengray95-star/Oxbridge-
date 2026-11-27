/**
 * Voice support is deliberately auditable, not emotion recognition.
 * Native audio cannot supply authoritative per-turn hint metadata; only
 * explicit spoken cues and transcript observations are recorded here.
 */
export const liveSupportLevels = [
  { level: 0, label: "Clarify", description: "Repeat or rephrase the task without introducing a solution step." },
  { level: 1, label: "Direct attention", description: "Point towards one relevant consideration without supplying the reasoning." },
  { level: 2, label: "Simpler example", description: "Offer an analogous or simpler case and ask the candidate to reason through it." },
  { level: 3, label: "Targeted scaffold", description: "Supply one intermediate step, leaving the main problem to the candidate." },
  { level: 4, label: "Concept explanation", description: "Explain the underlying principle, then ask for transfer; coaching or debrief only." },
] as const

export function permittedLiveSupport(mode: unknown): number {
  if (mode === "No-hint") return 0
  if (mode === "Tutor") return 4
  if (mode === "Stress") return 1
  return 2
}

export function liveAdaptiveSupportInstructions(mode: string): string[] {
  const max = permittedLiveSupport(mode)
  return [
    "ADAPTIVE ACADEMIC SUPPORT: respond only to observable academic behaviour or explicit student requests. Never infer emotions, anxiety, disability, confidence, ability or other personal traits from voice, silence, appearance or pace. A thinking pause, filler or request for time is not an incorrect answer.",
    "First establish whether the student asks for clarification, explicitly requests help, makes a substantive attempt, corrects a claim, or simply needs time. A self-correction is not automatically a failure. Do not give an unsolicited hint after a silence.",
    "Use this graduated support ladder on the SAME academic problem. Level 0: neutral repeat or rephrase without new information. Level 1: point to one consideration. Level 2: offer a simpler analogous example. Level 3: supply a single intermediate reasoning step. Level 4: explain a concept, never the full solution, and ask for a transfer step.",
    "Begin with a neutral diagnostic question. Only move up one level after a further genuine attempt remains unresolved or the student explicitly asks for that support. Check whether the student can make the next step independently before offering anything else; return to the original problem and reduce support once reasoning improves.",
    "Maximum permitted in the active interview: level " + max + ". This cap overrides personality, repair ladders, and other suggestions about giving hints. No-hint permits level 0 only. Level 4 is only for explicit Tutor coaching, after genuine attempts; any full model solution belongs in the post-interview debrief.",
    "For a delivered level 1 hint, briefly introduce it naturally with 'A small hint:'. For level 2 use 'Try a simpler example:'. For level 3 use 'One intermediate step:'. For level 4 use 'The underlying principle is:'. Use these phrases only when actually supplying that level of assistance, never when merely asking a neutral question. Do not speak numbers, tags, internal reasoning or metadata.",
    "Keep the exchange academically engaging: ask one focused question, vary between a justified assumption, a prediction, a check or a counterexample when relevant, and invite the student to explain the next step themselves. Avoid praise filler or a monologue.",
    "Do not infer engagement or academic attainment from speaking time, hint count, speech patterns or the number of questions. Support evidence is contextual practice information, not an admissions prediction or automatic penalty.",
  ]
}

export type LiveSupportTurn = { role: string; text: string }
export type LiveSupportEvent = { turn: number; level: 1 | 2 | 3 | 4; quote: string; aboveModeCap: boolean }
export type LiveEngagementReport = {
  candidateTurns: number; interviewerTurns: number; candidateWords: number; interviewerWords: number;
  candidateQuestions: number; interviewerQuestions: number; followUpQuestionTurns: number;
  clarificationRequests: number; helpRequests: number; explicitUncertaintyTurns: number;
  revisionTurns: number; reasoningLinks: number; longestReasoningSequence: number;
  candidateEstimatedSeconds: number | null; interviewerEstimatedSeconds: number | null;
  supportEvents: LiveSupportEvent[]; modeCap: number;
}

const clarification = /\b(?:could you|can you|would you|please)\s+(?:repeat|clarify|rephrase|explain what you mean|say (?:that|it) again)\b|\b(?:what do you mean by|what does .{1,60} mean|do you mean)\b/i
const help = /\b(?:could|can|would) you (?:give (?:me|us) (?:a|another|some) (?:hint|clue|help)|help me|give me a starting point)\b|\b(?:i need|i'd like|i would like) (?:a hint|some help|a clue)\b|\b(?:a hint|a clue),? please\b/i
const uncertainty = /\b(?:i(?:'m| am) not sure|i(?:'m| am) stuck|i (?:do not|don't) know|i(?:'m| am) unsure|i can't work (?:it|that) out)\b/i
const revision = /\b(?:i(?:'d| would) revise|i now think|i was wrong|i initially thought|i take that back|let me correct|on reflection|my earlier (?:claim|answer))\b/i
const reason = /\b(?:because|therefore|since|hence|as a result|it follows|this implies|which means)\b/i

const supportCuePatterns: ReadonlyArray<{ level: LiveSupportEvent["level"]; pattern: RegExp }> = [
  { level: 1, pattern: /(?:^|[.!?]\s+)(?:[AB]:\s*)?a small hint\s*[:,—-]/i },
  { level: 2, pattern: /(?:^|[.!?]\s+)(?:[AB]:\s*)?try a simpler example\s*[:,—-]/i },
  { level: 3, pattern: /(?:^|[.!?]\s+)(?:[AB]:\s*)?one intermediate step\s*[:,—-]/i },
  { level: 4, pattern: /(?:^|[.!?]\s+)(?:[AB]:\s*)?the underlying principle is\s*[:,—-]/i },
]

export function observedLiveSupport(text: string): LiveSupportEvent["level"] | null {
  // Count the highest explicitly signalled level once per interviewer turn.
  const matches = supportCuePatterns.filter(item => item.pattern.test(text.trim()))
  return matches.length ? matches[matches.length - 1].level : null
}

export function buildLiveEngagementReport(turns: readonly LiveSupportTurn[], mode: string): LiveEngagementReport {
  const modeCap = permittedLiveSupport(mode)
  const result: LiveEngagementReport = {
    candidateTurns: 0, interviewerTurns: 0, candidateWords: 0, interviewerWords: 0,
    candidateQuestions: 0, interviewerQuestions: 0, followUpQuestionTurns: 0,
    clarificationRequests: 0, helpRequests: 0, explicitUncertaintyTurns: 0,
    revisionTurns: 0, reasoningLinks: 0, longestReasoningSequence: 0,
    candidateEstimatedSeconds: null, interviewerEstimatedSeconds: null,
    supportEvents: [], modeCap,
  }
  let sequence = 0
  let haveOpeningQuestion = false
  turns.forEach((turn, index) => {
    const text = typeof turn.text === "string" ? turn.text.replace(/\s+/g, " ").trim() : ""
    if (!text || (turn.role !== "candidate" && turn.role !== "interviewer")) return
    const words = text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu)?.length ?? 0
    const questionMarks = (text.match(/\?/g) ?? []).length
    if (turn.role === "candidate") {
      result.candidateTurns++
      result.candidateWords += words
      result.candidateQuestions += questionMarks
      if (clarification.test(text)) result.clarificationRequests++
      if (help.test(text)) result.helpRequests++
      if (uncertainty.test(text)) result.explicitUncertaintyTurns++
      if (revision.test(text)) result.revisionTurns++
      if (reason.test(text)) {
        result.reasoningLinks++
        sequence++
        result.longestReasoningSequence = Math.max(result.longestReasoningSequence, sequence)
      } else {
        sequence = 0
      }
    } else {
      result.interviewerTurns++
      result.interviewerWords += words
      result.interviewerQuestions += questionMarks
      if (questionMarks) {
        if (haveOpeningQuestion) result.followUpQuestionTurns++
        haveOpeningQuestion = true
      }
      const level = observedLiveSupport(text)
      if (level !== null) result.supportEvents.push({ turn: index + 1, level, quote: text.slice(0, 240), aboveModeCap: level > modeCap })
    }
  })
  // A transcript-based approximation, not measured microphone or playback time.
  const estimate = (words: number) => words ? Math.round(words * 60 / 130) : null
  result.candidateEstimatedSeconds = estimate(result.candidateWords)
  result.interviewerEstimatedSeconds = estimate(result.interviewerWords)
  return result
}
