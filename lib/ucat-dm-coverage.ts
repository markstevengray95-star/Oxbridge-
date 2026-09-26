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

function productionFamily(id: string): UcatDmFamily | null {
  if (id.startsWith("ucat-dm-production-puzzle-")) return "Logical Puzzles"
  if (id.startsWith("ucat-dm-production-statistical-")) return "Statistical Reasoning"
  if (id.startsWith("ucat-dm-production-assumption-")) return "Assumption Recognition"
  if (id.startsWith("ucat-dm-production-venn-")) return "Venn Diagrams"
  return null
}

/**
 * Classifies Decision Making practice by the response/item families reported in
 * the UCAT technical material. Verified production MCQs carry an explicit
 * family in their stable id; that metadata is authoritative because wording can
 * legitimately contain terms shared by several reasoning families. "Other" is
 * retained for legacy/unrecognised material so CI still exposes format drift.
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

  const verifiedFamily = productionFamily(question.id)
  if (verifiedFamily) return verifiedFamily

  // Legacy/reserve material falls back to content inference. Order matters:
  // puzzle/statistical markers are more diagnostic than generic words such as
  // "assumption", "both" or "conclusion" that may appear in explanations.
  if (/\b(slot|slots|scheduled|schedule|order|ordered|before|after|arrange|arranged|assignment|assigned|position|positions|sequence|seating|route)\b/.test(content)) {
    return "Logical Puzzles"
  }

  if (/\b(probability|chance|random|odds|mean|median|percentage|percent|rate|sample|statistical|expected value|risk)\b/.test(content)) {
    return "Statistical Reasoning"
  }

  if (/\b(venn|both|neither|at least one|exactly one|only one|overlap|intersection|union)\b/.test(content) || /\bpeople surveyed\b/.test(content)) {
    return "Venn Diagrams"
  }

  if (/\b(assumption|argument|conclusion|strengthen|weaken|reasoning|claim)\b/.test(content)) return "Assumption Recognition"

  return "Other"
}
