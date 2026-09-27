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

const cueWord = /\b(?:always|never|everyone|completely|entirely|automatically|impossible|guarantees?|none of|all cases|solely)\b/i

function candidatePool(prompt: string) {
  if (/main conclusion/i.test(prompt)) {
    return [
      "The passage mainly argues for improving how the issue is measured, while leaving the existing approach substantially unchanged.",
      "The author treats a supporting example as the main reason for preferring one practical response to the issue.",
      "The passage suggests that better evidence would largely settle the dispute without resolving the wider evaluative question it raises.",
      "The author favours the current approach but argues that its central outcome should be measured and reported more carefully.",
      "The passage's central claim is that the practical problem described matters more than the broader distinction used elsewhere in the argument.",
      "The author argues that the supporting consideration should normally decide the issue, with the broader qualification playing a secondary role.",
      "The passage recommends changing present practice chiefly because the example described shows that the current arrangement can produce an undesirable result.",
      "The author concludes that uncertainty in the evidence is the main obstacle and that reducing this uncertainty should take priority over the wider issue.",
    ]
  }

  if (/assumption/i.test(prompt)) {
    return [
      "That the example in the passage is relevant enough to show that the practical issue can arise in at least some cases.",
      "That decision-makers can compare the main outcome with reasonable consistency, even if other considerations remain disputed.",
      "That collecting better evidence would reduce uncertainty about the issue, without by itself deciding the value judgement involved.",
      "That the practical difficulty described is significant enough to deserve attention when the wider decision is made.",
      "That the supporting observation is not merely accidental, even though the argument still requires a further evaluative step.",
      "That people affected by the issue can provide information relevant to the decision, although their views need not determine the outcome.",
      "That the central outcome can be investigated in a way that permits meaningful comparison between different cases or approaches.",
      "That the example discussed is connected to the policy question, while leaving open how much weight that connection should ultimately receive.",
    ]
  }

  if (/strengthen/i.test(prompt)) {
    return [
      "A larger study reproduces the pattern in the passage but does not distinguish the author's explanation from a plausible rival cause.",
      "People affected by the policy report greater satisfaction, although the survey does not test the distinction on which the argument depends.",
      "A comparable case shows a related benefit, but the groups also differ on another factor capable of producing the same result.",
      "A longer follow-up finds the original association again, while still leaving the central alternative explanation unresolved.",
      "More precise measurement confirms the size of the reported effect but provides no new evidence about why that effect occurred.",
      "A separate example points in the same direction, although it concerns a different mechanism from the one the author uses to support the conclusion.",
      "Participants prefer the proposed approach after trying it, but their preference does not establish the causal or evaluative claim made in the passage.",
      "Researchers find the same descriptive difference in another setting, but important background conditions also changed between the comparison groups.",
    ]
  }

  if (/most strongly supported|best supported/i.test(prompt)) {
    return [
      "The reasoning could support a similar recommendation elsewhere if one of the passage's supporting considerations were also present there.",
      "Improving the accuracy of the evidence would reduce uncertainty, even though the evaluative distinction in the passage could remain contested.",
      "The supporting example gives some reason to favour the conclusion, but it does not by itself establish how competing considerations should be weighted.",
      "The passage implies that the practical concern it identifies can matter even in cases where the author's final recommendation would differ.",
      "The argument suggests that a better measured outcome would make comparison easier, without removing the need for judgement about what matters.",
      "The author's qualification leaves room for cases in which the supporting consideration is present but another relevant consideration carries greater weight.",
      "The example discussed is consistent with the author's conclusion, although a different example could require the broader principle to be applied differently.",
      "The passage gives the supporting observation evidential importance while still treating the wider distinction as necessary to reach the final judgement.",
    ]
  }

  return []
}

/**
 * Final LNAT-only repair. It runs after semantic distractor repair and is used
 * only when the keyed option is still conspicuously longer or shorter. Several
 * genuine near-miss interpretations are available at different lengths; the
 * three closest to the keyed answer are selected. This avoids mechanical
 * padding/truncation and keeps difficulty in close reading rather than option shape.
 */
export function repairLnatAnswerLengthCue(question: TestQuestion): TestQuestion {
  if (question.test !== "LNAT" || question.section !== "Argumentative passages" || !hasLengthCue(question)) return question
  if (question.answer < 0 || question.answer >= question.options.length) return question

  const correct = question.options[question.answer]
  const correctLength = compactLength(correct)
  const existing = question.options.filter((_, index) => index !== question.answer)
  const candidates = [...existing, ...candidatePool(question.prompt)]
    .filter(text => text && normalise(text) !== normalise(correct))
    .filter(text => !cueWord.test(text))

  const unique = [...new Map(candidates.map(text => [normalise(text), text])).values()]
    .sort((a, b) => {
      const aDistance = Math.abs(compactLength(a) - correctLength)
      const bDistance = Math.abs(compactLength(b) - correctLength)
      if (aDistance !== bDistance) return aDistance - bDistance
      return compactLength(a) - compactLength(b)
    })

  if (unique.length < 3) return question
  const options = [correct, ...unique.slice(0, 3)]
  return { ...question, options, answer: 0 }
}
