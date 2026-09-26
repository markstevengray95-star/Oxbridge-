import type { SkillState, StudentIntelligence, TutorAction } from "@/lib/personal-tutor"

type JsonRecord = Record<string, unknown>

type TutorDomain = "Interview" | "Admissions test" | "Writing"

export type TutorEvidenceQuality = {
  confidence: number
  freshness: "fresh" | "ageing" | "stale" | "none"
  coverage: "thin" | "developing" | "broad"
  latestEvidenceAt: string | null
  latestEvidenceAgeDays: number | null
  totalEvidenceCount: number
  coveredDomains: number
  freshDomains: number
  leastCurrentDomain: TutorDomain
  summary: string
  refreshAction: TutorAction
}

export type RefinedStudentIntelligence = StudentIntelligence & {
  evidenceQuality: TutorEvidenceQuality
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function dateValue(item: JsonRecord) {
  for (const key of ["date", "createdAt", "created_at", "completedAt", "completed_at", "updatedAt", "updated_at", "timestamp"]) {
    const raw = item[key]
    if (typeof raw !== "string" && typeof raw !== "number") continue
    const time = new Date(raw).getTime()
    if (Number.isFinite(time)) return time
  }
  return null
}

function latestDate(items: unknown[]) {
  const dates = items.map(item => dateValue(record(item))).filter((value): value is number => value !== null)
  return dates.length ? Math.max(...dates) : null
}

function ageDays(timestamp: number | null) {
  return timestamp === null ? null : Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000))
}

