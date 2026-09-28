import { inferUnderlyingSkill } from "@/lib/mistake-replay"

export const EXAM_INTELLIGENCE_KEY = "oxbridge-exam-intelligence-v1"

export type ExamQuestionLike = {
  id: string
  test?: string
  section?: string
  difficulty?: string
  prompt: string
  options?: string[]
  answer?: number
  explanation?: string
}

export type ExamAttemptObservation = {
  id: string
  questionId: string
  test: string
  section: string
  prompt: string
  difficulty?: string
  selectedAnswer?: string
  correctAnswer?: string
  correct: boolean
  rawMark?: number
  maxMarks?: number
  confidence: number
  reasoningNote?: string
  answerChanges: number
  flagged: boolean
  timeSpentSeconds: number
  createdAt: string
}

export type ReasoningProcessScore = {
  total: number
  method: number
  assumptions: number
  checking: number
  interpretation: number
  evidence: string[]
  nextAction: string
}

export type ExamErrorCause =
  | "confident misconception"
  | "knowledge gap"
  | "misread or rushed"
  | "method gap"
  | "execution or precision"
  | "indecision"
  | "low-confidence guess"
  | "time-pressure error"
  | "unclassified"

export type CalibrationSummary = {
  count: number
  meanConfidence: number
  accuracy: number
  calibrationGap: number
  brierScore: number
  highConfidenceErrors: number
  label: "well calibrated" | "slightly overconfident" | "slightly underconfident" | "overconfident" | "underconfident"
}

export type DifficultyCalibration = {
  questionId: string
  attempts: number
  accuracy: number
  medianSeconds: number
  observedBand: "Foundation" | "Stretch" | "Challenge" | "Insufficient data"
}

export type QuestionQualityFinding = {
  severity: "block" | "warn" | "info"
  code: string
  message: string
}

const METHOD = /\b(?:let|define|equation|formula|model|diagram|case|consider|suppose|first|then|rearrange|substitute|factor|differentiate|integrate|eliminate|compare|infer|premise|conclusion)\b/i
const ASSUMPTION = /\b(?:assum|suppose|provided|given|holding|constant|independent|ignore|neglect|approximately|ideal|condition)\b/i
const CHECK = /\b(?:check|verify|unit|dimension|limit|boundary|extreme|estimate|counterexample|substitute back|sanity|test)\b/i
const INTERPRET = /\b(?:therefore|hence|means|implies|so the|because|conclusion|interpret|physically|in context|this suggests)\b/i

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function scoreReasoningProcess(note: string | undefined): ReasoningProcessScore {
  const text = (note ?? "").trim()
  if (!text) return { total: 0, method: 0, assumptions: 0, checking: 0, interpretation: 0, evidence: [], nextAction: "Write one or two lines showing the method or inference you used before committing to the answer." }
  const words = text.split(/\s+/).filter(Boolean).length
  const evidence: string[] = []
  let method = METHOD.test(text) ? 3 : words >= 12 ? 1 : 0
  let assumptions = ASSUMPTION.test(text) ? 3 : 0
  let checking = CHECK.test(text) ? 3 : 0
  let interpretation = INTERPRET.test(text) ? 3 : words >= 18 ? 1 : 0
  if (/\d|[=<>≤≥√π²³×÷+−*/]/.test(text)) method = Math.min(4, method + 1)
  if (/\b(?:if|unless|only if|necessary|sufficient|counterexample)\b/i.test(text)) assumptions = Math.min(4, assumptions + 1)
  if (/\b(?:approximately|order of magnitude|reasonable|same sign|same units)\b/i.test(text)) checking = Math.min(4, checking + 1)
  if (/\b(?:therefore|hence|so)\b/i.test(text)) interpretation = Math.min(4, interpretation + 1)
  if (method) evidence.push("A method or inference was made explicit.")
  if (assumptions) evidence.push("An assumption, condition or logical dependency was exposed.")
  if (checking) evidence.push("The response included a check, boundary case, unit check or falsification step.")
  if (interpretation) evidence.push("The working connected the process back to a conclusion or interpretation.")
  const total = clamp((method + assumptions + checking + interpretation) / 16 * 100, 0, 100)
  const weakest = [[method, "method"], [assumptions, "assumptions"], [checking, "checking"], [interpretation, "interpretation"]] as const
  const key = [...weakest].sort((a, b) => a[0] - b[0])[0]?.[1]
  const nextAction = key === "method" ? "Name the method before using it and expose the decisive step."
    : key === "assumptions" ? "State the condition your reasoning depends on and ask what happens if it fails."
      : key === "checking" ? "Add one deliberate check: units, boundary case, substitution, counterexample or estimate."
        : "Finish by stating what the working actually proves or implies in the context of the question."
  return { total, method, assumptions, checking, interpretation, evidence, nextAction }
}

