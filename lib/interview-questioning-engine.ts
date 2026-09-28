import type { InterviewAnswerClassification, InterviewAnswerIssue } from "@/lib/interview-answer-quality"

export type InterviewMoveKind =
  | "repair"
  | "assumption"
  | "prediction"
  | "reveal"
  | "counterexample"
  | "whiteboard"
  | "representation"
  | "error-diagnosis"
  | "extension"

export type InterviewReveal = {
  kind: "new-information" | "counterexample" | "worked-error"
  title: string
  content: string
}

export type WhiteboardMode = "sketch" | "graph" | "diagram" | "working" | "argument-map"

export type InterviewWhiteboardTask = {
  title: string
  prompt: string
  mode: WhiteboardMode
}

export type InterviewMove = {
  kind: InterviewMoveKind
  reply: string
  reveal?: InterviewReveal
  whiteboardTask?: InterviewWhiteboardTask
  hintLevel?: 1 | 2 | 3 | 4
  branchReason: string
}

const coreResponsiveSequence: InterviewMoveKind[] = ["assumption", "prediction", "reveal", "counterexample"]

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

function clampAdaptiveLevel(value: number) {
  return Math.max(-2, Math.min(2, Math.round(value)))
}

function probeScore(probe: string, words: RegExp[]) {
  return words.reduce((score, pattern) => score + (pattern.test(probe) ? 1 : 0), 0)
}

function rankedProbe(probes: string[], kind: "reveal" | "counterexample", exclude: string[] = []) {
  const banned = new Set(exclude.map(item => clean(item).toLowerCase()))
  const revealWords = [/\bsuppose\b/i, /\bnow\b/i, /\bimagine\b/i, /\breplace\b/i, /\bnew\b/i, /\blearn\b/i, /\bfind\b/i, /\bresult\b/i, /\bdata\b/i, /\bif\b/i]
  const counterWords = [/\bcounterexample\b/i, /\bwhat if\b/i, /\bsuppose\b/i, /\breplace\b/i, /\bnegative\b/i, /\bextreme\b/i, /\blimit\b/i, /\bsame answer\b/i, /\bchanges?\b/i]
  const words = kind === "reveal" ? revealWords : counterWords
  return probes
    .filter(Boolean)
    .filter(probe => !banned.has(clean(probe).toLowerCase()))
    .map((probe, index) => ({ probe: clean(probe), score: probeScore(probe, words) * 10 - index }))
    .sort((a, b) => b.score - a.score)[0]?.probe
}

function trailingRepairs(history: InterviewMoveKind[]) {
  let count = 0
  for (let index = history.length - 1; index >= 0 && history[index] === "repair"; index -= 1) count += 1
  return count
}

export function hintLevelFor(input: { moveHistory?: InterviewMoveKind[]; repairDepth?: number }) : 1 | 2 | 3 | 4 {
  const historyDepth = trailingRepairs(input.moveHistory ?? []) + 1
  const diagnosticDepth = Math.max(1, Math.min(4, Math.round((input.repairDepth ?? 0) + 1)))
  return Math.min(4, Math.max(historyDepth, diagnosticDepth)) as 1 | 2 | 3 | 4
}

export function adaptInterviewLevel(input: {
  current?: number
  classification: InterviewAnswerClassification
  directness?: number
  repairDepth?: number
}) {
  const current = clampAdaptiveLevel(input.current ?? 0)
  if (input.classification === "responsive") {
    const strong = (input.directness ?? 75) >= 72 && (input.repairDepth ?? 0) === 0
    return clampAdaptiveLevel(current + (strong ? 1 : 0))
  }
  if (input.classification === "incorrect" || input.classification === "vague" || input.classification === "irrelevant") {
    return clampAdaptiveLevel(current - 1)
  }
  return current
}

export function adaptiveChallengeDescriptor(level: number) {
  if (level <= -2) return "Use one variable, one concrete step and visible scaffolding. Do not make the academic content trivial."
  if (level === -1) return "Keep the problem intellectually authentic but narrow the next task to one focused decision or relationship."
  if (level >= 2) return "Remove routine scaffolding, combine ideas or conditions, and require the candidate to choose a method before you confirm its direction."
  if (level === 1) return "Increase independence: ask for a generalisation, justification, limiting case or second representation with little prompting."
  return "Use normal interview challenge: enough information to reason, but no worked method or leading sequence."
}

