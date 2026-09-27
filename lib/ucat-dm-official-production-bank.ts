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

const familyOrder = ["puzzle", "statistical", "assumption", "venn"] as const
const byFamily = new Map<string, typeof source>()
for (const family of familyOrder) byFamily.set(family, [])
for (const question of source) {
  const family = familyFor(question.id)
  byFamily.get(family)?.push(question)
}

const buckets: typeof source[] = [[], [], [], []]
for (const family of familyOrder) {
  const questions = byFamily.get(family) ?? []
  if (questions.length !== 14) {
    throw new Error(`UCAT Decision Making production bank expects 14 ${family} items; found ${questions.length}.`)
  }
  questions.forEach((question, index) => buckets[index % buckets.length].push(question))
}

// The shared paper allocator round-robins id families and then sends alternating
// positions to Forms 1 and 2. Four pure reasoning-family groups therefore caused
// one form to receive only two of the four MCQ families. These four production
// buckets deliberately contain a balanced mix of all reasoning families. Any
// two buckets therefore give each form broad Logical Puzzle, Statistical,
// Assumption and Venn/Set coverage while preserving zero prompt overlap.
export const ucatDecisionMakingProductionMcqBank = buckets.flatMap((bucket, bucketIndex) =>
  bucket.map((question, index) => {
    const family = familyFor(question.id)
    const strengthened = family === "assumption" ? balanceAssumptionOptions(question) : question
    return {
      ...strengthened,
      id: `ucat-dm-production-bucket-${bucketIndex + 1}-${index + 1}`,
    }
  }),
)
