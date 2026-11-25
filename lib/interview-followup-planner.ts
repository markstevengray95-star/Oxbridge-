/**
 * Phase 3: choose the next academic move from observable student reasoning.
 * No answer keys, trait inference or admissions predictions are used here.
 */
import type { InterviewAnswerClassification, InterviewAnswerIssue } from "@/lib/interview-answer-quality"
import type { InterviewTreeNodeId } from "@/lib/interview-question-tree"
import type { InterviewMoveKind } from "@/lib/interview-questioning-engine"

export type FollowUpStrategy = "clarify" | "justify" | "verify" | "revision" | "assumption" | "prediction" | "alternative" | "stress-test" | "transfer" | "synthesis"
export type AcademicFollowUpPlan = {
  strategy: FollowUpStrategy
  prompt: string
  rationale: string
  anchor: string
  preferredNodeId: InterviewTreeNodeId
  preferredMove: InterviewMoveKind
  needsSupport: boolean
}
export type AcademicFollowUpInput = {
  course?: string
  subjectProbes?: Partial<Record<FollowUpStrategy, string>>
  openingProblem: string
  currentQuestion: string
  candidateAnswer: string
  previousCandidateAnswers?: string[]
  previousMoves?: string[]
  recentQuestions?: string[]
  candidateTurnCount?: number
  classification: InterviewAnswerClassification
  issue?: InterviewAnswerIssue
  track?: string
}

