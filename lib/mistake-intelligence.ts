import { inferUnderlyingSkill, type FullPaperResultRecord, type QuestionReviewRecord } from "@/lib/mistake-replay"

export type MistakeCauseId = "omission" | "interpretation" | "evidence" | "method" | "execution" | "assumption" | "evaluation" | "checking"

export type MistakeCause = {
  id: MistakeCauseId
  label: string
  description: string
  count: number
  ratePerPaper: number
  recentRate: number
  earlierRate: number
  trend: "improving" | "stable" | "worsening" | "new"
  examples: { test: string; prompt: string; date: string }[]
  intervention: string
  href: string
}

const causes: Record<MistakeCauseId, Omit<MistakeCause, "count"|"ratePerPaper"|"recentRate"|"earlierRate"|"trend"|"examples">> = {
  omission: { id: "omission", label: "Omission / time pressure", description: "A question was left unanswered or the response did not reach a usable conclusion.", intervention: "Practise timed triage: decide quickly whether to solve, park or eliminate options, then return with a clear final check.", href: "/timing-trainer" },
  interpretation: { id: "interpretation", label: "Question interpretation", description: "The response appears to answer a plausible nearby question rather than the exact task or wording.", intervention: "Underline the operative words, restate the task in your own words, then check the answer against that restatement before submitting.", href: "/paper-intervention" },
  evidence: { id: "evidence", label: "Evidence & inference", description: "The conclusion goes beyond what the passage, data or stated evidence securely supports.", intervention: "Separate what is stated, what follows necessarily and what is merely plausible. Cite the decisive evidence before choosing a conclusion.", href: "/reading-room" },
  method: { id: "method", label: "Model / method selection", description: "The main issue is choosing or setting up the right representation, equation, model or logical structure.", intervention: "Before calculating, name the model or method, list the variables/conditions and test one simple or limiting case.", href: "/advanced-practice" },
  execution: { id: "execution", label: "Calculation / execution", description: "The overall approach is plausible but the working, arithmetic, units or final execution loses the mark.", intervention: "Estimate first, keep units visible, and run a sign/order-of-magnitude check before committing to the final answer.", href: "/paper-intervention" },
  assumption: { id: "assumption", label: "Assumption control", description: "Reasoning relies on an unstated condition or treats a possibility as though it must be true.", intervention: "State the hidden assumption explicitly and ask what happens if it fails. Try one counterexample before accepting the conclusion.", href: "/interview-replay" },
  evaluation: { id: "evaluation", label: "Evaluation / counterargument", description: "The response gives a position but does not adequately test alternatives, limitations or competing explanations.", intervention: "Add the strongest objection, identify what evidence would favour it, then explain why your conclusion survives or should be narrowed.", href: "/essay-tutor" },
  checking: { id: "checking", label: "Checking & precision", description: "A preventable final-step error remains after otherwise useful reasoning.", intervention: "Build a deliberate final check: reread the exact question, test the chosen answer against one alternative, and verify any units/conditions.", href: "/mistake-replay" },
}

function clean(value: unknown) { return typeof value === "string" ? value.trim() : "" }

export function inferMistakeCause(result: FullPaperResultRecord, item: QuestionReviewRecord): MistakeCauseId {
  const answer = clean(item.answer)
  const prompt = clean(item.prompt).toLowerCase()
  const section = clean(item.section).toLowerCase()
  const skill = inferUnderlyingSkill({ test: result.test, section: item.section, prompt: item.prompt })
  const max = Number(item.maxMarks ?? 1)
  const raw = Number(item.rawMark ?? (item.correct ? max : 0))

  if (!answer || /^unanswered$/i.test(answer)) return "omission"
  if (/which statement|according to|passage|author|text|must follow|cannot be concluded|best supported/.test(`${section} ${prompt}`)) return skill === "Argument & inference" ? "assumption" : "evidence"
  if (/assumption|strengthen|weaken|flaw|necessary|sufficient|conclusion|inference/.test(`${section} ${prompt}`)) return "assumption"
  if (/evaluate|compare|extent|most convincing|best argument|counter|limitation/.test(`${section} ${prompt}`)) return "evaluation"
  if (skill === "Close reading & evidence") return "evidence"
  if (skill === "Logic & deduction") return "interpretation"
  if (skill === "Scientific modelling" || skill === "Mathematical structure") return raw > 0 ? "execution" : "method"
  if (skill === "Data & quantitative interpretation") return raw > 0 ? "execution" : /what|which|interpret|show/.test(prompt) ? "interpretation" : "method"
  if (raw > 0 && raw < max) return "checking"
  return "checking"
}

