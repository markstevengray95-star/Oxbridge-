export type InterviewAnswerClassification = "incorrect" | "vague" | "irrelevant" | "partial" | "responsive"
export type InterviewAnswerIssue = "none" | "repetition" | "contradiction" | "unsupported" | "evasion" | "off-topic" | "missing-reasoning" | "factual-error"

export type InterviewAnswerQuality = {
  classification: InterviewAnswerClassification
  confidence: number
  reason: string
  issue: InterviewAnswerIssue
  directness: number
  repairDepth: 0 | 1 | 2 | 3
}

export type InterviewAnswerInput = {
  question?: string
  answer?: string
  concepts?: string[]
  referenceAnswer?: string
  previousAnswers?: string[]
}

const STOP_WORDS = new Set([
  "about", "after", "again", "against", "also", "because", "before", "being", "between", "could", "does", "from", "have", "into", "more", "most", "only", "other", "should", "some", "such", "than", "that", "their", "there", "these", "they", "this", "those", "through", "under", "very", "what", "when", "where", "which", "while", "with", "would", "your", "then", "them", "just", "like", "think", "question", "answer",
])

const GENERIC_ANSWERS = /^(?:i\s+(?:don't|do not)\s+know|i'm\s+not\s+sure|i\s+am\s+not\s+sure|not\s+sure|no\s+idea|it\s+depends|maybe|possibly|probably|yes|no|i\s+guess|i\s+think\s+so|sort\s+of|kind\s+of)[.!?\s]*$/i
const STUCK_OPENING = /^(?:i\s+(?:don't|do not)\s+know|i'm\s+not\s+sure|i\s+am\s+not\s+sure|not\s+sure|no\s+idea)\b/i
const REVISION_LANGUAGE = /\b(?:i(?:'d| would)\s+(?:revise|change|correct)|i\s+(?:revise|change|correct)|actually|on reflection|thinking again|my earlier answer|my previous answer|i was wrong|let me correct)\b/i
const REASONING_LANGUAGE = /\b(?:because|therefore|since|so that|hence|implies?|means that|if|given|assuming|as a result|which means|this leads to|so the)\b/i
const EXPLANATION_QUESTION = /\b(?:why|explain|justify|reason|talk through|show|prove|develop|evaluate|how would|what happens|what would|estimate|interpret|compare|argue|defend)\b/i
const DIRECT_ANSWER_LANGUAGE = /\b(?:my answer is|i would say|therefore|so the answer|the result is|this means|i conclude|it is|it would|it increases|it decreases|it stays|yes,|no,)\b/i

const CONTRAST_PAIRS: Array<[string, string]> = [
  ["warmer", "cooler"],
  ["increase", "decrease"],
  ["increases", "decreases"],
  ["higher", "lower"],
  ["larger", "smaller"],
  ["more", "less"],
  ["faster", "slower"],
  ["positive", "negative"],
  ["halves", "doubles"],
  ["true", "false"],
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .match(/[a-z][a-z-]{3,}/g)
    ?.filter(token => !STOP_WORDS.has(token)) ?? []
}

function numberTokens(text: string) {
  return text
    .replace(/[−–—]/g, "-")
    .match(/-?\d+(?:\.\d+)?(?:\s*[×x*]\s*10\s*\^?\s*-?\d+)?/g)
    ?.map(value => value.replace(/\s+/g, "").toLowerCase()) ?? []
}

function containsMath(text: string) {
  return /\d|[=<>≤≥√π²³×÷+−*/]/.test(text)
}

function overlapCount(question: string, answer: string, concepts: string[]) {
  const answerLower = answer.toLowerCase()
  const conceptHits = concepts.filter(concept => concept.length >= 3 && answerLower.includes(concept.toLowerCase())).length
  const questionTokens = new Set(tokens(question))
  const answerTokens = new Set(tokens(answer))
  let lexicalHits = 0
  for (const token of answerTokens) if (questionTokens.has(token)) lexicalHits += 1
  return { conceptHits, lexicalHits }
}

function tokenSimilarity(a: string, b: string) {
  const left = new Set(tokens(a))
  const right = new Set(tokens(b))
  if (!left.size || !right.size) return a.trim().toLowerCase() === b.trim().toLowerCase() ? 1 : 0
  let intersection = 0
  for (const token of left) if (right.has(token)) intersection += 1
  return intersection / Math.max(left.size, right.size)
}

function contradictsConcreteClaim(answer: string, comparison: string) {
  const lowerAnswer = answer.toLowerCase()
  const lowerComparison = comparison.toLowerCase()
  for (const [a, b] of CONTRAST_PAIRS) {
    if ((lowerComparison.includes(a) && lowerAnswer.includes(b)) || (lowerComparison.includes(b) && lowerAnswer.includes(a))) return true
  }

  const previousNumbers = numberTokens(comparison)
  const currentNumbers = numberTokens(answer)
  if (previousNumbers.length === 1 && currentNumbers.length === 1 && previousNumbers[0] !== currentNumbers[0]) return true
  return false
}

function contradictsReference(answer: string, referenceAnswer: string, question: string) {
  if (contradictsConcreteClaim(answer, referenceAnswer)) return true
  if (/\b(?:how many|estimate|calculate|what .*ratio|what .*value|what .*mass|what .*number)\b/i.test(question)) {
    const expected = numberTokens(referenceAnswer)
    const claimed = numberTokens(answer)
    if (expected.length && claimed.length && !claimed.some(value => expected.includes(value))) return true
  }
  return false
}

function historySignals(answer: string, previousAnswers: string[]) {
  const history = previousAnswers.map(item => item.trim()).filter(Boolean).slice(-4)
  const repeated = history.filter(previous => tokenSimilarity(answer, previous) >= 0.72).length
  const contradiction = !REVISION_LANGUAGE.test(answer) && history.some(previous => contradictsConcreteClaim(answer, previous))
  const explicitRevision = REVISION_LANGUAGE.test(answer)
  const repairDepth = clamp(repeated + (contradiction ? 1 : 0), 0, 3) as 0 | 1 | 2 | 3
  return { repeated, contradiction, explicitRevision, repairDepth }
}

function directnessScore(question: string, answer: string, concepts: string[], wordCount: number) {
  const { conceptHits, lexicalHits } = overlapCount(question, answer, concepts)
  const topicalSignal = conceptHits + lexicalHits
  let score = 18
  score += Math.min(36, topicalSignal * 12)
  if (REASONING_LANGUAGE.test(answer)) score += 18
  if (DIRECT_ANSWER_LANGUAGE.test(answer)) score += 14
  if (containsMath(answer)) score += 14
  if (wordCount >= 10) score += 6
  if (GENERIC_ANSWERS.test(answer) || STUCK_OPENING.test(answer)) score -= 38
  if (wordCount >= 14 && topicalSignal === 0 && !containsMath(answer)) score -= 35
  return clamp(Math.round(score), 0, 100)
}

function result(
  classification: InterviewAnswerClassification,
  confidence: number,
  reason: string,
  issue: InterviewAnswerIssue,
  directness: number,
  repairDepth: 0 | 1 | 2 | 3,
): InterviewAnswerQuality {
  return { classification, confidence, reason, issue, directness, repairDepth }
}

export function evaluateInterviewAnswerLocally(input: InterviewAnswerInput): InterviewAnswerQuality {
  const question = (input.question ?? "").trim()
  const answer = (input.answer ?? "").trim()
  const concepts = input.concepts ?? []
  const referenceAnswer = (input.referenceAnswer ?? "").trim()
  const previousAnswers = input.previousAnswers ?? []
  const wordCount = answer ? answer.split(/\s+/).filter(Boolean).length : 0
  const directness = directnessScore(question, answer, concepts, wordCount)
  const history = historySignals(answer, previousAnswers)

  if (!answer || GENERIC_ANSWERS.test(answer)) {
    const issue: InterviewAnswerIssue = history.repeated ? "repetition" : "evasion"
    return result("vague", 0.98, history.repeated
      ? "The response repeats an earlier non-specific answer without resolving the academic gap."
      : "The response does not contain a specific academic claim or reasoning step.", issue, directness, history.repairDepth)
  }

  const { conceptHits, lexicalHits } = overlapCount(question, answer, concepts)
  const topicalSignal = conceptHits + lexicalHits
  const mathematical = containsMath(answer)

  if (referenceAnswer && contradictsReference(answer, referenceAnswer, question)) {
    return result("incorrect", 0.9, "The response appears to contradict a concrete relationship or numerical result in the reference reasoning.", "factual-error", directness, Math.max(history.repairDepth, 1) as 1 | 2 | 3)
  }

  if (history.contradiction && !history.explicitRevision) {
    return result("partial", 0.84, "The response reverses a concrete claim made earlier without explaining what changed in the reasoning.", "contradiction", directness, Math.max(history.repairDepth, 1) as 1 | 2 | 3)
  }

  if (wordCount >= 10 && topicalSignal === 0 && !mathematical) {
    const issue: InterviewAnswerIssue = history.repeated ? "repetition" : "off-topic"
    return result("irrelevant", 0.84, history.repeated
      ? "The candidate is repeating material that still does not answer the current question."
      : "The response has enough content to assess but does not connect to the current question or its subject concepts.", issue, directness, history.repairDepth)
  }

  if (history.repeated && directness < 68) {
    return result("vague", 0.86, "The response substantially repeats an earlier weak answer instead of adding the requested specificity or reasoning.", "repetition", directness, history.repairDepth)
  }

  if (STUCK_OPENING.test(answer) || (wordCount <= 7 && !mathematical)) {
    return result("vague", 0.9, "The response is too brief or non-committal to show the reasoning needed for this question.", "evasion", directness, history.repairDepth)
  }

  if (wordCount >= 18 && conceptHits >= 2 && lexicalHits === 0 && !REASONING_LANGUAGE.test(answer) && !DIRECT_ANSWER_LANGUAGE.test(answer)) {
    return result("vague", 0.76, "The response uses relevant terminology but does not turn it into a direct claim or reasoning chain that answers the task.", "unsupported", directness, history.repairDepth)
  }

  if (EXPLANATION_QUESTION.test(question) && wordCount < 18 && !REASONING_LANGUAGE.test(answer)) {
    return result("partial", 0.82, "The response is relevant but gives too little reasoning for a question that asks for explanation or justification.", "missing-reasoning", directness, history.repairDepth)
  }

  if (wordCount < 14 && topicalSignal === 0 && !mathematical) {
    return result("vague", 0.72, "The response is short and does not yet make a clear connection to the task.", "evasion", directness, history.repairDepth)
  }

  return result("responsive", 0.7, history.explicitRevision
    ? "The candidate has explicitly revised the earlier position and now gives a sufficiently specific, relevant answer for deeper probing."
    : "The response is sufficiently specific and relevant for the interviewer to probe more deeply.", "none", directness, history.repairDepth)
}

export function localInterviewFollowUp(input: InterviewAnswerInput, persona = "Socratic") {
  const quality = evaluateInterviewAnswerLocally(input)
  const answer = (input.answer ?? "").trim()
  const words = answer ? answer.split(/\s+/).length : 0
  const openings = persona === "Technical"
    ? ["Let's pin that down.", "I want the exact step there.", "Let's make that precise."]
    : persona === "Evidence-led"
      ? ["What supports that?", "Let's look at the evidence for that.", "I want you to justify that claim."]
      : persona === "Sceptical"
        ? ["I'm not persuaded by that yet.", "I want to test that claim.", "Let's challenge that step."]
        : ["Right.", "Okay.", "Let's stay with that."]
  const open = openings[Math.abs(words + answer.length) % openings.length]

  if (quality.issue === "contradiction") {
    return { ...quality, reply: `${open} That's different from the position you gave a moment ago. What changed in your reasoning, and which of the two claims do you now want to defend?` }
  }
  if (quality.issue === "repetition") {
    const question = quality.repairDepth >= 2
      ? "Choose one concrete principle or relationship that decides the point, and apply just that one step. What does it give you?"
      : "You're repeating the same position, so let's narrow it. What is the single most important fact or principle that directly answers the question?"
    return { ...quality, reply: `${open} ${question}` }
  }
  if (quality.classification === "incorrect") {
    const question = quality.repairDepth >= 2
      ? "Check one thing only: the sign, direction, unit or numerical step that your conclusion depends on. Which one changes the result?"
      : "I don't think that conclusion follows from the information we've got. Which exact step would you check first?"
    return { ...quality, reply: `${open} ${question}` }
  }
  if (quality.classification === "irrelevant") {
    return { ...quality, reply: `${open} That doesn't answer the question I asked. In one sentence, what is your direct answer to this specific task, and what supports it?` }
  }
  if (quality.classification === "vague") {
    const question = quality.repairDepth >= 2
      ? "Let's reduce it to one decision. Which mechanism, principle, piece of evidence or calculation would you use first, and what does it imply?"
      : "That's too general for me to evaluate. What specific mechanism, principle, piece of evidence or calculation makes you say that?"
    return { ...quality, reply: `${open} ${question}` }
  }
  if (quality.classification === "partial") {
    return { ...quality, reply: `${open} You've got part of it, but the key link is still missing. What exactly connects that claim to the conclusion?` }
  }

  const lower = answer.toLowerCase()
  if (REVISION_LANGUAGE.test(lower)) return { ...quality, reply: `${open} You've revised your position. Which piece of reasoning made you change it, and why should that outweigh your earlier argument?` }
  if (!/assum|suppos|given|if\s/i.test(lower)) return { ...quality, reply: `${open} What are you assuming there, and what happens if that assumption is wrong?` }
  if (!/however|alternative|counter|unless|could|depends/i.test(lower)) return { ...quality, reply: `${open} What's the strongest alternative explanation or counterexample to what you've just said?` }
  if (!REASONING_LANGUAGE.test(lower)) return { ...quality, reply: `${open} What exactly links your evidence to that conclusion?` }
  return { ...quality, reply: `${open} Let's change one condition. Which part of your argument still works, and which part would you revise?` }
}
