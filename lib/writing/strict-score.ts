import { analyseOfflineEssayTask } from "./offline-review-v3"
import { analyseOfflineTopicAlignment } from "./offline-review-v2"
import type { WritingReport } from "./review"

export type UniversityEssayClassification =
  | "Exceptional First"
  | "First"
  | "High II.1"
  | "Upper Second (II.1)"
  | "Lower Second (II.2)"
  | "Third"
  | "Fail"

// Kept as an alias because older saved reviews use the `grade` field.
export type StrictEssayGrade = UniversityEssayClassification

export type StrictEssayScore = {
  score: number
  rawScore: number
  grade: StrictEssayGrade
  classification: UniversityEssayClassification
  descriptor: string
  components: Array<{
    label: string
    weight: number
    level: number
    earned: number
    reason: string
  }>
  caps: Array<{ maximum: number; reason: string }>
  topicLevel: number
  topicLabel: string
  taskLabel: string
  taskSatisfied: boolean
  confidence: "moderate" | "limited"
  note: string
}

const WEIGHTS = [25, 20, 15, 15, 10, 15] as const
const SCORE_PREFIX = "University-style practice mark:"

export const UNIVERSITY_CLASSIFICATION_BANDS = [
  { minimum: 85, label: "Exceptional First", descriptor: "Outstanding and memorable; first-class qualities are present to a remarkable degree." },
  { minimum: 70, label: "First", descriptor: "Excellent command of relevant material with close engagement, strong analysis and clear independent judgement." },
  { minimum: 67, label: "High II.1", descriptor: "Very strong upper-second work with some first-class qualities, but not consistently enough for a First." },
  { minimum: 60, label: "Upper Second (II.1)", descriptor: "Good, broad engagement with relevant material; clearly argued, well illustrated and relevant." },
  { minimum: 50, label: "Lower Second (II.2)", descriptor: "Competent and broadly relevant, but with significant weaknesses in focus, organisation, depth or analysis." },
  { minimum: 40, label: "Third", descriptor: "Basic understanding is visible, but there are substantial gaps, limited analysis or inconsistent relevance." },
  { minimum: 0, label: "Fail", descriptor: "Insufficient understanding, analysis or relevance for a passing university-style standard." },
] as const satisfies ReadonlyArray<{ minimum: number; label: UniversityEssayClassification; descriptor: string }>

function classificationFor(score: number): { classification: UniversityEssayClassification; descriptor: string } {
  const band = UNIVERSITY_CLASSIFICATION_BANDS.find(item => score >= item.minimum) ?? UNIVERSITY_CLASSIFICATION_BANDS[UNIVERSITY_CLASSIFICATION_BANDS.length - 1]
  return { classification: band.label, descriptor: band.descriptor }
}

function levelReason(level: number) {
  if (level === 4) return "First-class qualities: sustained relevance, strong analysis, precise expression and convincing support."
  if (level === 3) return "Upper-second qualities: clear, relevant and well organised, with good analysis but less consistent independence or depth."
  if (level === 2) return "Lower-second qualities: broadly competent and relevant, but with important weaknesses in depth, organisation or analytical control."
  if (level === 1) return "Third-class qualities: some understanding is present, but analysis, clarity or relevance is limited and inconsistent."
  return "Fail-standard evidence on this criterion: the required quality is not demonstrated sufficiently in the submitted draft."
}

