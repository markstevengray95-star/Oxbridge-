import { ucatDecisionMakingOfficialMcqBank } from "@/lib/ucat-dm-official-mcq-bank"
import { ucatDmLogicalPuzzleBank } from "@/lib/ucat-dm-logical-puzzle-bank"

const nonPuzzle = ucatDecisionMakingOfficialMcqBank.filter(question => !question.id.startsWith("ucat-dm-official-puzzle-"))
const source = [...ucatDmLogicalPuzzleBank, ...nonPuzzle]

// The shared paper allocator removes the final numeric segment when it derives
// a template-family key. Retaining the source question id inside a new id and
// adding a final serial therefore gives every official DM item its own family
// key. That prevents one large category template from monopolising one form,
// while the dedicated DM coverage regression still enforces the intended mix.
export const ucatDecisionMakingProductionMcqBank = source.map((question, index) => ({
  ...question,
  id: `ucat-dm-production-${question.id}-${index + 1}`,
}))
