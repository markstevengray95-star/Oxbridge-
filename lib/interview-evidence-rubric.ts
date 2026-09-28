import type { InterviewAnswerClassification } from "@/lib/interview-answer-quality"
import type { InterviewMarkingResult, InterviewMarkingTurn, TypedTurnAssessment } from "@/lib/interview-marking"

export type EvidenceDimensionKey =
  | "problemDecomposition"
  | "independentReasoning"
  | "responseToChallenge"
  | "useOfEvidence"
  | "conceptualUnderstanding"
  | "precision"
  | "communicationOfReasoning"
  | "recoveryAfterDifficulty"
  | "transferToUnfamiliar"

export type TranscriptEvidence = {
  turnIndex: number
  quote: string
  reason: string
}

export type EvidenceDimension = {
  key: EvidenceDimensionKey
  label: string
  score: number
  maxScore: 4
  descriptor: string
  evidence: TranscriptEvidence[]
  nextAction: string
  practiceSeed: string
}

export type InterviewEvidenceProfile = {
  rubricVersion: "evidence-2026.1"
  dimensions: EvidenceDimension[]
  total: number
  maxTotal: 36
  evidenceCoverage: number
  confidence: "low" | "medium" | "high"
  note: string
}

const REASONING = /\b(?:because|therefore|hence|since|implies?|which means|leads to|if|then|assuming|given)\b/i
const DECOMPOSE = /\b(?:first|second|then|start by|break|separate|case|step|before|after|assumption|variable|constraint)\b/i
const EVIDENCE = /\b(?:evidence|data|measure|experiment|test|compare|control|observation|counterexample|example|source|quotation|calculate|calculation|limiting case)\b/i
const PRECISION = /(?:\d|[=<>≤≥√π²³×÷+\-*/%])|\b(?:exactly|approximately|proportional|unit|definition|condition|if and only if|necessary|sufficient|gradient|rate|mechanism)\b/i
const ALTERNATIVE = /\b(?:however|alternatively|another explanation|counterexample|on the other hand|unless|whereas|rival|different interpretation)\b/i
const REVISION = /\b(?:actually|on reflection|i would revise|i'd revise|i would change|i'd change|i was wrong|let me correct|my earlier answer|with that new information)\b/i
const TRANSFER = /\b(?:generalise|generalize|in another case|more generally|same structure|different context|would still|would no longer|boundary|edge case|extreme case|reverse)\b/i

function clamp(value: number) {
  return Math.max(0, Math.min(4, Math.round(value)))
}

