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
  throw new Error(`Unsupported runtime import in UCAT SJT format audit: ${specifier}`)
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

function scenarioKey(question) {
  const match = question.id.match(/^(?:upgrade|uniq)-ucat-sjt-(\d+)-\d+$/)
  return match ? match[1] : null
}

function sameSet(actual, expected) {
  const a = [...actual].map(value => value.trim()).sort()
  const b = [...expected].map(value => value.trim()).sort()
  return a.length === b.length && a.every((value, index) => value === b[index])
}

const appropriatenessScale = [
  "A very appropriate thing to do",
  "Appropriate, but not ideal",
  "Inappropriate, but not awful",
  "A very inappropriate thing to do",
]
const importanceScale = [
  "Very important",
  "Important",
  "Of minor importance",
  "Not important at all",
]

const { buildFullPaper } = loadTs(path.join(root, "lib/full-paper-system.ts"))
const { ucatSjtOfficialFormatBank } = loadTs(path.join(root, "lib/ucat-sjt-official-format-bank.ts"))

if (!Array.isArray(ucatSjtOfficialFormatBank) || ucatSjtOfficialFormatBank.length !== 100) {
  throw new Error(`UCAT official-format SJT bank should contain 100 questions across 20 scenarios; found ${ucatSjtOfficialFormatBank?.length ?? 0}.`)
}

const sourceGroups = new Map()
for (const question of ucatSjtOfficialFormatBank) {
  const key = scenarioKey(question)
  if (!key) throw new Error(`Official-format SJT question has an ungroupable id: ${question.id}.`)
  const group = sourceGroups.get(key) ?? []
  group.push(question)
  sourceGroups.set(key, group)
}
if (sourceGroups.size !== 20) throw new Error(`UCAT official-format SJT bank should contain 20 scenarios; found ${sourceGroups.size}.`)
if ([...sourceGroups.values()].some(group => group.length !== 5)) throw new Error("Every UCAT official-format SJT source scenario must contain exactly five questions.")

for (const form of [1, 2]) {
  const paper = buildFullPaper("UCAT", form)
  const section = paper.sections.find(item => item.id === "sjt")
  if (!section || section.kind !== "mcq") throw new Error(`UCAT Form ${form} has no SJT MCQ section.`)
  if (section.durationMinutes !== 26 || section.questions.length !== 69) {
    throw new Error(`UCAT Form ${form} SJT structure should be 69 questions in 26 minutes; found ${section.questions.length} in ${section.durationMinutes}.`)
  }

  const groups = new Map()
  let appropriateness = 0
  let directSpeech = 0
  let importance = 0
  let mostLeast = 0

  for (const question of section.questions) {
    const key = scenarioKey(question)
    if (!key) throw new Error(`UCAT Form ${form} SJT question is not attached to a recognised scenario: ${question.id}.`)
    const group = groups.get(key) ?? []
    group.push(question)
    groups.set(key, group)

    if (/How appropriate is the following direct response\?/i.test(question.prompt)) {
      directSpeech += 1
      if (!sameSet(question.options, appropriatenessScale)) {
        throw new Error(`UCAT Form ${form} direct-speech rating ${question.id} does not preserve the four-category appropriateness scale.`)
      }
    } else if (/How appropriate is the following response\?/i.test(question.prompt)) {
      appropriateness += 1
      if (!sameSet(question.options, appropriatenessScale)) {
        throw new Error(`UCAT Form ${form} appropriateness rating ${question.id} does not preserve the four-category scale.`)
      }
    } else if (/How important is the following consideration/i.test(question.prompt)) {
      importance += 1
      if (!sameSet(question.options, importanceScale)) {
        throw new Error(`UCAT Form ${form} importance rating ${question.id} does not preserve the four-category importance scale.`)
      }
    } else if (/most and least appropriate actions/i.test(question.prompt)) {
      mostLeast += 1
      if (question.options.length !== 4 || question.options.some(option => !/Most appropriate:.*Least appropriate:/s.test(option))) {
        throw new Error(`UCAT Form ${form} most/least item ${question.id} is not represented as four complete most/least judgements.`)
      }
    }
  }

  if (groups.size !== 16) throw new Error(`UCAT Form ${form} SJT should contain 16 scenario groups; found ${groups.size}.`)
  for (const [key, group] of groups) {
    if (group.length < 3 || group.length > 6) throw new Error(`UCAT Form ${form} SJT scenario ${key} has ${group.length} questions; expected 3–6.`)
  }

  if (appropriateness < 4) throw new Error(`UCAT Form ${form} contains only ${appropriateness} standard appropriateness ratings; expected at least 4.`)
  if (directSpeech < 4) throw new Error(`UCAT Form ${form} contains only ${directSpeech} direct-speech appropriateness ratings; expected at least 4.`)
  if (importance < 8) throw new Error(`UCAT Form ${form} contains only ${importance} importance ratings; expected at least 8.`)
  if (mostLeast < 4) throw new Error(`UCAT Form ${form} contains only ${mostLeast} most/least items; expected at least 4.`)

  console.log(`UCAT SJT Form ${form}: scenarios=${groups.size}; appropriateness=${appropriateness}; direct-speech=${directSpeech}; importance=${importance}; most/least=${mostLeast}.`)
}

console.log("PASS: both UCAT SJT forms preserve 69 questions/26 minutes and contain a substantial mix of official-style appropriateness, direct-speech, importance and most/least judgements.")
