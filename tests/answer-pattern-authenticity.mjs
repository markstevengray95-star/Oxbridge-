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
  throw new Error(`Unsupported runtime import in answer-pattern audit: ${specifier}`)
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
  if (errors.length) throw new Error(errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"))
  const moduleShim = { exports: {} }
  cache.set(file, moduleShim)
  new Function("exports", "module", "require", outputText)(moduleShim.exports, moduleShim, specifier => loadTs(resolveModule(specifier, file)))
  return moduleShim.exports
}

const { buildFullPaper } = loadTs(path.join(root, "lib/full-paper-system.ts"))
const { auditQuestionReliability } = loadTs(path.join(root, "lib/question-reliability.ts"))
const { isYesNoStatementQuestion } = loadTs(path.join(root, "lib/full-paper-question.ts"))

function periodicity(keys) {
  let strongest = { period: 0, ratio: 0 }
  for (let period = 1; period <= Math.min(5, Math.floor(keys.length / 2)); period++) {
    let matches = 0
    let total = 0
    for (let i = period; i < keys.length; i++) {
      total += 1
      if (keys[i] === keys[i - period]) matches += 1
    }
    const ratio = total ? matches / total : 0
    if (ratio > strongest.ratio) strongest = { period, ratio }
  }
  return strongest
}

function auditSection(paper, section) {
  if (section.kind !== "mcq") return
  const singles = section.questions.filter(question => !isYesNoStatementQuestion(question))
  if (!singles.length) return

  const byOptionCount = new Map()
  let lengthCues = 0
  let weakDistractors = 0
  let reasoningDepthWarnings = 0
  let longestRun = 0
  let previous = null
  let currentRun = 0
  const keySequence = []

  for (const question of singles) {
    const audit = auditQuestionReliability(question)
    const warningCodes = new Set(audit.warnings.map(issue => issue.code))
    if (warningCodes.has("correct-length-clue") || warningCodes.has("correct-short-clue")) lengthCues += 1
    if (warningCodes.has("implausible-distractors") || warningCodes.has("extreme-distractor-cue") || warningCodes.has("stem-echo-cue")) weakDistractors += 1
    if (warningCodes.has("low-reasoning-depth") || warningCodes.has("low-discrimination-stem")) reasoningDepthWarnings += 1

    const optionCount = question.options.length
    const counts = byOptionCount.get(optionCount) ?? Array(optionCount).fill(0)
    if (question.answer < 0 || question.answer >= optionCount) throw new Error(`${paper.id}/${section.id}/${question.id} has invalid answer index.`)
    counts[question.answer] += 1
    byOptionCount.set(optionCount, counts)
    keySequence.push(`${optionCount}:${question.answer}`)

    const key = `${optionCount}:${question.answer}`
    if (key === previous) currentRun += 1
    else { previous = key; currentRun = 1 }
    longestRun = Math.max(longestRun, currentRun)
  }

  for (const [optionCount, counts] of byOptionCount.entries()) {
    const max = Math.max(...counts)
    const min = Math.min(...counts)
    if (max - min > 1) throw new Error(`${paper.id}/${section.id} ${optionCount}-option keys are visibly imbalanced: ${counts.join("/")}.`)
  }
  if (longestRun > 2) throw new Error(`${paper.id}/${section.id} contains ${longestRun} consecutive answers in the same option position.`)

  const repeated = periodicity(keySequence)
  if (keySequence.length >= 12 && repeated.ratio > 0.78) {
    throw new Error(`${paper.id}/${section.id} answer positions show a strong period-${repeated.period} repeating pattern (${Math.round(repeated.ratio * 100)}%).`)
  }

  const n = singles.length
  if (lengthCues / n > 0.10) throw new Error(`${paper.id}/${section.id} has too many answer-length cues: ${lengthCues}/${n}.`)
  if (weakDistractors / n > 0.10) throw new Error(`${paper.id}/${section.id} has too many wording/distractor cues: ${weakDistractors}/${n}.`)
  if (reasoningDepthWarnings / n > 0.35) throw new Error(`${paper.id}/${section.id} contains too many low-discrimination one-step questions: ${reasoningDepthWarnings}/${n}.`)
}

function auditPaper(test, form, modules) {
  const paper = buildFullPaper(test, form, modules)
  for (const section of paper.sections) auditSection(paper, section)
}

for (const test of ["TMUA", "TARA", "LNAT", "UCAT"]) {
  for (const form of [1, 2]) auditPaper(test, form)
}

const esatPairs = [
  ["Mathematics 2", "Physics"],
  ["Mathematics 2", "Chemistry"],
  ["Mathematics 2", "Biology"],
  ["Physics", "Chemistry"],
  ["Physics", "Biology"],
  ["Chemistry", "Biology"],
]
for (const form of [1, 2]) {
  for (const pair of esatPairs) auditPaper("ESAT", form, ["Mathematics 1", ...pair])
}

console.log("PASS: full papers have balanced answer positions, no obvious answer-key cycles, controlled length/wording cues and admissions-level reasoning depth.")
