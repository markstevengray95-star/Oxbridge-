import type { EvidenceDimension, EvidenceDimensionKey } from "@/lib/interview-evidence-rubric"
import type { ReplayMistake } from "@/lib/mistake-replay"

export const TARGETED_PRACTICE_KEY = "oxbridge-targeted-practice-pack-v1"
export const TARGETED_PRACTICE_HISTORY_KEY = "oxbridge-targeted-practice-history-v1"

export type PracticeSource = "interview" | "exam"

export type TargetedPracticeTarget = {
  id: string
  source: PracticeSource
  skill: string
  weakness: string
  practiceSeed: string
  evidence?: string
  course?: string
  track?: string
  test?: string
  section?: string
  originalQuestion?: string
  originalAnswer?: string
  correctAnswer?: string
  dimensionKey?: EvidenceDimensionKey
  createdAt: string
}

export type TargetedPracticeQuestion = {
  id: string
  prompt: string
  skill: string
  contextShift: string
  successCriteria: string[]
  source: "local" | "gemini"
}

export type TargetedPracticeAttempt = {
  id: string
  targetId: string
  questionId: string
  prompt: string
  answer: string
  classification: "needs-repair" | "developing" | "secure"
  feedback: string
  nextStep: string
  createdAt: string
}

function clean(text: string | undefined, max = 500) {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, max)
}

export function targetFromEvidenceDimension(input: {
  dimension: EvidenceDimension
  course?: string
  track?: string
  originalQuestion?: string
}): TargetedPracticeTarget {
  const evidence = input.dimension.evidence[0]
  return {
    id: `interview-${input.dimension.key}-${Date.now()}`,
    source: "interview",
    skill: input.dimension.label,
    weakness: input.dimension.nextAction,
    practiceSeed: input.dimension.practiceSeed,
    evidence: evidence ? `${evidence.quote} — ${evidence.reason}` : undefined,
    course: clean(input.course, 120),
    track: clean(input.track, 80),
    originalQuestion: clean(input.originalQuestion, 900),
    dimensionKey: input.dimension.key,
    createdAt: new Date().toISOString(),
  }
}

export function targetFromExamMistake(mistake: ReplayMistake): TargetedPracticeTarget {
  return {
    id: `exam-${mistake.id}-${Date.now()}`,
    source: "exam",
    skill: mistake.skill,
    weakness: `Build the underlying ${mistake.skill.toLowerCase()} skill without repeating the same question wording.`,
    practiceSeed: `Create a fresh admissions-test-style reasoning task that tests ${mistake.skill} in a different context. The learner must explain the decisive reasoning step before committing to an answer.`,
    evidence: `Previous ${mistake.severity === "partial" ? "partial-credit" : "missed"} item from ${mistake.test} ${mistake.section}.`,
    test: mistake.test,
    section: mistake.section,
    originalQuestion: clean(mistake.prompt, 900),
    originalAnswer: clean(mistake.previousAnswer, 900),
    correctAnswer: clean(mistake.correctAnswer, 900),
    createdAt: new Date().toISOString(),
  }
}

export function localPracticePrompt(target: TargetedPracticeTarget, round = 1): TargetedPracticeQuestion {
  const shift = round <= 1 ? "new context" : round === 2 ? "changed condition" : "far-transfer context"
  const subject = target.course || target.test || target.track || "academic reasoning"
  const skill = target.skill
  let prompt = `You are given a new ${subject} problem. Before reaching a conclusion, explain the decisive reasoning step that tests ${skill.toLowerCase()}. State one assumption and one check that could change your answer.`

  if (/problem decomposition/i.test(skill)) prompt = `A new ${subject} problem contains more information than you need. Explain how you would break it into sub-problems, identify the variables or claims that actually control the answer, and justify which part you would tackle first.`
  else if (/independent reasoning/i.test(skill)) prompt = `You are given an unfamiliar ${subject} problem with no method suggested. Choose the first method or principle you would try, justify that choice, and explain what result would make you abandon it.`
  else if (/response to challenge|recovery/i.test(skill)) prompt = `Suppose your first explanation for a ${subject} problem seems plausible, but new information contradicts one key assumption. Explain what survives from your original reasoning, what must change, and how you would rebuild the conclusion.`
  else if (/use of evidence|close reading/i.test(skill)) prompt = `Two explanations fit the initial evidence in a ${subject} problem. Design or identify one observation, calculation, source detail or comparison that would discriminate between them, and explain what each possible result would imply.`
  else if (/conceptual understanding|scientific modelling/i.test(skill)) prompt = `Apply a core ${subject} idea in an unfamiliar situation. Name the model or concept, state the assumption that makes it usable, and explain a boundary case in which it would stop being a good model.`
  else if (/precision|checking/i.test(skill)) prompt = `A student gives a vague but plausible answer to a ${subject} question. Rewrite the claim so that it becomes precise and testable, then give one deliberate check for a sign, definition, condition, unit or logical direction that could reveal an error.`
  else if (/communication/i.test(skill)) prompt = `Answer a new ${subject} reasoning problem in no more than four sentences using this structure: conclusion → reason or mechanism → check → qualification. Make every inferential step visible without adding filler.`
  else if (/transfer|mathematical structure/i.test(skill)) prompt = `Take a familiar reasoning method from ${subject} and apply it to a different-looking problem with the same underlying structure. Explain what is invariant in the method and what has to be reinterpreted in the new context.`
  else if (/argument|logic/i.test(skill)) prompt = `A short argument in ${subject} reaches a conclusion from two premises. Identify the conclusion, state the hidden assumption that makes the inference work, and give a counterexample or changed condition that would break the argument.`
  else if (/data|quantitative/i.test(skill)) prompt = `A new ${subject} problem gives several quantities and one graph or table. State what quantity must be found, predict its rough direction or size before calculating, and explain one unit or magnitude check you would use afterwards.`
  else if (/pattern recognition/i.test(skill)) prompt = `A sequence of examples in ${subject} appears to follow a pattern. State the transformation precisely, test it against every example, and describe one alternative rule you would rule out before committing.`

  return {
    id: `local-${target.id}-${round}-${Date.now()}`,
    prompt,
    skill,
    contextShift: shift,
    successCriteria: [
      "Makes a direct claim or method choice",
      "Shows the decisive reasoning step",
      "Includes a check, assumption, counterexample or test",
      round >= 2 ? "Explains what changes when the condition changes" : "Avoids copying the original question's surface wording",
    ],
    source: "local",
  }
}
