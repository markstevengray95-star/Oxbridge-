import { uniqueFullPaperQuestionBank } from "@/lib/full-paper-unique-bank"
import { reliabilityUpgradeQuestionBank } from "@/lib/question-bank-reliability-upgrades"
import { ucatQrReliabilityUpgradeBank } from "@/lib/ucat-qr-reliability-upgrades"
import { tmuaSpecificationExpansionBank } from "@/lib/tmua-spec-expansion"
import { esatSpecificationExpansionBank } from "@/lib/esat-spec-expansion"
import { esatSpecificationReserveBank } from "@/lib/esat-spec-reserve"
import { esatEnergeticsReliabilityBank } from "@/lib/esat-energetics-reliability"
import { taraSpecificationExpansionBank } from "@/lib/tara-spec-expansion"
import { taraRelevantSelectionReserveBank } from "@/lib/tara-relevant-selection-reserve"
import { taraSimilarityReserveBank } from "@/lib/tara-similarity-reserve"
import { ensureTaraFiveOptions } from "@/lib/tara-question-format"
import { auditQuestionReliability, repairQuestionReliability, reliabilityScore } from "@/lib/question-reliability"
import { repairSemanticAnswerCues } from "@/lib/question-integrity-repair"

// Keep the original diverse bank as reliable reserve material rather than
// removing whole sections when an upgraded bank is present. The paper builder
// can then construct two genuinely different forms while still ranking the
// stronger upgraded items first.
const repair = (question: Parameters<typeof repairQuestionReliability>[0]) => {
  const repaired = repairSemanticAnswerCues(repairQuestionReliability(question))
  return repaired.test === "TARA" ? ensureTaraFiveOptions(repaired) : repaired
}

const originalRepaired = uniqueFullPaperQuestionBank.map(repair)
const primaryUpgrades = reliabilityUpgradeQuestionBank
  .filter(question => !(question.test === "UCAT" && question.section === "Quantitative Reasoning"))
const rawUpgrades = [...primaryUpgrades, ...ucatQrReliabilityUpgradeBank]
const upgradedRepaired = rawUpgrades.map(repair)
const tmuaSpecRepaired = tmuaSpecificationExpansionBank.map(repair)
const esatSpecRepaired = esatSpecificationExpansionBank.map(repair)
const esatSpecReserveRepaired = esatSpecificationReserveBank.map(repair)
const esatEnergeticsRepaired = esatEnergeticsReliabilityBank.map(repair)
const taraSpecRepaired = taraSpecificationExpansionBank.map(repair)
const taraRelevantSelectionRepaired = taraRelevantSelectionReserveBank.map(repair)
const taraSimilarityRepaired = taraSimilarityReserveBank.map(repair)
const repaired = [
  ...tmuaSpecRepaired,
  ...esatSpecRepaired,
  ...esatSpecReserveRepaired,
  ...esatEnergeticsRepaired,
  ...taraSpecRepaired,
  ...taraRelevantSelectionRepaired,
  ...taraSimilarityRepaired,
  ...upgradedRepaired,
  ...originalRepaired,
]

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
  taraSpecExpansion: taraSpecRepaired.length,
  taraRelevantSelectionReserve: taraRelevantSelectionRepaired.length,
  taraSimilarityReserve: taraSimilarityRepaired.length,
  reserve: originalRepaired.length,
  repairedUpgradeOptions: rawUpgrades.filter((question, index) =>
    JSON.stringify(question.options) !== JSON.stringify(upgradedRepaired[index]?.options),
  ).length,
  filteredBlocking: repaired.length - reliableFullPaperQuestionBank.length,
  averageReliability: reliableFullPaperQuestionBank.length
    ? Math.round(reliableFullPaperQuestionBank.reduce((sum, question) => sum + reliabilityScore(question), 0) / reliableFullPaperQuestionBank.length * 10) / 10
    : 0,
}
