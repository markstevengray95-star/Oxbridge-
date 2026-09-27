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
  throw new Error(`Unsupported runtime import in UCAT QR audit: ${specifier}`)
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
const promptSets = []
const contextSets = []

for (const form of [1, 2]) {
  const paper = buildFullPaper("UCAT", form)
  const section = paper.sections.find(item => item.id === "qr")
  if (!section || section.kind !== "mcq") throw new Error(`UCAT Form ${form} has no Quantitative Reasoning section.`)
  if (section.questions.length !== 36 || section.durationMinutes !== 26) {
    throw new Error(`UCAT Form ${form} QR should contain 36 questions in 26 minutes; found ${section.questions.length} in ${section.durationMinutes}.`)
  }

  const dataStimulus = section.questions.filter(question => /^(Bar chart|Line graph|Pie chart|Table) —/i.test(question.prompt))
  const chartGraph = section.questions.filter(question => /^(Bar chart|Line graph|Pie chart) —/i.test(question.prompt))
  if (dataStimulus.length !== 36) {
    throw new Error(`UCAT Form ${form} QR should be fully data-stimulus led; found ${dataStimulus.length}/36 chart, graph or table questions.`)
  }
  if (chartGraph.length < 28) {
    throw new Error(`UCAT Form ${form} QR should contain a strong chart/graph majority; found ${chartGraph.length}/36.`)
  }

  const contexts = new Map()
  for (const question of section.questions) {
    const match = question.id.match(/^ucat-qr-data-(\d+)-(\d+)$/)
    if (!match) throw new Error(`UCAT Form ${form} contains a non-production QR source: ${question.id}`)
    const context = match[1]
    contexts.set(context, (contexts.get(context) ?? 0) + 1)
  }
  if (contexts.size !== 9 || [...contexts.values()].some(count => count !== 4)) {
    throw new Error(`UCAT Form ${form} QR should contain nine four-item data testlets; found ${contexts.size} contexts with counts ${[...contexts.values()].join("/")}.`)
  }

  promptSets.push(new Set(section.questions.map(question => question.prompt.trim().toLowerCase())))
  contextSets.push(new Set(contexts.keys()))
  console.log(`UCAT QR Form ${form}: data stimuli=${dataStimulus.length}; chart/graph=${chartGraph.length}; testlets=${contexts.size}×4.`)
}

const overlap = [...promptSets[0]].filter(prompt => promptSets[1].has(prompt))
if (overlap.length) throw new Error(`UCAT QR Forms 1 and 2 share ${overlap.length} prompt(s); expected zero overlap.`)
const contextOverlap = [...contextSets[0]].filter(context => contextSets[1].has(context))
if (contextOverlap.length) throw new Error(`UCAT QR Forms 1 and 2 share ${contextOverlap.length} data testlet(s); expected disjoint testlets.`)

console.log("PASS: both UCAT QR forms preserve 36 questions/26 minutes, use nine disjoint four-item data testlets and maintain a strong chart/graph majority.")
