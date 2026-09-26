import type { TestQuestion } from "@/lib/oxbridge-data"
import { taraQuestionType } from "@/lib/tara-question-format"

function compactLength(text: string) {
  return text.replace(/\s+/g, " ").trim().length
}

function hasAnswerLengthCue(question: TestQuestion) {
  if (!Array.isArray(question.options) || question.answer < 0 || question.answer >= question.options.length) return false
  const correctLength = compactLength(question.options[question.answer] ?? "")
  const distractorLengths = question.options.filter((_, index) => index !== question.answer).map(compactLength)
  if (!distractorLengths.length) return false
  const longestDistractor = Math.max(1, ...distractorLengths)
  const shortestDistractor = Math.min(...distractorLengths)
  const correctMuchLonger = correctLength >= 1.38 * longestDistractor && correctLength - longestDistractor >= 10
  const correctMuchShorter = shortestDistractor >= 1.65 * Math.max(1, correctLength) && shortestDistractor - correctLength >= 16
  return correctMuchLonger || correctMuchShorter
}

function lnatArgumentDistractors(question: TestQuestion): string[] | null {
  if (question.test !== "LNAT" || question.section !== "Argumentative passages") return null
  const prompt = question.prompt.toLowerCase()

  if (/main conclusion/.test(prompt)) {
    return [
      "The passage's main concern is that the evidence currently available is too uncertain to justify a substantive judgement, so improving measurement should take priority over changing the underlying approach.",
      "The passage supports preserving the existing approach while refining the way its most important outcome is measured, because the practical example shows that implementation matters more than the wider principle.",
      "The passage argues that the supporting consideration it describes should normally determine the decision, even though the wider distinction developed elsewhere in the passage may still matter in unusual cases.",
    ]
  }

  if (/assumption/.test(prompt)) {
    return [
      "That the practical example described is representative enough to show that the issue can arise, even though this does not establish the broader evaluative premise needed for the conclusion.",
      "That decision-makers are capable of measuring the main outcome consistently enough to compare cases, while leaving open how competing considerations should be weighed.",
      "That improving the available evidence would reduce uncertainty about the issue, although better evidence alone would not establish the value judgement on which the conclusion depends.",
    ]
  }

  if (/strengthen/.test(prompt)) {
    return [
      "A larger study reproduces the descriptive pattern identified in the passage, but it does not distinguish the mechanism on which the author's conclusion depends from a plausible rival explanation.",
      "People affected by the policy report greater satisfaction after the change, although the survey does not test the particular distinction the author uses to justify the conclusion.",
      "A comparable case shows improvement in a related outcome, but the comparison groups differ on another factor capable of producing the same result independently of the author's explanation.",
    ]
  }

  if (/most strongly supported|best supported/.test(prompt)) {
    return [
      "The author's reasoning would support the same recommendation in a materially different setting provided that one of the supporting considerations in the passage was also present there.",
      "The passage suggests that improving the accuracy of the available evidence would be sufficient to settle the issue even if the evaluative distinction at the centre of the argument remained contested.",
      "The argument implies that the supporting example gives a strong presumption in favour of the conclusion, so competing considerations would need unusually strong evidence to justify a different outcome.",
    ]
  }

  return null
}

