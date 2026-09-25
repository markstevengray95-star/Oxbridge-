import type { TestQuestion } from "@/lib/oxbridge-data"
import { lnatEssayPrompts2027, taraWritingPrompts2027 } from "@/lib/question-bank-2027"
import { reliableFullPaperQuestionBank } from "@/lib/full-paper-reliable-bank"
import { prepareQuestionSet } from "@/lib/question-quality"
import { auditQuestionReliability, reliabilityScore } from "@/lib/question-reliability"

export type FullPaperTest = TestQuestion["test"]
export type PaperForm = 1 | 2
export type EsatModule = "Mathematics 1" | "Mathematics 2" | "Physics" | "Chemistry" | "Biology"

export type FullPaperSection = {
  id: string
  title: string
  kind: "mcq" | "essay"
  durationMinutes: number
  questions: TestQuestion[]
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
  // Generated banks end ids with a variant number. Removing only the final
  // numeric segment preserves meaningful passage/task families while stopping
  // one parameterised template from dominating a paper.
  return question.id.replace(/-\d+$/, "")
}

function pickUniqueQuestions(
  test: FullPaperTest,
  sourceSection: string,
  count: number,
  form: PaperForm,
  salt: string,
) {
  const seed = hashString(`${test}:${sourceSection}:form-${form}:${salt}`)
  const pool = reliableFullPaperQuestionBank
    .filter(question => question.test === test && question.section === sourceSection)
    .filter(question => auditQuestionReliability(question).blocking.length === 0)
    .sort((a, b) => {
      const reliabilityDifference = reliabilityScore(b) - reliabilityScore(a)
      if (reliabilityDifference !== 0) return reliabilityDifference
      return seededRank(a.id, seed) - seededRank(b.id, seed)
    })

  const usedIds = new Set<string>()
  const usedSignatures = new Set<string>()
  const familyUses = new Map<string, number>()
  const selected: TestQuestion[] = []

  // Select in rounds: one item per family first, then a second per family, etc.
  // This keeps realistic passage clusters while preventing repetitive numeric
  // families or one SJT scenario type from filling most of a paper.
  for (let round = 0; selected.length < count && round < 12; round++) {
    for (const question of pool) {
      if (selected.length === count) break
      const signature = promptSignature(question.prompt)
      const family = questionFamilyKey(question)
      if ((familyUses.get(family) ?? 0) !== round) continue
      if (usedIds.has(question.id) || usedSignatures.has(signature)) continue
      usedIds.add(question.id)
      usedSignatures.add(signature)
      familyUses.set(family, round + 1)
      selected.push(question)
    }
  }

  // Defensive fallback for any section whose ids do not expose family structure.
  if (selected.length < count) {
    for (const question of pool) {
      if (selected.length === count) break
      const signature = promptSignature(question.prompt)
      if (usedIds.has(question.id) || usedSignatures.has(signature)) continue
      usedIds.add(question.id)
      usedSignatures.add(signature)
      selected.push(question)
    }
  }

  if (selected.length !== count) {
    throw new Error(`Reliable unique question pool too small for ${test} / ${sourceSection}: needed ${count}, found ${selected.length}.`)
  }

  return prepareQuestionSet(selected, seed)
}

