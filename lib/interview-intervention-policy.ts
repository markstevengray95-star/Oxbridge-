import type { InterviewAnswerClassification, InterviewAnswerIssue } from "@/lib/interview-answer-quality"
import type { InterviewTreeNode } from "@/lib/interview-question-tree"

export type InterviewInterventionKind = "silence" | "clarification" | "challenge" | "hint" | "counterexample" | "new-information" | "change-condition" | "move-on"

export type InterviewIntervention = {
  kind: InterviewInterventionKind
  label: string
  instruction: string
  rationale: string
  supportLevel: 0 | 1 | 2 | 3
}

export function selectInterviewerIntervention(input: {
  classification: InterviewAnswerClassification
  issue?: InterviewAnswerIssue
  repairDepth?: number
  candidateTurnCount: number
  node: InterviewTreeNode
  previous?: InterviewInterventionKind[]
}): InterviewIntervention {
  const previous = input.previous ?? []
  const repairDepth = Math.max(0, Math.min(3, input.repairDepth ?? 0))
  if (input.candidateTurnCount >= 9 && ["synthesis", "reflection"].includes(input.node.id)) {
    return { kind: "move-on", label: "Conclude the chain", instruction: "Ask for a compact synthesis and then close this problem rather than extending it indefinitely.", rationale: "The candidate has already completed a long reasoning chain; further probing risks repetition rather than new evidence.", supportLevel: 0 }
  }
  if (input.classification === "vague" || input.issue === "evasion" || input.issue === "off-topic") {
    return { kind: "clarification", label: "Clarify before helping", instruction: "Ask for a direct provisional claim. Do not supply content or a method yet.", rationale: "The problem is not lack of knowledge yet; the response is too unclear to diagnose securely.", supportLevel: 0 }
  }
  if (input.classification === "incorrect" || input.issue === "factual-error") {
    const recent = previous.slice(-2)
    const repeatedNonHintRepair = recent.length === 2 && recent.every(item => item === "clarification" || item === "challenge")
    if (repairDepth >= 2 || repeatedNonHintRepair) return { kind: "hint", label: "Narrow hint", instruction: "Give one directional hint that identifies what type of relationship, definition or check to use without giving the answer.", rationale: "Repeated repair attempts have not resolved a concrete error, so a small amount of scaffolding is justified.", supportLevel: 2 }
    return { kind: "challenge", label: "Challenge the claim", instruction: "Question the decisive claim and ask the candidate to verify it independently before continuing.", rationale: "A concrete error should first be challenged, not immediately rescued with a hint.", supportLevel: 1 }
  }
  if (input.classification === "partial" || input.issue === "missing-reasoning" || input.issue === "unsupported") {
    return { kind: repairDepth >= 2 ? "hint" : "challenge", label: repairDepth >= 2 ? "Reasoning hint" : "Expose the missing link", instruction: repairDepth >= 2 ? "Point to the kind of inferential link needed, but leave the candidate to complete it." : "Ask for the exact inferential step connecting the evidence to the conclusion.", rationale: "The candidate has usable material, but the reasoning chain is incomplete.", supportLevel: repairDepth >= 2 ? 2 : 1 }
  }
  if (input.node.id === "new-information") return { kind: "new-information", label: "Introduce new evidence", instruction: "Introduce the selected new fact only after the candidate has committed to a prediction, then ask what must be revised.", rationale: "This tests flexible updating rather than recall.", supportLevel: 0 }
  if (input.node.id === "counterexample" || input.node.id === "limiting-case") return { kind: "counterexample", label: "Stress-test", instruction: "Give the counterexample or limiting case and require the candidate to repair or qualify the original claim.", rationale: "A strong answer should now be tested against its boundaries.", supportLevel: 0 }
  if (["generalise", "transfer-context", "reverse-problem"].includes(input.node.id)) return { kind: "change-condition", label: "Change the problem", instruction: "Alter the context or direction of the problem while preserving its underlying structure. Ask what part of the method transfers.", rationale: "The candidate has earned a transfer test rather than more support on the original surface form.", supportLevel: 0 }
  if (!previous.includes("silence") && input.candidateTurnCount <= 2) return { kind: "silence", label: "Hold back", instruction: "Do not rescue the candidate. Give them space to continue thinking aloud, using only a brief prompt to keep the reasoning moving.", rationale: "Early independence is valuable evidence; intervention should not arrive before the candidate has had a fair chance to develop the idea.", supportLevel: 0 }
  return { kind: "challenge", label: "Deepen", instruction: "Use the selected tree branch as a challenge, keeping the candidate responsible for the next intellectual move.", rationale: "The answer is responsive, so the interviewer should deepen rather than scaffold.", supportLevel: 0 }
}
