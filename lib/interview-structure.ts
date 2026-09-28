import type { InterviewAnswerClassification } from "@/lib/interview-answer-quality"

export const interviewStages = [
  { id: "approach", label: "Initial approach", focus: "Make a first claim and explain how you would begin." },
  { id: "test", label: "Test the reasoning", focus: "Check a key step with evidence, a calculation or a counterexample." },
  { id: "change", label: "Changed condition", focus: "Apply the idea to new information or a changed assumption." },
  { id: "synthesis", label: "Synthesis", focus: "Reconcile the evidence and state what still remains uncertain." },
] as const

export type InterviewStageId = typeof interviewStages[number]["id"]

type CandidateTurn = { role: "candidate" | "interviewer"; quality?: InterviewAnswerClassification }

export function interviewStageForTurns(turns: CandidateTurn[]) {
  const responsiveAnswers = turns.filter(turn => turn.role === "candidate" && turn.quality === "responsive").length
  const index = Math.min(responsiveAnswers, interviewStages.length - 1)
  return { ...interviewStages[index], index, progress: Math.round(index / (interviewStages.length - 1) * 100) }
}
