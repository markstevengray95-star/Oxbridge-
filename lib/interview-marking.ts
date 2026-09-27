import { evaluateInterviewAnswerLocally, type InterviewAnswerClassification } from "@/lib/interview-answer-quality"

export type InterviewMarkingTurn = {
  role: "interviewer" | "candidate"
  text: string
  quality?: InterviewAnswerClassification
}

export type TypedTurnAssessment = {
  question: string
  answer: string
  classification: InterviewAnswerClassification
  directness: number
  reasoning: number
  subject: number
  clarity: number
  issue: string
}

export type InterviewMarkingResult = {
  total: number
  reasoning: number
  subject: number
  flexibility: number
  clarity: number
  error: string
  strengths: string[]
  next: string[]
  typedAnswers: number
  rubricVersion: "2026.2"
  turnAssessments: TypedTurnAssessment[]
}

const REASONING = /\b(?:because|therefore|since|hence|implies?|so that|which means|as a result|if|then|assuming|given|follows|therefore)\b/i
const ASSUMPTION = /\b(?:assum(?:e|ing|ption)|suppose|holding .* constant|ceteris paribus|provided that|depends on)\b/i
const TESTING = /\b(?:test|check|measure|compare|control|evidence|data|experiment|counterexample|edge case|limiting case|falsif|distinguish)\b/i
const ALTERNATIVE = /\b(?:however|alternatively|another explanation|on the other hand|counterexample|instead|unless|whereas|could also|a different)\b/i
const REVISION = /\b(?:actually|on reflection|i would revise|i'd revise|i would change|i'd change|i was wrong|let me correct|my earlier answer|thinking again)\b/i
const CLAIM = /\b(?:i think|i would say|my view|my answer|therefore|so |this means|the result|i conclude|it follows|the most likely|the stronger explanation)\b/i
const HEDGE = /\b(?:maybe|sort of|kind of|i guess|probably maybe|i'm not sure but|i don't know but)\b/gi
const PRECISION = /(?:\d|[=<>≤≥√π²³×÷+−*/%])|\b(?:specifically|in particular|for example|for instance|approximately|proportional|gradient|rate|unit|mechanism|evidence)\b/i

const classificationWeight: Record<InterviewAnswerClassification, number> = {
  incorrect: 0.28,
  irrelevant: 0.22,
  vague: 0.38,
  partial: 0.7,
  responsive: 1,
}

function clamp(value: number, min = 0, max = 25) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function conceptHits(answer: string, concepts: string[]) {
  const lower = answer.toLowerCase()
  return concepts.filter(concept => {
    const clean = concept.trim().toLowerCase()
    return clean.length >= 3 && lower.includes(clean)
  }).length
}

function repetitionRatio(answer: string, previousAnswers: string[]) {
  const current = new Set(answer.toLowerCase().match(/[a-z]{4,}/g) ?? [])
  if (!current.size || !previousAnswers.length) return 0
  let highest = 0
  for (const previous of previousAnswers.slice(-3)) {
    const older = new Set(previous.toLowerCase().match(/[a-z]{4,}/g) ?? [])
    if (!older.size) continue
    let overlap = 0
    for (const token of current) if (older.has(token)) overlap += 1
    highest = Math.max(highest, overlap / Math.max(current.size, older.size))
  }
  return highest
}

function reasoningScore(answer: string, classification: InterviewAnswerClassification, directness: number) {
  let score = 5 + directness * 0.07
  if (REASONING.test(answer)) score += 3
  if (ASSUMPTION.test(answer)) score += 2
  if (TESTING.test(answer)) score += 2
  if (ALTERNATIVE.test(answer)) score += 2
  if (/\b(?:first|second|then|therefore|so)\b/i.test(answer)) score += 1
  if (/\b(?:why|because|therefore|implies|follows)\b/i.test(answer) && CLAIM.test(answer)) score += 1
  score *= 0.55 + classificationWeight[classification] * 0.45
  const cap = classification === "incorrect" ? 13 : classification === "irrelevant" ? 10 : classification === "vague" ? 13 : classification === "partial" ? 21 : 25
  return clamp(score, 0, cap)
}

function subjectScore(answer: string, concepts: string[], classification: InterviewAnswerClassification, directness: number) {
  const hits = conceptHits(answer, concepts)
  const ratio = concepts.length ? Math.min(1, hits / Math.max(2, Math.min(4, concepts.length))) : 0
  let score = 6 + ratio * 10 + directness * 0.05
  if (PRECISION.test(answer)) score += 2
  if (REASONING.test(answer) && hits > 0) score += 2
  score *= 0.55 + classificationWeight[classification] * 0.45
  if (hits >= 2 && !REASONING.test(answer) && directness < 55) score = Math.min(score, 13)
  const cap = classification === "incorrect" ? 10 : classification === "irrelevant" ? 9 : classification === "vague" ? 13 : classification === "partial" ? 21 : 25
  return clamp(score, 0, cap)
}

function clarityScore(answer: string, directness: number, classification: InterviewAnswerClassification) {
  const words = wordCount(answer)
  let score = 5 + directness * 0.14
  if (CLAIM.test(answer)) score += 2
  if (PRECISION.test(answer)) score += 2
  if (words < 8) score -= 5
  if (words > 180) score -= 3
  if (words > 280) score -= 3
  const hedges = answer.match(HEDGE)?.length ?? 0
  score -= Math.min(4, hedges * 1.5)
  if (classification === "irrelevant") score = Math.min(score, 10)
  if (classification === "vague") score = Math.min(score, 13)
  return clamp(score)
}

