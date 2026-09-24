export const WEEKLY_PROGRAMME_STATE_KEY = "oxbridge-premium-weekly-programme-v2"

export type WeeklyTask = {
  id: string
  label: string
  note: string
  href: string
  minutes: number
  domain: string
  target?: string
}

export type WeeklyDay = {
  id: string
  day: number
  date: string
  title: string
  rationale: string
  tasks: WeeklyTask[]
}

export type WeeklyProgramme = {
  version: 2
  weekStart: string
  generatedAt: string
  course: string
  dailyMinutes: number
  focus: string
  rationale: string
  evidenceUsed: string[]
  days: WeeklyDay[]
  completedIds: string[]
}

export type WeeklyProgrammeInput = {
  course?: string | null
  dailyMinutes?: number | null
  snapshot?: unknown
  mistakes?: unknown[] | null
  evidence?: unknown[] | null
  applicationCount?: number | null
  supercurricularCount?: number | null
  now?: Date
}

type RecordValue = Record<string, unknown>
type TaskSeed = Omit<WeeklyTask, "id" | "minutes"> & { minutes?: number }

function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {}
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function safeHref(value: unknown, fallback: string) {
  const href = text(value)
  return href.startsWith("/") && !href.startsWith("//") ? href : fallback
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "task"
}

function localLondonDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const map = new Map(parts.map(part => [part.type, part.value]))
  return {
    year: Number(map.get("year")),
    month: Number(map.get("month")),
    day: Number(map.get("day")),
  }
}

