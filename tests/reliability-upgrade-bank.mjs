import fs from "node:fs"
import ts from "typescript"

function loadTypeScriptModule(path) {
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8")
  const { outputText, diagnostics = [] } = ts.transpileModule(source, {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  })
  const errors = diagnostics.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
  if (errors.length) {
    for (const diagnostic of errors) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
    process.exit(1)
  }
  const moduleShim = { exports: {} }
  new Function("exports", "module", "require", outputText)(moduleShim.exports, moduleShim, specifier => {
    throw new Error(`Unexpected runtime import while auditing reliability upgrades: ${specifier}`)
  })
  return moduleShim.exports
}

const upgradeModule = loadTypeScriptModule("../lib/question-bank-reliability-upgrades.ts")
const qrUpgradeModule = loadTypeScriptModule("../lib/ucat-qr-reliability-upgrades.ts")
const reliabilityModule = loadTypeScriptModule("../lib/question-reliability.ts")
const taraFormatModule = loadTypeScriptModule("../lib/tara-question-format.ts")
const primaryBank = upgradeModule.reliabilityUpgradeQuestionBank.filter(question => !(question.test === "UCAT" && question.section === "Quantitative Reasoning"))
const rawBank = [...primaryBank, ...qrUpgradeModule.ucatQrReliabilityUpgradeBank]
const { auditQuestionReliability, repairQuestionReliability } = reliabilityModule
const { ensureTaraFiveOptions } = taraFormatModule

if (!Array.isArray(rawBank) || rawBank.length === 0) throw new Error("Reliability upgrade bank failed to load.")
if (typeof ensureTaraFiveOptions !== "function") throw new Error("TARA five-option converter failed to load for upgraded-bank audit.")

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
let repairCount = 0

function promptSignature(prompt) {
  return prompt.toLowerCase().replace(/\d+(?:\.\d+)?/g, "#").replace(/[^a-z#]+/g, " ").replace(/\s+/g, " ").trim()
}

for (const raw of rawBank) {
  const repaired = repairQuestionReliability(raw)
  const question = repaired.test === "TARA" ? ensureTaraFiveOptions(repaired) : repaired
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
}

for (const [section, expected] of expectedCounts) {
  const actual = counts.get(section) ?? 0
  if (actual !== expected) throw new Error(`${section} expected ${expected} upgraded questions but found ${actual}.`)
  const scores = sectionScores.get(section) ?? []
  const average = scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length)
  const minimum = Math.min(...scores)
  if (average < 80) throw new Error(`${section} upgraded-bank reliability average too low: ${average.toFixed(1)}.`)
  if (minimum < 60) throw new Error(`${section} contains an upgraded question below the minimum reliability threshold: ${minimum}.`)
  console.log(`${section}: ${actual} questions, reliability average ${average.toFixed(1)}, minimum ${minimum}.`)
}

if (blocking.length) {
  console.error("Blocking failures in upgraded question bank after production-format conversion:")
  blocking.forEach(issue => console.error(`- ${issue}`))
  process.exit(1)
}

console.log(`PASS: ${rawBank.length} upgraded questions are structurally unique and reliable after ${repairCount} deterministic/format repair(s).`)
