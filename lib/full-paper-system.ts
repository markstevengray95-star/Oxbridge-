import type { TestQuestion } from "@/lib/oxbridge-data"
import { lnatEssayPrompts2027, taraWritingPrompts2027 } from "@/lib/question-bank-2027"
import { reliableFullPaperQuestionBank } from "@/lib/full-paper-reliable-bank"
import { prepareQuestionSet } from "@/lib/question-quality"
import { auditQuestionReliability, reliabilityScore } from "@/lib/question-reliability"
import type { FullPaperQuestion } from "@/lib/full-paper-question"
import { isYesNoStatementQuestion, validateFullPaperQuestion } from "@/lib/full-paper-question"
import { ucatDecisionMakingStatementBank } from "@/lib/ucat-dm-statement-bank"
import { ucatDmFamily } from "@/lib/ucat-dm-coverage"
import { tmuaPaper1CoreTopics, tmuaPaper1Topic } from "@/lib/tmua-topic-coverage"
import { esatCoverageTopics, esatCoverageTopic } from "@/lib/esat-topic-coverage"

export type FullPaperTest = TestQuestion["test"]
export type PaperForm = 1 | 2
export type EsatModule = "Mathematics 1" | "Mathematics 2" | "Physics" | "Chemistry" | "Biology"

export type FullPaperSection = {
  id: string
  title: string
  kind: "mcq" | "essay"
  durationMinutes: number
  questions: FullPaperQuestion[]
  instructions: string
  essayChoices?: string[]
  wordLimit?: number
}

export type FullPaperDefinition = {
  id: string
  test: FullPaperTest
  form: PaperForm
  title: string
  subtitle: string
  totalMinutes: number
  sections: FullPaperSection[]
  note: string
}