function advancedSequence(adaptiveLevel: number) : InterviewMoveKind[] {
  return adaptiveLevel >= 1
    ? ["error-diagnosis", "representation", "whiteboard", "extension"]
    : ["whiteboard", "representation", "error-diagnosis", "extension"]
}

export function chooseInterviewMove(input: {
  classification: InterviewAnswerClassification
  issue?: InterviewAnswerIssue
  moveHistory?: InterviewMoveKind[]
  adaptiveLevel?: number
  track?: string
}) {
  if (input.classification !== "responsive") return "repair" as const
  const history = input.moveHistory ?? []
  for (const kind of coreResponsiveSequence) {
    if (!history.includes(kind)) return kind
  }
  for (const kind of advancedSequence(clampAdaptiveLevel(input.adaptiveLevel ?? 0))) {
    if (kind === "extension" || !history.includes(kind)) return kind
  }
  return "extension" as const
}

function subjectPrinciple(track?: string) {
  if (track === "maths") return "an invariant, symmetry, inequality, extreme case or simpler equivalent statement"
  if (track === "physical") return "a conservation law, force/energy model, proportionality, limiting case or measurable relationship"
  if (track === "life") return "a biological mechanism, comparison group, causal pathway or observation that discriminates between explanations"
  if (track === "law") return "the purpose of the rule, the decisive fact, a limiting case or a principle that treats similar cases consistently"
  if (track === "economics") return "the causal mechanism, incentives, a binding constraint, a counterfactual or what must be held constant"
  if (track === "humanities" || track === "languages") return "the strongest piece of evidence, an alternative interpretation, the relevant context or a distinction your claim depends on"
  return "the decisive principle, relationship or piece of evidence"
}

function repairQuestion(input: {
  issue: InterviewAnswerIssue | undefined
  fallbackReply?: string
  hintLevel: 1 | 2 | 3 | 4
  track?: string
}) {
  const { issue, fallbackReply, hintLevel, track } = input
  if (hintLevel === 1 && fallbackReply?.trim()) return clean(fallbackReply)
  if (hintLevel === 1) {
    if (issue === "factual-error") return "Stay with that last claim. Which exact value, direction or relationship can you check independently before you continue?"
    if (issue === "contradiction") return "You have two claims that do not obviously fit together. Which one are you prepared to defend, and what evidence or reasoning decides between them?"
    if (issue === "off-topic" || issue === "evasion") return "Answer the question in one direct sentence first. What is your actual conclusion here?"
    if (issue === "unsupported" || issue === "missing-reasoning") return "What is the single inferential step that connects your claim to the conclusion? Make that step explicit."
    if (issue === "repetition") return "Do not repeat the conclusion. Give me one new reason, calculation, example or test that could move the argument forward."
    return "Make your next step explicit: what are you claiming, and what is the strongest reason for it?"
  }
  if (hintLevel === 2) {
    return `Narrow it down. Ignore the whole solution for a moment and identify ${subjectPrinciple(track)} that would decide just the next step. What is it?`
  }
  if (hintLevel === 3) {
    return `Here is a direction, not the answer: try organising the problem around ${subjectPrinciple(track)}. What does that let you infer before doing anything else?`
  }
  return `I will make the task smaller. Start from ${subjectPrinciple(track)} and test one consequence of it in the original problem. What single result or comparison follows?`
}

function subjectSpecificCounterexample(track?: string) {
  if (track === "maths") return "Take the smallest non-trivial edge case in which one of your conditions is pushed to its limit."
  if (track === "physical") return "Consider the same observation but remove the mechanism you have relied on while keeping the other conditions as similar as possible."
  if (track === "life") return "Consider a case where the observed pattern remains but the biological mechanism you proposed is absent."
  if (track === "law") return "Keep your proposed rule, but change one fact so that applying the rule would produce an uncomfortable or apparently unfair result."
  if (track === "economics") return "Keep your causal story, but imagine the same outcome occurs in a setting where your proposed driver does not change."
  if (track === "humanities" || track === "languages") return "Consider a piece of evidence that fits the same facts but supports a different interpretation from yours."
  return "Consider a concrete edge case in which your proposed rule or mechanism might fail."
}

