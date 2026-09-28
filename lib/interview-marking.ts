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
  issue: string
  directness: number
  reasoning: number
  accuracy: number
  responsiveness: number
  evidence: number
  communication: number
  notes: string[]
}

export type InterviewMarkingResult = {
  total: number
  reasoning: number
  accuracy: number
  responsiveness: number
  adaptability: number
  evidence: number
  communication: number
  error: string
  band: "Exceptional practice" | "Strong" | "Promising" | "Developing" | "Limited evidence"
  strengths: string[]
  next: string[]
  typedAnswers: number
  rubricVersion: "2026.3"
  turnAssessments: TypedTurnAssessment[]
}

const REASONING = /\b(?:because|therefore|since|hence|implies?|so that|which means|as a result|if|then|assuming|given|follows|leads to|causes?|depends on)\b/i
const ASSUMPTION = /\b(?:assum(?:e|ing|ption)|suppose|provided that|holding .* constant|ceteris paribus|depends on|under the condition)\b/i
const TESTING = /\b(?:test|check|measure|compare|control|evidence|data|experiment|counterexample|edge case|limiting case|falsif|distinguish|predict|observe)\b/i
const ALTERNATIVE = /\b(?:however|alternatively|another explanation|on the other hand|counterexample|instead|unless|whereas|could also|a different|another possibility|rival)\b/i
const REVISION = /\b(?:actually|on reflection|i would revise|i'd revise|i would change|i'd change|i was wrong|let me correct|my earlier answer|thinking again|given that|with that new information)\b/i
const EXPLICIT_CLAIM = /\b(?:my answer is|i would say|my view is|therefore|so the answer|this means|i conclude|it follows|the result is|the stronger explanation is|the most likely explanation is)\b/i
const QUANTITATIVE = /(?:\d|[=<>≤≥√π²³×÷+−*/%])/
const SPECIFICITY = /\b(?:specifically|for example|for instance|approximately|proportional|gradient|rate|unit|mechanism|evidence|because|therefore|compared with|relative to)\b/i
const SPECIFIC_RELATION = /\b(?:same temperature|equal temperature|different temperature|faster|slower|more quickly|more slowly|higher|lower|warmer|cooler|increases?|decreases?|causes?|leads? to|results? in|proportional|inversely|directly|because .{0,55}\b(?:than|so|therefore)|if .{0,55}\bthen)\b/i
const META_FILLER = /\b(?:as an ai|as a language model|this is a complex question|there are many factors to consider|in today's society|throughout history|it is important to note|important scientific ideas|relevant concepts|scientists use|in many situations|experiments are useful|several concepts are relevant)\b/i

const classificationFactor: Record<InterviewAnswerClassification, number> = {
  incorrect: 0.34,
  irrelevant: 0.24,
  vague: 0.42,
  partial: 0.72,
  responsive: 1,
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
}

function conceptHits(answer: string, concepts: string[]) {
  const lower = answer.toLowerCase()
  return concepts.filter(concept => {
    const clean = concept.trim().toLowerCase()
    return clean.length >= 3 && lower.includes(clean)
  }).length
}

function looksLikeKeywordDump(answer: string, concepts: string[]) {
  const hits = conceptHits(answer, concepts)
  const manyConcepts = hits >= Math.min(4, Math.max(3, concepts.length - 1))
  return wordCount(answer) >= 35 && manyConcepts && (META_FILLER.test(answer) || !SPECIFIC_RELATION.test(answer))
}

function lexicalSet(text: string) {
  return new Set(text.toLowerCase().match(/[a-z]{4,}/g) ?? [])
}

function repetitionRatio(answer: string, previous: string[]) {
  const current = lexicalSet(answer)
  if (!current.size || !previous.length) return 0
  let best = 0
  for (const olderAnswer of previous.slice(-3)) {
    const older = lexicalSet(olderAnswer)
    if (!older.size) continue
    let overlap = 0
    for (const token of current) if (older.has(token)) overlap += 1
    best = Math.max(best, overlap / Math.max(current.size, older.size))
  }
  return best
}

function reasoningScore(answer: string, classification: InterviewAnswerClassification, directness: number) {
  let score = 7 + directness * 0.09
  if (REASONING.test(answer)) score += 4
  if (ASSUMPTION.test(answer)) score += 3
  if (TESTING.test(answer)) score += 3
  if (ALTERNATIVE.test(answer)) score += 2
  if (QUANTITATIVE.test(answer)) score += 1
  score *= 0.62 + classificationFactor[classification] * 0.38
  const cap = classification === "incorrect" ? 17 : classification === "irrelevant" ? 11 : classification === "vague" ? 15 : classification === "partial" ? 22 : 25
  return clamp(score, 0, cap)
}

function accuracyScore(answer: string, concepts: string[], classification: InterviewAnswerClassification) {
  const hits = conceptHits(answer, concepts)
  let score = 9
  if (classification === "responsive") score = 16
  if (classification === "partial") score = 12
  if (classification === "vague") score = 8
  if (classification === "irrelevant") score = 5
  if (classification === "incorrect") score = 3
  score += Math.min(3, hits)
  if (REASONING.test(answer) && hits > 0) score += 1
  return clamp(score, 0, 20)
}

function responsivenessScore(classification: InterviewAnswerClassification, directness: number, answer: string) {
  let score = directness * 0.12
  if (classification === "responsive") score += 3
  if (classification === "partial") score += 1
  if (classification === "irrelevant") score -= 4
  if (META_FILLER.test(answer)) score -= 2
  const cap = classification === "irrelevant" ? 5 : classification === "vague" ? 9 : classification === "incorrect" ? 8 : classification === "partial" ? 12 : 15
  return clamp(score, 0, cap)
}

function evidenceScore(answer: string, classification: InterviewAnswerClassification) {
  let score = 4
  if (TESTING.test(answer)) score += 4
  if (ASSUMPTION.test(answer)) score += 2
  if (ALTERNATIVE.test(answer)) score += 2
  if (SPECIFICITY.test(answer) || QUANTITATIVE.test(answer)) score += 2
  if (classification === "responsive") score += 1
  if (classification === "incorrect") score = Math.min(score, 8)
  if (classification === "irrelevant") score = Math.min(score, 6)
  if (classification === "vague") score = Math.min(score, 8)
  return clamp(score, 0, 15)
}

function communicationScore(answer: string, classification: InterviewAnswerClassification, directness: number) {
  const words = wordCount(answer)
  // Communication has deliberately low weight. Typed candidates are not rewarded for verbosity,
  // polished prose, spelling or formal grammar. A concise mathematical answer can score fully.
  let score = 2 + directness * 0.025
  if (EXPLICIT_CLAIM.test(answer) || QUANTITATIVE.test(answer) || SPECIFICITY.test(answer)) score += 1
  if (words <= 2 && !QUANTITATIVE.test(answer)) score -= 2
  if (META_FILLER.test(answer)) score -= 1
  if (classification === "irrelevant") score = Math.min(score, 2)
  if (classification === "vague") score = Math.min(score, 3)
  return clamp(score, 0, 5)
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
    const suppliedClassification = turn.quality ?? local.classification
    const keywordDump = looksLikeKeywordDump(answer, concepts)
    const classification: InterviewAnswerClassification = keywordDump && suppliedClassification !== "incorrect" && suppliedClassification !== "irrelevant"
      ? "vague"
      : suppliedClassification
    const issue = keywordDump && local.issue === "none" ? "unsupported" : local.issue
    const notes: string[] = []
    if (classification === "responsive") notes.push("Answered the question sufficiently to justify a deeper academic challenge.")
    if (classification === "partial") notes.push("Contained a usable idea but left an important reasoning step or condition unresolved.")
    if (classification === "incorrect") notes.push("Contained a concrete factual, mathematical or logical claim that needs repair.")
    if (classification === "irrelevant") notes.push("Did not directly answer the question being asked.")
    if (classification === "vague") notes.push("Did not yet expose enough specific reasoning to evaluate securely.")
    if (keywordDump) notes.push("Relevant terminology was present, but listing concepts did not substitute for applying them to the problem.")
    if (REASONING.test(answer)) notes.push("Made at least part of the reasoning chain explicit.")
    if (ASSUMPTION.test(answer)) notes.push("Identified or tested an assumption.")
    if (ALTERNATIVE.test(answer)) notes.push("Considered an alternative, counterexample or qualification.")
    if (TESTING.test(answer)) notes.push("Suggested evidence, a check or a way to discriminate between explanations.")

    assessments.push({
      question: currentQuestion,
      answer,
      classification,
      issue,
      directness: local.directness,
      reasoning: reasoningScore(answer, classification, local.directness),
      accuracy: accuracyScore(answer, concepts, classification),
      responsiveness: responsivenessScore(classification, local.directness, answer),
      evidence: evidenceScore(answer, classification),
      communication: communicationScore(answer, classification, local.directness),
      notes,
    })
    previousAnswers.push(answer)
    candidateIndex += 1
  }

  return assessments
}