function taraCriticalThinkingDistractors(question: TestQuestion): string[] | null {
  if (question.test !== "TARA" || question.section !== "Critical Thinking") return null
  const prompt = question.prompt.toLowerCase()
  const type = taraQuestionType(question)

  if (type === "Identifying an Assumption") {
    return [
      "That the comparison is measured consistently enough for the reported difference to be meaningful, even though this alone does not connect the reasons to the conclusion.",
      "That the proposed explanation has some effect in at least some cases, although the argument requires a stronger link than that possibility establishes.",
      "That the groups or periods are similar on one relevant feature, while other unmeasured differences could still account for the result.",
      "That the conclusion would be useful if true, which concerns its consequences rather than an assumption required by the reasoning itself.",
    ]
  }

  if (type === "Assessing the Impact of Additional Evidence" && /strengthen|support/.test(prompt)) {
    return [
      "The same pattern appears in another setting, but several other conditions changed there at the same time, so the proposed explanation remains uncertain.",
      "People affected by the change generally approved of it afterwards, although their opinion does not show that the change produced the measured outcome.",
      "The measured effect persisted for longer than expected, but the evidence still does not distinguish the proposed mechanism from a plausible rival cause.",
      "The outcome was recorded more precisely in a later survey, but the improved measurement does not address the central causal step in the argument.",
    ]
  }

  if (type === "Assessing the Impact of Additional Evidence" && /weaken|undermine/.test(prompt)) {
    return [
      "A second setting showed a smaller change, although it differed in several relevant ways and therefore gives only limited evidence against the conclusion.",
      "Some people affected by the intervention were sceptical about it, but their views do not establish whether the measured outcome had another cause.",
      "The proposed mechanism was not measured directly, although the timing of the outcome remains consistent with the conclusion being tested.",
      "The data were collected for longer than originally planned, which changes the quantity of evidence without identifying a competing explanation for the result.",
    ]
  }

  if (type === "Identifying the Main Conclusion") {
    return [
      "A reason the author gives in support of the argument, rather than the claim those reasons are ultimately intended to establish.",
      "A consequence that might follow if the author's view is correct, but which the passage does not itself present as its central claim.",
      "A stronger and less qualified version of the author's position that goes beyond what the stated reasons are meant to support.",
      "A background claim needed to understand the issue, but not the proposition the author is principally trying to persuade the reader to accept.",
    ]
  }

  if (type === "Drawing a Conclusion") {
    return [
      "A claim that is compatible with the information but would require an additional assumption before it could be inferred from what is given.",
      "A stronger generalisation than the evidence warrants because it extends the result beyond the people, period or conditions described.",
      "A statement that restates one piece of evidence accurately but does not follow as the requested conclusion from the information as a whole.",
      "A plausible explanation of the result that the information does not distinguish from other possible explanations.",
    ]
  }

  if (type === "Detecting Reasoning Errors") {
    return [
      "The argument may overstate the practical importance of the result, but that does not identify the central logical gap linking the evidence to the conclusion.",
      "The evidence could have been collected more precisely, although measurement precision is not the main problem with the inference being made.",
      "The author does not discuss every possible consequence of the policy, but the reasoning error concerns how the stated evidence is used rather than completeness of discussion.",
      "The conclusion may be unpopular with some people, which is irrelevant to whether the reasoning offered in its support is logically adequate.",
    ]
  }

  if (type === "Matching Arguments") {
    return [
      "An argument about similar subject matter that reverses the direction of the original inference and therefore has a different logical structure.",
      "An argument reaching a similar conclusion from a general rule, when the original reaches its conclusion by comparing two cases.",
      "An argument using the same key words but treating a necessary condition as sufficient, unlike the reasoning pattern in the original.",
      "An argument with the same number of premises but a different dependence between those premises and the conclusion.",
    ]
  }

  if (type === "Applying Principles") {
    return [
      "A case that pursues a similar goal but fails one of the conditions explicitly required by the principle.",
      "A case that satisfies one condition very strongly while violating another condition that the principle also makes necessary.",
      "A case that would be attractive on practical grounds, although those grounds are not the criterion stated in the principle.",
      "A case that resembles the example in surface details but differs on the feature that determines whether the principle applies.",
    ]
  }

  return null
}

function ucatVerbalReasoningDistractors(question: TestQuestion): string[] | null {
  if (question.test !== "UCAT" || question.section !== "Verbal Reasoning") return null
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

function esatBiologyDistractors(question: TestQuestion): string[] | null {
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
 * Removes answer-format cues without changing the keyed proposition. Replacements
 * are used only for reasoning types where a semantically plausible near-miss can
 * be generated safely; no meaningless padding is added merely to equalise length.
 */
export function repairSemanticAnswerCues(question: TestQuestion): TestQuestion {
  if (!hasAnswerLengthCue(question)) return question
  const replacements = lnatArgumentDistractors(question)
    ?? taraCriticalThinkingDistractors(question)
    ?? ucatVerbalReasoningDistractors(question)
    ?? esatBiologyDistractors(question)
  if (!replacements) return question
  const correct = question.options[question.answer]
  const requiredDistractors = Math.max(0, question.options.length - 1)
  if (replacements.length < requiredDistractors) return question
  return { ...question, options: [correct, ...replacements.slice(0, requiredDistractors)], answer: 0 }
}