function buildAssessments(turns: InterviewMarkingTurn[], concepts: string[], referenceAnswer?: string) {
  const assessments: TypedTurnAssessment[] = []
  const previousAnswers: string[] = []
  let currentQuestion = ""
  let candidateIndex = 0

  for (const turn of turns) {
    if (turn.role === "interviewer") {
      currentQuestion = turn.text.trim()
      continue
    }
    const answer = turn.text.trim()
    if (!answer) continue
    const local = evaluateInterviewAnswerLocally({
      question: currentQuestion,
      answer,
      concepts,
      referenceAnswer: candidateIndex === 0 ? referenceAnswer : undefined,
      previousAnswers,
    })
    const classification = turn.quality ?? local.classification
    assessments.push({
      question: currentQuestion,
      answer,
      classification,
      directness: local.directness,
      reasoning: reasoningScore(answer, classification, local.directness),
      subject: subjectScore(answer, concepts, classification, local.directness),
      clarity: clarityScore(answer, local.directness, classification),
      issue: local.issue,
    })
    previousAnswers.push(answer)
    candidateIndex += 1
  }
  return assessments
}

function flexibilityScore(assessments: TypedTurnAssessment[]) {
  if (!assessments.length) return 0
  let score = assessments.length >= 2 ? 7 : 5
  let revisions = 0
  let alternatives = 0
  let assumptionTests = 0
  let recoveries = 0
  const previous: string[] = []

  assessments.forEach((assessment, index) => {
    const answer = assessment.answer
    if (REVISION.test(answer)) revisions += 1
    if (ALTERNATIVE.test(answer)) alternatives += 1
    if (ASSUMPTION.test(answer) || TESTING.test(answer)) assumptionTests += 1
    if (index > 0) {
      const previousClassification = assessments[index - 1].classification
      if ((previousClassification === "partial" || previousClassification === "vague" || previousClassification === "incorrect") && assessment.classification === "responsive") recoveries += 1
      if (repetitionRatio(answer, previous) > 0.72 && !REVISION.test(answer)) score -= 2
    }
    previous.push(answer)
  })

  score += Math.min(5, alternatives * 2)
  score += Math.min(4, assumptionTests * 1.5)
  score += Math.min(4, revisions * 2.5)
  score += Math.min(5, recoveries * 2.5)
  const responsiveShare = assessments.filter(item => item.classification === "responsive").length / assessments.length
  score += responsiveShare * 4
  return clamp(score)
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function markTypedInterviewTranscript(input: {
  turns: InterviewMarkingTurn[]
  concepts: string[]
  referenceAnswer?: string
}): InterviewMarkingResult {
  const assessments = buildAssessments(input.turns, input.concepts, input.referenceAnswer)
  const reasoning = clamp(average(assessments.map(item => item.reasoning)))
  const subject = clamp(average(assessments.map(item => item.subject)))
  const flexibility = flexibilityScore(assessments)
  const clarity = clamp(average(assessments.map(item => item.clarity)))
  const total = reasoning + subject + flexibility + clarity

  const issueCounts = new Map<string, number>()
  for (const assessment of assessments) {
    if (assessment.issue === "none") continue
    issueCounts.set(assessment.issue, (issueCounts.get(assessment.issue) ?? 0) + 1)
  }
  const dominantIssue = [...issueCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const error = dominantIssue === "factual-error"
    ? "Accuracy and claim checking"
    : dominantIssue === "off-topic" || dominantIssue === "evasion"
      ? "Question focus"
      : dominantIssue === "missing-reasoning" || dominantIssue === "unsupported"
        ? "Reasoning link"
        : dominantIssue === "contradiction" || dominantIssue === "repetition"
          ? "Adaptability under challenge"
          : clarity < 15
            ? "Precision and concision"
            : "No dominant issue"

  const strengths: string[] = []
  const next: string[] = []

  if (reasoning >= 18) strengths.push("You made the inferential steps visible and justified rather than relying on conclusions alone.")
  else next.push("For each answer, make one explicit chain: claim → reason or mechanism → test/check → provisional conclusion.")

  if (subject >= 18) strengths.push("You applied subject knowledge to the unfamiliar problem instead of simply naming relevant terminology.")
  else next.push("Use fewer subject keywords and do more with them: explain exactly how the relevant principle changes the conclusion.")

  if (flexibility >= 18) strengths.push("You responded constructively to challenge by testing assumptions, considering alternatives or revising a position when needed.")
  else next.push("When challenged, do not repeat the first answer. Test an assumption, edge case, counterexample or alternative explanation and revise if necessary.")

  if (clarity >= 18) strengths.push("Your answers were direct and precise without needing unnecessary length to sound convincing.")
  else next.push("Answer the exact question first, then justify it. Typed answers are not rewarded for length, filler or technical vocabulary on its own.")

  if (assessments.some(item => item.classification === "incorrect")) {
    next.unshift("At least one answer contained a concrete error. Slow down at decisive values, directions, definitions or claims and check them before extending the argument.")
  }
  if (assessments.some(item => item.classification === "irrelevant")) {
    next.unshift("At least one response did not answer the question asked. State the direct answer before adding wider context.")
  }

  return {
    total,
    reasoning,
    subject,
    flexibility,
    clarity,
    error,
    strengths: strengths.slice(0, 4),
    next: [...new Set(next)].slice(0, 4),
    typedAnswers: assessments.length,
    rubricVersion: "2026.2",
    turnAssessments: assessments,
  }
}
