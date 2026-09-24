export type DeepMetric = {
  id: "independence" | "adaptability" | "retention" | "transfer" | "calibration" | "consistency"
  label: string
  score: number
  evidence: string
  next: string
}

export type DifficultyLevel = "Foundation" | "Standard" | "Stretch" | "Oxbridge"
export type ReadinessItem = { id: string; label: string; done: boolean; evidence: string; href: string }
export type HeatmapItem = { label: string; score: number; note: string }
export type AutopilotAction = { id: string; label: string; note: string; href: string; minutes: number; kind: string }

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : []
const num = (value: unknown, fallback = 0) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback }
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
const avg = (values: number[], fallback = 0) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback

export function deriveDeepMetrics(progressValue: unknown): DeepMetric[] {
  const progress = asRecord(progressValue)
  const logs = asArray(progress.logs).map(asRecord)
  const papers = asArray(progress.fullPaperResults).map(asRecord)
  const interventions = asArray(progress.interventionResults).map(asRecord)
  const essays = asArray(progress.essayAnalyses).map(asRecord)
  const hintEvents = asArray(progress.hintEvents).map(asRecord)
  const confidenceLogs = asArray(progress.confidenceLogs).map(asRecord)
  const transferChecks = asArray(progress.transferChecks).map(asRecord)

  const hintWeights: Record<string, number> = { independent: 100, clarification: 82, light: 68, substantial: 45, worked: 22 }
  const independenceValues = hintEvents.slice(-20).map(item => hintWeights[String(item.level ?? "independent")] ?? 70)
  const interviewFlexibility = logs.slice(0, 10).map(item => num(asRecord(item.dimensions).flexibility) * 4).filter(Boolean)
  const retentionValues = interventions.slice(0, 10).map(item => num(item.retestAccuracy)).filter(value => value > 0)
  const transferValues = transferChecks.slice(-12).map(item => num(item.score)).filter(value => value > 0)
  const calibrationValues = confidenceLogs.slice(-16).map(item => {
    const confidence = num(item.confidence)
    const performance = num(item.score)
    if (!confidence && !performance) return 0
    const confidencePercent = confidence <= 5 ? confidence * 20 : confidence
    return clamp(100 - Math.abs(confidencePercent - performance))
  }).filter(Boolean)

  const recentScores = [
    ...logs.slice(0, 5).map(item => num(item.score)),
    ...papers.slice(0, 5).map(item => num(item.accuracy)),
    ...essays.slice(0, 5).map(item => num(item.overall)),
  ].filter(value => value > 0)
  const consistency = recentScores.length < 2 ? 50 : clamp(100 - Math.min(50, Math.max(...recentScores) - Math.min(...recentScores)) * 1.5)

  return [
    { id: "independence", label: "Independence", score: clamp(avg(independenceValues, hintEvents.length ? 60 : 50)), evidence: hintEvents.length ? `${hintEvents.length} recent support-level records.` : "No hint-dependency baseline yet.", next: "Aim to solve the next unfamiliar task with one less level of support." },
    { id: "adaptability", label: "Adaptability", score: clamp(avg(interviewFlexibility, logs.length ? 55 : 50)), evidence: logs.length ? `${logs.length} saved interview session${logs.length === 1 ? "" : "s"}.` : "No interview baseline yet.", next: "Practise changing your model when the interviewer changes an assumption or gives new evidence." },
    { id: "retention", label: "Retention", score: clamp(avg(retentionValues, interventions.length ? 55 : 45)), evidence: interventions.length ? `${interventions.length} intervention retest${interventions.length === 1 ? "" : "s"}.` : "No delayed retention evidence yet.", next: "Repeat an intervention after a delay rather than immediately after learning." },
    { id: "transfer", label: "Transfer", score: clamp(avg(transferValues, transferChecks.length ? 55 : 45)), evidence: transferChecks.length ? `${transferChecks.length} cross-context transfer check${transferChecks.length === 1 ? "" : "s"}.` : "No cross-context transfer checks yet.", next: "Use the same reasoning skill in a different representation, topic or problem type." },
    { id: "calibration", label: "Confidence calibration", score: clamp(avg(calibrationValues, confidenceLogs.length ? 60 : 50)), evidence: confidenceLogs.length ? `${confidenceLogs.length} confidence/performance comparison${confidenceLogs.length === 1 ? "" : "s"}.` : "No confidence calibration baseline yet.", next: "Predict your confidence before feedback, then compare it with performance." },
    { id: "consistency", label: "Consistency", score: consistency, evidence: recentScores.length ? `${recentScores.length} recent scored pieces of evidence across the platform.` : "Not enough scored evidence yet.", next: "Build repeated evidence across tests, writing and interview work rather than relying on one strong session." },
  ]
}

