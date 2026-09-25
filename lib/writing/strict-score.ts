import { analyseOfflineEssayTask } from "./offline-review-v3"
import { analyseOfflineTopicAlignment } from "./offline-review-v2"
import type { WritingReport } from "./review"

export type StrictEssayGrade = "A*" | "A" | "B" | "C" | "D" | "E" | "U"

export type StrictEssayScore = {
  score: number
  rawScore: number
  grade: StrictEssayGrade
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

function gradeFor(score: number): { grade: StrictEssayGrade; descriptor: string } {
  if (score >= 85) return { grade: "A*", descriptor: "Exceptional practice standard" }
  if (score >= 75) return { grade: "A", descriptor: "Very strong practice standard" }
  if (score >= 65) return { grade: "B", descriptor: "Strong practice standard" }
  if (score >= 55) return { grade: "C", descriptor: "Secure but not yet consistently strong" }
  if (score >= 45) return { grade: "D", descriptor: "Developing; important weaknesses remain" }
  if (score >= 35) return { grade: "E", descriptor: "Weak; substantial revision needed" }
  return { grade: "U", descriptor: "Not yet meeting the practice standard" }
}

function levelReason(level: number) {
  if (level === 4) return "Convincing: precise, sustained and well supported."
  if (level === 3) return "Secure: clear and specific, but not consistently exceptional."
  if (level === 2) return "Developing: partly successful, with important gaps."
  if (level === 1) return "Emerging: asserted or present only weakly."
  return "Not demonstrated in the submitted draft."
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

  if (topic.level === 0) caps.push({ maximum: 29, reason: "The response is off-topic or does not address enough of the question's core concepts." })
  else if (topic.level === 1) caps.push({ maximum: 44, reason: "The response has only a weak match to the exact question." })
  else if (topic.level === 2) caps.push({ maximum: 59, reason: "The response is related to the topic but only partially answers the exact question." })

  if (task.promptEchoRisk) caps.push({ maximum: 39, reason: "The introduction echoes the prompt, but the body does not sustain the question." })
  if (!task.taskSatisfied) caps.push({ maximum: 64, reason: `The essay does not fully complete the required ${task.label} task.` })

  const bodyParagraphs = Math.max(1, essay.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean).length - 2)
  if (task.potentialDriftParagraphs.length >= Math.max(2, Math.ceil(bodyParagraphs / 2))) {
    caps.push({ maximum: 64, reason: "A substantial proportion of the body appears to drift away from the exact question." })
  }

  const reasoningLevel = report.criteria[1]?.level ?? 0
  if (reasoningLevel <= 1) caps.push({ maximum: 54, reason: "Reasoning is too weak or unsupported for a high overall mark." })

  const evidenceLevel = report.criteria[2]?.level ?? 0
  const evaluationLevel = report.criteria[3]?.level ?? 0
  if (evidenceLevel <= 1 && evaluationLevel <= 1) {
    caps.push({ maximum: 54, reason: "Both evidence and evaluation are too limited for a high overall mark." })
  }

  const maximum = caps.length ? Math.min(...caps.map(cap => cap.maximum)) : 100
  const score = Math.min(rawScore, maximum)
  const band = gradeFor(score)

  const paragraphs = essay.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean).length
  const confidence: StrictEssayScore["confidence"] = paragraphs >= 3 && topic.concepts.length >= 2 ? "moderate" : "limited"

  return {
    score,
    rawScore,
    grade: band.grade,
    descriptor: band.descriptor,
    components,
    caps: caps.sort((a, b) => a.maximum - b.maximum),
    topicLevel: topic.level,
    topicLabel: topic.label,
    taskLabel: task.label,
    taskSatisfied: task.taskSatisfied,
    confidence,
    note: "This is a strict ScholarBridge practice score, not an official Oxford, Cambridge, school, exam-board or admissions mark. It is designed to make weaknesses reduce the score rather than be averaged away.",
  }
}