function whiteboardTaskFor(track?: string) : InterviewWhiteboardTask {
  if (track === "maths") return { title: "Show the structure", mode: "working", prompt: "Use the whiteboard to show the key algebra, cases, invariant or diagram you are relying on. Do not try to make it neat; make the logic visible." }
  if (track === "physical") return { title: "Model it visually", mode: "diagram", prompt: "Sketch the physical situation, graph or force/energy model that best exposes the relationship you are using. Label only the quantities that matter." }
  if (track === "life") return { title: "Map the mechanism", mode: "diagram", prompt: "Draw a causal pathway, experimental comparison or labelled biological sketch that would let another person follow your mechanism." }
  if (track === "economics") return { title: "Represent the mechanism", mode: "graph", prompt: "Sketch a graph or causal chain showing which variable moves first, what is held constant and where your conclusion comes from." }
  if (track === "law") return { title: "Map the argument", mode: "argument-map", prompt: "Map the rule, decisive facts, competing interpretation and consequence. Show where your preferred conclusion depends on a particular premise." }
  if (track === "humanities" || track === "languages") return { title: "Map the interpretation", mode: "argument-map", prompt: "Map your claim, strongest evidence, alternative reading and the inference connecting the evidence to your conclusion." }
  return { title: "Make the reasoning visible", mode: "sketch", prompt: "Use the whiteboard to represent the structure of your reasoning in whatever visual form is most useful." }
}

function representationQuestion(track?: string) {
  if (track === "maths") return "Represent the same idea in a different form. If you used algebra, give me a graph, diagram or verbal invariant; if you used a picture, express the decisive relationship symbolically. What becomes clearer?"
  if (track === "physical") return "Switch representation. Turn your explanation into a graph, equation or labelled physical model, then tell me which feature of that representation carries the conclusion."
  if (track === "life") return "Switch representation. Express your explanation as a causal chain, simple experimental table or labelled mechanism. Which link is directly supported and which is still an inference?"
  if (track === "economics") return "Switch representation. Express your argument as a graph, causal chain or simple relationship between variables. Which assumption becomes more obvious in that form?"
  if (track === "law") return "Switch representation. Turn your answer into a short rule-plus-exception structure or an argument map. Which fact changes the result?"
  return "Switch representation. Turn the same argument into a compact structure—claim, evidence, inference and alternative interpretation. What can you now see that was hidden in the prose?"
}

function workedErrorFor(track?: string) {
  if (track === "maths") return "A student reaches a plausible pattern from two examples and writes: ‘It works in both cases, so it must be true for every case.’"
  if (track === "physical") return "A student writes: ‘At the instant an object has zero velocity, the resultant force on it must also be zero.’"
  if (track === "life") return "A student writes: ‘The two variables are correlated, so the first variable must be causing the second.’"
  if (track === "economics") return "A student writes: ‘The outcome changed after the policy, so the policy must be the only cause of the change.’"
  if (track === "law") return "A student applies the literal wording of a rule to every case and concludes that its purpose and any exceptional facts are irrelevant."
  if (track === "humanities" || track === "languages") return "A student finds one quotation that supports an interpretation and concludes that competing readings can therefore be dismissed."
  return "A student reaches the right-looking conclusion but uses a step that does not logically follow from the evidence given."
}

