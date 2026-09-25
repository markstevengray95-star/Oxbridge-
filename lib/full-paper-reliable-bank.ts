import { uniqueFullPaperQuestionBank } from "@/lib/full-paper-unique-bank"
import { auditQuestionReliability, repairQuestionReliability, reliabilityScore } from "@/lib/question-reliability"

const repaired = uniqueFullPaperQuestionBank.map(repairQuestionReliability)

export const reliableFullPaperQuestionBank = repaired.filter(question =>
  auditQuestionReliability(question).blocking.length === 0,
)

export const reliableFullPaperQuestionBankStats = {
  total: reliableFullPaperQuestionBank.length,
  repairedOptions: repaired.filter((question, index) =>
    JSON.stringify(question.options) !== JSON.stringify(uniqueFullPaperQuestionBank[index]?.options),
  ).length,
  filteredBlocking: repaired.length - reliableFullPaperQuestionBank.length,
  averageReliability: reliableFullPaperQuestionBank.length
    ? Math.round(reliableFullPaperQuestionBank.reduce((sum, question) => sum + reliabilityScore(question), 0) / reliableFullPaperQuestionBank.length * 10) / 10
    : 0,
}
