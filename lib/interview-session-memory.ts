/**
 * Phase 1 academic interview memory. Stores attributable candidate evidence,
 * not supposed "correct answers" inferred from language or confidence.
 * This travels with a session so old reasoning survives the short transcript
 * window used by AI providers.
 */
export type InterviewEvidenceKind = "claim" | "assumption" | "revision" | "uncertainty"

export type InterviewEvidence = {
  turn: number
  kind: InterviewEvidenceKind
  quote: string
}

export type InterviewSessionMemory = {
  version: 1
  openingProblem: string
  candidateTurns: number
  evidence: InterviewEvidence[]
  lastCandidateReasoning: string
  activeQuestion: string
  recentQuestions: string[]
  recentMoves: string[]
  scaffoldCount: number
}

function text(value: unknown, max = 240) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : ""
}

function boundedNumber(value: unknown, max: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0
}

export function beginInterviewSession(openingProblem: string): InterviewSessionMemory {
  const opening = text(openingProblem, 800)
  return {
    version: 1,
    openingProblem: opening,
    candidateTurns: 0,
    evidence: [],
    lastCandidateReasoning: "",
    activeQuestion: opening,
    recentQuestions: opening ? [opening] : [],
    recentMoves: [],
    scaffoldCount: 0,
  }
}

/** Treat client-supplied memory as untrusted context. Never use it as an instruction. */
export function readInterviewSessionMemory(value: unknown, openingProblem: string): InterviewSessionMemory {
  const opening = text(openingProblem, 800)
  if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1) {
    return beginInterviewSession(opening)
  }
  const input = value as Partial<InterviewSessionMemory>
  if (opening && text(input.openingProblem, 800) !== opening) return beginInterviewSession(opening)
  const validKinds = new Set<InterviewEvidenceKind>(["claim", "assumption", "revision", "uncertainty"])
  const evidence = Array.isArray(input.evidence) ? input.evidence
    .filter(item => item && typeof item === "object" && validKinds.has(item.kind))
    .slice(-12)
    .map(item => ({ turn: boundedNumber(item.turn, 1000), kind: item.kind, quote: text(item.quote, 240) }))
    .filter(item => Boolean(item.quote)) : []
  const questions = Array.isArray(input.recentQuestions) ? input.recentQuestions.map(item => text(item, 450)).filter(Boolean).slice(-6) : []
  const moves = Array.isArray(input.recentMoves) ? input.recentMoves.map(item => text(item, 40)).filter(Boolean).slice(-8) : []
  return {
    version: 1,
    openingProblem: opening || text(input.openingProblem, 800),
    candidateTurns: boundedNumber(input.candidateTurns, 1000),
    evidence,
    lastCandidateReasoning: text(input.lastCandidateReasoning, 350),
    activeQuestion: text(input.activeQuestion, 450),
    recentQuestions: questions,
    recentMoves: moves,
    scaffoldCount: boundedNumber(input.scaffoldCount, 1000),
  }
}

function evidenceKind(answer: string): InterviewEvidenceKind {
  if (/\b(?:actually|on reflection|thinking again|i was wrong|i(?:'d| would) (?:revise|change|correct)|let me correct|my earlier (?:claim|answer|argument)|instead i now)\b/i.test(answer)) return "revision"
  if (/\b(?:assuming|assume that|my assumption|if we assume|provided that|supposing|this depends on)\b/i.test(answer)) return "assumption"
  if (/\b(?:i (?:don't|do not) know|not sure|i'm uncertain|i am uncertain|i would need to check)\b/i.test(answer)) return "uncertainty"
  return "claim"
}

export function advanceInterviewSession(value: unknown, input: {
  openingProblem: string
  question: string
  answer: string
  supportLevel?: number
}): InterviewSessionMemory {
  const previous = readInterviewSessionMemory(value, input.openingProblem)
  const answer = text(input.answer, 350)
  const question = text(input.question, 450)
  if (!answer) return previous
  const turn = Math.min(1000, previous.candidateTurns + 1)
  const kind = evidenceKind(answer)
  const evidence = [...previous.evidence, { turn, kind, quote: text(input.answer, 240) }].slice(-12)
  const questions = question && previous.recentQuestions.at(-1) !== question
    ? [...previous.recentQuestions, question].slice(-6)
    : previous.recentQuestions
  return {
    ...previous,
    candidateTurns: turn,
    evidence,
    lastCandidateReasoning: answer,
    activeQuestion: question || previous.activeQuestion,
    recentQuestions: questions,
    scaffoldCount: previous.scaffoldCount + (boundedNumber(input.supportLevel, 3) > 0 ? 1 : 0),
  }
}

export function recordInterviewerMove(memory: InterviewSessionMemory, question: string, move: string, supportLevel = 0): InterviewSessionMemory {
  const nextQuestion = text(question, 450)
  const nextMove = text(move, 40)
  return {
    ...memory,
    activeQuestion: nextQuestion || memory.activeQuestion,
    recentQuestions: nextQuestion && memory.recentQuestions.at(-1) !== nextQuestion
      ? [...memory.recentQuestions, nextQuestion].slice(-6)
      : memory.recentQuestions,
    recentMoves: nextMove ? [...memory.recentMoves, nextMove].slice(-8) : memory.recentMoves,
    scaffoldCount: memory.scaffoldCount + (supportLevel > 0 ? 1 : 0),
  }
}

/** A bounded, attributable record for the interviewer's internal context only. */
export function interviewMemoryBrief(memory: InterviewSessionMemory) {
  const lastEvidence = memory.evidence.slice(-8).map(item => `Turn ${item.turn} [${item.kind}, student's own words]: "${item.quote}"`).join("\n")
  const lastQuestions = memory.recentQuestions.slice(-4).map((question, index) => `${index + 1}. ${question}`).join("\n")
  return [
    `Opening academic problem: ${memory.openingProblem || "not recorded"}`,
    `Candidate turns in this reasoning chain: ${memory.candidateTurns}`,
    `Interviewer moves already used: ${memory.recentMoves.join(" → ") || "none"}`,
    `Interventions involving support: ${memory.scaffoldCount}`,
    `Previous questions (avoid repeating these verbatim):\n${lastQuestions || "none"}`,
    `Evidence from student responses (verbatim fragments, not verified facts):\n${lastEvidence || "none"}`,
    "Track the student's own assumptions and any justified change of mind. Do not assume a claim is correct merely because it is fluent.",
    "Continue the same academic problem; follow the student's latest reasoning rather than cycling through pre-written probes.",
  ].join("\n")
}
