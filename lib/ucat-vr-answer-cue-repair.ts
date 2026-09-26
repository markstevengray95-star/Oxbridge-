import type { TestQuestion } from "@/lib/oxbridge-data"

function compactLength(text: string) {
  return text.replace(/\s+/g, " ").trim().length
}

function normalise(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
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

const giveawayWord = /\b(?:always|never|everyone|nobody|completely|entirely|automatically|impossible|guarantees?|definitely|solely|every relevant outcome|no factual statement)\b/i

function candidatePool(prompt: string) {
  if (/attitude.*best described|author'?s attitude/i.test(prompt)) {
    return [
      "Confident in the proposed explanation, treating the stated limitations as secondary to the observed result.",
      "Sceptical of the interpretation, treating the limitations as serious enough to undermine most of the reported evidence.",
      "Detached and mainly descriptive, reporting the findings without judging how much the limitations weaken the inference.",
      "Broadly supportive of the conclusion, while treating the acknowledged limitations as unlikely to alter the main interpretation.",
      "Doubtful about the findings themselves, rather than distinguishing between the observations and the conclusion drawn from them.",
      "Persuaded by the reported pattern and willing to infer more from it than the methodological qualifications strictly justify.",
      "Reserved about the usefulness of the evidence, suggesting that the limitations leave little basis for interpreting the observed pattern.",
      "Neutral about the strength of the inference, presenting the observation and the limitation without favouring either interpretation.",
    ]
  }

  if (/best supported|most strongly supported/i.test(prompt)) {
    return [
      "The measured outcome changed during the period described, but the passage does not isolate which of the accompanying changes produced it.",
      "The observed groups differed on the reported measure, although the evidence does not establish that the proposed factor caused the difference.",
      "The passage reports an association between the change and the measured result without showing that the same result would occur in another setting.",
      "At least one reported measure changed after the intervention, while the evidence leaves open whether another simultaneous factor contributed to the change.",
      "The comparison described shows a difference in the observed data, but it does not establish a general rule extending beyond the people or period studied.",
      "The evidence records a change in the stated outcome under the conditions described, without determining the effect of every other relevant condition.",
      "The passage supports the existence of the reported pattern, although it does not show that the proposed explanation is the unique cause of that pattern.",
      "The data are consistent with the proposed explanation, but the passage itself establishes the observation more securely than the causal interpretation.",
    ]
  }

  if (/goes beyond|beyond what/i.test(prompt)) {
    return [
      "The measured outcome differed between the groups or periods described in the passage.",
      "At least one factor changed at the same time as the reported outcome changed.",
      "The evidence leaves some uncertainty about how confidently the observed association should be interpreted.",
      "The passage describes a result from the particular people, place or period that was studied.",
      "A limitation mentioned in the passage makes a causal interpretation less secure than the descriptive observation.",
      "The reported comparison is compatible with more than one explanation of the observed result.",
      "The passage provides evidence about the measured outcome but does not report every potentially relevant background factor.",
      "The result described is an observation from the study or setting rather than a direct test of every possible explanation.",
    ]
  }

  if (/limitation/i.test(prompt)) {
    return [
      "The study reports one practical setting, which may limit how confidently the exact numerical result can be generalised elsewhere.",
      "The passage does not provide every background characteristic of the people or setting, leaving some uncertainty about wider applicability.",
      "Some outcomes are summarised rather than presenting the complete underlying dataset, which limits independent checking of the reported pattern.",
      "The evidence focuses on the main measured result and gives less information about secondary outcomes that may also matter in practice.",
      "The observation period is finite, so the passage cannot by itself establish that the same numerical effect would continue indefinitely.",
      "The comparison gives useful descriptive evidence but does not provide a complete account of every feature that could differ between settings.",
      "The passage reports the selected outcome clearly, while giving less detail about whether the magnitude would be identical in another population.",
      "The evidence comes from the stated design and context, so its numerical estimate should not automatically be assumed to apply unchanged everywhere.",
    ]
  }

  if (/additional information|improve the strength|improve interpretation/i.test(prompt)) {
    return [
      "A larger description of participants' views after the outcome changed, without a comparison that addresses the main source of uncertainty.",
      "A longer follow-up showing the same association while leaving the competing explanation or selection problem otherwise unchanged.",
      "More precise measurement of a secondary outcome that is not connected to the limitation affecting the main inference.",
      "More detail about the organisation's aims and implementation process without evidence separating the proposed cause from alternative explanations.",
      "A larger sample drawn in the same way, if the principal problem is that the compared groups differ systematically for another reason.",
      "Additional descriptive statistics about the observed result without a design change that tests the alternative explanation identified in the passage.",
      "A statement from investigators explaining why they prefer their interpretation, without new comparative evidence that distinguishes it from rival accounts.",
      "More information about an unrelated outcome measured during the same period, without evidence bearing on the central comparison in the passage.",
    ]
  }

  return []
}

/**
 * Final UCAT VR-only option-shape repair. It retains existing distractors where
 * possible, adds close-reading near misses at several lengths, then chooses the
 * three alternatives whose lengths sit closest to the keyed option. The goal is
 * to remove a visual shortcut without making distractors vague or irrelevant.
 */
export function repairUcatVrAnswerLengthCue(question: TestQuestion): TestQuestion {
  if (question.test !== "UCAT" || question.section !== "Verbal Reasoning" || !hasLengthCue(question)) return question
  if (question.answer < 0 || question.answer >= question.options.length) return question

  const correct = question.options[question.answer]
  const correctLength = compactLength(correct)
  const existing = question.options.filter((_, index) => index !== question.answer)
  const candidates = [...existing, ...candidatePool(question.prompt)]
    .filter(text => text && normalise(text) !== normalise(correct))
    .filter(text => !giveawayWord.test(text))

  const unique = [...new Map(candidates.map(text => [normalise(text), text])).values()]
    .sort((a, b) => {
      const aDistance = Math.abs(compactLength(a) - correctLength)
      const bDistance = Math.abs(compactLength(b) - correctLength)
      if (aDistance !== bDistance) return aDistance - bDistance
      return compactLength(a) - compactLength(b)
    })

  if (unique.length < 3) return question
  return { ...question, options: [correct, ...unique.slice(0, 3)], answer: 0 }
}
