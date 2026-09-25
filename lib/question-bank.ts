import type { TestQuestion, TrackId } from "@/lib/oxbridge-data"
import { legacyHardenedQuestionBank } from "@/lib/question-bank-legacy-hardened"
import { prepareQuestionSet, questionQualitySignals } from "@/lib/question-quality"

export type TestName = TestQuestion["test"]

export type TestBlueprint = {
  title: string
  durationMinutes: number
  sections: Array<{ name: string; questions: number; minutes?: number }>
  writing?: { minutes: number; promptChoices: number; wordLimit?: number }
  note: string
  officialPracticeUrl: string
}

/**
 * Central student-facing practice bank.
 *
 * The original one-step legacy generators were retired in September 2026 because
 * their seed % 4 option rotation and weak distractors created learnable answer
 * patterns. All older routes continue importing `questionBank`, but now receive
 * the hardened multi-step bank with balanced answer positions.
 */
export const questionBank: TestQuestion[] = legacyHardenedQuestionBank

export const taraEssayPrompts = [
  "Should governments ever restrict individual choices for a person’s own good?",
  "Is expertise more important than public opinion when making policy?",
  "Should universities value intellectual risk-taking even when it leads to mistakes?",
  "Can a fair rule produce unfair outcomes?",
  "Should public institutions prioritise equality of opportunity or equality of outcome?",
  "Is it better for a decision to be consistent or flexible?",
  "Should schools teach students how to disagree well?",
  "When, if ever, should efficiency outweigh fairness?",
  "Does technology make people better informed?",
  "Should scientific uncertainty delay public action?",
  "Can competition improve public services?",
  "Do individuals have a duty to consider the long-term effects of their choices?",
]

export const lnatEssayPrompts = [
  "Should freedom of speech protect statements that are offensive but lawful?",
  "Is punishment justified mainly by deterrence, desert, rehabilitation, or something else?",
  "Should voting be compulsory?",
  "Can privacy be a more important right than security?",
  "Should elected governments be able to overrule expert regulators?",
  "Is equality before the law enough to make a legal system fair?",
  "Should universities be permitted to restrict controversial speakers?",
  "When should civil disobedience be justified?",
  "Should social media companies be legally responsible for harmful content posted by users?",
  "Is it ever fair to treat people differently in order to achieve equality?",
  "Should judges interpret laws according to their wording or their purpose?",
  "Can a democracy legitimately limit anti-democratic political movements?",
]