function snippet(text: string, max = 190) {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trimEnd()}…`
}

function candidateTurnIndexes(turns: InterviewMarkingTurn[]) {
  const indexes: number[] = []
  turns.forEach((turn, index) => {
    if (turn.role === "candidate" && turn.text.trim()) indexes.push(index)
  })
  return indexes
}

function assessmentEvidence(
  assessments: TypedTurnAssessment[],
  turns: InterviewMarkingTurn[],
  rank: (assessment: TypedTurnAssessment) => number,
  reason: (assessment: TypedTurnAssessment) => string,
  count = 2,
): TranscriptEvidence[] {
  const indexes = candidateTurnIndexes(turns)
  return assessments
    .map((assessment, index) => ({ assessment, turnIndex: indexes[index] ?? index, rank: rank(assessment) }))
    .sort((a, b) => b.rank - a.rank)
    .filter(item => item.rank > 0)
    .slice(0, count)
    .map(item => ({ turnIndex: item.turnIndex, quote: snippet(item.assessment.answer), reason: reason(item.assessment) }))
}

function descriptor(score: number) {
  if (score >= 4) return "Consistent evidence across the transcript"
  if (score === 3) return "Clear evidence, with room for greater consistency"
  if (score === 2) return "Some evidence, but it is not yet dependable"
  if (score === 1) return "Limited evidence in this session"
  return "Not enough observable evidence in this session"
}

function classificationValue(value: InterviewAnswerClassification) {
  if (value === "responsive") return 4
  if (value === "partial") return 2.7
  if (value === "vague") return 1.4
  if (value === "incorrect") return 1.2
  return 0.8
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function recoveryScore(assessments: TypedTurnAssessment[]) {
  let opportunities = 0
  let recovered = 0
  for (let index = 1; index < assessments.length; index += 1) {
    const previous = assessments[index - 1].classification
    const current = assessments[index].classification
    if (["incorrect", "vague", "partial"].includes(previous)) {
      opportunities += 1
      if (current === "responsive") recovered += 1
      else if (current === "partial" && previous !== "partial") recovered += 0.5
    }
  }
  if (!opportunities) return assessments.length >= 3 ? 3 : 2
  return clamp(1 + (recovered / opportunities) * 3)
}

function dimension(
  key: EvidenceDimensionKey,
  label: string,
  score: number,
  evidence: TranscriptEvidence[],
  nextAction: string,
  practiceSeed: string,
): EvidenceDimension {
  const safe = clamp(score)
  return { key, label, score: safe, maxScore: 4, descriptor: descriptor(safe), evidence, nextAction, practiceSeed }
}

export function buildInterviewEvidenceProfile(input: {
  turns: InterviewMarkingTurn[]
  marking: InterviewMarkingResult
}): InterviewEvidenceProfile {
  const assessments = input.marking.turnAssessments
  const answerCount = assessments.length
  const responseAverage = average(assessments.map(item => classificationValue(item.classification)))

  const decompositionEvidence = assessmentEvidence(assessments, input.turns, item => DECOMPOSE.test(item.answer) ? item.reasoning + 8 : item.reasoning, item => DECOMPOSE.test(item.answer) ? "The response explicitly broke the problem into steps, cases, assumptions or variables." : "The reasoning score shows some structure, although the decomposition was less explicit.")
  const independentEvidence = assessmentEvidence(assessments, input.turns, item => item.reasoning + item.directness / 8 - item.issue.length / 100, item => "The candidate advanced a concrete line of reasoning rather than only restating the prompt.")
  const challengeEvidence = assessmentEvidence(assessments.slice(1), input.turns, item => (REVISION.test(item.answer) || ALTERNATIVE.test(item.answer) ? 18 : 0) + item.reasoning, item => REVISION.test(item.answer) ? "The response explicitly revised an earlier position after challenge." : "The response engaged with a changed condition, alternative or follow-up rather than repeating the first answer.")
  const evidenceUse = assessmentEvidence(assessments, input.turns, item => item.evidence + (EVIDENCE.test(item.answer) ? 10 : 0), item => "The response used a check, example, calculation, observation or discriminating piece of evidence.")
  const conceptual = assessmentEvidence(assessments, input.turns, item => item.accuracy * 2 + item.reasoning, item => "This turn provides the clearest evidence of conceptually accurate reasoning in the transcript.")
  const precisionEvidence = assessmentEvidence(assessments, input.turns, item => (PRECISION.test(item.answer) ? 15 : 0) + item.directness / 5 + item.accuracy, item => "The response made a precise claim using a definition, quantity, condition, relationship or clearly bounded statement.")
  const communicationEvidence = assessmentEvidence(assessments, input.turns, item => item.communication * 4 + item.reasoning, item => "The reasoning was interpretable: the conclusion and at least one supporting step were visible.")
  const recoveryEvidence = assessmentEvidence(assessments.slice(1), input.turns, item => (REVISION.test(item.answer) ? 20 : 0) + (item.classification === "responsive" ? 10 : 0), item => "This later answer is evidence of recovery or improvement after an earlier challenge.")
  const transferEvidence = assessmentEvidence(assessments, input.turns, item => (TRANSFER.test(item.answer) || ALTERNATIVE.test(item.answer) ? 18 : 0) + item.reasoning, item => "The response moved beyond the immediate case by testing an alternative, boundary case, generalisation or transferable method.")

  const decompositionScore = clamp(average(assessments.map(item => item.reasoning / 6.25)) + (assessments.some(item => DECOMPOSE.test(item.answer)) ? 0.5 : -0.5))
  const independentScore = clamp(responseAverage * 0.55 + (input.marking.reasoning / 25) * 1.8)
  const challengeScore = clamp((input.marking.adaptability / 20) * 3.2 + (assessments.some(item => REVISION.test(item.answer) || ALTERNATIVE.test(item.answer)) ? 0.8 : 0))
  const useEvidenceScore = clamp((input.marking.evidence / 15) * 4)
  const conceptualScore = clamp((input.marking.accuracy / 20) * 4)
  const precisionScore = clamp(average(assessments.map(item => (item.directness / 100) * 2 + (PRECISION.test(item.answer) ? 1.5 : 0))))
  const communicationScore = clamp((input.marking.communication / 5) * 2 + (input.marking.reasoning / 25) * 2)
  const recover = recoveryScore(assessments)
  const transferScore = clamp((assessments.filter(item => TRANSFER.test(item.answer) || ALTERNATIVE.test(item.answer)).length / Math.max(1, answerCount)) * 5 + (input.marking.adaptability / 20) * 1.5)

  const dimensions = [
    dimension("problemDecomposition", "Problem decomposition", decompositionScore, decompositionEvidence, "Before solving, name the sub-problems, variables, assumptions or cases that control the problem.", "Give a fresh problem where the first task is to choose a decomposition before any calculation or conclusion."),
    dimension("independentReasoning", "Independent reasoning", independentScore, independentEvidence, "Commit to a defensible next step before asking for reassurance or waiting for a hint.", "Give a new unfamiliar problem with no scaffolding and require the candidate to choose and justify the first method."),
    dimension("responseToChallenge", "Response to challenge", challengeScore, challengeEvidence, "When a condition changes, say explicitly what survives from the old argument and what must be rebuilt.", "Start from a plausible answer, then introduce one changed condition that forces a genuine revision."),
    dimension("useOfEvidence", "Use of evidence", useEvidenceScore, evidenceUse, "Add a discriminating check: a calculation, observation, example, source, experiment or counterexample that could change the conclusion.", "Ask a question where two explanations fit initially and the candidate must design one observation or test that separates them."),
    dimension("conceptualUnderstanding", "Conceptual understanding", conceptualScore, conceptual, "Check the decisive definition, mechanism or relationship before extending the argument.", "Create a conceptually demanding problem that cannot be solved by recalling a definition alone and requires applying the idea in an unfamiliar setting."),
    dimension("precision", "Precision", precisionScore, precisionEvidence, "State conditions, quantities, directions and definitions precisely enough that the claim could be checked or falsified.", "Give a problem containing a tempting vague statement and require the candidate to turn it into a precise, testable claim."),
    dimension("communicationOfReasoning", "Communication of reasoning", communicationScore, communicationEvidence, "Make the chain visible: conclusion → reason or mechanism → check. Brevity is fine if the logic is explicit.", "Give a short reasoning problem and require a concise answer in which every inferential step is visible."),
    dimension("recoveryAfterDifficulty", "Recovery after difficulty", recover, recoveryEvidence, "Treat challenge as new evidence: diagnose the failed step, repair it, then apply the corrected idea again.", "Present a problem with a likely misconception, give one interviewer challenge after the first attempt, then test whether the corrected idea transfers."),
    dimension("transferToUnfamiliar", "Transfer to unfamiliar material", transferScore, transferEvidence, "After solving one case, identify the underlying method and deliberately apply it to a different context or boundary case.", "Give a new-context transfer problem that shares the same reasoning structure but changes the surface topic and wording."),
  ]

  const total = dimensions.reduce((sum, item) => sum + item.score, 0)
  const evidenceCount = dimensions.filter(item => item.evidence.length > 0).length
  const evidenceCoverage = Math.round((evidenceCount / dimensions.length) * 100)
  const confidence = answerCount >= 6 && evidenceCoverage >= 75 ? "high" : answerCount >= 3 && evidenceCoverage >= 50 ? "medium" : "low"

  return {
    rubricVersion: "evidence-2026.1",
    dimensions,
    total,
    maxTotal: 36,
    evidenceCoverage,
    confidence,
    note: "Practice evidence profile only. Scores describe evidence visible in this transcript and are not an Oxford or Cambridge admissions judgement.",
  }
}
