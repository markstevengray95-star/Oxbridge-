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
  throw new Error(`Unsupported runtime import in ESAT topic audit: ${specifier}`)
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
const { esatCoverageTopics, esatCoverageTopic, esatCoverageCounts } = loadTs(path.join(root, "lib/esat-topic-coverage.ts"))
const { esatSpecificationExpansionBank } = loadTs(path.join(root, "lib/esat-spec-expansion.ts"))

if (typeof buildFullPaper !== "function") throw new Error("Could not load ESAT paper builder.")
if (esatSpecificationExpansionBank.length < 48) throw new Error(`ESAT specification expansion bank is unexpectedly small: ${esatSpecificationExpansionBank.length}.`)

const unclassifiedExpansion = esatSpecificationExpansionBank.filter(question => esatCoverageTopic(question) === "Other")
if (unclassifiedExpansion.length) {
  throw new Error(`ESAT expansion questions are not mapped to specification strands: ${unclassifiedExpansion.map(question => question.id).join(", ")}.`)
}

const modulePaperArgs = {
  "Mathematics 1": ["Mathematics 1", "Mathematics 2", "Physics"],
  "Mathematics 2": ["Mathematics 1", "Mathematics 2", "Physics"],
  Physics: ["Mathematics 1", "Mathematics 2", "Physics"],
  Chemistry: ["Mathematics 1", "Chemistry", "Biology"],
  Biology: ["Mathematics 1", "Chemistry", "Biology"],
}

function sectionFor(module, form) {
  const paper = buildFullPaper("ESAT", form, modulePaperArgs[module])
  const section = paper.sections.find(item => item.title === module)
  if (!section || section.kind !== "mcq") throw new Error(`ESAT Form ${form} is missing ${module}.`)
  if (section.durationMinutes !== 40) throw new Error(`ESAT ${module} Form ${form} must be 40 minutes.`)
  if (section.questions.length !== 27) throw new Error(`ESAT ${module} Form ${form} must contain 27 questions; found ${section.questions.length}.`)
  return section
}

for (const module of Object.keys(esatCoverageTopics)) {
  const byForm = new Map()
  for (const form of [1, 2]) {
    const section = sectionFor(module, form)
    const counts = esatCoverageCounts(section.questions)
    const missing = esatCoverageTopics[module].filter(topic => (counts.get(topic) ?? 0) === 0)
    if (missing.length) throw new Error(`ESAT ${module} Form ${form} misses specification breadth: ${missing.join(", ")}.`)

    const explicitlyClassified = section.questions.filter(question => esatCoverageTopic(question) !== "Other").length
    if (explicitlyClassified < esatCoverageTopics[module].length) {
      throw new Error(`ESAT ${module} Form ${form} has too few specification-classified questions: ${explicitlyClassified}/27.`)
    }

    byForm.set(form, section)
    console.log(`ESAT ${module} Form ${form}: ${esatCoverageTopics[module].map(topic => `${topic}=${counts.get(topic) ?? 0}`).join("; ")}; Other=${counts.get("Other") ?? 0}.`)
  }

  const form1 = byForm.get(1)
  const form2 = byForm.get(2)
  const ids1 = new Set(form1.questions.map(question => question.id))
  const overlapIds = form2.questions.filter(question => ids1.has(question.id)).map(question => question.id)
  if (overlapIds.length) throw new Error(`ESAT ${module} Forms 1 and 2 share question IDs: ${overlapIds.join(", ")}.`)

  const prompts1 = new Set(form1.questions.map(question => question.prompt.toLowerCase().replace(/\d+(?:\.\d+)?/g, "#").replace(/[^a-z#]+/g, " ").replace(/\s+/g, " ").trim()))
  const overlapPrompts = form2.questions.filter(question => prompts1.has(question.prompt.toLowerCase().replace(/\d+(?:\.\d+)?/g, "#").replace(/[^a-z#]+/g, " ").replace(/\s+/g, " ").trim()))
  if (overlapPrompts.length) throw new Error(`ESAT ${module} Forms 1 and 2 share prompt structures: ${overlapPrompts.map(question => question.id).join(", ")}.`)
}

console.log("PASS: both ESAT forms preserve 27-question/40-minute structure, cover every broad module strand, and remain disjoint across forms.")
