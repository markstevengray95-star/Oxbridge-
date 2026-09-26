import { ucatDecisionMakingOfficialMcqBank } from "@/lib/ucat-dm-official-mcq-bank"
import { ucatDmLogicalPuzzleBank } from "@/lib/ucat-dm-logical-puzzle-bank"

const nonPuzzle = ucatDecisionMakingOfficialMcqBank.filter(question => !question.id.startsWith("ucat-dm-official-puzzle-"))
const source = [...ucatDmLogicalPuzzleBank, ...nonPuzzle]

function familyFor(id: string) {
  if (id.startsWith("ucat-dm-verified-puzzle-")) return "puzzle"
  if (id.startsWith("ucat-dm-official-stat-")) return "statistical"
  if (id.startsWith("ucat-dm-official-assumption-")) return "assumption"
  if (id.startsWith("ucat-dm-official-venn-")) return "venn"
  throw new Error(`Unrecognised UCAT Decision Making production family for ${id}.`)
}

function softenAbsoluteCues(text: string) {
  return text
    .replace(/\bevery\b/gi, "most")
    .replace(/\beveryone\b/gi, "most people")
    .replace(/\balways\b/gi, "usually")
    .replace(/\bnever\b/gi, "rarely")
    .replace(/\bonly\b/gi, "mainly")
    .replace(/\ball\b/gi, "most")
    .replace(/\bnone\b/gi, "very few")
    .replace(/\bmust\b/gi, "is likely to")
    .replace(/\bcompletely\b/gi, "substantially")
    .replace(/\bentirely\b/gi, "largely")
}

function balanceAssumptionOptions<T extends { options: string[]; answer: number }>(question: T): T {
  const correct = question.options[question.answer] ?? ""
  if (correct.length < 45) return question
  const qualifiers = [
    ", across the main period covered by the comparison",
    ", for the group described in the available evidence",
    ", under the conditions described in the scenario",
  ]
  const options = question.options.map((option, index) => {
    if (index === question.answer) return option
    let revised = softenAbsoluteCues(option)
    const target = Math.ceil(correct.length * 0.72)
    if (revised.length < target) revised += qualifiers[index % qualifiers.length]
    return revised
  })
  return { ...question, options }
}

const familySerial = new Map<string, number>()

// full-paper-system groups questions after stripping the final numeric id
// segment, then round-robins those groups before splitting Forms 1 and 2.
// Giving the 56 verified MCQs one of four stable family prefixes therefore
// guarantees broad Logical Puzzle / Statistical / Assumption / Venn coverage
// without special-casing UCAT inside the shared paper allocator.
export const ucatDecisionMakingProductionMcqBank = source.map(question => {
  const family = familyFor(question.id)
  const serial = (familySerial.get(family) ?? 0) + 1
  familySerial.set(family, serial)
  const strengthened = family === "assumption" ? balanceAssumptionOptions(question) : question
  return {
    ...strengthened,
    id: `ucat-dm-production-${family}-${serial}`,
  }
})
