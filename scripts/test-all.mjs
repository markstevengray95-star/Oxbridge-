import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const files = readdirSync(new URL('../tests/', import.meta.url)).filter(name => /\.(cjs|mjs)$/.test(name)).sort()
let failed = 0
for (const file of files) {
  const result = spawnSync(process.execPath, [`tests/${file}`], { stdio: 'inherit' })
  if (result.error) console.error(result.error)
  if (result.status !== 0) { failed++; console.error(`FAILED: ${file}`) }
}
console.log(`${files.length - failed}/${files.length} test suites passed`)
if (failed) process.exitCode = 1
