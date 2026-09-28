import type { InterviewAnswerClassification, InterviewAnswerIssue } from "@/lib/interview-answer-quality"

export type InterviewMoveKind = "repair" | "assumption" | "prediction" | "reveal" | "counterexample" | "extension"

export type InterviewReveal = {
  kind: "new-information" | "counterexample"
  title: string
  content: string
}

export type InterviewMove = {
  kind: InterviewMoveKind
  reply: string
  reveal?: InterviewReveal
  branchReason: string
}

const responsiveSequence: InterviewMoveKind[] = ["assumption", "prediction", "reveal", "counterexample", "extension"]

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim()
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

export function chooseInterviewMove(input: {
  classification: InterviewAnswerClassification
  issue?: InterviewAnswerIssue
  moveHistory?: InterviewMoveKind[]
}) {
  if (input.classification !== "responsive") return "repair" as const
  const history = input.moveHistory ?? []
  for (const kind of responsiveSequence) {
    if (!history.includes(kind)) return kind
  }
  return "extension" as const
}

function repairQuestion(issue: InterviewAnswerIssue | undefined, fallbackReply?: string) {
  if (fallbackReply?.trim()) return clean(fallbackReply)
  if (issue === "factual-error") return "Stay with that last claim. Which exact value, direction or relationship can you check independently before you continue?"
  if (issue === "contradiction") return "You have two claims that do not obviously fit together. Which one are you prepared to defend, and what evidence or reasoning decides between them?"
  if (issue === "off-topic" || issue === "evasion") return "Answer the question in one direct sentence first. What is your actual conclusion here?"
  if (issue === "unsupported" || issue === "missing-reasoning") return "What is the single inferential step that connects your claim to the conclusion? Make that step explicit."
  if (issue === "repetition") return "Do not repeat the conclusion. Give me one new reason, calculation, example or test that could move the argument forward."
  return "Make your next step explicit: what are you claiming, and what is the strongest reason for it?"
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

export function buildLocalInterviewMove(input: {
  classification: InterviewAnswerClassification
  issue?: InterviewAnswerIssue
  moveHistory?: InterviewMoveKind[]
  probes?: string[]
  fallbackReply?: string
  track?: string
}) : InterviewMove {
  const history = input.moveHistory ?? []
  const probes = input.probes ?? []
  const kind = chooseInterviewMove({ classification: input.classification, issue: input.issue, moveHistory: history })

  if (kind === "repair") {
    return {
      kind,
      reply: repairQuestion(input.issue, input.fallbackReply),
      branchReason: `Repair branch because latest answer was ${input.classification}${input.issue && input.issue !== "none" ? ` (${input.issue})` : ""}.`,
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

  return {
    kind: "extension",
    reply: "Now transfer the principle rather than repeating the same solution. What is a genuinely different situation in which the same reasoning should apply, and what would you predict there?",
    branchReason: "Extension branch tests transfer after assumption, prediction, evidence and counterexample stages have already been used.",
  }
}

export function moveNeedsReveal(kind: InterviewMoveKind) {
  return kind === "reveal" || kind === "counterexample"
}

export const interviewQuestioningFeatures = [
  "dynamic-branching",
  "new-information",
  "prediction-reveal-explain",
  "counterexample-challenge",
  "assumption-hunting",
] as const
