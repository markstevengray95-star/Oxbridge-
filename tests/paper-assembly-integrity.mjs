import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const cache = new Map()

function resolveModule(specifier, fromFile) {
  if (specifier.startsWith("@/")) return path.join(root, specifier.slice(2)) + (path.extname(specifier) ? "" : ".ts")
  if (specifier.startsWith(".")) {
    const resolved = path.resolve(path.dirname(fromFile), specifier)
    return resolved + (path.extname(resolved) ? "" : ".ts")
  }
  throw new Error(`Unsupported runtime import in integrity audit: ${specifier}`)
}

function loadTs(file) {
  if (cache.has(file)) return cache.get(file).exports
  const source = fs.readFileSync(file, "utf8")
  const { outputText, diagnostics = [] } = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  })
  const errors = diagnostics.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
  if (errors.length) {
    for (const diagnostic of errors) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
    process.exit(1)
  }
  const moduleShim = { exports: {} }
  cache.set(file, moduleShim)
  new Function("exports", "module", "require", outputText)(moduleShim.exports, moduleShim, specifier => loadTs(resolveModule(specifier, file)))
  return moduleShim.exports
}

const { buildFullPaper } = loadTs(path.join(root, "lib/full-paper-system.ts"))
const { auditQuestionReliability } = loadTs(path.join(root, "lib/question-reliability.ts"))
if (typeof buildFullPaper !== "function" || typeof auditQuestionReliability !== "function") throw new Error("Could not load paper integrity dependencies.")

function mcqSection(paper, id) {
  const section = paper.sections.find(item => item.id === id)
  if (!section || section.kind !== "mcq") throw new Error(`${paper.id} is missing MCQ section ${id}.`)
  return section
}

function essaySection(paper, id) {
  const section = paper.sections.find(item => item.id === id)
  if (!section || section.kind !== "essay") throw new Error(`${paper.id} is missing essay section ${id}.`)
  return section
}

function assertSectionQuality(paper, section) {
  const questions = section.questions
  if (!questions.length) throw new Error(`${paper.id}/${section.id} has no questions.`)
  const scores = []
  const positions = [0, 0, 0, 0]
  let longestRun = 0
  let run = 0
  let previous = -1
  let lengthClues = 0
  let weakDistractors = 0
  let extremeCues = 0

  for (const question of questions) {
    const audit = auditQuestionReliability(question)
    if (audit.blocking.length) throw new Error(`${paper.id}/${section.id}/${question.id} has blocking reliability issues: ${audit.blocking.map(issue => issue.code).join(", ")}`)
    scores.push(audit.score)
    lengthClues += audit.warnings.some(issue => issue.code === "correct-length-clue") ? 1 : 0
    weakDistractors += audit.warnings.some(issue => issue.code === "implausible-distractors") ? 1 : 0
    extremeCues += audit.warnings.some(issue => issue.code === "extreme-distractor-cue") ? 1 : 0

    if (question.options.length === 4 && question.answer >= 0 && question.answer < 4) {
      positions[question.answer] += 1
      if (question.answer === previous) run += 1
      else { previous = question.answer; run = 1 }
      longestRun = Math.max(longestRun, run)
    }
  }

  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length
  const minimum = Math.min(...scores)
  const maxPosition = Math.max(...positions)
  const minPosition = Math.min(...positions)
  if (average < 80) throw new Error(`${paper.id}/${section.id} reliability average is too low: ${average.toFixed(1)}.`)
  if (minimum < 60) throw new Error(`${paper.id}/${section.id} contains a question below reliability 60: ${minimum}.`)
  if (positions.reduce((a, b) => a + b, 0) === questions.length && maxPosition - minPosition > 2) {
    throw new Error(`${paper.id}/${section.id} answer positions are imbalanced: ${positions.join("/")}.`)
  }
  if (longestRun > 2) throw new Error(`${paper.id}/${section.id} has ${longestRun} consecutive answers in the same option position.`)
  if (lengthClues / questions.length > 0.2) throw new Error(`${paper.id}/${section.id} has too many correct-answer length clues: ${lengthClues}/${questions.length}.`)
  if (weakDistractors / questions.length > 0.12) throw new Error(`${paper.id}/${section.id} has too many weak-distractor warnings: ${weakDistractors}/${questions.length}.`)
  if (extremeCues / questions.length > 0.12) throw new Error(`${paper.id}/${section.id} has too many extreme-wording cues: ${extremeCues}/${questions.length}.`)
}

function passagePrefix(prompt) {
  return prompt.split(/\n\s*\n/)[0].trim()
}

function assertContiguousGroups(questions, keyForQuestion, label, minimumSize, maximumSize) {
  const blocks = []
  let previous = null
  for (const question of questions) {
    const key = keyForQuestion(question)
    if (!key) throw new Error(`${label} cannot identify a group for ${question.id}.`)
    if (key !== previous) blocks.push({ key, count: 0 })
    blocks[blocks.length - 1].count += 1
    previous = key
  }
  const uniqueKeys = new Set(blocks.map(block => block.key))
  if (uniqueKeys.size !== blocks.length) throw new Error(`${label} splits at least one passage/scenario into multiple non-contiguous blocks.`)
  for (const block of blocks) {
    if (block.count < minimumSize || block.count > maximumSize) throw new Error(`${label} group ${block.key} has ${block.count} questions; expected ${minimumSize}-${maximumSize}.`)
  }
  return blocks
}

