import assert from "node:assert/strict"
import fs from "node:fs"
import ts from "typescript"

const source = fs.readFileSync(new URL("../lib/interview-structure.ts", import.meta.url), "utf8")
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
new Function("exports", code)(exports)
const { interviewStageForTurns } = exports

const answer = quality => ({ role: "candidate", quality })
assert.equal(interviewStageForTurns([]).id, "approach")
assert.equal(interviewStageForTurns([answer("incorrect"), answer("vague")]).id, "approach")
assert.equal(interviewStageForTurns([answer("responsive")]).id, "test")
assert.equal(interviewStageForTurns([answer("responsive"), answer("partial"), answer("responsive")]).id, "change")
assert.equal(interviewStageForTurns([answer("responsive"), answer("responsive"), answer("responsive")]).id, "synthesis")
assert.equal(interviewStageForTurns(Array.from({ length: 9 }, () => answer("responsive"))).progress, 100)
console.log("PASS: interview stages advance on responsive reasoning and hold when a claim needs repair")
