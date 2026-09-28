import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"

const source = fs.readFileSync(new URL("../lib/interview-question-selection.ts", import.meta.url), "utf8")
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
new Function("exports", code)(exports)
const { selectInterviewQuestion, recordInterviewQuestion } = exports
const bankSource = fs.readFileSync(new URL("../lib/realistic-interview-bank.ts", import.meta.url), "utf8")
const bankCode = ts.transpileModule(bankSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const bankExports = {}
new Function("exports", bankCode)(bankExports)

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
assert.equal(selectInterviewQuestion(questions, "Chemistry", [], 1)?.id, "chemistry-a")
assert.equal(selectInterviewQuestion(questions, "Chemistry", ["chemistry-a"])?.id, "physics-a")
assert.equal(selectInterviewQuestion(questions, "Chemistry", ["physics-b", "physics-a"])?.id, "chemistry-a")
assert.equal(selectInterviewQuestion(questions, "Physics", ["physics-b", "physics-a"])?.id, "physics-a")
assert.equal(selectInterviewQuestion([], "Physics", []), undefined)
assert.deepEqual(recordInterviewQuestion(["a", "b", "c"], "b"), ["b", "a", "c"])
const exhausted = ["physics-a", "physics-b"]
const initialAfterExhaustion = selectInterviewQuestion(questions, "Physics", exhausted)
const skippedHistory = recordInterviewQuestion(exhausted, initialAfterExhaustion.id)
assert.notEqual(selectInterviewQuestion(questions, "Physics", skippedHistory)?.id, initialAfterExhaustion.id)
for (const [track, course] of [["maths", "Computer Science"], ["physical", "Chemistry"], ["life", "Medicine"], ["humanities", "Geography"], ["languages", "Linguistics"]]) {
  const pool = bankExports.realisticInterviewQuestions.filter(question => question.track === track)
  const eligible = pool.filter(question => !question.courses || question.courses.includes(course))
  let history = []
  const selected = []
  for (let index = 0; index < eligible.length; index++) {
    const question = selectInterviewQuestion(pool, course, history)
    selected.push(question.id)
    history = recordInterviewQuestion(history, question.id)
  }
  assert.equal(new Set(selected).size, eligible.length, `${course} repeated a question before using its eligible pool`)
}
console.log("PASS: interview selection avoids repeats until eligible questions are exhausted and excludes other-course prompts")
