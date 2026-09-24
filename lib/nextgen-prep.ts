export const PRE_INTERVIEW_KEY = "oxbridge-pre-interview-material-v1"
export const LIVE_REPLAY_KEY = "oxbridge-live-reasoning-replays-v1"
export const ORAL_RETEST_KEY = "oxbridge-oral-retests-v1"
export const PREP_WEEK_KEY = "oxbridge-prep-week-v1"
export const ADMISSIONS_UPDATE_KEY = "oxbridge-admissions-update-v1"
export const INTERVIEW_CONTEXT_KEY = "oxbridge-live-interview-context-v1"
export const PROVENANCE_KEY = "oxbridge-question-provenance-v1"

export type UnseenMaterial = {
  id: string
  course: string
  title: string
  kind: "data" | "passage" | "scenario" | "diagram"
  material: string
  prompts: string[]
  preparationMinutes: number
  createdAt: string
  notes?: string
}

export type LiveTurnRecord = {
  id: string
  role: "candidate" | "interviewer" | "system"
  text: string
  feedback?: string
  confidence?: number
  branchType?: "deepen" | "challenge" | "repair" | "transfer" | "clarify"
  interviewer?: "A" | "B"
  workingSummary?: string
  createdAt?: string
}

export type ReasoningReplay = {
  id: string
  course: string
  date: string
  durationSeconds: number
  turns: LiveTurnRecord[]
  strengths: string[]
  improvements: string[]
  calibration: {
    averageConfidence: number | null
    lowConfidenceStrongAnswers: number
    highConfidenceWeakAnswers: number
    note: string
  }
  nextOralRetestAt: string
  focus: string
}

export type OralRetest = {
  id: string
  course: string
  focus: string
  sourceReplayId: string
  dueAt: string
  completedAt?: string
}