export function buildMistakeIntelligence(progress: Record<string, unknown>): MistakeCause[] {
  const papers = (Array.isArray(progress.fullPaperResults) ? progress.fullPaperResults : []) as FullPaperResultRecord[]
  const ordered = [...papers].sort((a, b) => clean(a.date).localeCompare(clean(b.date)))
  const midpoint = Math.max(1, Math.floor(ordered.length / 2))
  const earlierIds = new Set(ordered.slice(0, midpoint).map((paper, index) => clean(paper.id) || `earlier-${index}`))
  const recent = ordered.slice(midpoint)
  const recentIds = new Set(recent.map((paper, index) => clean(paper.id) || `recent-${index}`))
  const earlierPapers = Math.max(1, earlierIds.size)
  const recentPapers = Math.max(1, recentIds.size || (ordered.length ? 1 : 0))

  const buckets = new Map<MistakeCauseId, { total: number; earlier: number; recent: number; examples: MistakeCause["examples"] }>()
  for (const id of Object.keys(causes) as MistakeCauseId[]) buckets.set(id, { total: 0, earlier: 0, recent: 0, examples: [] })

  ordered.forEach((paper, paperIndex) => {
    const paperId = clean(paper.id) || (paperIndex < midpoint ? `earlier-${paperIndex}` : `recent-${paperIndex - midpoint}`)
    for (const item of Array.isArray(paper.questionReview) ? paper.questionReview : []) {
      const max = Number(item.maxMarks ?? 1)
      const raw = Number(item.rawMark ?? (item.correct ? max : 0))
      if (item.correct === true || raw >= max) continue
      const cause = inferMistakeCause(paper, item)
      const bucket = buckets.get(cause)!
      bucket.total += 1
      if (recentIds.has(paperId)) bucket.recent += 1
      else bucket.earlier += 1
      if (bucket.examples.length < 3 && clean(item.prompt)) bucket.examples.push({ test: clean(paper.test) || "Admissions test", prompt: clean(item.prompt), date: clean(paper.date) })
    }
  })

  return [...buckets.entries()].filter(([, bucket]) => bucket.total > 0).map(([id, bucket]) => {
    const meta = causes[id]
    const earlierRate = Math.round((bucket.earlier / earlierPapers) * 10) / 10
    const recentRate = Math.round((bucket.recent / recentPapers) * 10) / 10
    let trend: MistakeCause["trend"] = "stable"
    if (!bucket.earlier && bucket.recent) trend = "new"
    else if (recentRate <= earlierRate * 0.75) trend = "improving"
    else if (recentRate >= earlierRate * 1.25 && recentRate > earlierRate) trend = "worsening"
    return { ...meta, count: bucket.total, ratePerPaper: Math.round((bucket.total / Math.max(1, ordered.length)) * 10) / 10, earlierRate, recentRate, trend, examples: bucket.examples }
  }).sort((a, b) => {
    const weight = (item: MistakeCause) => (item.trend === "worsening" ? 3 : item.trend === "new" ? 2 : item.trend === "stable" ? 1 : 0) * 100 + item.recentRate * 10 + item.count
    return weight(b) - weight(a)
  })
}
