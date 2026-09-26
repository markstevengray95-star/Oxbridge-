import { ucatDecisionMakingOfficialMcqBank } from "@/lib/ucat-dm-official-mcq-bank"
import { ucatDmLogicalPuzzleBank } from "@/lib/ucat-dm-logical-puzzle-bank"

const nonPuzzle = ucatDecisionMakingOfficialMcqBank.filter(question => !question.id.startsWith("ucat-dm-official-puzzle-"))

export const ucatDecisionMakingProductionMcqBank = [
  ...ucatDmLogicalPuzzleBank,
  ...nonPuzzle,
]
