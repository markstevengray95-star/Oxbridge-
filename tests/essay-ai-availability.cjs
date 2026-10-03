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
assert.ok(defaults.includes('gemini-3.5-flash'))
assert.ok(defaults.includes('gemini-3.5-flash-lite'))

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
assert.match(route, /keyLoop: for \(const key of keys\)/)
assert.match(route, /const outputModes = \["structured", "json-only", "prompt-json"\] as const/)
assert.match(route, /responseFormat:\s*\{[\s\S]*text:\s*\{[\s\S]*mimeType:\s*"APPLICATION_JSON"[\s\S]*schema:\s*responseJsonSchema/)
assert.match(route, /responseMimeType:\s*"application\/json"/)
assert.match(route, /Return only one valid JSON object/)
assert.match(route, /maxOutputTokens:\s*20000/)
assert.doesNotMatch(route, /temperature:\s*[0-9.]+/)
assert.match(route, /response\.status >= 500\) lastFailure = "provider_unavailable"/)
assert.match(route, /The route retried with a simpler JSON mode and backup Gemini models/)
assert.match(route, /parseJsonOutput\(output\)/)
assert.match(route, /validateReport\(attached\.report, essay, mode\)/)
assert.match(route, /Offline writing review failed validation/)
assert.match(route, /keyVariablesDetected:\s*keys\.map/)
assert.match(route, /This \$\{environment\} deployment cannot see a Gemini API key/)
assert.match(route, /The Gemini API key is present, but Google rejected it/)
assert.match(route, /Gemini responded, but its report did not pass ScholarBridge's evidence\/JSON verification/)
assert.doesNotMatch(route, /key\.value[\s\S]*diagnostic\s*:/, 'Diagnostics must never expose the API key value.')
assert.match(route, /provider: "gemini"/)

console.log('PASS: essay AI review uses current Gemini structured output, plain-JSON compatibility retries, safe runtime diagnostics, multiple stable model fallbacks, scored-response validation, and offline fallback diagnostics.')
