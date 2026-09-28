import { localInterviewFollowUp } from "@/lib/interview-answer-quality"
import { interviewStages, type InterviewStageId } from "@/lib/interview-structure"

type Turn = { role: "candidate" | "interviewer"; text: string }

type OfflineFollowUpInput = {
  question: string
  answer: string
  concepts: string[]
  referenceAnswer: string
  expectedAnswer?: { value: number; unit?: string; tolerance?: number; exact?: boolean }
  checkNumericReference?: boolean
  probes: string[]
  turns: Turn[]
  persona: string
  stage?: InterviewStageId
}

export function offlineInterviewFollowUp(input: OfflineFollowUpInput) {
  const candidateAnswers = input.turns.filter(turn => turn.role === "candidate").map(turn => turn.text)
  const quality = localInterviewFollowUp({
    question: input.question,
    answer: input.answer,
    concepts: input.concepts,
    referenceAnswer: input.referenceAnswer,
    expectedAnswer: input.expectedAnswer,
    checkNumericReference: input.checkNumericReference,
    previousAnswers: candidateAnswers.slice(0, -1),
  }, input.persona)

  const asked = new Set(input.turns.filter(turn => turn.role === "interviewer").map(turn => turn.text.trim()))
  const stageIndex = interviewStages.findIndex(stage => stage.id === input.stage)
  const nextSubjectProbe = input.probes.slice(Math.max(0, stageIndex)).find(probe => !asked.has(probe.trim()))
    ?? input.probes.find(probe => !asked.has(probe.trim()))
  return {
    classification: quality.classification,
    reply: quality.classification === "responsive" && nextSubjectProbe ? nextSubjectProbe : quality.reply,
  }
}
