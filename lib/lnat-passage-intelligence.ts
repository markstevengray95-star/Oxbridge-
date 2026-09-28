import type { FullPaperQuestion } from "@/lib/full-paper-question"

export type LnatReasoningSkill = "main conclusion" | "inference" | "assumption" | "evidence" | "tone and purpose" | "distinction and qualification"

export function lnatPassageKey(question: FullPaperQuestion, index = 0) {
  const upgraded = question.id.match(/^upgrade-lnat-(\d+)-\d+$/)
  if (upgraded) return `Passage ${Number(upgraded[1]) + 1}`
  const reserve = question.id.match(/^uniq-lnat-(?:main|assume|strength|critic)-(\d+)$/)
  if (reserve) return `Passage ${Number(reserve[1]) + 1}`
  return `Passage ${Math.floor(index / 4) + 1}`
}

export function lnatReasoningSkill(prompt: string): LnatReasoningSkill {
  const text = prompt.toLowerCase()
  if (/main (?:point|conclusion|claim)|central (?:argument|claim)|best summar/.test(text)) return "main conclusion"
  if (/assum|depends on|must be presupposed|requires the author/.test(text)) return "assumption"
  if (/tone|purpose|attitude|rhetor|why does the author/.test(text)) return "tone and purpose"
  if (/evidence|support|example|reason|strengthen|weaken/.test(text)) return "evidence"
  if (/distinguish|qualification|exception|contrast|difference|most accurately/.test(text)) return "distinction and qualification"
  return "inference"
}

export function groupLnatQuestions(questions: FullPaperQuestion[]) {
  const groups = new Map<string, FullPaperQuestion[]>()
  questions.forEach((question, index) => {
    const key = lnatPassageKey(question, index)
    groups.set(key, [...(groups.get(key) ?? []), question])
  })
  return [...groups.entries()].map(([title, items], index) => ({ id: `lnat-passage-${index + 1}`, title, questions: items }))
}

export function lnatPassageDiagnostic(input: Array<{ prompt: string; correct: boolean; confidence: number }>) {
  const bySkill = new Map<LnatReasoningSkill, { correct: number; total: number; confidence: number[] }>()
  for (const item of input) {
    const skill = lnatReasoningSkill(item.prompt)
    const existing = bySkill.get(skill) ?? { correct: 0, total: 0, confidence: [] }
    existing.total += 1
    if (item.correct) existing.correct += 1
    existing.confidence.push(item.confidence)
    bySkill.set(skill, existing)
  }
  return [...bySkill.entries()].map(([skill, values]) => {
    const accuracy = values.total ? Math.round(values.correct / values.total * 100) : 0
    const meanConfidence = values.confidence.length ? Math.round(values.confidence.reduce((a, b) => a + b, 0) / values.confidence.length) : 0
    const gap = meanConfidence - accuracy
    return {
      skill,
      correct: values.correct,
      total: values.total,
      accuracy,
      meanConfidence,
      calibrationGap: gap,
      nextAction: skill === "main conclusion" ? "State the author's overall conclusion in your own words before looking at the options."
        : skill === "assumption" ? "Ask what must be true for the author's reasoning to work, not what would merely help it."
          : skill === "tone and purpose" ? "Separate the author's attitude from the topic and support tone judgements with specific wording."
            : skill === "evidence" ? "Identify which claim the evidence is meant to support before deciding whether it is strong or weak."
              : skill === "distinction and qualification" ? "Return to qualifiers such as only, usually, some, unless and however; they often control the answer."
                : "Separate what the passage states from what can be inferred; do not import outside knowledge.",
    }
  }).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
}