const WHY = /\b(?:because|therefore|since|hence|as a result|which means|it follows|so that|leads to|causes?|implies?)\b/i
const ASSUME = /\b(?:assum(?:e|ing|ption)|suppos(?:e|ing)|provided that|holding .{1,60} constant|if we take|depends on)\b/i
const REVISE = /\b(?:actually|on reflection|i was wrong|thinking again|i would revise|i'd revise|let me correct|my earlier (?:answer|claim|idea)|instead i now)\b/i
const TEST = /\b(?:measure|experiment|test|check|compare|collect data|observe|calculate|verify|counterexample|limiting case|falsif)\b/i
const ALTERNATIVE = /\b(?:alternatively|another explanation|on the other hand|however|rather than|whereas|rival interpretation|could also|unless)\b/i
const STUCK = /\b(?:i (?:don't|do not) know|i'm not sure|i am not sure|no idea|i'm stuck|not sure where|i need a hint)\b/i
const INJECTION = /\b(?:ignore (?:all |any )?(?:previous|above|prior) instructions|system prompt|developer message|api[_ -]?key|password|pretend you are|role:\s*(?:system|developer)|reveal your instructions|jailbreak)\b/i

function clean(text: string, max = 180) { return text.replace(/\s+/g, " ").trim().slice(0, max) }
function normal(text: string) { return clean(text.toLowerCase(), 450).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim() }
function focus(answer: string) {
  const source = clean(answer, 450)
  if (!source || INJECTION.test(source)) return "the specific claim you just made"
  const clause = source.split(/(?<=[.!?;])\s+|\s+(?=but |however |although )/i)[0] || source
  const anchor = clean(clause.replace(/^(?:i (?:think|believe|guess|suppose|would say) (?:that )?|perhaps |maybe |well |so )/i, ""), 125)
  return anchor.length >= 6 ? 'your statement "' + anchor + '"' : "the specific claim you just made"
}
function subject(track?: string) {
  if (track === "maths") return "a simple example, an invariant or a counterexample"
  if (track === "physical") return "a limiting case, physical model or measurable prediction"
  if (track === "life") return "a controlled comparison or causal mechanism"
  if (track === "economics") return "an incentive, constraint or counterfactual"
  if (track === "law") return "a changed fact or an exception"
  if (track === "humanities" || track === "languages") return "a rival interpretation or source detail"
  return "a changed condition or alternative explanation"
}
const nodes: Record<FollowUpStrategy, InterviewTreeNodeId> = {
  clarify:"repair-commit",justify:"repair-link",verify:"repair-check",revision:"repair-contradiction",
  assumption:"assumption",prediction:"prediction",alternative:"alternative",
  "stress-test":"counterexample",transfer:"transfer-context",synthesis:"synthesis",
}
const moves: Record<FollowUpStrategy, InterviewMoveKind> = {
  clarify:"repair",justify:"repair",verify:"repair",revision:"repair",
  assumption:"assumption",prediction:"prediction",alternative:"counterexample",
  "stress-test":"counterexample",transfer:"extension",synthesis:"extension",
}
function similar(a: string, b: string) {
  const left = normal(a), right = normal(b)
  if (!left || !right) return false
  if (left === right) return true
  const tokens = (x:string) => new Set(x.split(" ").filter(word=>word.length>3))
  const aa = tokens(left), bb = tokens(right)
  if (!aa.size || !bb.size) return false
  let overlap = 0
  for (const word of aa) if (bb.has(word)) overlap++
  return overlap / Math.max(aa.size, bb.size) > 0.84
}
function question(strategy: FollowUpStrategy, anchor: string, track: string | undefined, turn: number): string {
  switch (strategy) {
    case "clarify": return turn > 2 ? "Stay with the original problem. What is the smallest claim you can justify about " + anchor + ", and what would you check first?" : "Take one manageable step: what can you establish about " + anchor + " from the information given?"
    case "justify": return "What specific step connects the evidence in the question to " + anchor + ", and why does that step follow?"
    case "verify": return "Before accepting " + anchor + ", which relationship, definition or limiting case could you independently check?"
    case "revision": return "You have reconsidered " + anchor + ". What specific reasoning made you change your position, and what remains uncertain?"
    case "assumption": return "If the central assumption behind " + anchor + " were relaxed while everything else stayed constant, what would change and why?"
    case "prediction": return "You have proposed checking " + anchor + ". What result would you expect if your reasoning is right, and what result would count against it?"
    case "alternative": return "What is the strongest plausible alternative to " + anchor + ", and what observation or argument would distinguish the two?"
    case "stress-test": return "Test " + anchor + " using " + subject(track) + ". Under what condition might the explanation stop working?"
    case "transfer": return "Apply the reasoning behind " + anchor + " to another context involving " + subject(track) + ". What transfers, and what must change?"
    case "synthesis": return "Looking back at " + anchor + ", which assumption or correction was decisive, and what general method would you use again?"
  }
}
export function planAcademicFollowUp(input: AcademicFollowUpInput): AcademicFollowUpPlan {
  const answer = clean(input.candidateAnswer, 3000)
  const anchor = focus(answer)
  const used = input.previousMoves ?? []
  const turn = Math.max(1, input.candidateTurnCount ?? 1)
  const explained = WHY.test(answer)
  const strong = input.classification === "responsive"
  let strategy: FollowUpStrategy
  let rationale: string

  if (input.issue === "contradiction" && !REVISE.test(answer)) {
    strategy = "revision"; rationale = "An earlier position has changed without an explicit justification."
  } else if ((STUCK.test(answer) && !explained) || input.classification === "vague" || input.classification === "irrelevant" || input.issue === "evasion") {
    strategy = "clarify"; rationale = "Ask for the smallest reasoned claim rather than supplying the answer."
  } else if (input.classification === "incorrect" || input.issue === "factual-error") {
    strategy = "verify"; rationale = "Check one specific potentially mistaken relationship before extending the model."
  } else if (!explained && !TEST.test(answer)) {
    strategy = "justify"; rationale = "The conclusion has been asserted without enough visible reasoning."
  } else if (REVISE.test(answer)) {
    strategy = "revision"; rationale = "Recognise the explicit revision and probe why it is justified."
  } else if (ASSUME.test(answer) && !used.includes("assumption")) {
    strategy = "assumption"; rationale = "A stated assumption creates a natural opportunity to vary one condition."
  } else if (ALTERNATIVE.test(answer) && !used.includes("alternative")) {
    strategy = "alternative"; rationale = "The student proposed competing interpretations that can be tested."
  } else if (TEST.test(answer) && !used.includes("prediction")) {
    strategy = "prediction"; rationale = "The student proposed a test; request a prediction before revealing any result."
  } else if (turn >= 8 && strong && !used.includes("synthesis")) {
    strategy = "synthesis"; rationale = "A developed chain is ready for a concise synthesis."
  } else if (turn >= 5 && strong && !used.includes("transfer")) {
    strategy = "transfer"; rationale = "Strong sustained reasoning can now be applied to a different situation."
  } else if (strong && !used.includes("stress-test")) {
    strategy = "stress-test"; rationale = "An explained claim should be tested using a genuine limiting case."
  } else if (!used.includes("alternative")) {
    strategy = "alternative"; rationale = "Contrast the claim with a rival explanation instead of repeating a generic probe."
  } else {
    strategy = strong ? "transfer" : "justify"; rationale = "Continue the problem with a different intellectual move."
  }
  // A repeated move may be appropriate for repair, but not for an already
  // successful challenge. Switch when possible to keep the discussion varied.
  if (strong && used.includes(strategy) && !["revision","synthesis"].includes(strategy)) {
    if (!used.includes("prediction")) strategy = "prediction"
    else if (!used.includes("stress-test")) strategy = "stress-test"
    else if (!used.includes("transfer")) strategy = "transfer"
  }
  let prompt = input.subjectProbes?.[strategy] || question(strategy, anchor, input.track, turn)
  const recent = (input.recentQuestions ?? []).filter(Boolean)
  if (recent.some(earlier => similar(prompt, earlier))) {
    const alternatives = input.subjectProbes
      ? (["verify", "assumption", "alternative", "stress-test"] as const).map(next =>
          input.subjectProbes?.[next] || question(next, anchor, input.track, turn))
      : [
          "Which observation would most challenge " + anchor + ", and why?",
          "What would happen if the main condition supporting " + anchor + " changed?",
          "Which other method could test " + anchor + " independently?",
        ]
    prompt = alternatives.find(candidate => !recent.some(earlier => similar(candidate, earlier))) ?? alternatives[turn % alternatives.length]
  }
  return {
    strategy, prompt, rationale, anchor, preferredNodeId:nodes[strategy],
    preferredMove:moves[strategy],
    needsSupport:strategy==="clarify" || strategy==="verify",
  }
}

/** Reject repeated, non-question or answer-revealing cloud replies. */
export function suitableAcademicFollowUp(reply: string, recentQuestions: string[] = []) {
  const trimmed = clean(reply, 650)
  if (trimmed.length < 16 || trimmed.length > 540) return false
  if ((trimmed.match(/\?/g) ?? []).length !== 1) return false
  if (/\b(?:correct answer is|the solution is|the answer must be|well done|excellent answer|next unrelated question)\b/i.test(trimmed)) return false
  return !recentQuestions.some(earlier => similar(trimmed, earlier))
}
