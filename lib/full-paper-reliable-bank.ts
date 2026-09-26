import { uniqueFullPaperQuestionBank } from "@/lib/full-paper-unique-bank"
import { reliabilityUpgradeQuestionBank } from "@/lib/question-bank-reliability-upgrades"
import { ucatQrReliabilityUpgradeBank } from "@/lib/ucat-qr-reliability-upgrades"
import { tmuaSpecificationExpansionBank } from "@/lib/tmua-spec-expansion"
import { esatSpecificationExpansionBank } from "@/lib/esat-spec-expansion"
import { esatSpecificationReserveBank } from "@/lib/esat-spec-reserve"
import { esatEnergeticsReliabilityBank } from "@/lib/esat-energetics-reliability"
import { auditQuestionReliability, repairQuestionReliability, reliabilityScore } from "@/lib/question-reliability"
import { repairSemanticAnswerCues } from "@/lib/question-integrity-repair"

// Keep the original diverse bank as reliable reserve material rather than
// removing whole sections when an upgraded bank is present. The paper builder
// can then construct two genuinely different forms while still ranking the
// stronger upgraded items first.
const repair = (question: Parameters<typeof repairQuestionReliability>[0]) =>
  repairSemanticAnswerCues(repairQuestionReliability(question))

const originalRepaired = uniqueFullPaperQuestionBank.map(repair)
const primaryUpgrades = reliabilityUpgradeQuestionBank
  .filter(question => !(question.test === "UCAT" && question.section === "Quantitative Reasoning"))
const rawUpgrades = [...primaryUpgrades, ...ucatQrReliabilityUpgradeBank]
const upgradedRepaired = rawUpgrades.map(repair)
const tmuaSpecRepaired = tmuaSpecificationExpansionBank.map(repair)
const esatSpecRepaired = esatSpecificationExpansionBank.map(repair)
const esatSpecReserveRepaired = esatSpecificationReserveBank.map(repair)
const esatEnergeticsRepaired = esatEnergeticsReliabilityBank.map(repair)
const repaired = [...tmuaSpecRepaired, ...esatSpecRepaired, ...esatSpecReserveRepaired, ...esatEnergeticsRepaired, ...upgradedRepaired, ...originalRepaired]

export const reliableFullPaperQuestionBank = repaired.filter(question =>
  auditQuestionReliability(question).blocking.length === 0,
)

export const reliableFullPaperQuestionBankStats = {
  total: reliableFullPaperQuestionBank.length,
  upgraded: upgradedRepaired.length,
  tmuaSpecExpansion: tmuaSpecRepaired.length,
  esatSpecExpansion: esatSpecRepaired.length,
  esatSpecReserve: esatSpecReserveRepaired.length,
  esatEnergeticsReserve: esatEnergeticsRepaired.length,
  reserve: originalRepaired.length,
  repairedUpgradeOptions: rawUpgrades.filter((question, index) =>
    JSON.stringify(question.options) !== JSON.stringify(upgradedRepaired[index]?.options),
  ).length,
  filteredBlocking: repaired.length - reliableFullPaperQuestionBank.length,
  averageReliability: reliableFullPaperQuestionBank.length
    ? Math.round(reliableFullPaperQuestionBank.reduce((sum, question) => sum + reliabilityScore(question), 0) / reliableFullPaperQuestionBank.length * 10) / 10
    : 0,
}
