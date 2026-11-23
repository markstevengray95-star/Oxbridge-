/**
 * FELLOW formative reasoning-first assessment.
 *
 * This deliberately works from observable transcript evidence rather than
 * inferring intelligence, personality, accent, confidence, or admissions odds.
 * It does not independently verify the correctness of scientific claims:
 * academic accuracy is supplied by the existing subject-aware marker.
 */
export type ProcessTurn = {
  question: string
  answer: string
  classification: "incorrect" | "vague" | "irrelevant" | "partial" | "responsive"
  reasoning: number // existing 0-25 evidence indicator
  accuracy: number // existing 0-20 evidence indicator
  responsiveness: number // existing 0-15 evidence indicator
  evidence: number // existing 0-15 evidence indicator
  communication: number // existing 0-5 evidence indicator
  supportLevel?: number // 0 = no recorded help, 1-3 = increasing guidance
}

export type ProcessDimensionKey = "reasoning" | "accuracy" | "responsiveness" | "adaptability" | "evidence" | "communication"
export type ProcessDimension = {
  key: ProcessDimensionKey
  label: string
  score: number
  max: number
  observed: boolean
  rationale: string
}
export type ProcessObservation = {
  turn: number
  kind: "reasoning" | "assumption" | "testing" | "revision" | "uncertainty" | "supported"
  quote: string
  note: string
}
export type ReasoningFirstAssessment = {
  version: "reasoning-first-2026.1"
  total: number
  dimensions: ProcessDimension[]
  observations: ProcessObservation[]
  confidence: "low" | "medium" | "high"
  challengeOpportunities: number
  independentTurns: number
  supportedTurns: number
  missingEvidence: string[]
  note: string
}

const ASSUMPTION = /\b(?:assuming|assume that|suppose|provided that|if we assume|under the condition|holding .* constant)\b/i
const EXPLANATION = /\b(?:because|therefore|since|hence|which means|this follows|implies|so that|causes?|results? in|in order to|as a result)\b/i
const TESTING = /\b(?:test|check|measure|estimate|experiment|compare|counterexample|limiting case|predict|observe|discriminat|falsif|calculate|evidence|data)\b/i
const REVISED = /\b(?:actually|on reflection|thinking again|i was wrong|i(?:'d| would) (?:revise|change|correct)|let me correct|my earlier answer|given that new information)\b/i
const UNCERTAIN = /\b(?:i (?:do not|don't) know|i(?:'m| am) (?:not sure|uncertain)|i would need to check|i'm unsure)\b/i
const FILLER = /\b(?:as an ai|many factors to consider|in today's society|throughout history|it is important to note|several concepts are relevant|this is a complex question)\b/i

function clip(text: string, limit = 200) {
  const compact = text.replace(/\s+/g, " ").trim()
  return compact.length > limit ? compact.slice(0, limit - 1).trimEnd() + "…" : compact
}
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value : 0)))
}
function avg(items: number[]) {
  return items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : 0
}
function level(turn: ProcessTurn) {
  return clamp(turn.supportLevel ?? 0, 0, 3)
}
function scoreChange(prev: ProcessTurn, next: ProcessTurn) {
  const order = { irrelevant: 0, vague: 1, incorrect: 1, partial: 2, responsive: 3 }
  const goodExplanation = next.reasoning >= 13 && (EXPLANATION.test(next.answer) || TESTING.test(next.answer) || ASSUMPTION.test(next.answer))
  if (!goodExplanation) return 0
  const improved = order[next.classification] > order[prev.classification]
  const revisedWithReason = REVISED.test(next.answer)
  const responsiveExtension = next.classification === "responsive" && next.evidence >= 8 && next.reasoning >= 17
  const credit = improved ? 1 : revisedWithReason ? 0.85 : responsiveExtension ? 0.7 : next.classification === "partial" ? 0.35 : 0.15
  // Improvement after a hint still counts. It is not mislabelled independent.
  return credit * ([1, 0.9, 0.72, 0.56][level(next)] ?? 1)
}

