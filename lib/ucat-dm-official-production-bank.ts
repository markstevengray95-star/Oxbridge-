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
  return {
    ...question,
    id: `ucat-dm-production-${family}-${serial}`,
  }
})
