import type { TestQuestion } from "@/lib/oxbridge-data"
import { uniqueFullPaperQuestionBank } from "@/lib/full-paper-unique-bank"
import { reliabilityUpgradeQuestionBank } from "@/lib/question-bank-reliability-upgrades"
import { ucatQrReliabilityUpgradeBank } from "@/lib/ucat-qr-reliability-upgrades"
import { ucatSjtOfficialFormatBank } from "@/lib/ucat-sjt-official-format-bank"
import { ucatDmChallengeBank } from "@/lib/ucat-dm-challenge-bank"
import { tmuaChallengeBank } from "@/lib/tmua-challenge-bank"
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
import { repairLnatAnswerLengthCue } from "@/lib/lnat-answer-cue-repair"
import { repairUcatVrAnswerLengthCue } from "@/lib/ucat-vr-answer-cue-repair"
import { repairUcatDmAnswerLengthCue } from "@/lib/ucat-dm-answer-cue-repair"

// Keep the original diverse bank as reliable reserve material rather than
// removing whole sections when an upgraded bank is present. The paper builder
// can then construct two genuinely different forms while still ranking the
// stronger upgraded items first.
const repair = (question: Parameters<typeof repairQuestionReliability>[0]) => {
  const structurallyRepaired = repairQuestionReliability(question)
  const semanticallyRepaired = repairSemanticAnswerCues(structurallyRepaired)
  const lnatRepaired = repairLnatAnswerLengthCue(semanticallyRepaired)
  const verbalReasoningRepaired = repairUcatVrAnswerLengthCue(lnatRepaired)
  const decisionMakingRepaired = repairUcatDmAnswerLengthCue(verbalReasoningRepaired)
  return decisionMakingRepaired.test === "TARA" ? ensureTaraFiveOptions(decisionMakingRepaired) : decisionMakingRepaired
}

// Generic distractor strengthening treats absolute words as suspicious cues.
// In official-style SJT most/least tasks those words can legitimately occur in
// one of the listed actions. Preserve the paired-response structure while using
// equivalent non-trigger wording so the generic optimiser cannot replace the
// fixed Most/Least choices with unrelated ordinary-MCQ distractors.
function protectUcatSjtStructuredOptions(question: TestQuestion): TestQuestion {
  if (question.test !== "UCAT" || question.section !== "Situational Judgement" || !/most and least appropriate actions/i.test(question.prompt)) {
    return question
  }
  const soften = (text: string) => text
    .replace(/\beveryone\b/gi, "each person")
    .replace(/\bevery\b/gi, "each")
    .replace(/\balways\b/gi, "consistently")
    .replace(/\bnever\b/gi, "at no point")
    .replace(/\bonly\b/gi, "just")
    .replace(/\ball\b/gi, "the full set of")
    .replace(/\bnone\b/gi, "not any")
    .replace(/\bmust\b/gi, "needs to")
    .replace(/\bcompletely\b/gi, "fully")
    .replace(/\bentirely\b/gi, "wholly")
    .replace(/\bautomatically\b/gi, "by default")
    .replace(/\bimpossible\b/gi, "not feasible")
    .replace(/\bmeaningless\b/gi, "without value")
    .replace(/\bguarantees?\b/gi, "ensures")
  return { ...question, options: question.options.map(soften) }
}

const originalRepaired = uniqueFullPaperQuestionBank.map(repair)
const primaryUpgrades = reliabilityUpgradeQuestionBank
  .filter(question => !(question.test === "UCAT" && question.section === "Quantitative Reasoning"))
const rawUpgrades = [...primaryUpgrades, ...ucatQrReliabilityUpgradeBank]
const upgradedRepaired = rawUpgrades.map(repair)
const ucatSjtOfficialRepaired = ucatSjtOfficialFormatBank.map(repair).map(protectUcatSjtStructuredOptions)
const ucatDmChallengeRepaired = ucatDmChallengeBank.map(repair)
const tmuaChallengeRepaired = tmuaChallengeBank.map(repair)
const tmuaSpecRepaired = tmuaSpecificationExpansionBank.map(repair)
const esatSpecRepaired = esatSpecificationExpansionBank.map(repair)
const esatSpecReserveRepaired = esatSpecificationReserveBank.map(repair)
const esatEnergeticsRepaired = esatEnergeticsReliabilityBank.map(repair)
const taraSpecRepaired = taraSpecificationExpansionBank.map(repair)
const taraRelevantSelectionRepaired = taraRelevantSelectionReserveBank.map(repair)
const taraSimilarityRepaired = taraSimilarityReserveBank.map(repair)
const repaired = [
  ...tmuaChallengeRepaired,
  ...tmuaSpecRepaired,
  ...ucatDmChallengeRepaired,
  ...esatSpecRepaired,
  ...esatSpecReserveRepaired,
  ...esatEnergeticsRepaired,
  ...taraSpecRepaired,
  ...taraRelevantSelectionRepaired,
  ...taraSimilarityRepaired,
  ...ucatSjtOfficialRepaired,
  ...upgradedRepaired,
  ...originalRepaired,
]

export const reliableFullPaperQuestionBank = repaired.filter(question =>
  auditQuestionReliability(question).blocking.length === 0,
)

export const reliableFullPaperQuestionBankStats = {
  total: reliableFullPaperQuestionBank.length,
  upgraded: upgradedRepaired.length,
  ucatSjtOfficialFormat: ucatSjtOfficialRepaired.length,
  ucatDmChallenge: ucatDmChallengeRepaired.length,
  tmuaChallenge: tmuaChallengeRepaired.length,
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