export const testBlueprints: Record<TestName, TestBlueprint> = {
  TMUA: {
    title: "TMUA",
    durationMinutes: 150,
    sections: [
      { name: "Applications of Mathematical Knowledge", questions: 20, minutes: 75 },
      { name: "Mathematical Reasoning", questions: 20, minutes: 75 },
    ],
    note: "40 multiple-choice questions across two 75-minute papers. No calculator.",
    officialPracticeUrl: "https://esat-tmua.ac.uk/tmua-preparation-materials/",
  },
  ESAT: {
    title: "ESAT",
    durationMinutes: 120,
    sections: [
      { name: "Mathematics 1", questions: 27, minutes: 40 },
      { name: "Course module 1", questions: 27, minutes: 40 },
      { name: "Course module 2", questions: 27, minutes: 40 },
    ],
    note: "Most candidates sit Mathematics 1 plus two course-specific modules. Each module has 27 questions in 40 minutes.",
    officialPracticeUrl: "https://esat-tmua.ac.uk/prepare/",
  },
  TARA: {
    title: "TARA",
    durationMinutes: 120,
    sections: [
      { name: "Critical Thinking", questions: 22, minutes: 40 },
      { name: "Problem Solving", questions: 22, minutes: 40 },
    ],
    writing: { minutes: 40, promptChoices: 3, wordLimit: 750 },
    note: "Two 22-question multiple-choice modules, then one 40-minute writing task chosen from three prompts.",
    officialPracticeUrl: "https://esat-tmua.ac.uk/prepare/",
  },
  LNAT: {
    title: "LNAT",
    durationMinutes: 135,
    sections: [{ name: "Section A: passage-based multiple choice", questions: 42, minutes: 95 }],
    writing: { minutes: 40, promptChoices: 3 },
    note: "42 multiple-choice questions in 95 minutes, followed by one essay chosen from three prompts in 40 minutes.",
    officialPracticeUrl: "https://lnat.ac.uk/how-to-prepare/practice-test/",
  },
  UCAT: {
    title: "UCAT",
    durationMinutes: 111,
    sections: [
      { name: "Verbal Reasoning", questions: 44, minutes: 22 },
      { name: "Decision Making", questions: 35, minutes: 37 },
      { name: "Quantitative Reasoning", questions: 36, minutes: 26 },
      { name: "Situational Judgement", questions: 69, minutes: 26 },
    ],
    note: "Four separately timed subtests. This practice timer covers the scored subtest time, excluding instruction screens.",
    officialPracticeUrl: "https://www.ucat.ac.uk/prepare/practice-tests/",
  },
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function deterministicTake(pool: TestQuestion[], count: number, seed: number) {
  if (!pool.length || count <= 0) return [] as TestQuestion[]

  // Prefer stronger-discrimination questions while retaining deterministic variety.
  const ranked = [...pool]
    .map(item => ({
      item,
      score: questionQualitySignals(item).discriminationScore + (hashString(`${item.id}:${seed}`) % 10000) / 25000,
    }))
    .sort((a, b) => b.score - a.score)
    .map(row => row.item)

  return ranked.slice(0, Math.min(count, ranked.length))
}

function takeFromSection(test: TestName, section: string, count: number, seed: number) {
  return deterministicTake(questionBank.filter(question => question.test === test && question.section === section), count, seed)
}

export function esatModulesForTrack(track: TrackId): [string, string] {
  if (track === "life") return ["Biology", "Chemistry"]
  if (track === "physical") return ["Physics", "Mathematics 2"]
  if (track === "maths" || track === "economics") return ["Mathematics 2", "Physics"]
  return ["Physics", "Mathematics 2"]
}

export function buildFullMock(test: TestName, track: TrackId, seed = 1): TestQuestion[] {
  let selected: TestQuestion[]

  if (test === "TMUA") {
    selected = [
      ...takeFromSection("TMUA", "Applications of Mathematical Knowledge", 20, seed),
      ...takeFromSection("TMUA", "Mathematical Reasoning", 20, seed + 1),
    ]
  } else if (test === "ESAT") {
    const [module1, module2] = esatModulesForTrack(track)
    selected = [
      ...takeFromSection("ESAT", "Mathematics 1", 27, seed),
      ...takeFromSection("ESAT", module1, 27, seed + 1),
      ...takeFromSection("ESAT", module2, 27, seed + 2),
    ]
  } else if (test === "TARA") {
    selected = [
      ...takeFromSection("TARA", "Critical Thinking", 22, seed),
      ...takeFromSection("TARA", "Problem Solving", 22, seed + 1),
    ]
  } else if (test === "LNAT") {
    selected = deterministicTake(questionBank.filter(question => question.test === "LNAT"), 42, seed)
  } else {
    selected = [
      ...takeFromSection("UCAT", "Verbal Reasoning", 44, seed),
      ...takeFromSection("UCAT", "Decision Making", 35, seed + 1),
      ...takeFromSection("UCAT", "Quantitative Reasoning", 36, seed + 2),
      ...takeFromSection("UCAT", "Situational Judgement", 69, seed + 3),
    ]
  }

  // Rebalance A/B/C/D for this exact mock, not merely for the global bank.
  return prepareQuestionSet(selected, seed * 104729 + test.length * 7919)
}

export function writingPromptsFor(test: TestName, seed = 1) {
  const pool = test === "TARA" ? taraEssayPrompts : test === "LNAT" ? lnatEssayPrompts : []
  if (!pool.length) return []
  return Array.from({ length: Math.min(3, pool.length) }, (_, index) => pool[(seed * 3 + index * 5) % pool.length])
}

export const questionBankStats = {
  total: questionBank.length,
  byTest: Object.fromEntries((["TMUA", "ESAT", "TARA", "LNAT", "UCAT"] as TestName[]).map(test => [test, questionBank.filter(question => question.test === test).length])) as Record<TestName, number>,
}
