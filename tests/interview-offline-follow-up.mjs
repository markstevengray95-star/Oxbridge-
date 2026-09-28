import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
function load(relativePath, imports = {}) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function("exports", "require", code)(exports, name => {
    if (name in imports) return imports[name]
    throw new Error(`Unexpected import ${name}`)
  })
  return exports
}

const quality = load("lib/interview-answer-quality.ts")
const { offlineInterviewFollowUp } = load("lib/interview-offline-follow-up.ts", { "@/lib/interview-answer-quality": quality })
const { realisticInterviewQuestions } = load("lib/realistic-interview-bank.ts")
const scenario = realisticInterviewQuestions.find(question => question.id === "rx-physical-2")
const shared = {
  question: scenario.prompt,
  concepts: scenario.concepts,
  referenceAnswer: scenario.strongAnswer,
  probes: scenario.probes,
  persona: "Socratic",
}

const vague = offlineInterviewFollowUp({ ...shared, answer: "I don't know", turns: [
  { role: "interviewer", text: scenario.prompt },
  { role: "candidate", text: "I don't know" },
] })
assert.equal(vague.classification, "vague")
assert.ok(!scenario.probes.includes(vague.reply), "A stuck candidate needs a repair question before a harder subject probe")

const answer = "Both blocks can begin at the same temperature. Metal feels colder because it transfers energy from my hand faster than wood; I would measure their temperatures before contact."
const first = offlineInterviewFollowUp({ ...shared, answer, turns: [
  { role: "interviewer", text: scenario.prompt },
  { role: "candidate", text: answer },
] })
assert.equal(first.classification, "responsive")
assert.equal(first.reply, scenario.probes[0])

const second = offlineInterviewFollowUp({ ...shared, question: scenario.probes[0], answer, turns: [
  { role: "interviewer", text: scenario.prompt },
  { role: "candidate", text: answer },
  { role: "interviewer", text: scenario.probes[0] },
  { role: "candidate", text: answer },
] })
assert.notEqual(second.reply, scenario.probes[0], "An offline follow-up must not repeat an already asked probe")
console.log("PASS: offline interviews repair vague answers, advance responsive answers and avoid repeated probes")
