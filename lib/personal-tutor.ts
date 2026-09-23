export const PROFILE_KEY = "oxbridge-tutor-profile-v2"
export const PROGRESS_KEY = "oxbridge-tutor-progress-v2"
export const TUTOR_KEY = "oxbridge-personal-tutor-v1"
export const APPLICATION_KEY = "oxbridge-application-digital-twin-v1"
export const SUPERCURRICULAR_KEY = "oxbridge-supercurricular-v1"
export const HUMAN_REVIEW_KEY = "oxbridge-human-reviews-v1"
export const TUTORIAL_LAB_KEY = "oxbridge-tutorial-lab-v1"
export const MOCK_DAY_KEY = "oxbridge-mock-day-v1"
export const PARENT_SUMMARY_KEY = "oxbridge-parent-summary-v1"

export type TutorProfile = {
  university?: "Oxford" | "Cambridge" | "Both"
  course?: string
  year?: string
  track?: string
}

export type SkillState = {
  id: string
  label: string
  domain: "Interview" | "Admissions test" | "Writing" | "Application"
  score: number
  evidenceCount: number
  status: "Emerging" | "Developing" | "Secure"
  trend: "up" | "flat" | "down"
  note: string
  href: string
}

export type MistakeSignal = {
  id: string
  label: string
  domain: string
  count: number
  priority: "high" | "medium" | "watch"
  evidence: string
  action: string
  href: string
}

export type TutorAction = {
  id: string
  label: string
  note: string
  href: string
  minutes: number
  domain: string
  priority: number
}

export type TutorPlan = {
  generatedAt: string
  availableMinutes: number
  focus: string
  rationale: string
  actions: TutorAction[]
}

export type ProgressEvidence = {
  id: string
  date: string
  domain: string
  skill: string
  score: number
  state: "Emerging" | "Developing" | "Secure"
  evidence: string
}