export function assessReasoningFirst(turns: ProcessTurn[]): ReasoningFirstAssessment {
  const valid = turns.filter(turn => typeof turn.answer === "string" && turn.answer.trim()).slice(0, 80)
  const observations: ProcessObservation[] = []
  let independentTurns = 0
  let supportedTurns = 0
  const capped = valid.map((turn, index) => {
    const supported = level(turn) > 0
    if (supported) supportedTurns += 1
    else independentTurns += 1
    const answer = turn.answer
    const quote = clip(answer)
    const kind: ProcessObservation["kind"] = supported ? "supported"
      : REVISED.test(answer) ? "revision"
      : ASSUMPTION.test(answer) ? "assumption"
      : TESTING.test(answer) ? "testing"
      : UNCERTAIN.test(answer) ? "uncertainty" : "reasoning"
    if (quote && (EXPLANATION.test(answer) || REVISED.test(answer) || ASSUMPTION.test(answer) || TESTING.test(answer) || UNCERTAIN.test(answer) || supported)) {
      observations.push({
        turn: index + 1, kind, quote,
        note: supported
          ? "Reasoning followed a recorded interviewer prompt or hint; credit improvement, but do not call it independent."
          : kind === "revision" ? "The candidate explicitly reconsidered an earlier position; the justification still needs checking."
          : kind === "assumption" ? "The candidate stated a condition or assumption rather than hiding it."
          : kind === "testing" ? "The candidate proposed a check, example or source of evidence."
          : kind === "uncertainty" ? "The candidate recognised uncertainty; evaluate the next reasoning step, not confidence."
          : "The candidate attempted to make the reasoning visible.",
      })
    }
    const unsupported = turn.classification === "irrelevant" || turn.classification === "vague"
    const filler = FILLER.test(answer)
    // Marking fields already apply quality caps. Avoid giving extra credit for
    // length, generic phrases or hints that supply the reasoning.
    return {
      reasoning: clamp(turn.reasoning * (unsupported ? 0.75 : 1) * (filler ? 0.8 : 1), 0, 25),
      accuracy: clamp(turn.accuracy, 0, 20),
      responsiveness: clamp(turn.responsiveness, 0, 15),
      evidence: clamp(turn.evidence * (filler ? 0.7 : 1), 0, 15),
      communication: clamp(turn.communication, 0, 5),
    }
  })

  const challengeOpportunities = Math.max(0, valid.length - 1)
  const adaptation = challengeOpportunities
    ? clamp(avg(valid.slice(1).map((turn, index) => scoreChange(valid[index], turn))) * 25, 0, 25)
    : 0
  const dimension = (key: ProcessDimensionKey, label: string, score: number, max: number, rationale: string, observed = valid.length > 0): ProcessDimension =>
    ({ key, label, score: clamp(score, 0, max), max, observed, rationale })
  const dimensions = [
    dimension("reasoning", "Explicit academic reasoning", avg(capped.map(item => item.reasoning)) / 25 * 30, 30,
      "Credit a visible inferential chain, assumptions and self-correction even when a final claim needs repair."),
    dimension("accuracy", "Academic accuracy", avg(capped.map(item => item.accuracy)) / 20 * 10, 10,
      "Check decisive facts, relationships, calculations and evidence; this matters but does not dominate."),
    dimension("responsiveness", "Answering the actual question", avg(capped.map(item => item.responsiveness)) / 15 * 10, 10,
      "Stay relevant to the interviewer's latest question."),
    dimension("adaptability", "Thinking under challenge", adaptation, 25,
      "Credit justified revision or extension, distinguishing independent recovery from guided recovery.", challengeOpportunities > 0),
    dimension("evidence", "Testing and supporting ideas", avg(capped.map(item => item.evidence)) / 15 * 20, 20,
      "Reward a relevant check, comparison, calculation, counterexample or investigation."),
    dimension("communication", "Clarity of reasoning", avg(capped.map(item => item.communication)), 5,
      "Only whether the logic can be followed; never accent, speed, fluency or writing length."),
  ]
  const observedMaximum = dimensions.filter(item => item.observed).reduce((sum, item) => sum + item.max, 0)
  const points = dimensions.reduce((sum, item) => sum + item.score, 0)
  // A brief one-answer exercise must not masquerade as a full interview.
  const total = !valid.length ? 0 : challengeOpportunities
    ? clamp(points, 0, 100)
    : clamp(Math.min(78, points / Math.max(1, observedMaximum) * 100), 0, 78)
  const confidence = valid.length >= 6 && challengeOpportunities >= 4 ? "high"
    : valid.length >= 3 && challengeOpportunities >= 2 ? "medium" : "low"
  const missingEvidence = [
    ...(challengeOpportunities === 0 ? ["Response to challenge was not observed."] : []),
    ...(supportedTurns > 0 ? ["Some answers followed interviewer support; independent transfer should be checked."] : []),
    ...(valid.length < 3 ? ["Too few answers for a reliable overall assessment."] : []),
    ...(observations.length === 0 ? ["Not enough explicit reasoning was captured in the transcript."] : []),
  ]
  return {
    version: "reasoning-first-2026.1",
    total,
    dimensions,
    observations: observations.slice(-14),
    confidence,
    challengeOpportunities,
    independentTurns,
    supportedTurns,
    missingEvidence,
    note: "Formative FELLOW practice score, not an Oxford or Cambridge admissions score. Explicit reasoning and justified adaptation count more than a final answer; this automated analysis requires human validation.",
  }
}
