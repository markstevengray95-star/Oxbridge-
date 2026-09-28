import type { InterviewAnswerClassification, InterviewAnswerIssue } from "@/lib/interview-answer-quality"
import type { TrackId } from "@/lib/oxbridge-data"

export type InterviewTreePhase = "repair" | "diagnose" | "deepen" | "stress-test" | "transfer" | "synthesis"

export type InterviewTreeNodeId =
  | "repair-commit"
  | "repair-link"
  | "repair-check"
  | "repair-contradiction"
  | "repair-anchor"
  | "assumption"
  | "mechanism"
  | "method-choice"
  | "quantify"
  | "prediction"
  | "new-information"
  | "counterexample"
  | "limiting-case"
  | "alternative"
  | "representation"
  | "error-diagnosis"
  | "compare-methods"
  | "generalise"
  | "transfer-context"
  | "reverse-problem"
  | "synthesis"
  | "reflection"

export type InterviewTreeNode = {
  id: InterviewTreeNodeId
  phase: InterviewTreePhase
  label: string
  intent: string
  prompt: string
  branchReason: string
}

export type InterviewTreeInput = {
  track?: TrackId | string
  question: string
  answer: string
  classification: InterviewAnswerClassification
  issue?: InterviewAnswerIssue
  directness?: number
  repairDepth?: number
  candidateTurnCount: number
  previousNodeIds?: InterviewTreeNodeId[]
  probes?: string[]
}

const responsiveNodes: InterviewTreeNodeId[] = [
  "assumption",
  "mechanism",
  "method-choice",
  "quantify",
  "prediction",
  "new-information",
  "counterexample",
  "limiting-case",
  "alternative",
  "representation",
  "error-diagnosis",
  "compare-methods",
  "generalise",
  "transfer-context",
  "reverse-problem",
  "synthesis",
  "reflection",
]

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

function subjectAnchor(track?: string) {
  if (track === "maths") return "the mathematical structure, invariant, proof step or edge case"
  if (track === "physical") return "the physical model, measurable relationship, limiting case or conservation principle"
  if (track === "life") return "the biological mechanism, comparison, causal pathway or discriminating observation"
  if (track === "law") return "the rule, decisive fact, purpose, exception or limiting case"
  if (track === "economics") return "the causal mechanism, incentives, constraint, counterfactual or held-constant variable"
  if (track === "humanities" || track === "languages") return "the claim, evidence, interpretation, context or rival reading"
  return "the decisive principle, relationship or piece of evidence"
}

function quantitativePrompt(track?: string) {
  if (track === "maths") return "Put a quantity, bound, example or symbolic relationship on that claim. What would you calculate or prove next, and why is that the useful quantity?"
  if (track === "physical") return "Make the model quantitative. Which variables matter, how should they be related, and what units or limiting behaviour would let you check the relationship?"
  if (track === "life") return "Turn that biological claim into something measurable. Which variable would you compare, what pattern would support the mechanism, and what pattern would count against it?"
  if (track === "economics") return "Make the mechanism measurable. Which variables would move, in what direction, and what comparison would distinguish your explanation from a rival one?"
  return "Make the claim more testable. Which observation, comparison or quantity would let us decide whether it is actually supported?"
}

function representationPrompt(track?: string) {
  if (track === "maths") return "Represent the same idea another way: algebra, diagram, graph, cases or an invariant. Which representation exposes the decisive step most clearly?"
  if (track === "physical") return "Switch representation: use a labelled diagram, graph or equation. Which feature of that representation carries the conclusion?"
  if (track === "life") return "Express the explanation as a causal pathway, comparison table or labelled mechanism. Which link is observed and which link is still inferred?"
  if (track === "economics") return "Express the argument as a graph or causal chain. Which assumption becomes most visible in that representation?"
  if (track === "law") return "Map the rule, decisive facts, exception and consequence. Which fact changes the result?"
  return "Map the argument as claim → evidence → inference → alternative. Which link is strongest and which link is most vulnerable?"
}