export type StudentIntelligence = {
  profile: Required<Pick<TutorProfile, "university" | "course" | "year">>
  skills: SkillState[]
  mistakes: MistakeSignal[]
  strongest: SkillState | null
  priority: SkillState | null
  recommendations: TutorAction[]
  evidence: ProgressEvidence[]
  preparationScore: number
  interviewCount: number
  fullPaperCount: number
  essayCount: number
}

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function numberValue(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function average(values: number[], fallback = 50) {
  const useful = values.filter(Number.isFinite)
  return useful.length ? useful.reduce((sum, value) => sum + value, 0) / useful.length : fallback
}

function stateFor(score: number): SkillState["status"] {
  if (score >= 75) return "Secure"
  if (score >= 55) return "Developing"
  return "Emerging"
}

function trendFor(values: number[]): SkillState["trend"] {
  if (values.length < 2) return "flat"
  const recent = values.slice(-2)
  const delta = recent[1] - recent[0]
  return delta > 5 ? "up" : delta < -5 ? "down" : "flat"
}

function skill(id: string, label: string, domain: SkillState["domain"], values: number[], evidenceCount: number, note: string, href: string): SkillState {
  const score = clamp(average(values, evidenceCount ? 50 : 45))
  return { id, label, domain, score, evidenceCount, status: stateFor(score), trend: trendFor(values), note, href }
}

function extractInterviewSkills(progress: JsonRecord) {
  const logs = array(progress.logs).map(record)
  const dimensionRows = logs.map(item => record(item.dimensions)).filter(item => Object.keys(item).length)
  const reasoning = dimensionRows.map(item => numberValue(item.reasoning) * 4).filter(Boolean)
  const subject = dimensionRows.map(item => numberValue(item.subject) * 4).filter(Boolean)
  const flexibility = dimensionRows.map(item => numberValue(item.flexibility) * 4).filter(Boolean)
  const clarity = dimensionRows.map(item => numberValue(item.clarity) * 4).filter(Boolean)
  const count = dimensionRows.length
  return [
    skill("interview-reasoning", "Reasoning chain", "Interview", reasoning, count, "Makes the steps between observation, principle and conclusion visible.", "/interview-feedback"),
    skill("interview-assumptions", "Assumptions & testing", "Interview", flexibility.map(value => value - 4), count, "Surfaces assumptions, counterexamples and limiting cases instead of accepting the first route.", "/interview-room"),
    skill("interview-subject", "Subject reasoning", "Interview", subject, count, "Uses subject ideas precisely rather than relying on generic prepared language.", "/interview-room"),
    skill("interview-communication", "Communication", "Interview", clarity, count, "Explains thinking aloud in a focused way that an interviewer can follow.", "/interview-room"),
  ]
}

function extractTestSkills(progress: JsonRecord) {
  const papers = array(progress.fullPaperResults).map(record)
  const bySection = new Map<string, number[]>()
  for (const paper of papers.slice(0, 8)) {
    for (const raw of array(paper.sections)) {
      const section = record(raw)
      if (section.kind === "essay") continue
      const title = String(section.title ?? "General reasoning")
      const scores = bySection.get(title) ?? []
      scores.push(numberValue(section.accuracy, 0))
      bySection.set(title, scores)
    }
  }
  return [...bySection.entries()]
    .sort((a, b) => average(a[1]) - average(b[1]))
    .slice(0, 6)
    .map(([label, values], index) => skill(`test-${index}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, label, "Admissions test", values.slice().reverse(), values.length, "Performance across recent full-paper sections.", "/paper-intervention"))
}

function extractWritingSkills(progress: JsonRecord) {
  const analyses = array(progress.essayAnalyses).map(record).slice(0, 8)
  const grouped = new Map<string, number[]>()
  for (const item of analyses) {
    const analysis = record(item.analysis)
    for (const raw of array(analysis.dimensions)) {
      const dimension = record(raw)
      const label = String(dimension.label ?? "Writing")
      const values = grouped.get(label) ?? []
      values.push(numberValue(dimension.score, 0))
      grouped.set(label, values)
    }
  }
  return [...grouped.entries()].slice(0, 6).map(([label, values], index) => skill(`writing-${index}`, label, "Writing", values.slice().reverse(), values.length, "Evidence from detailed LNAT/TARA practice analysis.", "/essay-tutor"))
}

function extractMistakes(progress: JsonRecord, skills: SkillState[]) {
  const signals: MistakeSignal[] = []
  const misconceptions = record(progress.misconceptions)
  for (const [label, rawCount] of Object.entries(misconceptions)) {
    const count = numberValue(rawCount, 1)
    signals.push({
      id: `misconception-${label}`,
      label,
      domain: "Interview",
      count,
      priority: count >= 4 ? "high" : count >= 2 ? "medium" : "watch",
      evidence: `Appeared ${count} time${count === 1 ? "" : "s"} in saved interview feedback.`,
      action: "Practise a fresh interview where this behaviour is deliberately tested.",
      href: "/interview-room",
    })
  }

  for (const item of skills.filter(item => item.evidenceCount > 0 && item.score < 70).slice(0, 5)) {
    signals.push({
      id: `skill-${item.id}`,
      label: item.label,
      domain: item.domain,
      count: item.evidenceCount,
      priority: item.score < 50 ? "high" : item.score < 65 ? "medium" : "watch",
      evidence: `${item.score}% across ${item.evidenceCount} recent evidence point${item.evidenceCount === 1 ? "" : "s"}.`,
      action: item.domain === "Admissions test" ? "Complete the targeted intervention and fresh retest." : item.domain === "Writing" ? "Rewrite the weakest section using the detailed analysis." : "Use a new interview to practise this behaviour explicitly.",
      href: item.href,
    })
  }

  const interventionResults = array(progress.interventionResults).map(record)
  for (const result of interventionResults.slice(0, 4)) {
    const retest = numberValue(result.retestAccuracy)
    if (retest >= 75) continue
    signals.push({
      id: `retest-${String(result.id ?? result.date ?? Math.random())}`,
      label: `Retest not yet secure`,
      domain: String(result.test ?? "Admissions test"),
      count: 1,
      priority: retest < 60 ? "high" : "medium",
      evidence: `Latest targeted retest was ${retest}%.`,
      action: "Keep the intervention loop open and generate another fresh retest.",
      href: "/paper-intervention",
    })
  }

  const merged = new Map<string, MistakeSignal>()
  for (const item of signals) {
    const key = `${item.domain}:${item.label}`.toLowerCase()
    const current = merged.get(key)
    if (!current || item.priority === "high" || (item.priority === "medium" && current.priority === "watch")) merged.set(key, item)
  }
  return [...merged.values()].sort((a, b) => ({ high: 0, medium: 1, watch: 2 }[a.priority] - ({ high: 0, medium: 1, watch: 2 }[b.priority]) || b.count - a.count).slice(0, 10)
}

function progressEvidence(progress: JsonRecord, skills: SkillState[]): ProgressEvidence[] {
  const evidence: ProgressEvidence[] = []
  const papers = array(progress.fullPaperResults).map(record)
  for (const paper of papers.slice(0, 5)) {
    const score = clamp(numberValue(paper.accuracy))
    evidence.push({ id: `paper-${String(paper.id ?? paper.date ?? evidence.length)}`, date: String(paper.date ?? new Date().toISOString()), domain: "Admissions test", skill: String(paper.test ?? "Full paper"), score, state: stateFor(score), evidence: `${String(paper.title ?? "Full paper")}: ${score}% accuracy.` })
  }
  const interventions = array(progress.interventionResults).map(record)
  for (const item of interventions.slice(0, 5)) {
    const before = clamp(numberValue(item.originalAccuracy))
    const after = clamp(numberValue(item.retestAccuracy))
    evidence.push({ id: `intervention-${String(item.id ?? item.date ?? evidence.length)}`, date: String(item.date ?? new Date().toISOString()), domain: "Admissions test", skill: String(item.test ?? "Targeted intervention"), score: after, state: stateFor(after), evidence: `Targeted retest moved from ${before}% to ${after}% (${after - before >= 0 ? "+" : ""}${after - before} points).` })
  }
  const logs = array(progress.logs).map(record)
  for (const item of logs.slice(0, 5)) {
    const score = clamp(numberValue(item.score))
    evidence.push({ id: `interview-${String(item.id ?? item.date ?? evidence.length)}`, date: String(item.date ?? new Date().toISOString()), domain: "Interview", skill: String(item.title ?? "Interview"), score, state: stateFor(score), evidence: `${String(item.title ?? "Interview")}: practice reasoning signal ${score}/100.` })
  }
  if (!evidence.length) {
    for (const item of skills.filter(item => item.evidenceCount).slice(0, 5)) evidence.push({ id: item.id, date: new Date().toISOString(), domain: item.domain, skill: item.label, score: item.score, state: item.status, evidence: item.note })
  }
  return evidence.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15)
}

function actionForSkill(item: SkillState, index: number): TutorAction {
  if (item.domain === "Admissions test") return { id: `target-test-${index}`, label: `Target ${item.label}`, note: `${item.score}% is currently one of your lowest evidenced areas. Use the intervention loop rather than random questions.`, href: "/paper-intervention", minutes: 18, domain: item.domain, priority: 100 - item.score }
  if (item.domain === "Writing") return { id: `target-writing-${index}`, label: `Improve ${item.label}`, note: "Rewrite one section using sentence-level feedback, then compare the reasoning before and after.", href: "/essay-tutor", minutes: 18, domain: item.domain, priority: 100 - item.score }
  return { id: `target-interview-${index}`, label: `Practise ${item.label}`, note: "Use a fresh formal interview and make this reasoning behaviour an explicit focus.", href: "/interview-room", minutes: 14, domain: item.domain, priority: 100 - item.score }
}

export function buildStudentIntelligence(profileValue: unknown, progressValue: unknown): StudentIntelligence {
  const profile = record(profileValue) as TutorProfile
  const progress = record(progressValue)
  const interviewSkills = extractInterviewSkills(progress)
  const testSkills = extractTestSkills(progress)
  const writingSkills = extractWritingSkills(progress)
  const skills = [...interviewSkills, ...testSkills, ...writingSkills]
  const evidenced = skills.filter(item => item.evidenceCount > 0)
  const strongest = evidenced.length ? [...evidenced].sort((a, b) => b.score - a.score)[0] : null
  const priority = evidenced.length ? [...evidenced].sort((a, b) => a.score - b.score)[0] : interviewSkills[0]
  const mistakes = extractMistakes(progress, skills)
  const weakest = [...skills].sort((a, b) => (a.evidenceCount ? a.score : 101) - (b.evidenceCount ? b.score : 101)).filter(item => item.evidenceCount).slice(0, 4)
  const recommendations = weakest.map(actionForSkill)
  if (!testSkills.length) recommendations.push({ id: "baseline-paper", label: "Build an admissions-test baseline", note: "Complete a full paper so the tutor can identify section-level weaknesses.", href: "/full-papers", minutes: 40, domain: "Admissions test", priority: 65 })
  if (numberValue(progress.sessions) < 2) recommendations.push({ id: "baseline-interview", label: "Build an interview baseline", note: "Complete a formal interview so the tutor can learn how you reason aloud.", href: "/interview-room", minutes: 14, domain: "Interview", priority: 75 })
  recommendations.push({ id: "tutorial-lab", label: "Tutorial Lab reasoning challenge", note: "Work visually on an unfamiliar problem and ask the tutor to analyse your working.", href: "/tutorial-lab", minutes: 15, domain: "Tutorial", priority: 50 })
  const preparationScore = evidenced.length ? clamp(average(evidenced.map(item => item.score))) : 0
  return {
    profile: { university: profile.university ?? "Both", course: profile.course ?? "Physics", year: profile.year ?? "2027" },
    skills,
    mistakes,
    strongest,
    priority,
    recommendations: recommendations.sort((a, b) => b.priority - a.priority).slice(0, 7),
    evidence: progressEvidence(progress, skills),
    preparationScore,
    interviewCount: numberValue(progress.sessions, array(progress.logs).length),
    fullPaperCount: array(progress.fullPaperResults).length,
    essayCount: array(progress.essayAnalyses).length,
  }
}

export function buildDailyPlan(intelligence: StudentIntelligence, availableMinutes: number): TutorPlan {
  const minutes = Math.max(10, Math.min(90, Math.round(availableMinutes)))
  const candidates = intelligence.recommendations.length ? intelligence.recommendations : [{ id: "baseline", label: "Build your baseline", note: "Start with a formal interview so the tutor can learn how you reason.", href: "/interview-room", minutes: 12, domain: "Interview", priority: 50 }]
  const actions: TutorAction[] = []
  let remaining = minutes
  for (const candidate of candidates) {
    if (remaining < 8) break
    const duration = Math.min(candidate.minutes, remaining)
    if (duration < 8) continue
    actions.push({ ...candidate, minutes: duration })
    remaining -= duration
  }
  if (remaining >= 4) actions.push({ id: "reflection", label: "Tutor reflection", note: "Record what changed in your thinking and one thing to test next time.", href: "/tutor#reflection", minutes: remaining, domain: "Reflection", priority: 10 })
  const focus = intelligence.priority?.label ?? "Build a useful baseline"
  return {
    generatedAt: new Date().toISOString(),
    availableMinutes: minutes,
    focus,
    rationale: intelligence.priority?.evidenceCount ? `${focus} is currently the weakest well-evidenced area in your preparation profile.` : "The tutor needs a little more evidence before it can target preparation precisely.",
    actions,
  }
}

const genericChallenges = [
  "A claim sounds plausible but rests on one hidden assumption. How would you identify and test that assumption?",
  "You are given two explanations that fit the same evidence. What new observation would best distinguish them?",
  "Take a result you believe is correct and test it using an extreme or limiting case. What survives?",
  "Explain a familiar idea without using its usual technical label. What mechanism or principle remains?",
]

const courseChallenges: Record<string, string[]> = {
  physics: ["A sealed box is on a scale. A small bird inside takes off and hovers. Predict the reading at different moments and justify the mechanism.", "Sketch how a quantity could change if one variable doubles while another constraint is held fixed. State every assumption before drawing.", "You measure a relationship that appears linear over a narrow range. Give two reasons it might stop being linear outside that range."],
  mathematics: ["Find a statement that seems true for the first few integers but is false in general. How would you expose the failure efficiently?", "You are shown a curve but no equation. What local and global information could you recover from its shape?", "Give two different approaches to the same unfamiliar problem and explain which assumptions each approach makes."],
  engineering: ["Design a bridge component that must be lighter without becoming less safe. Which quantities would you trade off and how would you test the design?", "A system works in a laboratory but fails outdoors. Build a fault tree of possible causes before choosing one.", "Estimate an engineering quantity with incomplete information and defend each assumption."],
  chemistry: ["Two mechanisms predict the same overall products. What experimental evidence could distinguish them?", "An equilibrium shifts after a change. Explain the particle-level mechanism rather than naming a rule.", "A trend holds across three compounds but fails for the fourth. Propose and test a reason."],
  biology: ["A correlation appears in biological data. Give competing causal explanations and one experiment that separates them.", "A trait seems advantageous. Explain why that alone is not enough to predict its evolutionary fate.", "Design a control that would expose a hidden confound in an unfamiliar experiment."],
  medicine: ["A test is highly sensitive but not very specific. Explain how prevalence changes what a positive result means.", "Two treatments have similar average outcomes. What other evidence would you need before preferring one?", "A patient has incomplete information available. Explain how uncertainty should affect the next decision."],
  economics: ["A policy is intended to change behaviour but produces the opposite result. Give two mechanisms that could explain the response.", "Draw a graph for a familiar economic relationship, then state one condition under which its shape would change.", "A headline reports a strong association between two economic variables. What would you need before making a causal claim?"],
  law: ["A rule produces a fair result in one case but an apparently unfair result in another. Should the rule change, or the interpretation?", "Construct the strongest argument for a position you initially disagree with, then identify its most vulnerable premise.", "When should an exception strengthen a legal rule rather than undermine it?"],
  history: ["Two historians use the same evidence but reach different conclusions. What assumptions or weighting decisions could explain the disagreement?", "Choose one event and argue for both structural and individual explanations. What evidence would discriminate between them?", "How would you decide whether a source is unrepresentative without simply discarding it?"],
  english: ["Take an ambiguous line from a text. Build two defensible interpretations and identify what evidence would favour one.", "How can form change the meaning of an argument even when the literal content stays similar?", "When does authorial context clarify a text, and when can it distract from the language on the page?"],
  geography: ["A spatial pattern is visible on a map. Give three mechanisms that could produce it and identify data that would distinguish them.", "How could the scale of analysis reverse the apparent relationship between two geographical variables?", "A development intervention succeeds in one place and fails in another. What contextual variables would you investigate first?"],
}

export function dailyChallengeFor(course: string, date = new Date()) {
  const key = course.toLowerCase()
  const pool = Object.entries(courseChallenges).find(([name]) => key.includes(name))?.[1] ?? genericChallenges
  const seed = Number(`${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`)
  return pool[seed % pool.length]
}

export function buildApplicationQuestions(applicationValue: unknown) {
  const app = record(applicationValue)
  const items: string[] = []
  const add = (label: string, value: unknown, question: (text: string) => string) => {
    const text = String(value ?? "").trim()
    if (text) items.push(question(text))
  }
  add("EPQ", app.epq, text => `You have highlighted an EPQ/project on “${text.slice(0, 90)}”. What is the strongest objection to its central claim?`)
  add("Books", app.books, text => `You mention reading ${text.slice(0, 110)}. Which idea from it would you challenge, and why?`)
  add("Projects", app.projects, text => `You describe ${text.slice(0, 110)}. What trade-off, limitation or unexpected result taught you the most?`)
  add("Written work", app.writtenWork, text => `Your written work includes ${text.slice(0, 100)}. Which claim would be hardest to defend under questioning?`)
  add("Interests", app.interests, text => `You say you are especially interested in ${text.slice(0, 100)}. What unresolved question in that area would you most like to investigate?`)
  return items.slice(0, 8)
}
