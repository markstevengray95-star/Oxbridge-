const assert = require('node:assert/strict')
const fs = require('node:fs')

const engine = fs.readFileSync('lib/application/personal-statement-analysis.ts', 'utf8')
const page = fs.readFileSync('app/personal-statement-map/page.tsx', 'utf8')
const audit = fs.readFileSync('components/application/personal-statement-audit.tsx', 'utf8')

// Current UCAS structure: three questions, 350-character minimum per answer, 4,000 total.
assert.match(engine, /UCAS_TOTAL_CHARACTER_LIMIT = 4000/)
assert.match(engine, /UCAS_MIN_SECTION_CHARACTERS = 350/)
for (const key of ['motivation', 'preparation', 'outside']) assert.match(engine, new RegExp(`key: "${key}"`))
assert.match(page, /UCAS_SECTIONS\.map/)
assert.match(page, /Question 1|section\.label/)
assert.match(page, /oxbridge-personal-statement-ucas-v3/)

// Claim -> evidence -> thinking -> development chain must remain explicit.
for (const stage of ['claim', 'evidence', 'thinking', 'development']) assert.match(engine, new RegExp(stage))
assert.match(engine, /claimDiagnosis/)
assert.match(engine, /Complete evidence chain/)
assert.match(engine, /Evidence is described but not analysed/)
assert.match(audit, /Claim → evidence → thinking → development/)

// Academic depth map must stay multidimensional and evidence-backed, not become a fake admissions score.
for (const label of ['Academic motivation', 'Independent exploration', 'Critical thinking', 'Intellectual development', 'Connections between ideas', 'Evidence depth', 'Precision and specificity', 'Course relevance']) {
  assert.match(engine, new RegExp(label))
}
assert.match(audit, /Evidence strength, not an admissions score/)
assert.match(page, /does not predict admission or imitate an admissions decision/)

// Course-specific criteria must retain official-source profiles for Physics, Medicine and Law,
// plus transparent general Oxford/Cambridge fallbacks for other courses.
for (const path of [
  'physics.ox.ac.uk/study/undergraduates/how-apply',
  'medsci.ox.ac.uk/study/medicine/pre-clinical/requirements/criteria',
  'law.ox.ac.uk/admissions/undergraduate/undergraduate-selection-criteria',
  'ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/ucas-application',
  'undergraduate.study.cam.ac.uk/apply/before/improve-application',
]) assert.match(engine, new RegExp(path.replaceAll('/', '\\/')))
assert.match(engine, /getCourseCriteria/)
assert.match(audit, /Course-specific criteria evidence/)
assert.match(audit, /No clear evidence found\. Do not manufacture evidence/)

// Existing application profile context and the detailed AI/offline writing review remain connected.
assert.match(page, /APPLICATION_KEY/)
assert.match(page, /ReviewPanel essay=\{combined\}/)
assert.match(page, /Open whole application profile/)

console.log('PASS: UCAS three-question audit, evidence chains, academic depth map and course-specific criteria are integrated')