export function londonWeekStart(date = new Date()) {
  const local = localLondonDateParts(date)
  const localNoonUtc = new Date(Date.UTC(local.year, local.month - 1, local.day, 12))
  localNoonUtc.setUTCDate(localNoonUtc.getUTCDate() - localNoonUtc.getUTCDay())
  return localNoonUtc.toISOString().slice(0, 10)
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function recommendationSeeds(snapshot: RecordValue) {
  return list(snapshot.recommendations)
    .map(record)
    .map((item, index): TaskSeed | null => {
      const label = text(item.label)
      if (!label) return null
      return {
        label,
        note: text(item.note, "Target a current preparation priority using fresh evidence."),
        href: safeHref(item.href, "/tutor-autopilot"),
        minutes: Math.max(10, Math.min(45, numberValue(item.minutes, 18))),
        domain: text(item.domain, "Priority"),
        target: text(item.target, label),
      }
    })
    .filter((item): item is TaskSeed => Boolean(item))
    .slice(0, 7)
}

function weakestEvidence(rows: unknown[]) {
  return rows
    .map(record)
    .filter(item => Number.isFinite(Number(item.score)))
    .sort((a, b) => numberValue(a.score, 100) - numberValue(b.score, 100))[0]
}

function fitTasks(day: number, dailyMinutes: number, seeds: TaskSeed[]) {
  const output: WeeklyTask[] = []
  let remaining = dailyMinutes
  const seen = new Set<string>()

  for (const seed of seeds) {
    if (output.length >= 3 || remaining < 8) break
    const key = `${seed.href}|${seed.label}`
    if (seen.has(key)) continue
    seen.add(key)
    const preferred = Math.max(8, Math.min(45, seed.minutes ?? 15))
    const minutes = Math.min(preferred, remaining)
    if (minutes < 8) continue
    output.push({ ...seed, id: `d${day}-${slug(seed.label)}-${output.length + 1}`, minutes })
    remaining -= minutes
  }

  if (!output.length) {
    output.push({
      id: `d${day}-baseline`,
      label: "Build a useful baseline",
      note: "Complete one active preparation task so the tutor has fresh evidence for the next plan.",
      href: "/tutor-autopilot",
      minutes: Math.max(10, dailyMinutes),
      domain: "Baseline",
    })
  }

  return output
}

export function generateWeeklyProgramme(input: WeeklyProgrammeInput): WeeklyProgramme {
  const now = input.now ?? new Date()
  const weekStart = londonWeekStart(now)
  const snapshot = record(input.snapshot)
  const profile = record(snapshot.profile)
  const dailyMinutes = Math.max(20, Math.min(120, Math.round(numberValue(input.dailyMinutes, 45))))
  const course = text(input.course, text(profile.course, "General Oxbridge preparation"))
  const recommendations = recommendationSeeds(snapshot)
  const priority = record(snapshot.priority)
  const priorityLabel = text(priority.label, recommendations[0]?.label ?? "Build an evidence baseline")
  const priorityHref = safeHref(priority.href, recommendations[0]?.href ?? "/tutor-autopilot")
  const priorityNote = text(priority.note, recommendations[0]?.note ?? `Build stronger evidence around ${priorityLabel}.`)

  const mistakeRows = (input.mistakes ?? []).map(record)
  const topMistake = mistakeRows[0]
  const mistakeLabel = text(topMistake.label, priorityLabel)
  const weakEvidence = weakestEvidence(input.evidence ?? [])
  const weakSkill = text(weakEvidence?.skill, priorityLabel)
  const weakScore = weakEvidence ? numberValue(weakEvidence.score, 0) : null
  const hasApplication = numberValue(input.applicationCount, 0) > 0
  const hasReading = numberValue(input.supercurricularCount, 0) > 0

  const priorityTask: TaskSeed = {
    label: `Target ${priorityLabel}`,
    note: priorityNote,
    href: priorityHref,
    minutes: Math.min(25, Math.max(14, Math.round(dailyMinutes * 0.55))),
    domain: text(priority.domain, "Priority"),
    target: priorityLabel,
  }

  const evidenceUsed = [
    `Current priority: ${priorityLabel}`,
    topMistake && `Recurring issue: ${mistakeLabel}`,
    weakEvidence && `Lowest recent evidence: ${weakSkill}${weakScore === null ? "" : ` (${Math.round(weakScore)}%)`}`,
    hasApplication && "Application evidence available for defence practice",
    hasReading && "Saved supercurricular evidence available for discussion practice",
  ].filter((item): item is string => Boolean(item)).slice(0, 5)

  const daySeeds: Array<{ title: string; rationale: string; tasks: TaskSeed[] }> = [
    {
      title: "Set the week's priority",
      rationale: `Start with ${priorityLabel} while the evidence is fresh, then check the wider preparation picture.`,
      tasks: [priorityTask, recommendations[1] ?? { label: "Check preparation readiness", note: "Identify any neglected preparation area before the week becomes too narrow.", href: "/preparation-readiness", minutes: 12, domain: "Planning" }],
    },
    {
      title: "Repair a recurring weakness",
      rationale: `Use deliberate practice on ${mistakeLabel}, then immediately test whether the reasoning transfers.`,
      tasks: [
        { label: `Mistake-DNA: ${mistakeLabel}`, note: text(topMistake.evidence, "Use a fresh problem to interrupt the recurring error pattern."), href: "/mistake-dna", minutes: 18, domain: text(topMistake.domain, "Reasoning"), target: mistakeLabel },
        recommendations[2] ?? { label: "Autopilot transfer challenge", note: "Let the tutor choose a fresh problem that targets your weakest current signal.", href: "/tutor-autopilot#challenge", minutes: 15, domain: "Transfer" },
      ],
    },
    {
      title: "Admissions-test precision",
      rationale: `Use timed evidence to check whether ${weakSkill} holds up when the task changes.`,
      tasks: [
        { label: `Targeted test intervention: ${weakSkill}`, note: weakEvidence ? text(weakEvidence.evidence, "Repair the weakest recent test signal, then retest it.") : "Complete a targeted intervention or baseline test so the tutor can identify section-level weaknesses.", href: weakEvidence ? "/paper-intervention" : "/full-papers", minutes: Math.min(35, Math.max(20, dailyMinutes - 12)), domain: "Admissions test", target: weakSkill },
        { label: "Fresh adaptive questions", note: "Use unseen questions after the repair task so improvement is measured on new material.", href: "/adaptive-paper", minutes: 12, domain: "Admissions test" },
      ],
    },
    {
      title: "Writing and application depth",
      rationale: "Turn academic evidence into arguments you can defend rather than rehearsed statements.",
      tasks: [
        { label: "Written-work reasoning review", note: "Improve argument structure, evidence use and precision, then identify likely interview challenges.", href: "/essay-tutor", minutes: 20, domain: "Writing" },
        hasApplication
          ? { label: "Defend application evidence", note: "Use your saved application material to practise follow-up questions and counterarguments.", href: "/application-defence", minutes: 15, domain: "Application" }
          : { label: "Build application evidence", note: "Add one academically meaningful reading, project or written-work item and explain what changed in your thinking.", href: "/application-profile", minutes: 15, domain: "Application" },
      ],
    },
    {
      title: "Interview under challenge",
      rationale: `Practise adapting your reasoning on ${priorityLabel} instead of simply repeating a prepared answer.`,
      tasks: [
        { label: "Adaptive interview", note: "Use challenge, counterexample and repair turns so the interviewer responds to your reasoning.", href: "/interview-difficulty", minutes: Math.min(30, Math.max(18, dailyMinutes - 12)), domain: "Interview", target: priorityLabel },
        { label: "Two-interviewer panel", note: "Switch between a lead interviewer and challenger and practise recovering after a change of direction.", href: "/panel-interview", minutes: 12, domain: "Interview" },
      ],
    },
    {
      title: "Longer transfer practice",
      rationale: "Use a longer unfamiliar task so the week's improvements have to survive beyond one short exercise.",
      tasks: [
        { label: "Full-paper or extended test block", note: "Work under realistic timing, then inspect section-level errors rather than only the total score.", href: "/full-papers", minutes: Math.min(45, Math.max(24, dailyMinutes - 12)), domain: "Admissions test" },
        { label: hasReading ? "Reading-to-interview challenge" : "Unseen material challenge", note: hasReading ? "Connect saved reading to a fresh argument, objection or comparison." : "Interpret unfamiliar material and make your assumptions visible.", href: hasReading ? "/reading-curriculum" : "/unseen-lab", minutes: 12, domain: hasReading ? "Supercurricular" : "Transfer" },
      ],
    },
    {
      title: "Retest, reflect and reset",
      rationale: "Finish with delayed retrieval and a short review so next Sunday's plan is based on new evidence, not last week's assumptions.",
      tasks: [
        { label: "Delayed reasoning retest", note: "Revisit an earlier weakness after a delay and check whether the improvement is retained independently.", href: "/reasoning-replay", minutes: 18, domain: "Retention", target: priorityLabel },
        { label: "Weekly preparation review", note: "Review what improved, what stayed weak and what should become the next priority.", href: "/preparation-report", minutes: 12, domain: "Reflection" },
        { label: "Tutor reflection", note: "Record one change in your reasoning and one thing the tutor should test next week.", href: "/tutor#reflection", minutes: 10, domain: "Reflection" },
      ],
    },
  ]

  const days = daySeeds.map((day, index): WeeklyDay => ({
    id: `week-${weekStart}-day-${index + 1}`,
    day: index + 1,
    date: addDays(weekStart, index),
    title: day.title,
    rationale: day.rationale,
    tasks: fitTasks(index + 1, dailyMinutes, day.tasks),
  }))

  return {
    version: 2,
    weekStart,
    generatedAt: now.toISOString(),
    course,
    dailyMinutes,
    focus: priorityLabel,
    rationale: `This week prioritises ${priorityLabel} from your cloud preparation evidence, then alternates repair, transfer, test practice, writing, interview challenge and delayed retention so one weak area is not practised in isolation.`,
    evidenceUsed,
    days,
    completedIds: [],
  }
}
