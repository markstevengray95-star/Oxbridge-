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

function argumentCandidates(prompt: string) {
  if (/strongest in favour/i.test(prompt)) {
    return [
      "Survey evidence shows many people are concerned about the problem, although the survey does not establish that the proposed policy would reduce it effectively.",
      "A similar policy has been introduced in several comparable places, but the available information does not show whether those places experienced the same underlying problem or achieved better outcomes.",
      "The proposal could change behaviour among some people affected by the policy, although no evidence is given about whether that change would be large enough to solve the problem identified.",
      "The policy may be easier to explain than some alternatives, but administrative simplicity alone does not show that its expected benefits would outweigh its wider costs.",
      "Some stakeholders support the proposal because they expect an improvement, although their expectation is not independent evidence that the improvement would actually occur.",
      "The proposal targets a factor associated with the problem, but the argument does not establish that changing this factor would address the most important cause of the problem.",
    ]
  }

  if (/most directly challenges|most weaken/i.test(prompt)) {
    return [
      "The proposed change would require additional administration and monitoring, although the scale of that cost is not compared with the expected benefit.",
      "Some people affected by the proposal prefer the current arrangement, but preference alone does not establish that the proposed change would be ineffective.",
      "A comparable organisation introduced a similar change and reported mixed results, although important differences between the two settings make the comparison uncertain.",
      "The measure used to assess success captures only part of the intended outcome, but it still records one relevant aspect of performance.",
      "The observed improvement was larger in one subgroup than another, although both groups moved in the same direction during the period studied.",
      "The proposal has practical disadvantages that should be considered, but the evidence does not show that those disadvantages outweigh the claimed benefit.",
    ]
  }

  if (/most relevant|most important|evaluating the proposal|before deciding|limitation matters most/i.test(prompt)) {
    return [
      "Whether people affected by the proposal say they prefer the new arrangement, although preference would not by itself establish effectiveness or overall value.",
      "Whether organisations in similar settings have adopted a comparable approach, without knowing whether their aims, constraints and outcomes match this case.",
      "Whether the proposed change can be implemented smoothly in the short term, while leaving its longer-term effects and opportunity costs uncertain.",
      "Whether one secondary outcome improves after the change, even if the evidence does not show what happens to the main objective or to important competing costs.",
      "Whether the proposal appears simpler than the current system, although simplicity is only one consideration and may not predict the quality of the final outcome.",
      "Whether early feedback is positive among volunteers who chose to participate, given that self-selection may make their experience unrepresentative of the wider group.",
    ]
  }

  if (/most strengthen/i.test(prompt)) {
    return [
      "The outcome improved after the proposal was introduced in a second setting, although that setting also experienced another change capable of producing the same result.",
      "People exposed to the proposal reported that they believed it was helpful, but their belief does not independently establish that it caused the measured improvement.",
      "The improvement continued for a longer period than first reported, while the available evidence still lacks a comparison that separates the proposal from background trends.",
      "A larger sample showed the same association between the proposal and the outcome, but participation remained self-selected and therefore vulnerable to the same bias.",
      "Researchers measured the outcome more precisely after the proposal began, although greater precision does not by itself address the competing explanation for the observed change.",
      "The proposal produced a larger change in one subgroup, but the analysis does not show whether that subgroup differed in another relevant way before the intervention.",
    ]
  }

  return []
}

/**
 * Removes option-length shortcuts from UCAT Decision Making argument-evaluation
 * items. Distractors remain substantive: each is relevant enough to merit
 * consideration but is weaker because it lacks causal isolation, comparative
 * evidence, direct relevance or a complete benefits-versus-costs judgement.
 */
export function repairUcatDmAnswerLengthCue(question: TestQuestion): TestQuestion {
  if (question.test !== "UCAT" || question.section !== "Decision Making" || !hasLengthCue(question)) return question
  if (question.answer < 0 || question.answer >= question.options.length) return question

  const pool = argumentCandidates(question.prompt)
  if (!pool.length) return question

  const correct = question.options[question.answer]
  const correctLength = compactLength(correct)
  const existing = question.options.filter((_, index) => index !== question.answer)
  const candidates = [...existing, ...pool]
    .filter(text => text && normalise(text) !== normalise(correct))

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
