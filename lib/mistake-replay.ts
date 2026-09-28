export const MISTAKE_REPLAY_KEY = "oxbridge-mistake-replay-attempts-v1"

export type QuestionReviewRecord = {
  questionId?: string
  section?: string
  difficulty?: string
  prompt?: string
  answer?: string
  correctAnswer?: string
  rawMark?: number
  maxMarks?: number
  correct?: boolean
}

export type FullPaperResultRecord = {
  id?: string
  test?: string
  title?: string
  date?: string
  questionReview?: QuestionReviewRecord[]
}

export type ReplayMistake = {
  id: string
  sourceId: string
  test: string
  section: string
  skill: string
  prompt: string
  previousAnswer: string
  correctAnswer: string
  date: string
  severity: "missed" | "partial"
}

export type MistakeReplayGroup = {
  id: string
  skill: string
  count: number
  tests: string[]
  sections: string[]
  mistakes: ReplayMistake[]
  practiceCue: string
}

export type ReplayAttempt = {
  id: string
  mistakeId: string
  skill: string
  response: string
  confidence: number
  revealed: boolean
  createdAt: string
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function inferUnderlyingSkill(input: { test?: string; section?: string; prompt?: string }) {
  const test = clean(input.test).toLowerCase()
  const section = clean(input.section).toLowerCase()
  const prompt = clean(input.prompt).toLowerCase()
  const text = `${test} ${section} ${prompt}`

  if (/critical reasoning|argument|assumption|conclusion|strengthen|weaken|flaw|inference/.test(text)) return "Argument & inference"
  if (/reading|passage|author|text|statement|comprehension|lnat/.test(text)) return "Close reading & evidence"
  if (/decision|syllog|logic|proof|necessary|sufficient|must follow|tara/.test(text)) return "Logic & deduction"
  if (/probab|ratio|percentage|percent|rate|mean|median|table|chart|graph|data/.test(text)) return "Data & quantitative interpretation"
  if (/algebra|equation|function|sequence|integer|prime|factor|geometry|coordinate|tmua|mathematics/.test(text)) return "Mathematical structure"
  if (/physics|force|energy|electric|wave|mechan|chem|mole|reaction|esat/.test(text)) return "Scientific modelling"
  if (/ucat|abstract reasoning|pattern/.test(text)) return "Pattern recognition"
  return "Precision & checking"
}

export function practiceCueForSkill(skill: string) {
  if (skill === "Argument & inference") return "State the conclusion, identify the evidence, then test one assumption or counterexample before committing."
  if (skill === "Close reading & evidence") return "Return to the exact wording. Separate what the passage states from what is merely plausible."
  if (skill === "Logic & deduction") return "Translate each condition precisely, test the boundary cases, and only infer what must follow."
  if (skill === "Data & quantitative interpretation") return "Write the quantity being asked for, track units, and estimate the direction/size before calculating."
  if (skill === "Mathematical structure") return "Represent the problem algebraically or diagrammatically, then check a simple or extreme case."
  if (skill === "Scientific modelling") return "Name the model, assumptions and variables, then test units, limiting behaviour and mechanism."
  if (skill === "Pattern recognition") return "Describe the transformation explicitly and test it against every example before choosing an option."
  return "Slow the final decision: restate the question, eliminate contradictions, and perform one deliberate check."
}

export function buildMistakeReplayGroups(progress: Record<string, unknown>): MistakeReplayGroup[] {
  const results = Array.isArray(progress.fullPaperResults) ? progress.fullPaperResults as FullPaperResultRecord[] : []
  const mistakes: ReplayMistake[] = []

  for (const result of results) {
    const reviews = Array.isArray(result.questionReview) ? result.questionReview : []
    for (const item of reviews) {
      const maxMarks = Number(item.maxMarks ?? 1)
      const rawMark = Number(item.rawMark ?? (item.correct ? maxMarks : 0))
      if (item.correct === true || rawMark >= maxMarks) continue
      const prompt = clean(item.prompt)
      if (!prompt) continue
      const skill = inferUnderlyingSkill({ test: result.test, section: item.section, prompt })
      const questionId = clean(item.questionId) || `question-${mistakes.length + 1}`
      mistakes.push({
        id: `${clean(result.id) || "paper"}:${questionId}`,
        sourceId: clean(result.id) || "paper",
        test: clean(result.test) || "Admissions test",
        section: clean(item.section) || "General",
        skill,
        prompt,
        previousAnswer: clean(item.answer) || "Unanswered",
        correctAnswer: clean(item.correctAnswer) || "Check the original explanation",
        date: clean(result.date) || new Date(0).toISOString(),
        severity: rawMark > 0 ? "partial" : "missed",
      })
    }
  }

  const grouped = new Map<string, ReplayMistake[]>()
  for (const mistake of mistakes) grouped.set(mistake.skill, [...(grouped.get(mistake.skill) || []), mistake])

  return [...grouped.entries()]
    .map(([skill, items]) => ({
      id: skill.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      skill,
      count: items.length,
      tests: [...new Set(items.map(item => item.test))],
      sections: [...new Set(items.map(item => item.section))],
      mistakes: items.sort((a, b) => b.date.localeCompare(a.date)),
      practiceCue: practiceCueForSkill(skill),
    }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
}

export function replayCompletion(attempts: ReplayAttempt[], group: MistakeReplayGroup) {
  const completed = new Set(attempts.filter(item => item.revealed).map(item => item.mistakeId))
  const done = group.mistakes.filter(item => completed.has(item.id)).length
  return { done, total: group.mistakes.length, percent: group.mistakes.length ? Math.round(done / group.mistakes.length * 100) : 0 }
}
