import { uniqueFullPaperQuestionBank } from "@/lib/full-paper-unique-bank"
import { reliabilityUpgradeQuestionBank } from "@/lib/question-bank-reliability-upgrades"
import { auditQuestionReliability, repairQuestionReliability, reliabilityScore } from "@/lib/question-reliability"

const replacementSections = new Set([
  "LNAT:Argumentative passages",
  "TARA:Critical Thinking",
  "UCAT:Verbal Reasoning",
  "UCAT:Quantitative Reasoning",
  "UCAT:Situational Judgement",
])

const originalRepaired = uniqueFullPaperQuestionBank
  .map(repairQuestionReliability)
  .filter(question => !replacementSections.has(`${question.test}:${question.section}`))

const upgradedRepaired = reliabilityUpgradeQuestionBank.map(repairQuestionReliability)
const repaired = [...upgradedRepaired, ...originalRepaired]

export const reliableFullPaperQuestionBank = repaired.filter(question =>
  auditQuestionReliability(question).blocking.length === 0,
)

export const reliableFullPaperQuestionBankStats = {
  total: reliableFullPaperQuestionBank.length,
  upgraded: upgradedRepaired.length,
  replacedSections: replacementSections.size,
  repairedOptions: repaired.filter(question =>
    JSON.stringify(question.options) !== JSON.stringify(repairQuestionReliability(question).options),
  ).length,
  filteredBlocking: repaired.length - reliableFullPaperQuestionBank.length,
  averageReliability: reliableFullPaperQuestionBank.length
    ? Math.round(reliableFullPaperQuestionBank.reduce((sum, question) => sum + reliabilityScore(question), 0) / reliableFullPaperQuestionBank.length * 10) / 10
    : 0,
}
