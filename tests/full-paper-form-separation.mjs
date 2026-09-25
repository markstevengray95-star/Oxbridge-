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
  throw new Error(`Unsupported runtime import in paper regression test: ${specifier}`)
}

function loadTs(file) {
  if (cache.has(file)) return cache.get(file).exports
  const source = fs.readFileSync(file, "utf8")
  const { outputText, diagnostics = [] } = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
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
if (typeof buildFullPaper !== "function") throw new Error("Could not load buildFullPaper.")

function signature(prompt) {
  return prompt.toLowerCase().replace(/\d+(?:\.\d+)?/g, "#").replace(/[^a-z#]+/g, " ").replace(/\s+/g, " ").trim()
}

function mcqs(paper) {
  return paper.sections.filter(section => section.kind === "mcq").flatMap(section => section.questions)
}

function assertPaperUnique(paper) {
  const questions = mcqs(paper)
  const ids = new Set(questions.map(question => question.id))
  const prompts = new Set(questions.map(question => signature(question.prompt)))
  if (ids.size !== questions.length) throw new Error(`${paper.id} contains duplicate question ids.`)
  if (prompts.size !== questions.length) throw new Error(`${paper.id} contains duplicate prompt structures.`)
}

function assertFormsDisjoint(form1, form2, label) {
  const firstSignatures = new Set(mcqs(form1).map(question => signature(question.prompt)))
  const overlaps = mcqs(form2).filter(question => firstSignatures.has(signature(question.prompt)))
  if (overlaps.length) throw new Error(`${label} Forms 1 and 2 overlap on ${overlaps.length} MCQ prompt structure(s): ${overlaps.slice(0, 5).map(question => question.id).join(", ")}`)
}

function passagePrefix(prompt) {
  return prompt.split(/\n\s*\n/)[0].trim()
}

function assertLnatStructure(paper) {
  const section = paper.sections.find(item => item.id === "section-a")
  if (!section || section.questions.length !== 42) throw new Error(`${paper.id} must contain 42 LNAT Section A questions.`)
  const counts = new Map()
  for (const question of section.questions) {
    const key = passagePrefix(question.prompt)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  if (counts.size !== 12) throw new Error(`${paper.id} must contain 12 LNAT passages; found ${counts.size}.`)
  const sizes = [...counts.values()]
  if (!sizes.every(size => size === 3 || size === 4)) throw new Error(`${paper.id} has an LNAT passage with a question count other than 3 or 4: ${sizes.join(",")}.`)
  if (sizes.reduce((sum, size) => sum + size, 0) !== 42) throw new Error(`${paper.id} LNAT passage question counts do not total 42.`)
}

function assertUcatVrStructure(paper) {
  const section = paper.sections.find(item => item.id === "vr")
  if (!section || section.questions.length !== 44) throw new Error(`${paper.id} must contain 44 UCAT VR questions.`)
  const counts = new Map()
  for (const question of section.questions) {
    const key = passagePrefix(question.prompt)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  if (counts.size !== 11) throw new Error(`${paper.id} must contain 11 UCAT VR passages; found ${counts.size}.`)
  if (![...counts.values()].every(size => size === 4)) throw new Error(`${paper.id} must contain four questions per UCAT VR passage.`)
}

for (const test of ["TMUA", "TARA", "LNAT", "UCAT"]) {
  const form1 = buildFullPaper(test, 1)
  const form2 = buildFullPaper(test, 2)
  assertPaperUnique(form1)
  assertPaperUnique(form2)
  assertFormsDisjoint(form1, form2, test)
  if (test === "LNAT") { assertLnatStructure(form1); assertLnatStructure(form2) }
  if (test === "UCAT") { assertUcatVrStructure(form1); assertUcatVrStructure(form2) }
  console.log(`${test}: Forms 1 and 2 are structurally unique and have zero MCQ prompt overlap.`)
}

const options = ["Mathematics 2", "Physics", "Chemistry", "Biology"]
for (let a = 0; a < options.length; a++) {
  for (let b = a + 1; b < options.length; b++) {
    const modules = ["Mathematics 1", options[a], options[b]]
    const form1 = buildFullPaper("ESAT", 1, modules)
    const form2 = buildFullPaper("ESAT", 2, modules)
    assertPaperUnique(form1)
    assertPaperUnique(form2)
    assertFormsDisjoint(form1, form2, `ESAT ${modules.join(" + ")}`)
    for (const paper of [form1, form2]) {
      const sections = paper.sections.filter(section => section.kind === "mcq")
      if (sections.length !== 3 || sections.some(section => section.questions.length !== 27)) {
        throw new Error(`${paper.id} must contain three 27-question ESAT modules.`)
      }
    }
  }
}

console.log("PASS: all full-paper forms are distinct; LNAT and UCAT VR preserve official-style passage grouping.")