export type PrepWeekDay = {
  id: string
  day: number
  title: string
  rationale: string
  tasks: Array<{ id: string; label: string; href: string; minutes: number }>
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function normaliseCourse(course: string) {
  return course.trim() || "General Oxbridge"
}

function materialTemplates(course: string) {
  const key = course.toLowerCase()
  if (/physics|engineering|materials/.test(key)) return [
    {
      title: "Unexpected trend in an experiment",
      kind: "data" as const,
      material: "A student measures the period T of an oscillator as the driving amplitude A is increased. The first five readings are: A = 1, 2, 3, 4, 5 arbitrary units; T = 2.00, 2.01, 2.05, 2.18, 2.52 s. The apparatus was expected to behave linearly over the whole range.",
      prompts: ["Sketch the trend you would expect from these data.", "Which assumption appears least secure?", "What extra measurement would distinguish two plausible explanations?"],
    },
    {
      title: "Model under changed conditions",
      kind: "scenario" as const,
      material: "A lightweight bridge model carries a central load safely. The same design is scaled to twice every linear dimension while using the same material. Assume geometric similarity initially.",
      prompts: ["Predict how mass and load-bearing cross-sectional area scale.", "Which quantity becomes more problematic on scaling up?", "What design change might compensate, and what trade-off does it introduce?"],
    },
  ]
  if (/math|computer/.test(key)) return [
    {
      title: "Pattern, conjecture and counterexample",
      kind: "data" as const,
      material: "For n = 1, 2, 3, 4, 5 the expression n² + n + 41 gives prime numbers. You are not told what happens later.",
      prompts: ["What would and would not be justified by the first five cases?", "How could you search intelligently for a counterexample?", "What distinction is there between evidence for a conjecture and a proof?"],
    },
    {
      title: "Algorithmic trade-off",
      kind: "scenario" as const,
      material: "Two algorithms solve the same task. Algorithm X takes approximately 4n operations. Algorithm Y takes n log₂n + 30 operations, but its implementation has a larger fixed setup cost.",
      prompts: ["For what sizes of n might each be preferable?", "Which assumptions are hidden in comparing operation counts?", "How would real hardware change your conclusion?"],
    },
  ]
  if (/medicine|biology|biochem/.test(key)) return [
    {
      title: "Correlation, mechanism and confounding",
      kind: "data" as const,
      material: "In an observational study, people who report sleeping 8 hours per night have a lower incidence of a particular illness than people who report 5 hours. The study did not randomise sleep duration.",
      prompts: ["Give two explanations besides a direct causal effect.", "What evidence would strengthen a causal claim?", "Design a follow-up that is informative without assuming the conclusion."],
    },
  ]
  if (/econom|ppe|politic|geograph|psycholog|social/.test(key)) return [
    {
      title: "Policy effect with competing mechanisms",
      kind: "scenario" as const,
      material: "A city raises the minimum wage substantially. Employment in restaurants rises slightly in the following year, while neighbouring cities show little change. Prices in the city also rise.",
      prompts: ["Why does the employment result not by itself settle the policy question?", "Give two mechanisms consistent with the observations.", "What comparison would you want before claiming causation?"],
    },
  ]
  if (/law|history|english|classics|philosophy|theology|literature/.test(key)) return [
    {
      title: "Unseen claim under pressure",
      kind: "passage" as const,
      material: "‘A rule is only just when a reasonable person would accept it even without knowing whether they personally benefit from it.’ Consider the force and limits of this claim.",
      prompts: ["Define the most ambiguous word in the claim.", "Construct the strongest objection you can.", "What example would force you to qualify your first response?"],
    },
  ]
  return [
    {
      title: "Evidence and revision",
      kind: "scenario" as const,
      material: "You are given a conclusion that appears plausible and three pieces of evidence: one supports it strongly, one is ambiguous, and one points to an alternative explanation. You are not told which is which.",
      prompts: ["What makes evidence discriminating rather than merely relevant?", "How should confidence change when evidence conflicts?", "What new observation would most efficiently distinguish the explanations?"],
    },
  ]
}

export function generateUnseenMaterial(course: string, variant = 0): UnseenMaterial {
  const cleanCourse = normaliseCourse(course)
  const options = materialTemplates(cleanCourse)
  const item = options[Math.abs(variant) % options.length]
  const createdAt = new Date().toISOString()
  return {
    id: `unseen-${hashString(`${cleanCourse}-${item.title}-${createdAt}-${variant}`)}`,
    course: cleanCourse,
    title: item.title,
    kind: item.kind,
    material: item.material,
    prompts: item.prompts,
    preparationMinutes: /law|history|english|philosophy|literature/i.test(cleanCourse) ? 15 : 10,
    createdAt,
  }
}

function inferBranchType(feedback: string, question: string): LiveTurnRecord["branchType"] {
  const text = `${feedback} ${question}`.toLowerCase()
  if (/counterexample|assumption|however|what if|challenge|fails/.test(text)) return "challenge"
  if (/different|new condition|transfer|instead|change/.test(text)) return "transfer"
  if (/unclear|define|mean by|clarif/.test(text)) return "clarify"
  if (/missing|incorrect|fix|justify|step/.test(text)) return "repair"
  return "deepen"
}

export function buildReasoningReplay(course: string, turns: LiveTurnRecord[], durationSeconds: number): ReasoningReplay {
  const substantive = turns.filter(turn => turn.role === "candidate")
  const confidenceValues = substantive.map(turn => Number(turn.confidence)).filter(value => Number.isFinite(value) && value >= 0 && value <= 100)
  let lowConfidenceStrongAnswers = 0
  let highConfidenceWeakAnswers = 0
  const strengths: string[] = []
  const improvements: string[] = []

  for (const turn of substantive) {
    const feedback = turn.feedback ?? ""
    if (/strong|clear|useful|correct|well-justified|good distinction|effective/i.test(feedback)) {
      if ((turn.confidence ?? 101) < 50) lowConfidenceStrongAnswers += 1
      strengths.push(feedback)
    }
    if (/missing|assumption|unclear|justify|weak|incorrect|ambiguous|unsupported/i.test(feedback)) {
      if ((turn.confidence ?? -1) >= 75) highConfidenceWeakAnswers += 1
      improvements.push(feedback)
    }
  }

  const averageConfidence = confidenceValues.length
    ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length)
    : null
  const focus = improvements[0] || "Make assumptions explicit and test the reasoning under a changed condition."
  const delayDays = improvements.length >= 3 ? 2 : improvements.length ? 4 : 7
  const nextRetestAt = new Date(Date.now() + delayDays * 86_400_000).toISOString()

  const enriched = turns.map((turn, index) => {
    if (turn.role !== "interviewer") return turn
    const previousCandidate = [...turns.slice(0, index)].reverse().find(item => item.role === "candidate")
    return { ...turn, branchType: turn.branchType ?? inferBranchType(previousCandidate?.feedback ?? "", turn.text) }
  })

  return {
    id: `replay-${Date.now()}`,
    course: normaliseCourse(course),
    date: new Date().toISOString(),
    durationSeconds,
    turns: enriched,
    strengths: [...new Set(strengths)].slice(0, 5),
    improvements: [...new Set(improvements)].slice(0, 5),
    calibration: {
      averageConfidence,
      lowConfidenceStrongAnswers,
      highConfidenceWeakAnswers,
      note: highConfidenceWeakAnswers
        ? "Some high-confidence answers still contained reasoning gaps; practise checking assumptions before committing."
        : lowConfidenceStrongAnswers
          ? "Some strong reasoning was given with low confidence; avoid abandoning a sound argument simply because it is challenged."
          : "Confidence and feedback are broadly aligned in the evidence recorded so far.",
    },
    nextOralRetestAt: nextRetestAt,
    focus,
  }
}

