import type { TestQuestion } from "@/lib/oxbridge-data"

function compactLength(text: string) {
  return text.replace(/\s+/g, " ").trim().length
}

function hasLengthCue(question: TestQuestion) {
  if (question.answer < 0 || question.answer >= question.options.length) return false
  const correctLength = compactLength(question.options[question.answer] ?? "")
  const distractorLengths = question.options.filter((_, index) => index !== question.answer).map(compactLength)
  if (!distractorLengths.length) return false
  const longest = Math.max(...distractorLengths)
  const shortest = Math.min(...distractorLengths)
  return (correctLength >= 1.38 * Math.max(1, longest) && correctLength - longest >= 10)
    || (shortest >= 1.65 * Math.max(1, correctLength) && shortest - correctLength >= 16)
}

function replacementDistractors(question: TestQuestion): [string, string, string] | null {
  if (question.id === "esat-spec-bio-physiology-a") {
    return [
      "It makes the cell mechanically rigid so that its shape changes less in narrow capillaries.",
      "It increases the diffusion distance between the cell surface and the haemoglobin inside it.",
      "It creates extra internal space for storing genetic material used to control oxygen transport.",
    ]
  }

  if (question.id === "esat-spec-bio-physiology-c") {
    return [
      "To reduce the rate at which oxygen reaches active muscles while exercise continues.",
      "To keep more carbon dioxide within working tissues so that respiration can proceed faster.",
      "To decrease blood flow through exercising muscles and redirect it toward less active organs.",
    ]
  }

  if (question.id === "esat-spec-bio-immunity-a") {
    return [
      "Viruses have protective cell walls that prevent antibiotic molecules from reaching their targets.",
      "Viruses reproduce too slowly for antibiotics to act during the usual course of an infection.",
      "Antibiotics act mainly on human immune cells and therefore cannot reach viruses inside tissues.",
    ]
  }

  if (question.id.startsWith("uniq-esat-bio-evidence-")) {
    return [
      "The lower treatment mean is enough to establish a real treatment effect even without uncertainty data.",
      "The difference between the two means should be treated as negligible because no sample size is reported.",
      "The observed difference would be expected to remain unchanged in a larger sample from the same population.",
    ]
  }

  return null
}

/**
 * A small ESAT Biology-only repair for known option-shape shortcuts. It keeps
 * the keyed scientific claim and explanation intact while replacing only the
 * distractors with similarly developed alternatives, so students must use the
 * biology/evidence rather than the visual length of an option.
 */
export function repairEsatBiologyAnswerLengthCue(question: TestQuestion): TestQuestion {
  if (question.test !== "ESAT" || question.section !== "Biology" || !hasLengthCue(question)) return question
  const replacements = replacementDistractors(question)
  if (!replacements || question.answer < 0 || question.answer >= question.options.length) return question

  const correct = question.options[question.answer]
  return { ...question, options: [correct, ...replacements], answer: 0 }
}
