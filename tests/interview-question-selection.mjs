import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"

const source = fs.readFileSync(new URL("../lib/interview-question-selection.ts", import.meta.url), "utf8")
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
new Function("exports", code)(exports)
const { selectInterviewQuestion, recordInterviewQuestion } = exports

const questions = [
  { id: "physics-a" },
  { id: "physics-b" },
  { id: "chemistry-a", courses: ["Chemistry"] },
  { id: "medicine-a", courses: ["Medicine"] },
]
let seen = []
const chosen = []
for (let index = 0; index < 3; index++) {
  const question = selectInterviewQuestion(questions, "Physics", seen)
  chosen.push(question.id)
  seen = recordInterviewQuestion(seen, question.id)
}
assert.deepEqual(chosen, ["physics-a", "physics-b", "physics-a"])
assert.equal(selectInterviewQuestion(questions, "Chemistry", [])?.id, "chemistry-a")
assert.equal(selectInterviewQuestion(questions, "Chemistry", [], 1)?.id, "physics-a")
assert.equal(selectInterviewQuestion(questions, "Chemistry", ["physics-b", "physics-a"])?.id, "chemistry-a")
assert.equal(selectInterviewQuestion(questions, "Physics", ["physics-b", "physics-a"])?.id, "physics-a")
assert.equal(selectInterviewQuestion([], "Physics", []), undefined)
assert.deepEqual(recordInterviewQuestion(["a", "b", "c"], "b"), ["b", "a", "c"])
console.log("PASS: interview selection avoids repeats until eligible questions are exhausted and excludes other-course prompts")