export function oralRetestFromReplay(replay: ReasoningReplay): OralRetest {
  return {
    id: `oral-${replay.id}`,
    course: replay.course,
    focus: replay.focus,
    sourceReplayId: replay.id,
    dueAt: replay.nextOralRetestAt,
  }
}

export function buildPrepWeek(course: string): PrepWeekDay[] {
  const clean = normaliseCourse(course)
  return [
    { id: "week-1", day: 1, title: "Diagnostic baseline", rationale: "Measure test and interview performance before targeting anything.", tasks: [{ id: "paper", label: "Timed admissions-test section", href: "/test-player", minutes: 40 }, { id: "interview", label: `${clean} Gemini Live baseline`, href: "/gemini-live-interview", minutes: 18 }] },
    { id: "week-2", day: 2, title: "Weakness intervention", rationale: "Repair the most evidenced mistake rather than practising randomly.", tasks: [{ id: "mistakes", label: "Review Mistake DNA", href: "/mistake-dna", minutes: 8 }, { id: "intervention", label: "Targeted intervention + retest", href: "/paper-intervention", minutes: 30 }] },
    { id: "week-3", day: 3, title: "Unseen material", rationale: "Practise thinking with unfamiliar information under preparation-time pressure.", tasks: [{ id: "material", label: "Pre-interview material simulator", href: "/pre-interview-material", minutes: 25 }, { id: "replay", label: "Reasoning replay", href: "/reasoning-replay", minutes: 10 }] },
    { id: "week-4", day: 4, title: "Visual reasoning", rationale: "Make calculations, graphs and diagrams visible and challengeable.", tasks: [{ id: "tutorial", label: "Tutorial Lab", href: "/tutorial-lab", minutes: 25 }, { id: "reading", label: "Supercurricular defence", href: "/supercurricular-coach", minutes: 15 }] },
    { id: "week-5", day: 5, title: "Pressure and adaptation", rationale: "Test whether reasoning survives counterexamples and changed conditions.", tasks: [{ id: "panel", label: "Two-interviewer panel mode", href: "/gemini-live-interview", minutes: 22 }, { id: "confidence", label: "Confidence calibration review", href: "/reasoning-replay", minutes: 10 }] },
    { id: "week-6", day: 6, title: "Full simulation", rationale: "Combine timing, unfamiliar material and interview reasoning in one day.", tasks: [{ id: "mock", label: "Adaptive Mock Day", href: "/mock-day", minutes: 60 }, { id: "full", label: "Full paper / test player", href: "/full-papers", minutes: 45 }] },
    { id: "week-7", day: 7, title: "Retention and evidence", rationale: "Check whether gains survive a delay and capture proof of improvement.", tasks: [{ id: "retest", label: "Oral retention retest", href: "/gemini-live-interview", minutes: 15 }, { id: "proof", label: "Progress Proof", href: "/progress-proof", minutes: 10 }, { id: "tutor", label: "Generate next week's Tutor plan", href: "/tutor", minutes: 10 }] },
  ]
}

export const provenanceLegend = [
  { id: "original", label: "Original practice", description: "Written for this app in the style and skill domain of the relevant test; not copied from a live paper." },
  { id: "official-example", label: "Official published example", description: "Derived only from material officially made public for preparation, with provenance recorded." },
  { id: "spec-aligned", label: "Specification aligned", description: "Mapped to the published test/course skill requirements and current format." },
  { id: "teacher-reviewed", label: "Teacher reviewed", description: "Reviewed by an authorised educator in the app; not automatically implied for AI-generated content." },
  { id: "ai-generated", label: "AI generated", description: "Generated or materially transformed by AI and therefore kept separate from verified official material." },
] as const
