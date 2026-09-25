import type { TestQuestion } from "@/lib/oxbridge-data"

function compactLength(text: string) {
  return text.replace(/\s+/g, " ").trim().length
}

function hasAnswerLengthCue(question: TestQuestion) {
  if (!Array.isArray(question.options) || question.answer < 0 || question.answer >= question.options.length) return false
  const correctLength = compactLength(question.options[question.answer] ?? "")
  const longestDistractor = Math.max(1, ...question.options.filter((_, index) => index !== question.answer).map(compactLength))
  return correctLength >= 1.55 * longestDistractor && correctLength - longestDistractor >= 12
}

function taraCriticalThinkingDistractors(question: TestQuestion): [string, string, string] | null {
  if (question.test !== "TARA" || question.section !== "Critical Thinking") return null
  const prompt = question.prompt.toLowerCase()

  if (/assumption|required/.test(prompt)) {
    return [
      "That the measured outcome was recorded consistently enough for the before-and-after comparison to be meaningful, even if other causes remain possible.",
      "That the intervention had at least some effect on the people exposed to it, although the evidence does not establish that it caused most of the observed change.",
      "That the groups or periods being compared were broadly similar on one relevant feature, without ruling out other differences that could explain the result.",
    ]
  }

  if (/strengthen/.test(prompt)) {
    return [
      "The same outcome was also observed elsewhere, but in settings where several other relevant conditions changed at the same time.",
      "People affected by the intervention generally believed it was useful, although their views were collected only after the outcome had already changed.",
      "The measured effect persisted for longer than expected, but the evidence does not distinguish the proposed explanation from a plausible competing cause.",
    ]
  }

  if (/weaken/.test(prompt)) {
    return [
      "The observed change was somewhat smaller in a second setting, although the second setting differed in several ways that make the comparison uncertain.",
      "Some people affected by the intervention were sceptical about it, but their views do not show whether the measured outcome had another cause.",
      "The proposed mechanism was not measured directly, although the timing of the outcome remains consistent with the conclusion being tested.",
    ]
  }

  return null
}

/**
 * Repairs a test-taking clue without changing the keyed proposition. Only
 * question types with purpose-written, semantically plausible alternatives are
 * changed; the function never pads distractors with meaningless filler.
 */
export function repairSemanticAnswerCues(question: TestQuestion): TestQuestion {
  if (!hasAnswerLengthCue(question)) return question
  const replacements = taraCriticalThinkingDistractors(question)
  if (!replacements) return question
  const correct = question.options[question.answer]
  return { ...question, options: [correct, ...replacements], answer: 0 }
}