function probeFor(kind: "new" | "counter", probes: string[]) {
  const patterns = kind === "new"
    ? [/\bsuppose\b/i, /\bnow\b/i, /\bimagine\b/i, /\blearn\b/i, /\bnew\b/i, /\bfind\b/i, /\breplace\b/i]
    : [/\bcounter/i, /\bwhat if\b/i, /\bsuppose\b/i, /\bextreme\b/i, /\blimit\b/i, /\breplace\b/i]
  return probes
    .map((probe, index) => ({ probe: clean(probe), score: patterns.reduce((sum, pattern) => sum + (pattern.test(probe) ? 10 : 0), 0) - index }))
    .sort((a, b) => b.score - a.score)[0]?.probe
}

function nodePrompt(id: InterviewTreeNodeId, input: InterviewTreeInput) {
  const anchor = subjectAnchor(input.track)
  const probes = input.probes ?? []
  switch (id) {
    case "repair-commit": return "Give me a provisional answer first, even if you are uncertain. What is your best current conclusion, and what single fact makes you lean that way?"
    case "repair-link": return `Your conclusion may be usable, but the link is missing. State the one step involving ${anchor} that takes you from your evidence to that conclusion.`
    case "repair-check": return `Check the claim before extending it. Which exact sign, value, definition, direction, unit or relationship in ${anchor} could be independently verified right now?`
    case "repair-contradiction": return "Your latest claim conflicts with an earlier one. Which position do you now defend, what changed your mind, and what evidence would decide between them?"
    case "repair-anchor": return `Reduce the problem to one decision. Which part of ${anchor} should you establish first, and what follows immediately from it?`
    case "assumption": return "Which unstated assumption is doing the most work in your answer? State it explicitly, then tell me what breaks if it is false."
    case "mechanism": return `Do not just name the result. Walk me through the mechanism using ${anchor}: what changes first, what follows from it, and where could the chain fail?`
    case "method-choice": return "You have several possible routes. Choose one method before calculating or elaborating. Why is that method more informative than the obvious alternative?"
    case "quantify": return quantitativePrompt(input.track)
    case "prediction": return "Commit to a prediction before I alter the problem. Which part of your conclusion should change if one important condition is varied, which part should survive, and why?"
    case "new-information": return `${probeFor("new", probes) || "Now suppose one important condition changes while the rest of the problem stays the same."} Treat that as new information. What survives from your previous reasoning, what must change, and why?`
    case "counterexample": return `${probeFor("counter", probes) || "Consider an edge case in which the mechanism or rule you relied on is absent or pushed to an extreme."} Does your claim survive? If not, repair it so that it becomes precise enough to survive the case.`
    case "limiting-case": return "Push one variable, assumption or condition to an extreme or boundary case. What should happen there, and does your current explanation predict that behaviour?"
    case "alternative": return "Give me the strongest rival explanation or interpretation—not a weak one. What evidence would discriminate between your account and that rival?"
    case "representation": return representationPrompt(input.track)
    case "error-diagnosis": return "Imagine another student reaches the same final conclusion using a flawed step. What is the most tempting wrong step here, how would you detect it, and why is it wrong?"
    case "compare-methods": return "Solve or analyse the same point using a second method. Which method makes the assumptions clearer, and under what conditions would you prefer each one?"
    case "generalise": return "Generalise your result. Which features of this problem are essential and which are accidental? State a broader claim and then give one condition under which it fails."
    case "transfer-context": return "Transfer the reasoning to a different context with the same underlying structure. What stays invariant in your method, and what has to be reinterpreted?"
    case "reverse-problem": return "Reverse the problem. Instead of predicting the outcome from the conditions, what conditions would you need in order to produce or rule out the outcome you just described?"
    case "synthesis": return "Bring the argument together in a compact form: conclusion, decisive reasoning step, strongest assumption, strongest challenge, and the evidence that would most change your mind."
    case "reflection": return "Looking back over this chain, where did your reasoning improve most? Identify one move you would reuse on a completely new problem and explain why it is useful."
  }
}