export function adaptiveDifficulty(metrics: DeepMetric[]): DifficultyLevel {
  const core = metrics.filter(item => item.id === "independence" || item.id === "transfer" || item.id === "adaptability")
  const score = avg(core.map(item => item.score), 50)
  if (score >= 82) return "Oxbridge"
  if (score >= 68) return "Stretch"
  if (score >= 52) return "Standard"
  return "Foundation"
}

export function readinessChecklist(progressValue: unknown): ReadinessItem[] {
  const progress = asRecord(progressValue)
  const logs = asArray(progress.logs)
  const papers = asArray(progress.fullPaperResults)
  const essays = asArray(progress.essayAnalyses)
  const interventions = asArray(progress.interventionResults)
  const activities = asArray(progress.activities)
  const writtenDefences = asArray(progress.writtenWorkDefences)
  const unseen = asArray(progress.unseenMaterialResults)
  const transfer = asArray(progress.transferChecks)
  return [
    { id: "test", label: "Admissions-test baseline established", done: papers.length > 0, evidence: papers.length ? `${papers.length} full paper${papers.length === 1 ? "" : "s"} completed.` : "Complete one full paper.", href: "/full-papers" },
    { id: "interview", label: "Multiple unfamiliar interviews completed", done: logs.length >= 3, evidence: `${logs.length} saved interview${logs.length === 1 ? "" : "s"}.`, href: "/gemini-live-interview" },
    { id: "writing", label: "Writing feedback cycle established", done: essays.length >= 2, evidence: `${essays.length} analysed essay${essays.length === 1 ? "" : "s"}.`, href: "/essay-comparison" },
    { id: "retention", label: "Delayed retention checked", done: interventions.some(item => num(asRecord(item).retestAccuracy) >= 70), evidence: interventions.length ? `${interventions.length} intervention record${interventions.length === 1 ? "" : "s"}.` : "No delayed retest evidence yet.", href: "/paper-intervention" },
    { id: "written", label: "Submitted/important written work defended", done: writtenDefences.length > 0, evidence: writtenDefences.length ? `${writtenDefences.length} defence record${writtenDefences.length === 1 ? "" : "s"}.` : "No written-work defence recorded.", href: "/written-work-defence" },
    { id: "reading", label: "Academic reading discussed critically", done: activities.filter(item => String(asRecord(item).type ?? "").toLowerCase().includes("reading")).length >= 3, evidence: `${activities.length} academic activity record${activities.length === 1 ? "" : "s"}.`, href: "/reading-curriculum" },
    { id: "unseen", label: "Unseen-material practice completed", done: unseen.length > 0, evidence: unseen.length ? `${unseen.length} unseen-material result${unseen.length === 1 ? "" : "s"}.` : "No unseen-material result yet.", href: "/pre-interview-material" },
    { id: "transfer", label: "Transfer demonstrated in a new context", done: transfer.some(item => num(asRecord(item).score) >= 70), evidence: transfer.length ? `${transfer.length} transfer check${transfer.length === 1 ? "" : "s"}.` : "No transfer check yet.", href: "/tutor-autopilot" },
  ]
}