function finalisePaper(paper: FullPaperDefinition): FullPaperDefinition {
  const seenIds = new Set<string>()
  const seenPrompts = new Set<string>()

  for (const section of paper.sections) {
    if (section.kind !== "mcq") continue
    for (const question of section.questions) {
      const signature = promptSignature(question.prompt)
      const reliability = auditQuestionReliability(question)
      if (reliability.blocking.length) {
        throw new Error(`Unreliable question in ${paper.id}: ${question.id} (${reliability.blocking.map(issue => issue.code).join(", ")})`)
      }
      if (seenIds.has(question.id)) {
        throw new Error(`Duplicate question id in ${paper.id}: ${question.id}`)
      }
      if (seenPrompts.has(signature)) {
        throw new Error(`Duplicate or number-only question template in ${paper.id}: ${question.id}`)
      }
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
  { test: "LNAT", title: "LNAT Full Mock", structure: "42 passage questions in 95 minutes + one essay in 40 minutes", totalMinutes: 135 },
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
      note: "Raw marks are for practice only. No calculator. There is no negative marking. Questions are reliability-screened, numerically checked and balanced across distinct reasoning families before answer positions are shuffled.",
      sections: [
        {
          id: "paper-1",
          title: "Paper 1 · Applications of Mathematical Knowledge",
          kind: "mcq",
          durationMinutes: 75,
          questions: pickUniqueQuestions("TMUA", "Applications of Mathematical Knowledge", 20, form, "paper-1"),
          instructions: "Answer 20 multiple-choice questions. You may move freely within this paper until you submit it or time expires.",
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
    const selected: EsatModule[] = ["Mathematics 1", ...esatModules.filter(item => item !== "Mathematics 1").slice(0, 2)]
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
      note: "Mathematics 1 is compulsory. This mock uses two additional modules selected by the student. No calculator and no negative marking. Generated numerical answers are checked for equivalent options and explanation consistency before selection.",
      sections: selected.map(module => ({
        id: `module-${esatCode[module]}`,
        title: module,
        kind: "mcq" as const,
        durationMinutes: 40,
        questions: pickUniqueQuestions("ESAT", module, 27, form, `module-${esatCode[module]}`),
        instructions: `Answer 27 ${module} questions. The next module begins only after this module is submitted or time expires.`,
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
      note: "The writing task is left unscored. Multiple-choice questions are reliability-screened and balanced across causal reasoning, assumptions, strengthening, weakening, logical flaws and varied problem-solving structures.",
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
      note: "Section A is automatically marked. Section B is saved for review but is not assigned a fabricated numerical score. Passage questions are checked for reliability and balanced across conclusion, assumption, strengthening and criticism tasks.",
      sections: [
        {
          id: "section-a",
          title: "Section A · Argumentative Passages",
          kind: "mcq",
          durationMinutes: 95,
          questions: pickUniqueQuestions("LNAT", "Argumentative passages", 42, form, "section-a"),
          instructions: "Answer 42 questions based on argumentative passages. Once Section B starts, Section A stays locked.",
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
    note: "This practice mode reports raw marks and accuracy only. Each subtest is reliability-screened, numerical equivalence is checked, and question families are balanced before the paper is shown.",
    sections: [
      {
        id: "vr",
        title: "Verbal Reasoning",
        kind: "mcq",
        durationMinutes: 22,
        questions: pickUniqueQuestions("UCAT", "Verbal Reasoning", 44, form, "vr"),
        instructions: "44 questions · 22 minutes. Use only the information presented in each passage.",
      },
      {
        id: "dm",
        title: "Decision Making",
        kind: "mcq",
        durationMinutes: 37,
        questions: pickUniqueQuestions("UCAT", "Decision Making", 35, form, "dm"),
        instructions: "35 questions · 37 minutes. Work carefully through logic, probability and decision problems.",
      },
      {
        id: "qr",
        title: "Quantitative Reasoning",
        kind: "mcq",
        durationMinutes: 26,
        questions: pickUniqueQuestions("UCAT", "Quantitative Reasoning", 36, form, "qr"),
        instructions: "36 questions · 26 minutes. This practice interface focuses on pacing and numerical problem solving.",
      },
      {
        id: "sjt",
        title: "Situational Judgement",
        kind: "mcq",
        durationMinutes: 26,
        questions: pickUniqueQuestions("UCAT", "Situational Judgement", 69, form, "sjt"),
        instructions: "69 questions · 26 minutes. Choose the most appropriate response using the information in the scenario.",
      },
    ],
  })
}
