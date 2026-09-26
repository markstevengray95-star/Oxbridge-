export type InterviewAnswerClassification = "incorrect" | "vague" | "irrelevant" | "partial" | "responsive"

export type InterviewAnswerQuality = {
  classification: InterviewAnswerClassification
  confidence: number
  reason: string
}

type InterviewAnswerInput = {
  question?: string
  answer?: string
  concepts?: string[]
  referenceAnswer?: string
}

const STOP_WORDS = new Set([
  "about", "after", "again", "against", "also", "because", "before", "being", "between", "could", "does", "from", "have", "into", "more", "most", "only", "other", "should", "some", "such", "than", "that", "their", "there", "these", "they", "this", "those", "through", "under", "very", "what", "when", "where", "which", "while", "with", "would", "your", "then", "them", "just", "like", "think", "question", "answer",
])

const GENERIC_ANSWERS = /^(?:i\s+(?:don't|do not)\s+know|i'm\s+not\s+sure|i\s+am\s+not\s+sure|not\s+sure|no\s+idea|it\s+depends|maybe|possibly|probably|yes|no|i\s+guess|i\s+think\s+so|sort\s+of|kind\s+of)[.!?\s]*$/i
const STUCK_OPENING = /^(?:i\s+(?:don't|do not)\s+know|i'm\s+not\s+sure|i\s+am\s+not\s+sure|not\s+sure|no\s+idea)\b/i
const REASONING_LANGUAGE = /\b(?:because|therefore|since|so that|hence|implies?|means that|if|given|assuming|as a result|which means)\b/i
const EXPLANATION_QUESTION = /\b(?:why|explain|justify|reason|talk through|show|prove|develop|evaluate|how would|what happens|what would|estimate|interpret|compare|argue|defend)\b/i

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

function contradictsReference(answer: string, referenceAnswer: string, question: string) {
  const lowerAnswer = answer.toLowerCase()
  const lowerReference = referenceAnswer.toLowerCase()
  const contrastPairs: Array<[string, string]> = [
    ["warmer", "cooler"],
    ["increase", "decrease"],
    ["increases", "decreases"],
    ["higher", "lower"],
    ["larger", "smaller"],
    ["more", "less"],
    ["halves", "doubles"],
    ["true", "false"],
  ]
  for (const [a, b] of contrastPairs) {
    if ((lowerReference.includes(a) && lowerAnswer.includes(b)) || (lowerReference.includes(b) && lowerAnswer.includes(a))) return true
  }

  if (/\b(?:how many|estimate|calculate|what .*ratio|what .*value|what .*mass|what .*number)\b/i.test(question)) {
    const expected = numberTokens(referenceAnswer)
    const claimed = numberTokens(answer)
    if (expected.length && claimed.length && !claimed.some(value => expected.includes(value))) return true
  }
  return false
}

export function evaluateInterviewAnswerLocally(input: InterviewAnswerInput): InterviewAnswerQuality {
  const question = (input.question ?? "").trim()
  const answer = (input.answer ?? "").trim()
  const concepts = input.concepts ?? []
  const referenceAnswer = (input.referenceAnswer ?? "").trim()
  const wordCount = answer ? answer.split(/\s+/).filter(Boolean).length : 0

  if (!answer || GENERIC_ANSWERS.test(answer)) {
    return { classification: "vague", confidence: 0.98, reason: "The response does not contain a specific academic claim or reasoning step." }
  }

  const { conceptHits, lexicalHits } = overlapCount(question, answer, concepts)
  const topicalSignal = conceptHits + lexicalHits
  const mathematical = containsMath(answer)

  if (wordCount >= 10 && topicalSignal === 0 && !mathematical) {
    return { classification: "irrelevant", confidence: 0.82, reason: "The response has enough content to assess but does not connect to the current question or its subject concepts." }
  }

  if (referenceAnswer && contradictsReference(answer, referenceAnswer, question)) {
    return { classification: "incorrect", confidence: 0.88, reason: "The response appears to contradict a concrete relationship or numerical result in the reference reasoning." }
  }

  if (STUCK_OPENING.test(answer) || (wordCount <= 7 && !mathematical)) {
    return { classification: "vague", confidence: 0.9, reason: "The response is too brief or non-committal to show the reasoning needed for this question." }
  }

  if (EXPLANATION_QUESTION.test(question) && wordCount < 18 && !REASONING_LANGUAGE.test(answer)) {
    return { classification: "partial", confidence: 0.82, reason: "The response is relevant but gives too little reasoning for a question that asks for explanation or justification." }
  }

  if (wordCount < 14 && topicalSignal === 0 && !mathematical) {
    return { classification: "vague", confidence: 0.72, reason: "The response is short and does not yet make a clear connection to the task." }
  }

  return { classification: "responsive", confidence: 0.68, reason: "The response is sufficiently specific and relevant for the interviewer to probe more deeply." }
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

  if (quality.classification === "incorrect") {
    return { ...quality, reply: `${open} I don't think that conclusion follows from the information we've got. Which step would you check first, and what would make you revise it?` }
  }
  if (quality.classification === "irrelevant") {
    return { ...quality, reply: `${open} That doesn't answer the question I asked. Bring it back to the specific task: what is your direct answer, and what supports it?` }
  }
  if (quality.classification === "vague") {
    return { ...quality, reply: `${open} That's too general for me to evaluate. What specific mechanism, principle, piece of evidence or calculation makes you say that?` }
  }
  if (quality.classification === "partial") {
    return { ...quality, reply: `${open} You've started the answer, but the key reasoning step is still missing. What exactly links your claim to the conclusion?` }
  }

  const lower = answer.toLowerCase()
  if (!/assum|suppos|given|if\s/i.test(lower)) return { ...quality, reply: `${open} What are you assuming there, and what happens if that assumption is wrong?` }
  if (!/however|alternative|counter|unless|could|depends/i.test(lower)) return { ...quality, reply: `${open} What's the strongest alternative explanation or counterexample to what you've just said?` }
  if (!REASONING_LANGUAGE.test(lower)) return { ...quality, reply: `${open} What exactly links your evidence to that conclusion?` }
  return { ...quality, reply: `${open} Let's change one condition. Which part of your argument still works, and which part would you revise?` }
}
