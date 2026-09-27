import {
  markTypedInterviewTranscript as markBaseTranscript,
  type InterviewMarkingResult,
  type InterviewMarkingTurn,
  type TypedTurnAssessment,
} from "./interview-marking"

export * from "./interview-marking"

const SPECIFIC_RELATION = /\b(?:same temperature|equal temperature|different temperature|faster|slower|higher|lower|warmer|cooler|increases?|decreases?|causes?|leads? to|results? in|proportional|inversely|directly|because .{0,55}\b(?:than|so|therefore)|if .{0,55}\bthen)\b/i
const GENERIC_META = /\b(?:important scientific ideas|relevant concepts|scientists use|in many situations|experiments are useful|data and measurements|several concepts are relevant|there are many factors)\b/i

function words(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function conceptHits(answer: string, concepts: string[]) {
  const lower = answer.toLowerCase()
  return concepts.filter(concept => {
    const clean = concept.trim().toLowerCase()
    return clean.length >= 3 && lower.includes(clean)
  }).length
}

function looksLikeKeywordDump(answer: string, concepts: string[]) {
  const count = conceptHits(answer, concepts)
  const manyConcepts = count >= Math.min(4, Math.max(3, concepts.length - 1))
  const longEnoughToHide = words(answer) >= 45
  const noConcreteRelationship = !SPECIFIC_RELATION.test(answer)
  const metaLanguage = GENERIC_META.test(answer)
  return manyConcepts && longEnoughToHide && (noConcreteRelationship || metaLanguage)
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function round25(value: number) {
  return Math.max(0, Math.min(25, Math.round(value)))
}

function rebuildFeedback(result: InterviewMarkingResult, keywordDumped: boolean) {
  const strengths: string[] = []
  const next: string[] = []

  if (result.reasoning >= 18) strengths.push("You made the inferential steps visible and justified rather than relying on conclusions alone.")
  else next.push("Make one explicit chain in each answer: direct claim → reason or mechanism → check/test → provisional conclusion.")

  if (result.subject >= 18) strengths.push("You applied subject knowledge to the unfamiliar problem instead of simply naming relevant terminology.")
  else next.push(keywordDumped
    ? "Relevant terminology was present, but it was not doing enough analytical work. Use fewer terms and show the exact relationship or mechanism between them."
    : "Use the relevant subject principle to change or justify the conclusion, rather than mentioning it without application.")

  if (result.flexibility >= 18) strengths.push("You responded constructively to challenge by testing assumptions, considering alternatives or revising a position when needed.")
  else next.push("When challenged, test an assumption, edge case, counterexample or alternative explanation instead of repeating the original position.")

  if (result.clarity >= 18) strengths.push("Your answers were direct and precise without needing unnecessary length to sound convincing.")
  else next.push("State the direct answer first. Extra length, filler and technical vocabulary do not increase the score unless they advance the reasoning.")

  return { strengths: strengths.slice(0, 4), next: [...new Set(next)].slice(0, 4) }
}

export function markTypedInterviewTranscript(input: {
  turns: InterviewMarkingTurn[]
  concepts: string[]
  referenceAnswer?: string
}): InterviewMarkingResult {
  const base = markBaseTranscript(input)
  let keywordDumped = false

  const turnAssessments: TypedTurnAssessment[] = base.turnAssessments.map(assessment => {
    if (!looksLikeKeywordDump(assessment.answer, input.concepts)) return assessment
    keywordDumped = true
    return {
      ...assessment,
      classification: assessment.classification === "incorrect" || assessment.classification === "irrelevant" ? assessment.classification : "vague",
      reasoning: Math.min(assessment.reasoning, 11),
      subject: Math.min(assessment.subject, 12),
      clarity: Math.min(assessment.clarity, 14),
      issue: assessment.issue === "factual-error" ? assessment.issue : "unsupported",
    }
  })

  const reasoning = round25(average(turnAssessments.map(item => item.reasoning)))
  const subject = round25(average(turnAssessments.map(item => item.subject)))
  const clarity = round25(average(turnAssessments.map(item => item.clarity)))
  const flexibility = keywordDumped ? Math.min(base.flexibility, 14) : base.flexibility
  const total = reasoning + subject + flexibility + clarity
  const error = keywordDumped ? "Reasoning link" : base.error
  const feedback = rebuildFeedback({ ...base, reasoning, subject, clarity, flexibility, total, turnAssessments, error }, keywordDumped)

  return {
    ...base,
    reasoning,
    subject,
    flexibility,
    clarity,
    total,
    error,
    strengths: feedback.strengths,
    next: feedback.next,
    turnAssessments,
  }
}