function sjtScenarioKey(question) {
  const upgraded = question.id.match(/^upgrade-ucat-sjt-(\d+)-\d+$/)
  if (upgraded) return `upgrade-${upgraded[1]}`
  const reserve = question.id.match(/^uniq-ucat-sjt-(\d+)-\d+$/)
  if (reserve) return `reserve-${reserve[1]}`
  return null
}

function assertOfficialStructure(paper) {
  if (paper.test === "TMUA") {
    if (paper.totalMinutes !== 150 || paper.sections.length !== 2) throw new Error(`${paper.id} TMUA total structure is wrong.`)
    for (const id of ["paper-1", "paper-2"]) {
      const section = mcqSection(paper, id)
      if (section.questions.length !== 20 || section.durationMinutes !== 75) throw new Error(`${paper.id}/${id} must be 20 questions in 75 minutes.`)
    }
  } else if (paper.test === "ESAT") {
    const sections = paper.sections.filter(item => item.kind === "mcq")
    if (paper.totalMinutes !== 120 || sections.length !== 3) throw new Error(`${paper.id} ESAT must have three 40-minute modules.`)
    if (sections.some(section => section.questions.length !== 27 || section.durationMinutes !== 40)) throw new Error(`${paper.id} ESAT modules must each have 27 questions in 40 minutes.`)
    const titles = sections.map(section => section.title)
    if (titles.filter(title => title === "Mathematics 1").length !== 1) throw new Error(`${paper.id} must include Mathematics 1 exactly once.`)
    if (new Set(titles).size !== titles.length) throw new Error(`${paper.id} contains a duplicate ESAT module: ${titles.join(" / ")}.`)
  } else if (paper.test === "TARA") {
    if (paper.totalMinutes !== 120 || paper.sections.length !== 3) throw new Error(`${paper.id} TARA total structure is wrong.`)
    const ct = mcqSection(paper, "critical-thinking")
    const ps = mcqSection(paper, "problem-solving")
    const writing = essaySection(paper, "writing-task")
    if (ct.questions.length !== 22 || ps.questions.length !== 22 || ct.durationMinutes !== 40 || ps.durationMinutes !== 40 || writing.durationMinutes !== 40) throw new Error(`${paper.id} TARA section counts/timings are wrong.`)
    if (writing.wordLimit !== 750 || writing.essayChoices?.length !== 3) throw new Error(`${paper.id} TARA writing task must offer three prompts and a 750-word limit.`)
  } else if (paper.test === "LNAT") {
    if (paper.totalMinutes !== 135) throw new Error(`${paper.id} LNAT total time must be 135 minutes.`)
    const sectionA = mcqSection(paper, "section-a")
    const sectionB = essaySection(paper, "section-b")
    if (sectionA.questions.length !== 42 || sectionA.durationMinutes !== 95 || sectionB.durationMinutes !== 40 || sectionB.essayChoices?.length !== 3) throw new Error(`${paper.id} LNAT section structure is wrong.`)
    const blocks = assertContiguousGroups(sectionA.questions, question => passagePrefix(question.prompt), `${paper.id} LNAT`, 3, 4)
    if (blocks.length !== 12) throw new Error(`${paper.id} LNAT must contain 12 contiguous passages; found ${blocks.length}.`)
  } else if (paper.test === "UCAT") {
    if (paper.totalMinutes !== 111) throw new Error(`${paper.id} UCAT scored-section time must be 111 minutes.`)
    const expectations = [["vr", 44, 22], ["dm", 35, 37], ["qr", 36, 26], ["sjt", 69, 26]]
    for (const [id, count, minutes] of expectations) {
      const section = mcqSection(paper, id)
      if (section.questions.length !== count || section.durationMinutes !== minutes) throw new Error(`${paper.id}/${id} must contain ${count} questions in ${minutes} minutes.`)
    }
    const vrBlocks = assertContiguousGroups(mcqSection(paper, "vr").questions, question => passagePrefix(question.prompt), `${paper.id} UCAT VR`, 4, 4)
    if (vrBlocks.length !== 11) throw new Error(`${paper.id} UCAT VR must contain 11 contiguous four-question passages; found ${vrBlocks.length}.`)
    const sjtBlocks = assertContiguousGroups(mcqSection(paper, "sjt").questions, sjtScenarioKey, `${paper.id} UCAT SJT`, 2, 6)
    if (sjtBlocks.length < 12) throw new Error(`${paper.id} UCAT SJT uses too few distinct scenarios: ${sjtBlocks.length}.`)
  }

  for (const section of paper.sections) if (section.kind === "mcq") assertSectionQuality(paper, section)
}

for (const test of ["TMUA", "TARA", "LNAT", "UCAT"]) {
  for (const form of [1, 2]) assertOfficialStructure(buildFullPaper(test, form))
}

const esatPairs = [
  ["Mathematics 2", "Physics"], ["Mathematics 2", "Chemistry"], ["Mathematics 2", "Biology"],
  ["Physics", "Chemistry"], ["Physics", "Biology"], ["Chemistry", "Biology"],
]
for (const form of [1, 2]) {
  for (const pair of esatPairs) assertOfficialStructure(buildFullPaper("ESAT", form, ["Mathematics 1", ...pair]))
  assertOfficialStructure(buildFullPaper("ESAT", form, ["Mathematics 1", "Physics", "Physics"]))
}

console.log("PASS: assembled full papers satisfy official counts/timings, grouping, answer-pattern and reliability integrity checks.")