export function classifyExamError(attempt: ExamAttemptObservation): ExamErrorCause | "none" {
  if (attempt.correct) return "none"
  const reasoning = scoreReasoningProcess(attempt.reasoningNote)
  if (attempt.timeSpentSeconds > 0 && attempt.timeSpentSeconds < 12) return "misread or rushed"
  if (attempt.confidence >= 80) return "confident misconception"
  if (attempt.answerChanges >= 3) return "indecision"
  if (attempt.flagged && attempt.confidence <= 45) return "knowledge gap"
  if (attempt.timeSpentSeconds >= 150 && attempt.confidence <= 55) return "time-pressure error"
  if (reasoning.total >= 60) return "execution or precision"
  if (reasoning.method <= 1 && reasoning.assumptions <= 1) return "method gap"
  if (attempt.confidence <= 35) return "low-confidence guess"
  if (!attempt.reasoningNote?.trim()) return "low-confidence guess"
  return "unclassified"
}

export function confidenceCalibration(attempts: ExamAttemptObservation[]): CalibrationSummary {
  if (!attempts.length) return { count: 0, meanConfidence: 0, accuracy: 0, calibrationGap: 0, brierScore: 0, highConfidenceErrors: 0, label: "well calibrated" }
  const meanConfidence = mean(attempts.map(item => item.confidence))
  const accuracy = mean(attempts.map(item => item.correct ? 100 : 0))
  const calibrationGap = Math.round(meanConfidence - accuracy)
  const brierScore = Math.round(mean(attempts.map(item => {
    const probability = item.confidence / 100
    const outcome = item.correct ? 1 : 0
    return (probability - outcome) ** 2
  })) * 100) / 100
  const highConfidenceErrors = attempts.filter(item => !item.correct && item.confidence >= 80).length
  const label: CalibrationSummary["label"] = calibrationGap >= 18 ? "overconfident"
    : calibrationGap >= 8 ? "slightly overconfident"
      : calibrationGap <= -18 ? "underconfident"
        : calibrationGap <= -8 ? "slightly underconfident"
          : "well calibrated"
  return { count: attempts.length, meanConfidence: Math.round(meanConfidence), accuracy: Math.round(accuracy), calibrationGap, brierScore, highConfidenceErrors, label }
}

export function calibrateDifficulty(attempts: ExamAttemptObservation[]): DifficultyCalibration[] {
  const grouped = new Map<string, ExamAttemptObservation[]>()
  for (const attempt of attempts) grouped.set(attempt.questionId, [...(grouped.get(attempt.questionId) ?? []), attempt])
  return [...grouped.entries()].map(([questionId, items]) => {
    const accuracy = Math.round(mean(items.map(item => item.correct ? 100 : 0)))
    const attemptsCount = items.length
    const observedBand: DifficultyCalibration["observedBand"] = attemptsCount < 3 ? "Insufficient data" : accuracy >= 75 ? "Foundation" : accuracy >= 45 ? "Stretch" : "Challenge"
    return { questionId, attempts: attemptsCount, accuracy, medianSeconds: Math.round(median(items.map(item => item.timeSpentSeconds).filter(Boolean))), observedBand }
  }).sort((a, b) => b.attempts - a.attempts || a.accuracy - b.accuracy)
}

export function buildErrorDna(attempts: ExamAttemptObservation[]) {
  const counts = new Map<string, number>()
  for (const attempt of attempts) {
    const cause = classifyExamError(attempt)
    if (cause === "none") continue
    counts.set(cause, (counts.get(cause) ?? 0) + 1)
  }
  return [...counts.entries()].map(([cause, count]) => ({ cause: cause as ExamErrorCause, count, percent: attempts.length ? Math.round(count / attempts.length * 100) : 0 })).sort((a, b) => b.count - a.count)
}