function adaptabilityScore(assessments: TypedTurnAssessment[]) {
  if (!assessments.length) return 0
  if (assessments.length === 1) return 8

  let score = 6
  const previousAnswers: string[] = []

  assessments.forEach((assessment, index) => {
    const answer = assessment.answer
    if (REVISION.test(answer)) score += 3
    if (ALTERNATIVE.test(answer)) score += 2
    if (ASSUMPTION.test(answer) || TESTING.test(answer)) score += 1.5

    if (index > 0) {
      const previousClassification = assessments[index - 1].classification
      if (["incorrect", "vague", "partial"].includes(previousClassification) && assessment.classification === "responsive") score += 4
      if (repetitionRatio(answer, previousAnswers) > 0.72 && !REVISION.test(answer)) score -= 3
    }
    previousAnswers.push(answer)
  })

  const responsiveShare = assessments.filter(item => item.classification === "responsive").length / assessments.length
  score += responsiveShare * 3
  return clamp(score, 0, 20)
}

function bandFor(total: number): InterviewMarkingResult["band"] {
  if (total >= 85) return "Exceptional practice"
  if (total >= 70) return "Strong"
  if (total >= 55) return "Promising"
  if (total >= 40) return "Developing"
  return "Limited evidence"
}

export function markTypedInterviewTranscript(input: {
  turns: InterviewMarkingTurn[]
  concepts: string[]
  referenceAnswer?: string
}): InterviewMarkingResult {
  const assessments = buildAssessments(input.turns, input.concepts, input.referenceAnswer)
  const reasoning = clamp(average(assessments.map(item => item.reasoning)), 0, 25)
  const accuracy = clamp(average(assessments.map(item => item.accuracy)), 0, 20)
  const responsiveness = clamp(average(assessments.map(item => item.responsiveness)), 0, 15)
  const adaptability = adaptabilityScore(assessments)
  const evidence = clamp(average(assessments.map(item => item.evidence)), 0, 15)
  const communication = clamp(average(assessments.map(item => item.communication)), 0, 5)
  const total = reasoning + accuracy + responsiveness + adaptability + evidence + communication

  const issueCounts = new Map<string, number>()
  for (const assessment of assessments) {
    if (assessment.issue === "none") continue
    issueCounts.set(assessment.issue, (issueCounts.get(assessment.issue) ?? 0) + 1)
  }
  const dominantIssue = [...issueCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const error = dominantIssue === "factual-error"
    ? "Accuracy and claim checking"
    : dominantIssue === "off-topic" || dominantIssue === "evasion"
      ? "Answering the exact question"
      : dominantIssue === "missing-reasoning" || dominantIssue === "unsupported"
        ? "Making the reasoning chain explicit"
        : dominantIssue === "contradiction" || dominantIssue === "repetition"
          ? "Adapting under challenge"
          : adaptability < 11
            ? "Adapting when the problem changes"
            : "No dominant issue"

  const strengths: string[] = []
  const next: string[] = []

  if (reasoning >= 19) strengths.push("You exposed the reasoning process rather than only presenting conclusions.")
  else next.push("Make the inferential chain visible: claim → reason/mechanism → check → provisional conclusion.")

  if (accuracy >= 15) strengths.push("Your main claims were generally accurate enough for the interviewer to keep increasing the difficulty.")
  else next.push("Slow down at decisive values, definitions, causal directions and assumptions before extending the argument.")

  if (responsiveness >= 11) strengths.push("You usually answered the precise question that had just been asked.")
  else next.push("Lead with a direct answer to the exact prompt before adding wider context.")

  if (adaptability >= 15) strengths.push("You adapted constructively when challenged, including revising or testing assumptions rather than defending the first answer automatically.")
  else next.push("When the interviewer changes a condition, explicitly say what in your earlier reasoning survives and what now needs to change.")

  if (evidence >= 11) strengths.push("You used examples, tests, evidence or discriminating checks rather than relying on assertion alone.")
  else next.push("Add one discriminating check: evidence, a counterexample, a limiting case, a calculation or an observation that could change your view.")

  if (communication <= 2) next.push("Make the core claim easier to locate. This rubric does not reward long prose, spelling or polished style; it only needs the reasoning to be interpretable.")

  return {
    total,
    reasoning,
    accuracy,
    responsiveness,
    adaptability,
    evidence,
    communication,
    error,
    band: bandFor(total),
    strengths: strengths.slice(0, 5),
    next: [...new Set(next)].slice(0, 5),
    typedAnswers: assessments.length,
    rubricVersion: "2026.3",
    turnAssessments: assessments,
  }
}
