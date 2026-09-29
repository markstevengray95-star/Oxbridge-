export type TwinDimensionKey = "testReadiness" | "interviewReasoning" | "writingQuality" | "applicationEvidence" | "consistency" | "recovery"

export type TwinDimension = {
  key: TwinDimensionKey
  label: string
  score: number
  confidence: "low" | "medium" | "high"
  evidence: string
  nextAction: string
  href: string
}

export type TwinInput = {
  testResults: Array<{ accuracy?: number | null; raw_score?: number | null; max_raw_marks?: number | null; completed_at?: string | null }>
  interviews: Array<{ overall_feedback?: Record<string, unknown> | null; interview_turns?: Array<{ role?: string; content?: string; feedback?: string | null }> }>
  essayScores: number[]
  applicationEvidenceCount: number
  applicationFieldsCompleted: number
  applicationFieldsTotal: number
}

export type DigitalTwinSummary = {
  readiness: number
  confidence: "low" | "medium" | "high"
  dimensions: TwinDimension[]
  strongest: TwinDimension
  priority: TwinDimension
  evidenceItems: number
  completedActivities: number
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function average(values: number[], fallback = 0) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback
}

function confidenceFromCount(count: number): "low" | "medium" | "high" {
  if (count >= 6) return "high"
  if (count >= 2) return "medium"
  return "low"
}

function interviewScore(item: TwinInput["interviews"][number]) {
  const direct = item.overall_feedback?.score
  if (typeof direct === "number" && Number.isFinite(direct)) return clamp(direct)
  const candidateTurns = (item.interview_turns ?? []).filter(turn => turn.role === "candidate")
  if (!candidateTurns.length) return 50
  const detailed = candidateTurns.filter(turn => (turn.feedback ?? "").trim().length >= 20).length
  return clamp(45 + (detailed / candidateTurns.length) * 35)
}

function recoveryScore(interviews: TwinInput["interviews"]) {
  const turns = interviews.flatMap(item => item.interview_turns ?? []).filter(turn => turn.role === "candidate")
  if (!turns.length) return 45
  const recoveryLanguage = turns.filter(turn => /\b(i would revise|actually|on reflection|i need to change|instead|a better way|my first answer)\b/i.test(turn.content ?? "")).length
  const evidence = turns.filter(turn => /\b(because|therefore|so that|which means|however|assuming|if .* then)\b/i.test(turn.content ?? "")).length
  return clamp(40 + Math.min(30, recoveryLanguage * 8) + Math.min(30, (evidence / turns.length) * 35))
}

export function buildApplicationDigitalTwin(input: TwinInput): DigitalTwinSummary {
  const testScores = input.testResults.map(result => {
    if (typeof result.accuracy === "number") return clamp(result.accuracy)
    if (typeof result.raw_score === "number" && typeof result.max_raw_marks === "number" && result.max_raw_marks > 0) return clamp((result.raw_score / result.max_raw_marks) * 100)
    return 50
  })
  const interviewScores = input.interviews.map(interviewScore)
  const essays = input.essayScores.filter(score => Number.isFinite(score)).map(clamp)
  const applicationCompletion = input.applicationFieldsTotal > 0 ? (input.applicationFieldsCompleted / input.applicationFieldsTotal) * 100 : 0
  const evidenceScore = clamp(applicationCompletion * 0.6 + Math.min(40, input.applicationEvidenceCount * 6.5))
  const allPerformance = [...testScores, ...interviewScores, ...essays]
  const consistency = allPerformance.length >= 2
    ? clamp(100 - Math.min(70, Math.max(...allPerformance) - Math.min(...allPerformance)))
    : 45
  const recovery = recoveryScore(input.interviews)

  const dimensions: TwinDimension[] = [
    {
      key: "testReadiness",
      label: "Admissions-test readiness",
      score: clamp(average(testScores, 45)),
      confidence: confidenceFromCount(testScores.length),
      evidence: testScores.length ? `${testScores.length} completed paper${testScores.length === 1 ? "" : "s"}` : "No completed full paper is synced yet",
      nextAction: "Complete a timed paper, then review the lowest-performing section rather than only the final mark.",
      href: "/full-papers",
    },
    {
      key: "interviewReasoning",
      label: "Interview reasoning",
      score: clamp(average(interviewScores, 45)),
      confidence: confidenceFromCount(interviewScores.length),
      evidence: interviewScores.length ? `${interviewScores.length} saved interview${interviewScores.length === 1 ? "" : "s"}` : "No saved interview transcript yet",
      nextAction: "Replay one difficult interview moment and improve the reasoning, not just the wording.",
      href: "/interview-replay",
    },
    {
      key: "writingQuality",
      label: "Academic writing",
      score: clamp(average(essays, 45)),
      confidence: confidenceFromCount(essays.length),
      evidence: essays.length ? `${essays.length} marked essay${essays.length === 1 ? "" : "s"}` : "No essay-analysis score is available yet",
      nextAction: "Analyse one essay against its exact task and revise the highest-priority reasoning weakness.",
      href: "/essay-tutor",
    },
    {
      key: "applicationEvidence",
      label: "Application evidence",
      score: evidenceScore,
      confidence: input.applicationFieldsCompleted >= 5 ? "high" : input.applicationFieldsCompleted >= 2 ? "medium" : "low",
      evidence: `${input.applicationFieldsCompleted}/${input.applicationFieldsTotal} profile areas completed · ${input.applicationEvidenceCount} evidence item${input.applicationEvidenceCount === 1 ? "" : "s"}`,
      nextAction: "Add concrete reading, project or written-work evidence and prepare to defend what you learned from it.",
      href: "/application-profile",
    },
    {
      key: "consistency",
      label: "Consistency under pressure",
      score: consistency,
      confidence: confidenceFromCount(allPerformance.length),
      evidence: allPerformance.length >= 2 ? `${allPerformance.length} scored activities compared` : "More scored activity is needed to estimate consistency",
      nextAction: "Use mixed practice across tests, writing and interviews so strong performance transfers between formats.",
      href: "/tutor",
    },
    {
      key: "recovery",
      label: "Recovery & self-correction",
      score: recovery,
      confidence: confidenceFromCount(input.interviews.length),
      evidence: input.interviews.length ? "Estimated from candidate turns and visible revisions in saved transcripts" : "No transcript evidence yet",
      nextAction: "Practise noticing a weak assumption, revising it aloud and continuing without restarting the whole answer.",
      href: "/interview-replay",
    },
  ]

  const strongest = [...dimensions].sort((a, b) => b.score - a.score)[0]
  const priority = [...dimensions].sort((a, b) => a.score - b.score)[0]
  const evidenceItems = input.applicationEvidenceCount + input.testResults.length + input.interviews.length + essays.length
  const readiness = clamp(average(dimensions.map(item => item.score), 0))
  return {
    readiness,
    confidence: confidenceFromCount(evidenceItems),
    dimensions,
    strongest,
    priority,
    evidenceItems,
    completedActivities: input.testResults.length + input.interviews.length + essays.length,
  }
}
