import type { FullPaperQuestion } from "@/lib/full-paper-question"
import { isYesNoStatementQuestion } from "@/lib/full-paper-question"

export const ucatDmFamilies = [
  "Syllogisms",
  "Information Interpretation",
  "Logical Puzzles",
  "Statistical Reasoning",
  "Assumption Recognition",
  "Venn Diagrams",
] as const

export type UcatDmFamily = typeof ucatDmFamilies[number] | "Other"

function text(question: FullPaperQuestion) {
  return `${question.prompt} ${question.explanation}`.toLowerCase()
}

/**
 * Classifies Decision Making practice by the response/item families reported in
 * the UCAT technical material. Statement questions are deliberately kept to
 * the two multi-statement families; single-answer questions use the four MCQ
 * families. "Other" is retained so CI can expose format drift rather than
 * silently forcing an ill-fitting question into a category.
 */
export function ucatDmFamily(question: FullPaperQuestion): UcatDmFamily {
  const content = text(question)

  if (isYesNoStatementQuestion(question)) {
    // Explicit datasets/studies take precedence. Their wording can naturally
    // contain "all", "no" or "conclusion follows", which must not turn them
    // into syllogisms merely because the response format is also Yes/No.
    if (/\b(study|survey|service|clinic|library|comparison|observational|randomi[sz]ed|recorded|records|mean|rate|data|evidence|measured|appointments?|journeys?|residents?|participants?|students?)\b/.test(content)) {
      return "Information Interpretation"
    }

    const categorical = /\b(all|every|some|no)\b/.test(content) && /\b(follows?|conclusion|premises?|subset|cannot|implies?)\b/.test(content)
    const conditionalLogic = /\bif\b/.test(content) && /\b(conclusion|follows?|contrapositive|implies?)\b/.test(content)
    if (categorical || conditionalLogic) return "Syllogisms"
    return "Other"
  }

  if (/\b(assumption|argument|conclusion|strengthen|weaken|reasoning|claim)\b/.test(content)) return "Assumption Recognition"

  if (/\b(venn|both|neither|at least one|exactly one|only one|overlap|intersection|union)\b/.test(content) || /\bpeople surveyed\b/.test(content)) {
    return "Venn Diagrams"
  }

  if (/\b(probability|chance|random|odds|mean|median|percentage|percent|rate|sample|statistical|expected value|risk)\b/.test(content)) {
    return "Statistical Reasoning"
  }

  if (/\b(slot|slots|scheduled|schedule|order|ordered|before|after|arrange|arranged|assignment|assigned|position|positions|sequence|seating|route)\b/.test(content)) {
    return "Logical Puzzles"
  }

  return "Other"
}