function stableKey(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function domainRefreshAction(domain: TutorDomain): TutorAction {
  if (domain === "Admissions test") return {
    id: "refresh-test-evidence",
    label: "Refresh your admissions-test evidence",
    note: "Complete a fresh full-paper section or targeted retest so the Tutor is not planning from an old score.",
    href: "/full-papers",
    minutes: 40,
    domain,
    priority: 120,
  }
  if (domain === "Writing") return {
    id: "refresh-writing-evidence",
    label: "Refresh your writing evidence",
    note: "Complete a new analysed response so the Tutor can check whether previous writing weaknesses still apply.",
    href: "/essay-tutor",
    minutes: 25,
    domain,
    priority: 120,
  }
  return {
    id: "refresh-interview-evidence",
    label: "Refresh your interview evidence",
    note: "Complete a fresh formal interview so the Tutor can check whether previous reasoning patterns still recur.",
    href: "/interview-room",
    minutes: 15,
    domain,
    priority: 120,
  }
}

export function buildTutorEvidenceQuality(progressValue: unknown, intelligence: StudentIntelligence): TutorEvidenceQuality {
  const progress = record(progressValue)
  const interviews = array(progress.logs)
  const papers = array(progress.fullPaperResults)
  const essays = array(progress.essayAnalyses)
  const interventions = array(progress.interventionResults)

  const counts: Record<TutorDomain, number> = {
    Interview: Math.max(interviews.length, intelligence.interviewCount),
    "Admissions test": papers.length + interventions.length,
    Writing: Math.max(essays.length, intelligence.essayCount),
  }
  const domainLatest: Record<TutorDomain, number | null> = {
    Interview: latestDate(interviews),
    "Admissions test": Math.max(latestDate(papers) ?? 0, latestDate(interventions) ?? 0) || null,
    Writing: latestDate(essays),
  }
  const domainAges: Record<TutorDomain, number | null> = {
    Interview: ageDays(domainLatest.Interview),
    "Admissions test": ageDays(domainLatest["Admissions test"]),
    Writing: ageDays(domainLatest.Writing),
  }

  const dates = Object.values(domainLatest).filter((value): value is number => value !== null)
  const latest = dates.length ? Math.max(...dates) : null
  const latestAgeDays = ageDays(latest)
  const totalEvidenceCount = counts.Interview + counts["Admissions test"] + counts.Writing
  const coveredDomains = Object.values(counts).filter(count => count > 0).length
  const freshDomains = (Object.entries(counts) as Array<[TutorDomain, number]>).filter(([domain, count]) => count > 0 && (domainAges[domain] ?? 999) <= 45).length
  const evidencedAges = (Object.entries(counts) as Array<[TutorDomain, number]>).filter(([, count]) => count > 0).map(([domain]) => domainAges[domain] ?? 999)
  const stalestEvidenceAge = evidencedAges.length ? Math.max(...evidencedAges) : null
  const freshness: TutorEvidenceQuality["freshness"] = totalEvidenceCount === 0
    ? "none"
    : stalestEvidenceAge !== null && stalestEvidenceAge <= 14
      ? "fresh"
      : stalestEvidenceAge !== null && stalestEvidenceAge <= 45
        ? "ageing"
        : "stale"
  const coverage: TutorEvidenceQuality["coverage"] = totalEvidenceCount >= 8 && coveredDomains === 3 ? "broad" : totalEvidenceCount >= 3 && coveredDomains >= 2 ? "developing" : "thin"

  const volumeScore = Math.min(100, totalEvidenceCount * 12)
  const breadthScore = coveredDomains * 33
  const currentDomainScore = coveredDomains ? Math.round((freshDomains / coveredDomains) * 100) : 0
  const recencyScore = freshness === "fresh" ? 100 : freshness === "ageing" ? 68 : freshness === "stale" ? 30 : totalEvidenceCount ? 48 : 0
  const confidence = clamp(volumeScore * 0.35 + breadthScore * 0.25 + recencyScore * 0.2 + currentDomainScore * 0.2)

  const leastCurrentDomain = (Object.keys(counts) as TutorDomain[]).sort((a, b) => {
    if (counts[a] === 0 && counts[b] > 0) return -1
    if (counts[b] === 0 && counts[a] > 0) return 1
    const ageA = domainAges[a] ?? 999
    const ageB = domainAges[b] ?? 999
    if (ageA !== ageB) return ageB - ageA
    return counts[a] - counts[b]
  })[0] ?? "Interview"
  const refreshAction = domainRefreshAction(leastCurrentDomain)

  const summary = totalEvidenceCount === 0
    ? "The Tutor has almost no scored evidence yet, so its first job is to build a useful baseline."
    : freshness === "stale"
      ? `At least one evidenced preparation area is now stale. Refresh ${leastCurrentDomain.toLowerCase()} evidence before treating the old diagnosis as current.`
      : coverage === "thin"
        ? `The Tutor has some evidence, but it is concentrated in too few preparation areas. ${leastCurrentDomain} is the best next area to strengthen the diagnosis.`
        : freshness === "ageing"
          ? `The evidence base is useful, but ${leastCurrentDomain.toLowerCase()} is the least current area and should be refreshed soon.`
          : "The Tutor has recent evidence across enough preparation activity to make a well-supported next-step recommendation."

  return {
    confidence,
    freshness,
    coverage,
    latestEvidenceAt: latest === null ? null : new Date(latest).toISOString(),
    latestEvidenceAgeDays: latestAgeDays,
    totalEvidenceCount,
    coveredDomains,
    freshDomains,
    leastCurrentDomain,
    summary,
    refreshAction,
  }
}

function priorityDiagnostic(skill: SkillState) {
  const evidencePenalty = skill.evidenceCount <= 1 ? 12 : skill.evidenceCount === 2 ? 5 : 0
  return skill.score + evidencePenalty
}

function actionForPriority(item: SkillState): TutorAction {
  if (item.domain === "Admissions test") return {
    id: `refined-${item.id}`,
    label: `Target ${item.label}`,
    note: `${item.score}% across ${item.evidenceCount} evidence point${item.evidenceCount === 1 ? "" : "s"}. Use a focused intervention followed by a fresh retest.`,
    href: "/paper-intervention",
    minutes: 18,
    domain: item.domain,
    priority: 112 - item.score,
  }
  if (item.domain === "Writing") return {
    id: `refined-${item.id}`,
    label: `Improve ${item.label}`,
    note: `${item.score}% across ${item.evidenceCount} evidence point${item.evidenceCount === 1 ? "" : "s"}. Rewrite, compare, then test whether the improvement transfers to a new prompt.`,
    href: "/essay-tutor",
    minutes: 20,
    domain: item.domain,
    priority: 112 - item.score,
  }
  return {
    id: `refined-${item.id}`,
    label: `Practise ${item.label}`,
    note: `${item.score}% across ${item.evidenceCount} evidence point${item.evidenceCount === 1 ? "" : "s"}. Use a fresh interview and deliberately test this reasoning behaviour.`,
    href: "/interview-room",
    minutes: 15,
    domain: item.domain,
    priority: 112 - item.score,
  }
}

export function refineStudentIntelligence(base: StudentIntelligence, progressValue: unknown): RefinedStudentIntelligence {
  const evidenceQuality = buildTutorEvidenceQuality(progressValue, base)
  const evidenced = base.skills.filter(skill => skill.evidenceCount > 0)
  const repeated = evidenced.filter(skill => skill.evidenceCount >= 2)
  const diagnosticPool = repeated.length ? repeated : evidenced
  const priority = diagnosticPool.length
    ? [...diagnosticPool].sort((a, b) => priorityDiagnostic(a) - priorityDiagnostic(b))[0]
    : base.priority
  const strongestPool = repeated.length ? repeated : evidenced
  const strongest = strongestPool.length ? [...strongestPool].sort((a, b) => b.score - a.score)[0] : base.strongest

  const weighted = evidenced.reduce((acc, skill) => {
    const weight = Math.min(4, Math.max(1, skill.evidenceCount))
    acc.total += skill.score * weight
    acc.weight += weight
    return acc
  }, { total: 0, weight: 0 })
  const preparationScore = weighted.weight ? clamp(weighted.total / weighted.weight) : base.preparationScore

  const mistakes = base.mistakes.map(item => item.id.startsWith("retest-")
    ? { ...item, id: `retest-${stableKey(`${item.domain}|${item.label}|${item.evidence}`)}` }
    : item)

  const recommendations: TutorAction[] = []
  if (evidenceQuality.freshness === "stale" || evidenceQuality.freshness === "none" || evidenceQuality.confidence < 45) {
    recommendations.push(evidenceQuality.refreshAction)
  }
  if (priority?.evidenceCount) recommendations.push(actionForPriority(priority))
  for (const action of base.recommendations) {
    if (recommendations.some(existing => existing.id === action.id || (existing.href === action.href && existing.domain === action.domain))) continue
    recommendations.push(action)
  }

  const priorityWithConfidence = priority && (evidenceQuality.freshness === "stale" || evidenceQuality.confidence < 45)
    ? { ...priority, note: `${priority.note} Treat this as provisional until a fresh task confirms it.` }
    : priority

  return {
    ...base,
    priority: priorityWithConfidence,
    strongest,
    mistakes,
    preparationScore,
    recommendations: recommendations.sort((a, b) => b.priority - a.priority).slice(0, 7),
    evidenceQuality,
  }
}
