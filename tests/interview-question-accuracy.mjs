import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"

const source = fs.readFileSync(new URL("../lib/realistic-interview-bank.ts", import.meta.url), "utf8")
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
new Function("exports", code)(exports)
const { realisticInterviewQuestions: questions } = exports
const find = id => questions.find(question => question.id === id)

const lights = find("rx-maths-2")
assert.match(lights.strongAnswer, /impossible/i)
let singleReachable = false
let oppositeReachable = false
for (let presses = 0; presses < 64; presses++) {
  let state = 0
  for (let switchIndex = 0; switchIndex < 6; switchIndex++) {
    if (!(presses & (1 << switchIndex))) continue
    for (const light of [(switchIndex + 5) % 6, switchIndex, (switchIndex + 1) % 6]) state ^= 1 << light
  }
  if (state !== 0 && (state & (state - 1)) === 0) singleReachable = true
  if (state === (1 << 0) + (1 << 3)) oppositeReachable = true
}
assert.equal(singleReachable, false)
assert.equal(oppositeReachable, true)

const polynomial = find("rx-maths-4")
assert.match(polynomial.strongAnswer, /x²\+2x\+2/)
const p = x => x * x + 2 * x + 2
assert.equal(p(0) % 2, 0)
assert.equal(p(1) % 2, 1)
for (let x = -100; x <= 100; x++) assert.ok(p(x) > 0)

const envelopes = find("rx-maths-3")
assert.match(envelopes.strongAnswer, /£12\.50/)
const values = [10, 20, 40]
const conditionalKeep = (values[0] + values[1]) / 2
const conditionalSwitch = ((values[1] + values[2]) / 2 + (values[0] + values[2]) / 2) / 2
assert.equal(conditionalSwitch - conditionalKeep, 12.5)
console.log("PASS: interview reference answers agree with reachable light states, the polynomial counterexample and conditional envelope values")