export function buildLocalInterviewMove(input: {
  classification: InterviewAnswerClassification
  issue?: InterviewAnswerIssue
  moveHistory?: InterviewMoveKind[]
  probes?: string[]
  fallbackReply?: string
  track?: string
  repairDepth?: number
  adaptiveLevel?: number
}) : InterviewMove {
  const history = input.moveHistory ?? []
  const probes = input.probes ?? []
  const kind = chooseInterviewMove({
    classification: input.classification,
    issue: input.issue,
    moveHistory: history,
    adaptiveLevel: input.adaptiveLevel,
    track: input.track,
  })

  if (kind === "repair") {
    const hintLevel = hintLevelFor({ moveHistory: history, repairDepth: input.repairDepth })
    return {
      kind,
      hintLevel,
      reply: repairQuestion({ issue: input.issue, fallbackReply: input.fallbackReply, hintLevel, track: input.track }),
      branchReason: `Repair branch uses hint level ${hintLevel} because the latest answer was ${input.classification}${input.issue && input.issue !== "none" ? ` (${input.issue})` : ""}.`,
    }
  }

  if (kind === "assumption") {
    return {
      kind,
      reply: "Which unstated assumption in your answer is doing the most work? State it explicitly, then tell me what would change if it were false.",
      branchReason: "First responsive branch tests whether the candidate can expose and stress-test an assumption.",
    }
  }

  if (kind === "prediction") {
    return {
      kind,
      reply: "Before I give you another piece of information, commit to a prediction. Which part of your conclusion should change if one important condition is altered, which part should survive, and why?",
      branchReason: "Prediction branch makes the candidate commit before new evidence is revealed.",
    }
  }

  if (kind === "reveal") {
    const chosen = rankedProbe(probes, "reveal")
    const content = chosen || "A new observation is introduced that changes one important condition while leaving the rest of the problem unchanged."
    return {
      kind,
      reveal: { kind: "new-information", title: "New information", content },
      reply: "Take that as new information. Compare it with the prediction you just made: what survives, what has to change, and what does that tell you about your original reasoning?",
      branchReason: "Reveal branch follows a prediction so the candidate has to reconcile evidence with a prior commitment.",
    }
  }

  if (kind === "counterexample") {
    const previouslyUsed = probes.filter(probe => history.includes("reveal") && probeScore(probe, [/\bsuppose\b/i, /\bnow\b/i, /\breplace\b/i]) > 0).slice(0, 1)
    const chosen = rankedProbe(probes, "counterexample", previouslyUsed)
    const content = chosen || subjectSpecificCounterexample(input.track)
    return {
      kind,
      reveal: { kind: "counterexample", title: "Counterexample challenge", content },
      reply: "Does your rule or explanation survive that case? If not, repair the claim so that it is strong enough to handle both the original problem and this counterexample.",
      branchReason: "Counterexample branch tests whether the candidate can repair an over-general rule rather than defend it reflexively.",
    }
  }

  if (kind === "whiteboard") {
    const whiteboardTask = whiteboardTaskFor(input.track)
    return {
      kind,
      whiteboardTask,
      reply: `${whiteboardTask.prompt} When you are ready, talk me through the one feature of your working that actually determines the answer.`,
      branchReason: "Whiteboard branch tests whether the candidate can make working visible instead of hiding reasoning behind a final answer.",
    }
  }

  if (kind === "representation") {
    return {
      kind,
      reply: representationQuestion(input.track),
      branchReason: "Representation branch tests whether understanding survives a switch between verbal, symbolic, graphical or diagrammatic forms.",
    }
  }

  if (kind === "error-diagnosis") {
    return {
      kind,
      reveal: { kind: "worked-error", title: "A student's working", content: workedErrorFor(input.track) },
      reply: "Do not just tell me that it is wrong. Identify the first unjustified step, explain why it fails, and give the smallest correction that would repair the reasoning. What would you change?",
      branchReason: "Error-diagnosis branch tests whether the candidate can identify and repair a plausible mistake rather than merely produce their own solution.",
    }
  }

  const hardExtension = (input.adaptiveLevel ?? 0) >= 1
  return {
    kind: "extension",
    reply: hardExtension
      ? "Take the principle you have used and move it into a less familiar case where two conditions change at once. Which conclusion can you still defend without being told which method to use?"
      : "Now transfer the principle rather than repeating the same solution. What is a genuinely different situation in which the same reasoning should apply, and what would you predict there?",
    branchReason: "Extension branch tests transfer after the earlier reasoning challenges have been used; the hidden adaptive level controls how much scaffolding remains.",
  }
}

export function moveNeedsReveal(kind: InterviewMoveKind) {
  return kind === "reveal" || kind === "counterexample" || kind === "error-diagnosis"
}

export const interviewQuestioningFeatures = [
  "dynamic-branching",
  "new-information",
  "prediction-reveal-explain",
  "counterexample-challenge",
  "assumption-hunting",
  "progressive-hint-ladder",
  "whiteboard-working",
  "representation-switching",
  "error-seeded-diagnosis",
  "invisible-difficulty-adaptation",
] as const
