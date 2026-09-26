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

function ucatVerbalReasoningDistractors(question: TestQuestion): [string, string, string] | null {
  // Preserve structured True / False / Can't Tell items exactly. This repair is
  // only appropriate for ordinary four-option verbal-reasoning questions.
  if (question.test !== "UCAT" || question.section !== "Verbal Reasoning" || question.options.length !== 4) return null
  const prompt = question.prompt.toLowerCase()

  if (/best supported|most strongly supported/.test(prompt)) {
    return [
      "The intervention described was the only important change capable of affecting the measured outcome during the period in question.",
      "The evidence establishes that the observed change would be reproduced in other settings if the same intervention were introduced there.",
      "The data show that every relevant outcome improved, rather than only the particular measures explicitly described in the passage.",
    ]
  }

  if (/goes beyond|beyond what/.test(prompt)) {
    return [
      "At least one measured outcome differed between the groups or periods described, as reported directly in the passage.",
      "The passage identifies at least one limitation affecting how confidently the observed association can be interpreted.",
      "The evidence describes an observed pattern without eliminating every plausible alternative explanation for that pattern.",
    ]
  }

  if (/limitation/.test(prompt)) {
    return [
      "The evidence comes from a limited practical setting, which may restrict how confidently the exact numerical result can be generalised elsewhere.",
      "The passage does not report every contextual characteristic of the participants or setting, leaving some uncertainty about external validity.",
      "Some results are summarised rather than showing the complete underlying dataset, which limits independent checking but does not resolve the main inference problem.",
    ]
  }

  if (/additional information|improve the strength|improve interpretation/.test(prompt)) {
    return [
      "More descriptive information about participants' views after the outcome changed, without a comparison that addresses the stated limitation.",
      "A longer follow-up reporting the same association while leaving the competing explanation or selection problem otherwise unchanged.",
      "More precise measurement of a secondary outcome that is not connected to the uncertainty identified in the passage's main comparison.",
    ]
  }

  return null
}

function esatBiologyDistractors(question: TestQuestion): [string, string, string] | null {
  if (question.test !== "ESAT" || question.section !== "Biology") return null
  const prompt = question.prompt.toLowerCase()

  if (/most defensible/.test(prompt)) {
    return [
      "The treatment probably explains the entire observed difference because its mean is lower than the control mean, even though variation and sample size are unknown.",
      "The treatment should be regarded as having no effect because, without variation data, any numerical difference between the two means must be ignored.",
      "The difference can be treated as statistically significant because the group means are numerically different, even though no measure of spread or sample size is supplied.",
    ]
  }

  if (/surface-area-to-volume/.test(prompt)) {
    const factor = Number(prompt.match(/factor of\s+(\d+)/)?.[1] ?? "")
    if (Number.isFinite(factor) && factor > 0) {
      return [
        `It becomes ${factor} times the original ratio because the surface area increases as the radius increases.`,
        `It becomes 1/${factor * factor} of the original ratio because the ratio is assumed to scale with surface area alone.`,
        "It remains equal to the original ratio because both surface area and volume increase when the radius increases.",
      ]
    }
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
    ?? ucatVerbalReasoningDistractors(question)
    ?? esatBiologyDistractors(question)
  if (!replacements) return question
  const correct = question.options[question.answer]
  return { ...question, options: [correct, ...replacements], answer: 0 }
}
