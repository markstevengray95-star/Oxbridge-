import { localInterviewFollowUp } from "@/lib/interview-answer-quality"

type Turn = { role: "candidate" | "interviewer"; text: string }

type OfflineFollowUpInput = {
  question: string
  answer: string
  concepts: string[]
  referenceAnswer: string
  probes: string[]
  turns: Turn[]
  persona: string
}

export function offlineInterviewFollowUp(input: OfflineFollowUpInput) {
  const candidateAnswers = input.turns.filter(turn => turn.role === "candidate").map(turn => turn.text)
  const quality = localInterviewFollowUp({
    question: input.question,
    answer: input.answer,
    concepts: input.concepts,
    referenceAnswer: input.referenceAnswer,
    previousAnswers: candidateAnswers.slice(0, -1),
  }, input.persona)

  const asked = new Set(input.turns.filter(turn => turn.role === "interviewer").map(turn => turn.text.trim()))
  const nextSubjectProbe = input.probes.find(probe => !asked.has(probe.trim()))
  return {
    classification: quality.classification,
    reply: quality.classification === "responsive" && nextSubjectProbe ? nextSubjectProbe : quality.reply,
  }
}
