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
  throw new Error(`Unsupported runtime import in UCAT VR format audit: ${specifier}`)
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

function passageKey(question) {
  const upgraded = question.id.match(/^upgrade-ucat-vr-(\d+)-\d+$/)
  if (upgraded) return `upgrade-${upgraded[1]}`
  const reserve = question.id.match(/^uniq-ucat-vr-(?:support|beyond|attitude|info)-(\d+)$/)
  if (reserve) return `reserve-${reserve[1]}`
  return null
}

function sameSet(actual, expected) {
  const a = [...actual].map(value => value.trim()).sort()
  const b = [...expected].map(value => value.trim()).sort()
  return a.length === b.length && a.every((value, index) => value === b[index])
}

const tfctScale = ["True", "False", "Can't Tell"]
const { buildFullPaper } = loadTs(path.join(root, "lib/full-paper-system.ts"))
const { ucatVrMixedFormatBank } = loadTs(path.join(root, "lib/ucat-vr-mixed-format-bank.ts"))

if (!Array.isArray(ucatVrMixedFormatBank) || ucatVrMixedFormatBank.length < 88) {
  throw new Error(`UCAT mixed-format VR bank should contain at least 88 questions; found ${ucatVrMixedFormatBank?.length ?? 0}.`)
}

const sourceGroups = new Map()
const sourceAnswers = new Set()
for (const question of ucatVrMixedFormatBank) {
  const key = passageKey(question)
  if (!key) throw new Error(`Mixed-format VR question has an ungroupable id: ${question.id}.`)
  const group = sourceGroups.get(key) ?? []
  group.push(question)
  sourceGroups.set(key, group)
  if (question.options.length === 3) {
    if (!sameSet(question.options, tfctScale)) throw new Error(`Source TFCT item ${question.id} does not use exactly True / False / Can't Tell.`)
    sourceAnswers.add(question.options[question.answer])
  }
}

if (sourceGroups.size < 22) throw new Error(`UCAT mixed-format VR bank needs at least 22 passage groups for two disjoint forms; found ${sourceGroups.size}.`)
for (const [key, group] of sourceGroups) {
  if (group.length !== 4) throw new Error(`Mixed-format VR passage ${key} has ${group.length} questions; expected exactly four.`)
  if (group.filter(question => question.options.length === 3).length !== 1) {
    throw new Error(`Mixed-format VR passage ${key} should contain exactly one True/False/Can't Tell item.`)
  }
}
if (!["True", "False", "Can't Tell"].every(value => sourceAnswers.has(value))) {
  throw new Error(`Mixed-format VR source bank should exercise all three TFCT keys; found ${[...sourceAnswers].join(", ")}.`)
}

const promptsByForm = []
for (const form of [1, 2]) {
  const paper = buildFullPaper("UCAT", form)
  const section = paper.sections.find(item => item.id === "vr")
  if (!section || section.kind !== "mcq") throw new Error(`UCAT Form ${form} has no Verbal Reasoning MCQ section.`)
  if (section.durationMinutes !== 22 || section.questions.length !== 44) {
    throw new Error(`UCAT Form ${form} VR should be 44 questions in 22 minutes; found ${section.questions.length} in ${section.durationMinutes}.`)
  }

  const groups = new Map()
  let tfct = 0
  let fourOption = 0
  for (const question of section.questions) {
    const key = passageKey(question)
    if (!key) throw new Error(`UCAT Form ${form} VR question is not attached to a recognised passage: ${question.id}.`)
    const group = groups.get(key) ?? []
    group.push(question)
    groups.set(key, group)

    if (question.options.length === 3) {
      tfct += 1
      if (!sameSet(question.options, tfctScale)) {
        throw new Error(`UCAT Form ${form} TFCT item ${question.id} does not preserve the exact True / False / Can't Tell response set.`)
      }
      if (!/True, False or Can't Tell|True\/False\/Can't Tell/i.test(question.prompt)) {
        throw new Error(`UCAT Form ${form} three-option item ${question.id} is not explicitly presented as a True/False/Can't Tell judgement.`)
      }
    } else if (question.options.length === 4) {
      fourOption += 1
    } else {
      throw new Error(`UCAT Form ${form} VR item ${question.id} has ${question.options.length} options; expected three or four.`)
    }
  }

  if (groups.size !== 11) throw new Error(`UCAT Form ${form} VR should contain 11 passage groups; found ${groups.size}.`)
  for (const [key, group] of groups) {
    if (group.length !== 4) throw new Error(`UCAT Form ${form} passage ${key} contains ${group.length} questions instead of four.`)
  }
  if (tfct < 8) throw new Error(`UCAT Form ${form} contains only ${tfct} True/False/Can't Tell items; expected at least 8 for a substantial mixed-format simulation.`)
  if (fourOption < 24) throw new Error(`UCAT Form ${form} contains only ${fourOption} four-option VR items; expected a substantial multiple-choice component.`)

  promptsByForm.push(new Set(section.questions.map(question => question.prompt.trim().toLowerCase())))
  console.log(`UCAT VR Form ${form}: passages=${groups.size}; TFCT=${tfct}; four-option=${fourOption}.`)
}

const overlap = [...promptsByForm[0]].filter(prompt => promptsByForm[1].has(prompt))
if (overlap.length) throw new Error(`UCAT VR Forms 1 and 2 share ${overlap.length} question prompt(s); expected zero overlap.`)

console.log("PASS: both UCAT VR forms preserve 44 questions/22 minutes, 11 four-question passages, mixed four-option and True/False/Can't Tell formats, and zero cross-form prompt overlap.")