export function buildPostExamDiagnostic(attempts: ExamAttemptObservation[]) {
  const calibration = confidenceCalibration(attempts)
  const errors = buildErrorDna(attempts)
  const wrong = attempts.filter(item => !item.correct)
  const skills = new Map<string, number>()
  for (const item of wrong) {
    const skill = inferUnderlyingSkill({ test: item.test, section: item.section, prompt: item.prompt })
    skills.set(skill, (skills.get(skill) ?? 0) + 1)
  }
  const skillBreakdown = [...skills.entries()].map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count)
  const reasoningAverage = Math.round(mean(attempts.map(item => scoreReasoningProcess(item.reasoningNote).total)))
  const priorities: string[] = []
  if (errors[0]) priorities.push(`Primary error pattern: ${errors[0].cause}.`)
  if (skillBreakdown[0]) priorities.push(`Most repeated underlying skill: ${skillBreakdown[0].skill}.`)
  if (calibration.highConfidenceErrors) priorities.push(`${calibration.highConfidenceErrors} high-confidence error${calibration.highConfidenceErrors === 1 ? "" : "s"} should be replayed first because they may represent durable misconceptions.`)
  if (reasoningAverage < 45) priorities.push("Make the method visible before selecting an answer; reasoning notes are currently too thin to diagnose securely.")
  if (!priorities.length) priorities.push("No dominant weakness is visible yet; use a larger sample before drawing conclusions.")
  return {
    attempts: attempts.length,
    accuracy: attempts.length ? Math.round(mean(attempts.map(item => item.correct ? 100 : 0))) : 0,
    calibration,
    errors,
    skillBreakdown,
    reasoningAverage,
    priorities,
  }
}

function normaliseOption(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
}

export function auditQuestionQuality(question: ExamQuestionLike): QuestionQualityFinding[] {
  const findings: QuestionQualityFinding[] = []
  const options = question.options ?? []
  if (!question.prompt.trim()) findings.push({ severity: "block", code: "empty-prompt", message: "Question prompt is empty." })
  if (options.length && (typeof question.answer !== "number" || question.answer < 0 || question.answer >= options.length)) findings.push({ severity: "block", code: "invalid-answer", message: "Marked answer is outside the option range." })
  if (options.length < 2) findings.push({ severity: "block", code: "too-few-options", message: "Multiple-choice question needs at least two answer options." })
  const normalised = options.map(normaliseOption)
  if (new Set(normalised).size !== normalised.length) findings.push({ severity: "block", code: "duplicate-options", message: "Two or more answer options are effectively duplicates." })
  if (options.length && typeof question.answer === "number") {
    const lengths = options.map(item => item.trim().length)
    const correctLength = lengths[question.answer] ?? 0
    const otherAverage = mean(lengths.filter((_, index) => index !== question.answer))
    if (otherAverage > 0 && correctLength > otherAverage * 1.35 && correctLength - otherAverage >= 12) findings.push({ severity: "warn", code: "longest-answer-bias", message: "The marked answer is substantially longer than the distractors and may be guessable by length." })
  }
  if (options.some(item => /\b(?:obviously|clearly|always|never|all of the above|none of the above)\b/i.test(item))) findings.push({ severity: "warn", code: "option-giveaway", message: "An option uses an absolute or meta-answer phrase that can create test-taking clues." })
  if (question.prompt.length < 18) findings.push({ severity: "warn", code: "thin-stem", message: "The stem is unusually short; check that the reasoning demand is explicit and unambiguous." })
  if (!question.explanation?.trim()) findings.push({ severity: "warn", code: "missing-explanation", message: "No explanation is stored for independent verification or feedback." })
  if (question.explanation && question.explanation.length < 35) findings.push({ severity: "info", code: "short-explanation", message: "The explanation is brief; consider storing the decisive reasoning step, not just the answer." })
  if (!findings.length) findings.push({ severity: "info", code: "local-pass", message: "No structural giveaway was detected locally. Independent solution checking is still recommended." })
  return findings
}

export function mutationInstruction(question: ExamQuestionLike, target: "same" | "harder" | "far-transfer") {
  const skill = inferUnderlyingSkill({ test: question.test, section: question.section, prompt: question.prompt })
  const mode = target === "same" ? "change numbers, surface context and distractors while preserving the same underlying reasoning demand"
    : target === "harder" ? "add one extra condition, representation switch or dependency so the same skill requires a deeper chain"
      : "move the same underlying skill into a substantially different context so recognition of the original wording cannot help"
  return `Create a new ${question.test ?? "admissions-test"} practice question for ${skill}. ${mode}. Do not copy distinctive wording from the source. Keep one unambiguously best answer and provide a concise independent explanation.`
}