export function scoreStrictEssay(report: WritingReport, prompt: string, essay: string): StrictEssayScore | null {
  if (!prompt.trim()) return null

  const components = report.criteria.map((criterion, index) => {
    const level = criterion.level ?? 0
    const weight = WEIGHTS[index] ?? 0
    return {
      label: criterion.label,
      weight,
      level,
      earned: Math.round((weight * level / 4) * 10) / 10,
      reason: levelReason(level),
    }
  })

  const rawScore = Math.round(components.reduce((sum, component) => sum + component.earned, 0))
  const topic = analyseOfflineTopicAlignment(prompt, essay)
  const task = analyseOfflineEssayTask(prompt, essay)
  const caps: StrictEssayScore["caps"] = []

  // These ceilings deliberately mirror the logic of university classification language:
  // a fluent answer cannot reach a high class if it fails to engage closely with the question.
  if (topic.level === 0) caps.push({ maximum: 39, reason: "The response is substantially irrelevant to the question or fails to address its core concepts; university marking language would treat gross irrelevance as fail-standard." })
  else if (topic.level === 1) caps.push({ maximum: 49, reason: "The response shows only limited engagement with the exact question; this cannot reach a secure Second-class standard." })
  else if (topic.level === 2) caps.push({ maximum: 59, reason: "The response is broadly relevant but only partially answers the exact question; this is capped within Lower Second (II.2) territory." })

  if (task.promptEchoRisk) caps.push({ maximum: 39, reason: "The introduction echoes the question, but the body does not sustain engagement with it." })
  if (!task.taskSatisfied) caps.push({ maximum: 59, reason: `The essay does not fully complete the required ${task.label} task; a good answer to the wrong or incomplete task should not rise above Lower Second (II.2) territory.` })

  const bodyParagraphs = Math.max(1, essay.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean).length - 2)
  if (task.potentialDriftParagraphs.length >= Math.max(2, Math.ceil(bodyParagraphs / 2))) {
    caps.push({ maximum: 59, reason: "A substantial proportion of the body is weakly related to the central argument, so the response cannot reach Upper Second or First-class standard." })
  }

  const reasoningLevel = report.criteria[1]?.level ?? 0
  if (reasoningLevel <= 1) caps.push({ maximum: 59, reason: "Reasoning and analysis are too limited for Upper Second or First-class standard." })

  const evidenceLevel = report.criteria[2]?.level ?? 0
  const evaluationLevel = report.criteria[3]?.level ?? 0
  if (evidenceLevel <= 1 && evaluationLevel <= 1) {
    caps.push({ maximum: 59, reason: "Both supporting material and evaluation are too limited for Upper Second or First-class standard." })
  }

  const maximum = caps.length ? Math.min(...caps.map(cap => cap.maximum)) : 100
  const score = Math.min(rawScore, maximum)
  const band = classificationFor(score)

  const paragraphs = essay.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean).length
  const confidence: StrictEssayScore["confidence"] = paragraphs >= 3 && topic.concepts.length >= 2 ? "moderate" : "limited"

  return {
    score,
    rawScore,
    grade: band.classification,
    classification: band.classification,
    descriptor: band.descriptor,
    components,
    caps: caps.sort((a, b) => a.maximum - b.maximum),
    topicLevel: topic.level,
    topicLabel: topic.label,
    taskLabel: task.label,
    taskSatisfied: task.taskSatisfied,
    confidence,
    note: "This is a strict ScholarBridge university-style practice classification, not an official Oxford or Cambridge admissions decision, degree mark, school grade or exam-board result. Oxford and Cambridge departments vary in their detailed marking conventions; this scale uses common Oxbridge-style class language to make the feedback more academically realistic.",
  }
}

export function attachStrictEssayScoring(report: WritingReport, prompt: string, essay: string) {
  const mark = scoreStrictEssay(report, prompt, essay)
  if (!mark || report.summary.startsWith(SCORE_PREFIX)) return { report, strictScore: mark }

  const caps = mark.caps.length
    ? ` Classification ceiling${mark.caps.length === 1 ? "" : "s"}: ${mark.caps.map(cap => `${cap.maximum}/100 (${cap.reason})`).join("; ")}.`
    : " No classification ceiling was triggered."
  report.summary = `${SCORE_PREFIX} ${mark.score}/100 — ${mark.classification} (${mark.descriptor}). Raw weighted mark: ${mark.rawScore}/100.${caps} ${report.summary}`

  report.criteria = report.criteria.map((criterion, index) => {
    const component = mark.components[index]
    if (!component || criterion.judgement.startsWith("University-style weighted mark:")) return criterion
    return {
      ...criterion,
      judgement: `University-style weighted mark: ${component.earned}/${component.weight}. ${criterion.judgement}`,
    }
  })

  report.limitations = [
    mark.note,
    ...report.limitations.filter(item => !/strict ScholarBridge .*practice/i.test(item)),
  ].slice(0, 5)

  return { report, strictScore: mark }
}