function labelFor(id: InterviewTreeNodeId) {
  const labels: Record<InterviewTreeNodeId, string> = {
    "repair-commit": "Commit to a position",
    "repair-link": "Repair the reasoning link",
    "repair-check": "Check the decisive claim",
    "repair-contradiction": "Resolve a contradiction",
    "repair-anchor": "Re-anchor the problem",
    assumption: "Expose an assumption",
    mechanism: "Explain the mechanism",
    "method-choice": "Choose and justify a method",
    quantify: "Make it measurable",
    prediction: "Commit to a prediction",
    "new-information": "Adapt to new information",
    counterexample: "Stress-test with a counterexample",
    "limiting-case": "Test a limiting case",
    alternative: "Build a rival explanation",
    representation: "Change representation",
    "error-diagnosis": "Diagnose a tempting error",
    "compare-methods": "Compare methods",
    generalise: "Generalise the result",
    "transfer-context": "Transfer to a new context",
    "reverse-problem": "Reverse the problem",
    synthesis: "Synthesize the argument",
    reflection: "Reflect on the method",
  }
  return labels[id]
}

function phaseFor(id: InterviewTreeNodeId): InterviewTreePhase {
  if (id.startsWith("repair-")) return "repair"
  if (["assumption", "mechanism", "method-choice", "quantify"].includes(id)) return "diagnose"
  if (["prediction", "new-information", "representation", "compare-methods"].includes(id)) return "deepen"
  if (["counterexample", "limiting-case", "alternative", "error-diagnosis"].includes(id)) return "stress-test"
  if (["generalise", "transfer-context", "reverse-problem"].includes(id)) return "transfer"
  return "synthesis"
}

function repairNode(input: InterviewTreeInput): InterviewTreeNodeId {
  if (input.issue === "contradiction") return "repair-contradiction"
  if (input.issue === "factual-error" || input.classification === "incorrect") return "repair-check"
  if (input.issue === "missing-reasoning" || input.issue === "unsupported" || input.classification === "partial") return "repair-link"
  if (input.issue === "evasion" || input.classification === "vague") return "repair-commit"
  return "repair-anchor"
}

function responsiveNode(input: InterviewTreeInput): InterviewTreeNodeId {
  const seen = new Set(input.previousNodeIds ?? [])
  const lower = input.answer.toLowerCase()
  const preferred: InterviewTreeNodeId[] = []

  if (!/assum|suppos|provided|given that|if\b/.test(lower)) preferred.push("assumption")
  if (!/because|therefore|hence|leads to|causes|mechanism|which means/.test(lower)) preferred.push("mechanism")
  if (/[=<>≤≥√π²³×÷+\-*/%\d]/.test(input.answer) || input.track === "maths" || input.track === "physical") preferred.push("quantify")
  if (!/however|alternatively|another|counter|unless|whereas/.test(lower)) preferred.push("alternative")

  preferred.push(...responsiveNodes)
  const unique = preferred.filter((id, index) => preferred.indexOf(id) === index)
  const unvisited = unique.filter(id => !seen.has(id))
  if (unvisited.length) {
    const offset = Math.max(0, Math.min(unvisited.length - 1, Math.floor(input.candidateTurnCount / 3)))
    return unvisited[offset]
  }
  return input.candidateTurnCount % 2 === 0 ? "transfer-context" : "synthesis"
}

export function selectInterviewTreeNode(input: InterviewTreeInput): InterviewTreeNode {
  const needsRepair = input.classification !== "responsive"
  const id = needsRepair ? repairNode(input) : responsiveNode(input)
  const phase = phaseFor(id)
  return {
    id,
    phase,
    label: labelFor(id),
    intent: needsRepair
      ? "Repair only the weakest reasoning step without giving away the solution."
      : phase === "transfer"
        ? "Test whether the candidate can carry the underlying method into unfamiliar material."
        : phase === "stress-test"
          ? "Challenge the current model hard enough to expose its limits."
          : phase === "synthesis"
            ? "Consolidate what changed across the interview and make the transferable method explicit."
            : "Deepen the same problem rather than jumping to a disconnected question.",
    prompt: nodePrompt(id, input),
    branchReason: `${labelFor(id)} selected after a ${input.classification} response${input.issue && input.issue !== "none" ? ` with ${input.issue}` : ""}; ${input.previousNodeIds?.length ?? 0} prior tree branches are already recorded.`,
  }
}

export function availableInterviewBranchCount() {
  return responsiveNodes.length + 5
}