function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function promptSignature(prompt: string) {
  return prompt
    .toLowerCase()
    .replace(/\d+(?:\.\d+)?/g, "#")
    .replace(/[^a-z#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function seededRank(id: string, seed: number) {
  return hashString(`${id}:${seed}`)
}

function questionFamilyKey(question: TestQuestion) {
  return question.id.replace(/-\d+$/, "")
}

function reliableSectionPool(test: FullPaperTest, sourceSection: string, salt: string) {
  const seed = hashString(`${test}:${sourceSection}:${salt}:stable-pool`)
  const ranked = reliableFullPaperQuestionBank
    .filter(question => question.test === test && question.section === sourceSection)
    .filter(question => auditQuestionReliability(question).blocking.length === 0)
    .sort((a, b) => {
      const reliabilityDifference = reliabilityScore(b) - reliabilityScore(a)
      if (reliabilityDifference !== 0) return reliabilityDifference
      return seededRank(a.id, seed) - seededRank(b.id, seed)
    })

  const bySignature = new Map<string, TestQuestion>()
  for (const question of ranked) {
    const signature = promptSignature(question.prompt)
    if (!bySignature.has(signature)) bySignature.set(signature, question)
  }
  return [...bySignature.values()]
}

function balanceFamilies(pool: TestQuestion[], seed: number) {
  const groups = new Map<string, TestQuestion[]>()
  for (const question of pool) {
    const family = questionFamilyKey(question)
    const items = groups.get(family) ?? []
    items.push(question)
    groups.set(family, items)
  }

  const orderedGroups = [...groups.entries()]
    .map(([family, questions]) => ({
      family,
      questions: [...questions].sort((a, b) => {
        const reliabilityDifference = reliabilityScore(b) - reliabilityScore(a)
        if (reliabilityDifference !== 0) return reliabilityDifference
        return seededRank(a.id, seed) - seededRank(b.id, seed)
      }),
    }))
    .sort((a, b) => {
      const qualityDifference = reliabilityScore(b.questions[0]) - reliabilityScore(a.questions[0])
      if (qualityDifference !== 0) return qualityDifference
      return seededRank(a.family, seed) - seededRank(b.family, seed)
    })

  const result: TestQuestion[] = []
  const maximumFamilySize = Math.max(0, ...orderedGroups.map(group => group.questions.length))
  for (let round = 0; round < maximumFamilySize; round++) {
    for (const group of orderedGroups) {
      const question = group.questions[round]
      if (question) result.push(question)
    }
  }
  return result
}

function partitionDistinctForm(pool: TestQuestion[], count: number, form: PaperForm, label: string) {
  if (pool.length < count * 2) {
    throw new Error(`Reliable bank cannot create two distinct ${label} forms: need ${count * 2} unique prompt structures, found ${pool.length}.`)
  }

  const universe = pool.slice(0, count * 2)
  const selected = universe.filter((_, index) => index % 2 === form - 1).slice(0, count)
  if (selected.length !== count) {
    throw new Error(`Could not allocate ${count} distinct questions to ${label} Form ${form}.`)
  }
  return selected
}

function pickUniqueQuestions(
  test: FullPaperTest,
  sourceSection: string,
  count: number,
  form: PaperForm,
  salt: string,
) {
  const seed = hashString(`${test}:${sourceSection}:form-${form}:${salt}`)
  const stablePool = reliableSectionPool(test, sourceSection, salt)
  const balanced = balanceFamilies(stablePool, hashString(`${test}:${sourceSection}:${salt}:families`))
  const selected = partitionDistinctForm(balanced, count, form, `${test} / ${sourceSection}`)
  return prepareQuestionSet(selected, seed)
}

function pickTmuaPaper1Questions(form: PaperForm): TestQuestion[] {
  const sectionName = "Applications of Mathematical Knowledge"
  const stablePool = reliableSectionPool("TMUA", sectionName, "paper-1")
  const seed = hashString(`TMUA:${sectionName}:form-${form}:spec-breadth`)

  const reservedByForm = new Map<PaperForm, TestQuestion[]>([[1, []], [2, []]])
  const reservedIds = new Set<string>()

  for (const topic of tmuaPaper1CoreTopics) {
    const topicPool = stablePool
      .filter(question => tmuaPaper1Topic(question) === topic)
      .sort((a, b) => {
        const reliabilityDifference = reliabilityScore(b) - reliabilityScore(a)
        if (reliabilityDifference !== 0) return reliabilityDifference
        return seededRank(a.id, hashString(`TMUA:${topic}:reserved`)) - seededRank(b.id, hashString(`TMUA:${topic}:reserved`))
      })

    if (topicPool.length < 2) {
      throw new Error(`TMUA Paper 1 requires at least two reliable ${topic} questions to create distinct forms; found ${topicPool.length}.`)
    }

    const form1Question = topicPool[0]
    const form2Question = topicPool[1]
    reservedByForm.get(1)?.push(form1Question)
    reservedByForm.get(2)?.push(form2Question)
    reservedIds.add(form1Question.id)
    reservedIds.add(form2Question.id)
  }

  const remaining = stablePool.filter(question => !reservedIds.has(question.id))
  const coreRemaining = balanceFamilies(
    remaining.filter(question => tmuaPaper1Topic(question) !== "Other"),
    hashString("TMUA:paper-1:core-fill"),
  )
  const foundationalRemaining = balanceFamilies(
    remaining.filter(question => tmuaPaper1Topic(question) === "Other"),
    hashString("TMUA:paper-1:foundation-fill"),
  )

  const topicReserved = reservedByForm.get(form) ?? []
  const coreFill = partitionDistinctForm(coreRemaining, 8, form, "TMUA Paper 1 core-topic filler")
  const foundationFill = partitionDistinctForm(foundationalRemaining, 4, form, "TMUA Paper 1 foundational filler")
  const selected = [...topicReserved, ...coreFill, ...foundationFill]

  if (selected.length !== 20) {
    throw new Error(`TMUA Paper 1 Form ${form} should contain 20 questions; found ${selected.length}.`)
  }
  return prepareQuestionSet(selected, seed)
}

function pickEsatModuleQuestions(module: EsatModule, form: PaperForm): TestQuestion[] {
  const salt = `module-${esatCode[module]}`
  const stablePool = reliableSectionPool("ESAT", module, salt)
  const topics = esatCoverageTopics[module]
  const seed = hashString(`ESAT:${module}:form-${form}:spec-breadth`)
  const reservedByForm = new Map<PaperForm, TestQuestion[]>([[1, []], [2, []]])
  const reservedIds = new Set<string>()

  for (const topic of topics) {
    const topicPool = stablePool
      .filter(question => esatCoverageTopic(question) === topic)
      .sort((a, b) => {
        const reliabilityDifference = reliabilityScore(b) - reliabilityScore(a)
        if (reliabilityDifference !== 0) return reliabilityDifference
        const topicSeed = hashString(`ESAT:${module}:${topic}:reserved`)
        return seededRank(a.id, topicSeed) - seededRank(b.id, topicSeed)
      })

    if (topicPool.length < 2) {
      throw new Error(`ESAT ${module} requires at least two reliable ${topic} questions to create distinct forms; found ${topicPool.length}.`)
    }

    const form1Question = topicPool[0]
    const form2Question = topicPool[1]
    reservedByForm.get(1)?.push(form1Question)
    reservedByForm.get(2)?.push(form2Question)
    reservedIds.add(form1Question.id)
    reservedIds.add(form2Question.id)
  }

  const remaining = balanceFamilies(
    stablePool.filter(question => !reservedIds.has(question.id)),
    hashString(`ESAT:${module}:breadth-fill`),
  )
  const fillCount = 27 - topics.length
  const filler = partitionDistinctForm(remaining, fillCount, form, `ESAT ${module} breadth filler`)
  const selected = [...(reservedByForm.get(form) ?? []), ...filler]

  if (selected.length !== 27) {
    throw new Error(`ESAT ${module} Form ${form} should contain 27 questions; found ${selected.length}.`)
  }
  return prepareQuestionSet(selected, seed)
}

const ucatDmSingleFamilies = [
  "Logical Puzzles",
  "Statistical Reasoning",
  "Assumption Recognition",
  "Venn Diagrams",
] as const

function pickUcatDmSingleAnswerQuestions(form: PaperForm): TestQuestion[] {
  const stablePool = reliableSectionPool("UCAT", "Decision Making", "dm-single")
  const seed = hashString(`UCAT:Decision Making:form-${form}:family-breadth`)
  const reservedByForm = new Map<PaperForm, TestQuestion[]>([[1, []], [2, []]])
  const reservedIds = new Set<string>()

  for (const family of ucatDmSingleFamilies) {
    const familySeed = hashString(`UCAT:Decision Making:${family}:reserved`)
    const familyPool = stablePool
      .filter(question => ucatDmFamily(question) === family)
      .sort((a, b) => {
        const reliabilityDifference = reliabilityScore(b) - reliabilityScore(a)
        if (reliabilityDifference !== 0) return reliabilityDifference
        return seededRank(a.id, familySeed) - seededRank(b.id, familySeed)
      })

    if (familyPool.length < 8) {
      throw new Error(`UCAT Decision Making requires at least eight reliable ${family} questions to create two balanced forms; found ${familyPool.length}.`)
    }

    for (const [index, question] of familyPool.slice(0, 8).entries()) {
      const targetForm: PaperForm = index % 2 === 0 ? 1 : 2
      reservedByForm.get(targetForm)?.push(question)
      reservedIds.add(question.id)
    }
  }

  const remaining = balanceFamilies(
    stablePool.filter(question => !reservedIds.has(question.id)),
    hashString("UCAT:Decision Making:family-balanced-fill"),
  )
  const filler = partitionDistinctForm(remaining, 11, form, "UCAT Decision Making family-balanced filler")
  const selected = [...(reservedByForm.get(form) ?? []), ...filler]

  if (selected.length !== 27) {
    throw new Error(`UCAT Decision Making Form ${form} should contain 27 single-answer questions; found ${selected.length}.`)
  }
  return prepareQuestionSet(selected, seed)
}

function pickUcatDmQuestions(form: PaperForm): FullPaperQuestion[] {
  const singleAnswer = pickUcatDmSingleAnswerQuestions(form)
  const statementPool = [...ucatDecisionMakingStatementBank].sort((a, b) => a.id.localeCompare(b.id))
  if (statementPool.length < 16) throw new Error(`UCAT Decision Making requires at least 16 reliable multiple-statement sets; found ${statementPool.length}.`)
  const statementQuestions = statementPool.filter((_, index) => index % 2 === form - 1).slice(0, 8)
  if (statementQuestions.length !== 8) throw new Error(`Could not allocate eight UCAT Decision Making multiple-statement questions to Form ${form}.`)

  const insertionPositions = new Set([2, 6, 10, 14, 18, 22, 27, 32])
  const mixed: FullPaperQuestion[] = []
  let singleIndex = 0
  let statementIndex = 0
  for (let position = 0; position < 35; position++) {
    if (insertionPositions.has(position)) mixed.push(statementQuestions[statementIndex++])
    else mixed.push(singleAnswer[singleIndex++])
  }
  if (singleIndex !== 27 || statementIndex !== 8 || mixed.length !== 35) {
    throw new Error(`UCAT Decision Making Form ${form} could not be assembled with the intended mixed response formats.`)
  }
  return mixed
}

function lnatPassageKey(question: TestQuestion) {
  const upgraded = question.id.match(/^upgrade-lnat-(\d+)-\d+$/)
  if (upgraded) return `upgrade-lnat-${upgraded[1]}`
  const reserve = question.id.match(/^uniq-lnat-(?:main|assume|strength|critic)-(\d+)$/)
  if (reserve) return `reserve-lnat-${reserve[1]}`
  return null
}

function ucatVrPassageKey(question: TestQuestion) {
  const upgraded = question.id.match(/^upgrade-ucat-vr-(\d+)-\d+$/)
  if (upgraded) return `upgrade-ucat-vr-${upgraded[1]}`
  const reserve = question.id.match(/^uniq-ucat-vr-(?:support|beyond|attitude|info)-(\d+)$/)
  if (reserve) return `reserve-ucat-vr-${reserve[1]}`
  return null
}

function ucatSjtScenarioKey(question: TestQuestion) {
  const upgraded = question.id.match(/^upgrade-ucat-sjt-(\d+)-\d+$/)
  if (upgraded) return `upgrade-ucat-sjt-${upgraded[1]}`
  const reserve = question.id.match(/^uniq-ucat-sjt-(\d+)-\d+$/)
  if (reserve) return `reserve-ucat-sjt-${reserve[1]}`
  return null
}

type PassageGroup = { key: string; questions: TestQuestion[]; score: number }

function passageGroups(
  test: FullPaperTest,
  sourceSection: string,
  salt: string,
  keyForQuestion: (question: TestQuestion) => string | null,
) {
  const seed = hashString(`${test}:${sourceSection}:${salt}:passages`)
  const pool = reliableSectionPool(test, sourceSection, salt)
  const groups = new Map<string, TestQuestion[]>()
  for (const question of pool) {
    const key = keyForQuestion(question)
    if (!key) continue
    const items = groups.get(key) ?? []
    items.push(question)
    groups.set(key, items)
  }

  return [...groups.entries()]
    .map(([key, questions]): PassageGroup => {
      const ordered = [...questions].sort((a, b) => {
        const reliabilityDifference = reliabilityScore(b) - reliabilityScore(a)
        if (reliabilityDifference !== 0) return reliabilityDifference
        return seededRank(a.id, seed) - seededRank(b.id, seed)
      })
      return {
        key,
        questions: ordered,
        score: ordered.reduce((sum, question) => sum + reliabilityScore(question), 0) / Math.max(1, ordered.length),
      }
    })
    .sort((a, b) => {
      const scoreDifference = b.score - a.score
      if (scoreDifference !== 0) return scoreDifference
      return seededRank(a.key, seed) - seededRank(b.key, seed)
    })
}

function allocatePassageGroups(groups: PassageGroup[], groupCount: number, form: PaperForm, label: string) {
  if (groups.length < groupCount * 2) {
    throw new Error(`${label} needs ${groupCount * 2} distinct passage groups for two forms; found ${groups.length}.`)
  }
  const universe = groups.slice(0, groupCount * 2)
  const selected = universe.filter((_, index) => index % 2 === form - 1).slice(0, groupCount)
  if (selected.length !== groupCount) throw new Error(`Could not allocate ${groupCount} ${label} passages to Form ${form}.`)
  return selected
}

function pickLnatQuestions(form: PaperForm) {
  const groups = allocatePassageGroups(
    passageGroups("LNAT", "Argumentative passages", "section-a", lnatPassageKey),
    12,
    form,
    "LNAT",
  )

  const fourQuestionGroups = groups
    .filter(group => group.questions.length >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
  if (fourQuestionGroups.length < 6 || groups.some(group => group.questions.length < 3)) {
    throw new Error(`LNAT Form ${form} does not have enough reliable grouped passage questions.`)
  }
  const fourKeys = new Set(fourQuestionGroups.map(group => group.key))
  const selected = groups.flatMap(group => group.questions.slice(0, fourKeys.has(group.key) ? 4 : 3))
  if (selected.length !== 42) throw new Error(`LNAT Form ${form} should contain 42 grouped questions; found ${selected.length}.`)
  return prepareQuestionSet(selected, hashString(`LNAT:form-${form}:grouped`))
}

function pickUcatVrQuestions(form: PaperForm) {
  const groups = allocatePassageGroups(
    passageGroups("UCAT", "Verbal Reasoning", "vr", ucatVrPassageKey).filter(group => group.questions.length >= 4),
    11,
    form,
    "UCAT Verbal Reasoning",
  )
  const selected = groups.flatMap(group => group.questions.slice(0, 4))
  if (selected.length !== 44) throw new Error(`UCAT VR Form ${form} should contain 44 grouped questions; found ${selected.length}.`)
  return prepareQuestionSet(selected, hashString(`UCAT:VR:form-${form}:grouped`))
}

function pickUcatSjtQuestions(form: PaperForm) {
  const groups = allocatePassageGroups(
    passageGroups("UCAT", "Situational Judgement", "sjt", ucatSjtScenarioKey).filter(group => group.questions.length >= 3),
    16,
    form,
    "UCAT Situational Judgement",
  )

  const sizes = groups.map(group => group.questions.length)
  let excess = sizes.reduce((sum, size) => sum + size, 0) - 69
  if (excess < 0) throw new Error(`UCAT SJT Form ${form} has capacity for only ${69 + excess} grouped questions.`)

  const trimOrder = groups
    .map((group, index) => ({ index, score: group.score, tie: seededRank(group.key, hashString(`UCAT:SJT:form-${form}:trim`)) }))
    .sort((a, b) => a.score - b.score || a.tie - b.tie)

  for (const candidate of trimOrder) {
    while (excess > 0 && sizes[candidate.index] > 3) {
      sizes[candidate.index] -= 1
      excess -= 1
    }
    if (excess === 0) break
  }
  if (excess !== 0) throw new Error(`UCAT SJT Form ${form} could not be trimmed to 69 questions without breaking scenario integrity.`)

  const selected = groups.flatMap((group, index) => group.questions.slice(0, sizes[index]))
  if (selected.length !== 69) throw new Error(`UCAT SJT Form ${form} should contain 69 grouped questions; found ${selected.length}.`)
  return prepareQuestionSet(selected, hashString(`UCAT:SJT:form-${form}:grouped`))
}

function finalisePaper(paper: FullPaperDefinition): FullPaperDefinition {
  const seenIds = new Set<string>()
  const seenPrompts = new Set<string>()

  for (const section of paper.sections) {
    if (section.kind !== "mcq") continue
    for (const question of section.questions) {
      const signature = promptSignature(question.prompt)
      if (isYesNoStatementQuestion(question)) {
        const issues = validateFullPaperQuestion(question)
        if (issues.length) throw new Error(`Invalid mixed-format question in ${paper.id}: ${question.id} (${issues.join(", ")})`)
      } else {
        const reliability = auditQuestionReliability(question)
        if (reliability.blocking.length) {
          throw new Error(`Unreliable question in ${paper.id}: ${question.id} (${reliability.blocking.map(issue => issue.code).join(", ")})`)
        }
      }
      if (seenIds.has(question.id)) throw new Error(`Duplicate question id in ${paper.id}: ${question.id}`)
      if (seenPrompts.has(signature)) throw new Error(`Duplicate or number-only question template in ${paper.id}: ${question.id}`)
      seenIds.add(question.id)
      seenPrompts.add(signature)
    }
  }

  return paper
}

const esatCode: Record<EsatModule, string> = {
  "Mathematics 1": "m1",
  "Mathematics 2": "m2",
  Physics: "phy",
  Chemistry: "chem",
  Biology: "bio",
}

export const esatOptionalModules: EsatModule[] = ["Mathematics 2", "Physics", "Chemistry", "Biology"]

export const paperCatalog: Array<{
  test: FullPaperTest
  title: string
  structure: string
  totalMinutes: number
}> = [
  { test: "TMUA", title: "TMUA Full Mock", structure: "2 papers · 20 questions each · 75 minutes per paper", totalMinutes: 150 },
  { test: "ESAT", title: "ESAT Full Mock", structure: "3 modules · 27 questions each · 40 minutes per module", totalMinutes: 120 },
  { test: "TARA", title: "TARA Full Mock", structure: "22 Critical Thinking + 22 Problem Solving + 40-minute writing task", totalMinutes: 120 },
  { test: "LNAT", title: "LNAT Full Mock", structure: "12 passages · 42 questions in 95 minutes + one essay in 40 minutes", totalMinutes: 135 },
  { test: "UCAT", title: "UCAT Full Mock", structure: "VR 44 · DM 35 · QR 36 · SJT 69 with current section timings", totalMinutes: 111 },
]

export function buildFullPaper(
  test: FullPaperTest,
  form: PaperForm,
  esatModules: EsatModule[] = ["Mathematics 1", "Physics", "Mathematics 2"],
): FullPaperDefinition {
  if (test === "TMUA") {
    return finalisePaper({
      id: `tmua-form-${form}`,
      test,
      form,
      title: `TMUA Practice Form ${form}`,
      subtitle: "Full two-paper simulation",
      totalMinutes: 150,
      note: "Raw marks are for practice only. No calculator. There is no negative marking. Paper 1 is deliberately balanced across the major current specification domains as well as foundational mathematics; Paper 2 focuses on mathematical reasoning. Forms 1 and 2 use separate prompt pools.",
      sections: [
        {
          id: "paper-1",
          title: "Paper 1 · Applications of Mathematical Knowledge",
          kind: "mcq",
          durationMinutes: 75,
          questions: pickTmuaPaper1Questions(form),
          instructions: "Answer 20 multiple-choice questions spanning the major specification domains. You may move freely within this paper until you submit it or time expires.",
        },
        {
          id: "paper-2",
          title: "Paper 2 · Mathematical Reasoning",
          kind: "mcq",
          durationMinutes: 75,
          questions: pickUniqueQuestions("TMUA", "Mathematical Reasoning", 20, form, "paper-2"),
          instructions: "Answer 20 multiple-choice questions. Once you begin Paper 2, Paper 1 stays locked.",
        },
      ],
    })
  }

  if (test === "ESAT") {
    const requestedExtras = Array.from(new Set(esatModules.filter(item => item !== "Mathematics 1"))).slice(0, 2)
    const selected: EsatModule[] = ["Mathematics 1", ...requestedExtras]
    while (selected.length < 3) {
      const fallback = esatOptionalModules.find(item => !selected.includes(item))
      if (!fallback) break
      selected.push(fallback)
    }
    return finalisePaper({
      id: `esat-form-${form}-${selected.join("-").replaceAll(" ", "_")}`,
      test,
      form,
      title: `ESAT Practice Form ${form}`,
      subtitle: selected.join(" · "),
      totalMinutes: selected.length * 40,
      note: "Mathematics 1 is compulsory. This mock uses two additional distinct modules selected by the student. Each module is deliberately balanced across broad current specification strands, then filled from reliability-screened questions. No calculator, no negative marking, and Forms 1 and 2 use separate prompt pools.",
      sections: selected.map(module => ({
        id: `module-${esatCode[module]}`,
        title: module,
        kind: "mcq" as const,
        durationMinutes: 40,
        questions: pickEsatModuleQuestions(module, form),
        instructions: `Answer 27 ${module} questions spanning the module's broad specification strands. The next module begins only after this module is submitted or time expires.`,
      })),
    })
  }

  if (test === "TARA") {
    const essayStart = form === 1 ? 0 : 3
    const essayChoices = Array.from({ length: 3 }, (_, i) => taraWritingPrompts2027[(essayStart + i) % taraWritingPrompts2027.length])
    return finalisePaper({
      id: `tara-form-${form}`,
      test,
      form,
      title: `TARA Practice Form ${form}`,
      subtitle: "Critical Thinking · Problem Solving · Writing Task",
      totalMinutes: 120,
      note: "The writing task is left unscored. Multiple-choice questions are reliability-screened and balanced across causal reasoning, assumptions, strengthening, weakening, logical flaws and varied problem-solving structures. Forms 1 and 2 use separate MCQ prompt pools.",
      sections: [
        {
          id: "critical-thinking",
          title: "Critical Thinking",
          kind: "mcq",
          durationMinutes: 40,
          questions: pickUniqueQuestions("TARA", "Critical Thinking", 22, form, "critical-thinking"),
          instructions: "Answer 22 multiple-choice questions. There is no negative marking.",
        },
        {
          id: "problem-solving",
          title: "Problem Solving",
          kind: "mcq",
          durationMinutes: 40,
          questions: pickUniqueQuestions("TARA", "Problem Solving", 22, form, "problem-solving"),
          instructions: "Answer 22 multiple-choice questions. No calculator or dictionary.",
        },
        {
          id: "writing-task",
          title: "Writing Task",
          kind: "essay",
          durationMinutes: 40,
          questions: [],
          essayChoices,
          wordLimit: 750,
          instructions: "Choose one of three prompts and write one clear, economical argument. Maximum 750 words.",
        },
      ],
    })
  }

  if (test === "LNAT") {
    const essayStart = form === 1 ? 0 : 3
    const essayChoices = Array.from({ length: 3 }, (_, i) => lnatEssayPrompts2027[(essayStart + i) % lnatEssayPrompts2027.length])
    return finalisePaper({
      id: `lnat-form-${form}`,
      test,
      form,
      title: `LNAT Practice Form ${form}`,
      subtitle: "Section A · Multiple Choice + Section B · Essay",
      totalMinutes: 135,
      note: "Section A contains 12 argumentative passages with three or four linked questions per passage. Questions are kept in passage blocks, reliability-screened, and Forms 1 and 2 use different passages. Section B is saved for review but is not assigned a fabricated numerical score.",
      sections: [
        {
          id: "section-a",
          title: "Section A · Argumentative Passages",
          kind: "mcq",
          durationMinutes: 95,
          questions: pickLnatQuestions(form),
          instructions: "Answer 42 questions across 12 argumentative passages. Each passage has three or four linked questions. Once Section B starts, Section A stays locked.",
        },
        {
          id: "section-b",
          title: "Section B · Essay",
          kind: "essay",
          durationMinutes: 40,
          questions: [],
          essayChoices,
          instructions: "Choose one of three prompts and write one concise, well-structured argument.",
        },
      ],
    })
  }

  return finalisePaper({
    id: `ucat-form-${form}`,
    test: "UCAT",
    form,
    title: `UCAT Practice Form ${form}`,
    subtitle: "Current four-subtest structure",
    totalMinutes: 111,
    note: "This practice mode reports raw marks and accuracy only. Verbal Reasoning preserves 11 passage blocks. Decision Making mixes single-answer items with five-statement Yes/No items worth up to two raw marks with partial credit. Situational Judgement keeps related judgements together by scenario. Forms 1 and 2 draw from separate prompt pools.",
    sections: [
      {
        id: "vr",
        title: "Verbal Reasoning",
        kind: "mcq",
        durationMinutes: 22,
        questions: pickUcatVrQuestions(form),
        instructions: "44 questions · 22 minutes · 11 passages with four linked questions each. Use only the information presented in each passage.",
      },
      {
        id: "dm",
        title: "Decision Making",
        kind: "mcq",
        durationMinutes: 37,
        questions: pickUcatDmQuestions(form),
        instructions: "35 questions · 37 minutes. The section mixes four-option single-answer items with five-statement Yes/No items. Complete all five judgements on a multiple-statement item before moving on.",
      },
      {
        id: "qr",
        title: "Quantitative Reasoning",
        kind: "mcq",
        durationMinutes: 26,
        questions: pickUniqueQuestions("UCAT", "Quantitative Reasoning", 36, form, "qr"),
        instructions: "36 questions · 26 minutes. Interpret the data before choosing a calculation route.",
      },
      {
        id: "sjt",
        title: "Situational Judgement",
        kind: "mcq",
        durationMinutes: 26,
        questions: pickUcatSjtQuestions(form),
        instructions: "69 questions · 26 minutes. Related judgements stay together within each scenario; choose the response that best fits the information given.",
      },
    ],
  })
}