import { inferUnderlyingSkill } from "@/lib/mistake-replay"
import type { ExamAttemptObservation } from "@/lib/exam-intelligence"
import type { TargetedPracticeAttempt } from "@/lib/feedback-practice"

export const LEARNING_TRAJECTORY_KEY = "oxbridge-learning-trajectory-v1"

export type TrajectoryEvidenceSource = "exam" | "targeted-practice" | "interview" | "full-paper"

export type SkillEvidenceEvent = {
  id: string
  skill: string
  source: TrajectoryEvidenceSource
  score: number
  confidence?: number
  createdAt: string
  context?: string
  secure?: boolean
  highConfidenceError?: boolean
}

export type SkillTrajectory = {
  skill: string
  mastery: number
  trend: "rising" | "stable" | "falling" | "new"
  evidenceCount: number
  sourceCount: number
  stability: "fragile" | "developing" | "stable" | "robust"
  dueAt: string
  dueNow: boolean
  lastEvidenceAt: string
  highConfidenceErrors: number
  recentAverage: number
  earlierAverage: number
  evidence: SkillEvidenceEvent[]
}

export type LearningTrajectorySummary = {
  generatedAt: string
  skills: SkillTrajectory[]
  dueSkills: SkillTrajectory[]
  strongest: SkillTrajectory[]
  priorities: SkillTrajectory[]
  overallMastery: number
  evidenceCount: number
  crossContextSkills: number
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function safeDate(value: unknown) {
  const text = typeof value === "string" ? value : ""
  const parsed = Date.parse(text)
  return Number.isFinite(parsed) ? new Date(parsed) : new Date(0)
}

function recencyWeight(date: Date, now: Date) {
  const days = Math.max(0, (now.getTime() - date.getTime()) / 86_400_000)
  if (days <= 2) return 1.35
  if (days <= 7) return 1.18
  if (days <= 21) return 1
  if (days <= 60) return 0.82
  return 0.65
}

function normaliseLabel(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

export function examEvidence(attempts: ExamAttemptObservation[]): SkillEvidenceEvent[] {
  return attempts.map(attempt => {
    const skill = inferUnderlyingSkill({ test: attempt.test, section: attempt.section, prompt: attempt.prompt })
    const reasoningBonus = attempt.reasoningNote?.trim() ? 8 : 0
    const base = attempt.correct ? 82 : 24
    const calibrationAdjustment = attempt.correct
      ? attempt.confidence >= 55 ? 6 : 0
      : attempt.confidence >= 80 ? -12 : attempt.confidence <= 35 ? 2 : 0
    return {
      id: `exam:${attempt.id}`,
      skill,
      source: "exam",
      score: clamp(base + reasoningBonus + calibrationAdjustment),
      confidence: attempt.confidence,
      createdAt: attempt.createdAt,
      context: `${attempt.test} · ${attempt.section}`,
      secure: Boolean(attempt.correct && attempt.confidence >= 60),
      highConfidenceError: Boolean(!attempt.correct && attempt.confidence >= 80),
    }
  })
}

export function targetedPracticeEvidence(attempts: TargetedPracticeAttempt[]): SkillEvidenceEvent[] {
  return attempts.map((attempt, index) => {
    const inferred = normaliseLabel((attempt as TargetedPracticeAttempt & { skill?: string }).skill || "Targeted reasoning")
    const classificationScore = attempt.classification === "secure" ? 92 : attempt.classification === "developing" ? 62 : 30
    return {
      id: `targeted:${attempt.id || index}`,
      skill: inferred,
      source: "targeted-practice",
      score: classificationScore,
      createdAt: attempt.createdAt,
      context: (attempt as TargetedPracticeAttempt & { contextShift?: string }).contextShift || "Transfer practice",
      secure: attempt.classification === "secure",
    }
  })
}

export function interviewEvidence(progress: Record<string, unknown>): SkillEvidenceEvent[] {
  const logs = Array.isArray(progress.logs) ? progress.logs as Array<Record<string, unknown>> : []
  const events: SkillEvidenceEvent[] = []
  for (const [logIndex, log] of logs.entries()) {
    const profile = log.evidenceProfile
    if (!profile || typeof profile !== "object") continue
    const dimensions = Array.isArray((profile as { dimensions?: unknown[] }).dimensions)
      ? (profile as { dimensions: Array<Record<string, unknown>> }).dimensions
      : []
    const createdAt = typeof log.date === "string" ? log.date : new Date(0).toISOString()
    for (const [dimensionIndex, dimension] of dimensions.entries()) {
      const label = typeof dimension.label === "string" ? normaliseLabel(dimension.label) : "Interview reasoning"
      const rawScore = Number(dimension.score ?? 0)
      const score = clamp(rawScore / 4 * 100)
      events.push({
        id: `interview:${String(log.id ?? logIndex)}:${dimensionIndex}`,
        skill: label,
        source: "interview",
        score,
        createdAt,
        context: typeof log.title === "string" ? log.title : "Reasoning interview",
        secure: rawScore >= 3,
      })
    }
  }
  return events
}

export function fullPaperEvidence(progress: Record<string, unknown>): SkillEvidenceEvent[] {
  const results = Array.isArray(progress.fullPaperResults) ? progress.fullPaperResults as Array<Record<string, unknown>> : []
  const events: SkillEvidenceEvent[] = []
  for (const [paperIndex, result] of results.entries()) {
    const reviews = Array.isArray(result.questionReview) ? result.questionReview as Array<Record<string, unknown>> : []
    const createdAt = typeof result.date === "string" ? result.date : new Date(0).toISOString()
    for (const [questionIndex, review] of reviews.entries()) {
      const prompt = typeof review.prompt === "string" ? review.prompt : ""
      if (!prompt) continue
      const test = typeof result.test === "string" ? result.test : "Admissions test"
      const section = typeof review.section === "string" ? review.section : "General"
      const maxMarks = Math.max(1, Number(review.maxMarks ?? 1))
      const rawMark = Math.max(0, Number(review.rawMark ?? 0))
      const proportion = Math.max(0, Math.min(1, rawMark / maxMarks))
      events.push({
        id: `paper:${String(result.id ?? paperIndex)}:${String(review.questionId ?? questionIndex)}`,
        skill: inferUnderlyingSkill({ test, section, prompt }),
        source: "full-paper",
        score: clamp(20 + proportion * 75),
        createdAt,
        context: `${test} · ${section}`,
        secure: proportion >= 1,
      })
    }
  }
  return events
}

function retestIntervalDays(mastery: number, stability: SkillTrajectory["stability"], hasHighConfidenceError: boolean) {
  if (hasHighConfidenceError) return 0
  if (mastery < 45) return 1
  if (mastery < 60) return 2
  if (mastery < 72) return 4
  if (mastery < 84) return stability === "fragile" ? 5 : 7
  if (mastery < 92) return stability === "robust" ? 14 : 10
  return stability === "robust" ? 21 : 14
}

function trajectoryFor(skill: string, events: SkillEvidenceEvent[], now: Date): SkillTrajectory {
  const ordered = [...events].sort((a, b) => safeDate(a.createdAt).getTime() - safeDate(b.createdAt).getTime())
  const weighted = ordered.map(event => ({ event, weight: recencyWeight(safeDate(event.createdAt), now) * (event.source === "targeted-practice" ? 1.1 : event.source === "interview" ? 1.05 : 1) }))
  const numerator = weighted.reduce((sum, item) => sum + item.event.score * item.weight, 0)
  const denominator = weighted.reduce((sum, item) => sum + item.weight, 0) || 1
  const mastery = clamp(numerator / denominator)
  const split = Math.max(1, Math.floor(ordered.length / 2))
  const earlier = ordered.slice(0, split)
  const recent = ordered.slice(split)
  const earlierAverage = clamp(mean(earlier.map(item => item.score)))
  const recentAverage = clamp(mean((recent.length ? recent : earlier).map(item => item.score)))
  const delta = recentAverage - earlierAverage
  const trend: SkillTrajectory["trend"] = ordered.length < 3 ? "new" : delta >= 8 ? "rising" : delta <= -8 ? "falling" : "stable"
  const sourceCount = new Set(ordered.map(item => item.source)).size
  const secureCount = ordered.filter(item => item.secure).length
  const stability: SkillTrajectory["stability"] = ordered.length < 2 || sourceCount < 2 ? "fragile"
    : secureCount >= 5 && sourceCount >= 3 ? "robust"
      : secureCount >= 3 && sourceCount >= 2 ? "stable"
        : "developing"
  const latest = ordered[ordered.length - 1]
  const highConfidenceErrors = ordered.filter(item => item.highConfidenceError).length
  const dueDays = retestIntervalDays(mastery, stability, highConfidenceErrors > 0 && safeDate(latest.createdAt).getTime() >= now.getTime() - 7 * 86_400_000)
  const dueAtDate = safeDate(latest.createdAt)
  dueAtDate.setUTCDate(dueAtDate.getUTCDate() + dueDays)
  const dueAt = dueAtDate.toISOString()
  return {
    skill,
    mastery,
    trend,
    evidenceCount: ordered.length,
    sourceCount,
    stability,
    dueAt,
    dueNow: dueAtDate.getTime() <= now.getTime(),
    lastEvidenceAt: latest.createdAt,
    highConfidenceErrors,
    recentAverage,
    earlierAverage,
    evidence: [...ordered].reverse().slice(0, 12),
  }
}

export function buildLearningTrajectory(input: {
  examAttempts?: ExamAttemptObservation[]
  targetedAttempts?: TargetedPracticeAttempt[]
  progress?: Record<string, unknown>
  now?: Date
}): LearningTrajectorySummary {
  const now = input.now ?? new Date()
  const events = [
    ...examEvidence(input.examAttempts ?? []),
    ...targetedPracticeEvidence(input.targetedAttempts ?? []),
    ...interviewEvidence(input.progress ?? {}),
    ...fullPaperEvidence(input.progress ?? {}),
  ].filter(event => event.skill.trim())
  const grouped = new Map<string, SkillEvidenceEvent[]>()
  for (const event of events) grouped.set(event.skill, [...(grouped.get(event.skill) ?? []), event])
  const skills = [...grouped.entries()].map(([skill, skillEvents]) => trajectoryFor(skill, skillEvents, now))
    .sort((a, b) => a.mastery - b.mastery || b.evidenceCount - a.evidenceCount)
  const dueSkills = skills.filter(item => item.dueNow).sort((a, b) => a.mastery - b.mastery || b.highConfidenceErrors - a.highConfidenceErrors)
  const priorities = [...skills].sort((a, b) => {
    const aPriority = (a.dueNow ? 30 : 0) + (a.highConfidenceErrors ? 18 : 0) + (a.trend === "falling" ? 14 : 0) + (100 - a.mastery)
    const bPriority = (b.dueNow ? 30 : 0) + (b.highConfidenceErrors ? 18 : 0) + (b.trend === "falling" ? 14 : 0) + (100 - b.mastery)
    return bPriority - aPriority
  }).slice(0, 6)
  const strongest = [...skills].sort((a, b) => b.mastery - a.mastery || b.sourceCount - a.sourceCount).slice(0, 5)
  return {
    generatedAt: now.toISOString(),
    skills,
    dueSkills,
    strongest,
    priorities,
    overallMastery: skills.length ? clamp(mean(skills.map(item => item.mastery))) : 0,
    evidenceCount: events.length,
    crossContextSkills: skills.filter(item => item.sourceCount >= 2).length,
  }
}

export function recommendedSession(summary: LearningTrajectorySummary) {
  const picks = summary.priorities.slice(0, 3)
  return picks.map((item, index) => ({
    skill: item.skill,
    reason: item.highConfidenceErrors
      ? "Recent high-confidence error"
      : item.trend === "falling"
        ? "Performance is falling across recent evidence"
        : item.dueNow
          ? "Spaced retest is due"
          : "Lowest current mastery",
    mode: index === 0 && item.sourceCount >= 2 ? "far-transfer" : item.mastery < 55 ? "repair" : "mixed-transfer",
    minutes: item.mastery < 55 ? 12 : 8,
  }))
}
