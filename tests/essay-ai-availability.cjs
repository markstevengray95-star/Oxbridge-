const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')

const source = fs.readFileSync('lib/gemini/writing-model-fallback.ts', 'utf8')

function load(env = {}) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const moduleShim = { exports: {} }
  vm.runInNewContext(output, {
    exports: moduleShim.exports,
    module: moduleShim,
    process: { env },
    require,
  })
  return moduleShim.exports
}

const defaults = load({}).configuredWritingModels()
assert.equal(defaults[0], 'gemini-3.8-flash')
assert.ok(defaults.includes('gemini-3.7-flash'))
assert.ok(defaults.includes('gemini-3.6-flash'))

const liveGeneric = load({ GEMINI_MODEL: 'gemini-3.8-live' }).configuredWritingModels()
assert.equal(liveGeneric[0], 'gemini-3.8-flash', 'A generic Live model must not become the essay model.')
assert.ok(!liveGeneric.some(model => /live|native-audio/i.test(model)), 'Writing candidates must remain GenerateContent-compatible.')

const custom = load({
  GEMINI_WRITING_MODEL: 'models/gemini-3.7-flash',
  GEMINI_MODEL: 'gemini-3.8-live',
}).configuredWritingModels()
assert.equal(custom[0], 'gemini-3.7-flash')
assert.equal(new Set(custom).size, custom.length, 'Writing model candidates should be deduplicated.')

const textOverride = load({ GEMINI_TEXT_MODEL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash' }).configuredWritingModels()
assert.equal(textOverride[0], 'gemini-3.6-flash')

const route = fs.readFileSync('app/api/essay-analysis/route.ts', 'utf8')
assert.match(route, /getGeminiApiKeyCandidates\(\)/)
assert.doesNotMatch(route, /getGeminiApiKeyCandidates\(\)\[0\]/)
assert.match(route, /configuredWritingModels\(\)/)
assert.match(route, /for \(const model of models\)/)
assert.match(route, /for \(const key of keys\)/)
assert.match(route, /response\.status === 400 \|\| response\.status === 404/)
assert.match(route, /provider: "gemini"/)

console.log('PASS: essay AI review isolates writing models from Live configuration and retries compatible model/key candidates before offline fallback.')