export function interviewHeatmap(progressValue: unknown): HeatmapItem[] {
  const progress = asRecord(progressValue)
  const logs = asArray(progress.logs).map(asRecord).slice(0, 12)
  const text = logs.flatMap(item => asArray(item.events).map(String)).join(" ").toLowerCase()
  const dimensions = logs.map(item => asRecord(item.dimensions))
  const flex = avg(dimensions.map(item => num(item.flexibility) * 4).filter(Boolean), 50)
  const reasoning = avg(dimensions.map(item => num(item.reasoning) * 4).filter(Boolean), 50)
  const clarity = avg(dimensions.map(item => num(item.clarity) * 4).filter(Boolean), 50)
  const subject = avg(dimensions.map(item => num(item.subject) * 4).filter(Boolean), 50)
  const challengeMentions = (text.match(/challenge|counter|assumption|different angle/g) || []).length
  const evidenceMentions = (text.match(/new evidence|data|graph|information/g) || []).length
  return [
    { label: "Initial unfamiliar question", score: clamp(reasoning), note: "How clearly the first reasoning chain is exposed." },
    { label: "Counterexample / challenge", score: clamp((flex + Math.min(100, challengeMentions * 12)) / 2), note: "Response when the interviewer pushes against the first answer." },
    { label: "New evidence", score: clamp((flex + Math.min(100, evidenceMentions * 18)) / 2), note: "Ability to update a view when new information arrives." },
    { label: "Definition / precision", score: clamp((subject + clarity) / 2), note: "Precision when asked to define or justify a term." },
    { label: "Being challenged while correct", score: clamp((reasoning + flex) / 2), note: "Maintaining justified reasoning without becoming rigid or abandoning it too quickly." },
    { label: "Changed conditions", score: clamp(flex), note: "Ability to preserve the useful structure of an argument while modifying assumptions." },
  ]
}

export function nextMockRecommendation(progressValue: unknown) {
  const progress = asRecord(progressValue)
  const logs = asArray(progress.logs).map(asRecord)
  const last = logs[0]
  const lastDate = last?.date ? new Date(String(last.date)) : null
  const daysSince = lastDate && Number.isFinite(lastDate.getTime()) ? Math.max(0, Math.floor((Date.now() - lastDate.getTime()) / 86400000)) : 999
  const metrics = deriveDeepMetrics(progress)
  const weak = metrics.filter(item => item.score < 65)
  const due = logs.length < 2 || (daysSince >= 7 && weak.length <= 3)
  return {
    due,
    label: due ? "Full mock is useful now" : "Targeted practice first",
    reason: logs.length < 2 ? "You still need a reliable interview baseline." : weak.length > 3 ? "Several core behaviours remain below 65%; targeted work will be more useful than another full mock." : daysSince < 7 ? "Your last mock was recent; use targeted practice before repeating a full simulation." : "Enough time and targeted work have passed to make another mock informative.",
    href: due ? "/mock-day" : "/tutor-autopilot",
  }
}

export function buildAutopilotPlan(progressValue: unknown, minutes: number): AutopilotAction[] {
  const metrics = deriveDeepMetrics(progressValue)
  const weakest = [...metrics].sort((a, b) => a.score - b.score)
  const plan: AutopilotAction[] = []
  const push = (action: AutopilotAction) => { if (plan.reduce((sum, item) => sum + item.minutes, 0) + action.minutes <= minutes) plan.push(action) }
  const primary = weakest[0]
  if (primary.id === "retention") push({ id: "retention", label: "Delayed retention check", note: "Revisit a previous weakness after a delay so success is not just same-session familiarity.", href: "/paper-intervention", minutes: 10, kind: "Retest" })
  else if (primary.id === "transfer") push({ id: "transfer", label: "Transfer challenge", note: "Use your weakest reasoning habit in a different context and representation.", href: "/tutor-autopilot#challenge", minutes: 10, kind: "Transfer" })
  else push({ id: "adaptive", label: `Adaptive ${adaptiveDifficulty(metrics)} challenge`, note: `Current priority: ${primary.label}. The difficulty changes with independence and transfer evidence.`, href: "/tutor-autopilot#challenge", minutes: 10, kind: "Adaptive" })
  push({ id: "interview", label: "Adaptive interview pressure test", note: "Use a fresh problem and deliberately test response to challenge, changed conditions and hints.", href: "/gemini-live-interview", minutes: 15, kind: "Interview" })
  push({ id: "reading", label: "Reading synthesis", note: "Compare two academic ideas and explain how new evidence changes the stronger argument.", href: "/reading-curriculum", minutes: 10, kind: "Reading" })
  push({ id: "reflection", label: "Evidence reflection", note: "Record where your thinking changed, what you initially missed, and what you will try next time.", href: "/tutor", minutes: 5, kind: "Reflection" })
  if (!plan.length) plan.push({ id: "short", label: "Focused Tutor challenge", note: "Use one difficult question and a two-minute reflection.", href: "/tutor-autopilot#challenge", minutes: Math.max(5, minutes), kind: "Adaptive" })
  return plan
}
