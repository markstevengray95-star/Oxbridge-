import type { TestQuestion } from "@/lib/oxbridge-data"

export const tmuaPaper1CoreTopics = [
  "Algebra and functions",
  "Sequences and series",
  "Coordinate geometry and circles",
  "Trigonometry",
  "Exponentials and logarithms",
  "Differentiation",
  "Integration",
  "Graphs of functions",
] as const

export type TmuaPaper1CoreTopic = typeof tmuaPaper1CoreTopics[number]

const expansionPrefixes: Array<[string, TmuaPaper1CoreTopic]> = [
  ["tmua-spec-algebra-", "Algebra and functions"],
  ["tmua-spec-sequences-", "Sequences and series"],
  ["tmua-spec-coordinate-", "Coordinate geometry and circles"],
  ["tmua-spec-trigonometry-", "Trigonometry"],
  ["tmua-spec-explog-", "Exponentials and logarithms"],
  ["tmua-spec-differentiation-", "Differentiation"],
  ["tmua-spec-integration-", "Integration"],
  ["tmua-spec-graphs-", "Graphs of functions"],
]

/**
 * Maps original TMUA Paper 1 practice questions to the broad Part 1 domains in
 * the current UAT-UK content specification. "Other" is deliberately retained
 * for useful GCSE-level/foundational questions that do not cleanly belong to
 * one of these eight AS-level headings.
 */
export function tmuaPaper1Topic(question: TestQuestion): TmuaPaper1CoreTopic | "Other" {
  for (const [prefix, topic] of expansionPrefixes) {
    if (question.id.startsWith(prefix)) return topic
  }

  if (/^uniq-tmua-ak-(linear|compose|quadratic|modulus)-/.test(question.id)) return "Algebra and functions"
  if (question.id.startsWith("uniq-tmua-ak-seq-")) return "Sequences and series"
  if (question.id.startsWith("uniq-tmua-ak-gradient-")) return "Coordinate geometry and circles"
  return "Other"
}

export function tmuaTopicCounts(questions: TestQuestion[]) {
  const counts = new Map<TmuaPaper1CoreTopic | "Other", number>()
  for (const question of questions) {
    const topic = tmuaPaper1Topic(question)
    counts.set(topic, (counts.get(topic) ?? 0) + 1)
  }
  return counts
}
