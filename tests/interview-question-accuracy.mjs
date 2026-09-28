import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"

const source = fs.readFileSync(new URL("../lib/realistic-interview-bank.ts", import.meta.url), "utf8")
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
new Function("exports", code)(exports)
const { realisticInterviewQuestions: questions } = exports
const find = id => questions.find(question => question.id === id)
assert.ok(questions.length >= 56, "The interview bank should include 14 course-linked scenarios")
assert.equal(new Set(questions.map(question => question.prompt)).size, questions.length, "Opening prompts must be distinct")

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

const tracks = ["maths", "physical", "life", "law", "humanities", "economics", "languages"]
assert.equal(new Set(questions.map(question => question.id)).size, questions.length)
for (const track of tracks) {
  const trackQuestions = questions.filter(question => question.track === track)
  assert.ok(trackQuestions.length >= 6, `${track} should offer at least six scenarios`)
  assert.ok(trackQuestions.filter(question => question.difficulty === "Foundation").length >= 2, `${track} should offer at least two entry points`)
  assert.ok(trackQuestions.filter(question => question.difficulty === "Challenge").length >= 2, `${track} should offer at least two challenge scenarios`)
  for (const question of trackQuestions) {
    assert.ok(question.probes.length >= 4, `${question.id} needs staged probes`)
    assert.ok(question.strongAnswer.length > 100, `${question.id} needs reference reasoning`)
  }
}

const handshake = find("rx-maths-5")
assert.match(handshake.strongAnswer, /14 handshakes/)
assert.equal(6 * 5 / 2 - 1, 14)
assert.equal((2 * 14) % 6, 4)

const cafe = find("rx-econ-5")
assert.match(cafe.strongAnswer, /167 coffees/)
assert.equal(100 * (4 - 1.5), 250)
assert.equal(130 * (3 - 1.5), 195)
assert.equal(Math.floor(250 / (3 - 1.5)) + 1, 167)

const counters = find("rx-maths-6")
assert.match(counters.strongAnswer, /take two, leaving 18/)
for (let remaining = 3; remaining <= 21; remaining += 3) {
  assert.ok([1, 2].every(take => (remaining - take) % 3 !== 0))
}

const carts = find("rx-physical-6")
assert.match(carts.strongAnswer, /1 m\/s/)
assert.equal(1 * 2 / 2, 1)
assert.equal(0.5 * 1 * 2 ** 2 - 0.5 * 2 * 1 ** 2, 1)

const medicine = find("rx-med-1")
assert.ok(medicine.courses.includes("Medicine"))
assert.match(medicine.strongAnswer, /8\.3%/)
assert.ok(Math.abs(9 / (9 + 99) - 1 / 12) < 0.0001)
assert.ok(find("rx-cs-1").courses.includes("Computer Science"))
assert.ok(find("rx-chem-1").courses.includes("Chemistry"))
assert.ok(find("rx-engineering-1").courses.includes("Engineering"))
assert.ok(find("rx-psych-1").courses.includes("Psychology"))
assert.ok(find("rx-geography-1").courses.includes("Geography"))
assert.ok(find("rx-linguistics-1").courses.includes("Linguistics"))
assert.match(find("rx-engineering-1").strongAnswer, /W\/4/)
assert.ok(2 ** 6 < 100 && 2 ** 7 >= 100)
console.log("PASS: seven tracks contain staged questions; quantitative answers and course-linked scenarios are consistent")
