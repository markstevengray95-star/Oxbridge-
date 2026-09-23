import type { TestQuestion } from "@/lib/oxbridge-data"
import { lnatEssayPrompts2027, questionBank2027, taraWritingPrompts2027 } from "@/lib/question-bank-2027"

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

const q = (prefix: string) => questionBank2027.filter(item => item.id.startsWith(prefix))

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
    return {
      id: `tmua-form-${form}`,
      test,
      form,
      title: `TMUA Practice Form ${form}`,
      subtitle: "Full two-paper simulation",
      totalMinutes: 150,
      note: "Raw marks are for practice only. No calculator. There is no negative marking.",
      sections: [
        {
          id: "paper-1",
          title: "Paper 1 · Applications of Mathematical Knowledge",
          kind: "mcq",
          durationMinutes: 75,
          questions: q(`2027-tmua-f${form}-ak-`),
          instructions: "Answer 20 multiple-choice questions. You may move freely within this paper until you submit it or time expires.",
        },
        {
          id: "paper-2",
          title: "Paper 2 · Mathematical Reasoning",
          kind: "mcq",
          durationMinutes: 75,
          questions: q(`2027-tmua-f${form}-mr-`),
          instructions: "Answer 20 multiple-choice questions. Once you begin Paper 2, Paper 1 stays locked.",
        },
      ],
    }
  }

  if (test === "ESAT") {
    const selected: EsatModule[] = ["Mathematics 1", ...esatModules.filter(item => item !== "Mathematics 1").slice(0, 2)]
    while (selected.length < 3) {
      const fallback = esatOptionalModules.find(item => !selected.includes(item))
      if (!fallback) break
      selected.push(fallback)
    }
    return {
      id: `esat-form-${form}-${selected.join("-").replaceAll(" ", "_")}`,
      test,
      form,
      title: `ESAT Practice Form ${form}`,
      subtitle: selected.join(" · "),
      totalMinutes: selected.length * 40,
      note: "Mathematics 1 is compulsory. This mock uses two additional modules selected by the student. No calculator and no negative marking.",
      sections: selected.map(module => ({
        id: `module-${esatCode[module]}`,
        title: module,
        kind: "mcq" as const,
        durationMinutes: 40,
        questions: q(`2027-esat-f${form}-${esatCode[module]}-`),
        instructions: `Answer 27 ${module} questions. The next module begins only after this module is submitted or time expires.`,
      })),
    }
  }

  if (test === "TARA") {
    const essayStart = form === 1 ? 0 : 3
    const essayChoices = Array.from({ length: 3 }, (_, i) => taraWritingPrompts2027[(essayStart + i) % taraWritingPrompts2027.length])
    return {
      id: `tara-form-${form}`,
      test,
      form,
      title: `TARA Practice Form ${form}`,
      subtitle: "Critical Thinking · Problem Solving · Writing Task",
      totalMinutes: 120,
      note: "The writing task is deliberately left unscored, matching the fact that UAT-UK sends the response to universities rather than assigning it a TARA score.",
      sections: [
        {
          id: "critical-thinking",
          title: "Critical Thinking",
          kind: "mcq",
          durationMinutes: 40,
          questions: q(`2027-tara-f${form}-ct-`),
          instructions: "Answer 22 multiple-choice questions. There is no negative marking.",
        },
        {
          id: "problem-solving",
          title: "Problem Solving",
          kind: "mcq",
          durationMinutes: 40,
          questions: q(`2027-tara-f${form}-ps-`),
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
    }
  }

  if (test === "LNAT") {
    const essayStart = form === 1 ? 0 : 3
    const essayChoices = Array.from({ length: 3 }, (_, i) => lnatEssayPrompts2027[(essayStart + i) % lnatEssayPrompts2027.length])
    return {
      id: `lnat-form-${form}`,
      test,
      form,
      title: `LNAT Practice Form ${form}`,
      subtitle: "Section A · Multiple Choice + Section B · Essay",
      totalMinutes: 135,
      note: "Section A is automatically marked. Section B is saved for review but is not assigned a fabricated numerical score.",
      sections: [
        {
          id: "section-a",
          title: "Section A · Argumentative Passages",
          kind: "mcq",
          durationMinutes: 95,
          questions: q(`2027-lnat-f${form}-`),
          instructions: "Answer 42 questions based on 12 argumentative passages. Once Section B starts, Section A stays locked.",
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
    }
  }

  return {
    id: `ucat-form-${form}`,
    test: "UCAT",
    form,
    title: `UCAT Practice Form ${form}`,
    subtitle: "Current four-subtest structure",
    totalMinutes: 111,
    note: "This practice mode reports raw marks and accuracy only. It does not invent a UCAT scaled score or SJT band.",
    sections: [
      {
        id: "vr",
        title: "Verbal Reasoning",
        kind: "mcq",
        durationMinutes: 22,
        questions: q(`2027-ucat-f${form}-vr-`),
        instructions: "44 questions · 22 minutes. Use only the information presented in each passage.",
      },
      {
        id: "dm",
        title: "Decision Making",
        kind: "mcq",
        durationMinutes: 37,
        questions: q(`2027-ucat-f${form}-dm-`),
        instructions: "35 questions · 37 minutes. Work carefully through logic, probability and decision problems.",
      },
      {
        id: "qr",
        title: "Quantitative Reasoning",
        kind: "mcq",
        durationMinutes: 26,
        questions: q(`2027-ucat-f${form}-qr-`),
        instructions: "36 questions · 26 minutes. This practice interface focuses on pacing and numerical problem solving.",
      },
      {
        id: "sjt",
        title: "Situational Judgement",
        kind: "mcq",
        durationMinutes: 26,
        questions: q(`2027-ucat-f${form}-sjt-`),
        instructions: "69 questions · 26 minutes. Choose the most appropriate response using the information in the scenario.",
      },
    ],
  }
}
