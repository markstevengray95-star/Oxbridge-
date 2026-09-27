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
  return null
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
  new Function("exports", "module", "require", outputText)(moduleShim.exports, moduleShim, specifier => {
    const local = resolveModule(specifier, file)
    if (local) return loadTs(local)
    return require(specifier)
  })
  return moduleShim.exports
}

const upgradeModule = loadTs(path.join(root, "lib/question-bank-reliability-upgrades.ts"))
const qrUpgradeModule = loadTs(path.join(root, "lib/ucat-qr-reliability-upgrades.ts"))
const reliabilityModule = loadTs(path.join(root, "lib/question-reliability.ts"))
const integrityModule = loadTs(path.join(root, "lib/question-integrity-repair.ts"))
const taraFormatModule = loadTs(path.join(root, "lib/tara-question-format.ts"))

const primaryBank = upgradeModule.reliabilityUpgradeQuestionBank.filter(question => !(question.test === "UCAT" && question.section === "Quantitative Reasoning"))
const rawBank = [...primaryBank, ...qrUpgradeModule.ucatQrReliabilityUpgradeBank]
const { auditQuestionReliability, repairQuestionReliability } = reliabilityModule
const { repairSemanticAnswerCues } = integrityModule
const { ensureTaraFiveOptions } = taraFormatModule

if (!Array.isArray(rawBank) || rawBank.length === 0) throw new Error("Reliability upgrade bank failed to load.")

const expectedCounts = new Map([
  ["LNAT:Argumentative passages", 42],
  ["TARA:Critical Thinking", 22],
  ["UCAT:Verbal Reasoning", 44],
  ["UCAT:Quantitative Reasoning", 36],
  ["UCAT:Situational Judgement", 70],
])

const counts = new Map()
const signatures = new Map()
const blocking = []
const sectionScores = new Map()
const sectionWarnings = new Map()
let repairCount = 0

function promptSignature(prompt) {
  return prompt.toLowerCase().replace(/\d+(?:\.\d+)?/g, "#").replace(/[^a-z#]+/g, " ").replace(/\s+/g, " ").trim()
}

function repair(raw) {
  let question = repairQuestionReliability(raw)
  question = repairSemanticAnswerCues(question)
  if (question.test === "TARA") question = ensureTaraFiveOptions(question)
  return question
}

for (const raw of rawBank) {
  const question = repair(raw)
  if (JSON.stringify(question.options) !== JSON.stringify(raw.options)) repairCount += 1
  const key = `${question.test}:${question.section}`
  counts.set(key, (counts.get(key) ?? 0) + 1)

  const signature = promptSignature(question.prompt)
  const sectionSignatures = signatures.get(key) ?? new Set()
  if (sectionSignatures.has(signature)) throw new Error(`Repeated prompt structure in upgraded bank: ${question.id}`)
  sectionSignatures.add(signature)
  signatures.set(key, sectionSignatures)

  const audit = auditQuestionReliability(question)
  for (const issue of audit.blocking) blocking.push(`${question.id} [${issue.code}] ${issue.message}`)
  const scores = sectionScores.get(key) ?? []
  scores.push(audit.score)
  sectionScores.set(key, scores)
  const warningMap = sectionWarnings.get(key) ?? new Map()
  for (const issue of audit.warnings) warningMap.set(issue.code, (warningMap.get(issue.code) ?? 0) + 1)
  sectionWarnings.set(key, warningMap)
}

if (blocking.length) {
  console.error("Blocking failures in upgraded question bank:")
  blocking.forEach(issue => console.error(`- ${issue}`))
  process.exit(1)
}

for (const [section, expected] of expectedCounts) {
  const actual = counts.get(section) ?? 0
  if (actual !== expected) throw new Error(`${section} expected ${expected} upgraded questions but found ${actual}.`)
  const scores = sectionScores.get(section) ?? []
  const average = scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length)
  const minimum = Math.min(...scores)
  const warnings = [...(sectionWarnings.get(section) ?? new Map()).entries()].sort((a, b) => b[1] - a[1])
  if (average < 80) throw new Error(`${section} upgraded-bank reliability average too low: ${average.toFixed(1)}. Warnings: ${warnings.map(([code,count]) => `${code}=${count}`).join(", ") || "none"}.`)
  if (minimum < 60) throw new Error(`${section} contains an upgraded question below the minimum reliability threshold: ${minimum}.`)
  console.log(`${section}: ${actual} questions, reliability average ${average.toFixed(1)}, minimum ${minimum}; warnings ${warnings.map(([code,count]) => `${code}=${count}`).join(", ") || "none"}.`)
}

console.log(`PASS: ${rawBank.length} upgraded questions are structurally unique and reliable after ${repairCount} production-pipeline repair(s).`)
