const assert = require('node:assert/strict')
const fs = require('node:fs')

const engine = fs.readFileSync('lib/application/personal-statement-analysis.ts', 'utf8')
const depthEngine = fs.readFileSync('lib/application/personal-statement-analysis-v3.ts', 'utf8')
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

// Step 5: supercurricular depth must reward analysis/development rather than raw activity count.
assert.match(depthEngine, /buildSupercurricular/)
assert.match(depthEngine, /depthScore/)
assert.match(depthEngine, /own analysis/)
assert.match(depthEngine, /next step shown/)
assert.match(audit, /5 · Supercurricular depth checker/)
assert.match(audit, /Depth matters more than quantity/)

// Step 6: the "so what?" detector must explicitly test reflection and intellectual follow-through.
assert.match(depthEngine, /buildSoWhat/)
assert.match(depthEngine, /needs reflection/)
assert.match(depthEngine, /needs development/)
assert.match(depthEngine, /What surprised you, changed your mind, or made you disagree/)
assert.match(depthEngine, /What unresolved question would you pursue/)
assert.match(audit, /6 · “So what\?” detector/)

// Step 7: academic journey should classify a sequence of source/argument/investigation/project/question nodes.
assert.match(depthEngine, /buildAcademicJourney/)
for (const stage of ['source', 'argument', 'investigation', 'project', 'question']) assert.match(depthEngine, new RegExp(`"${stage}"`))
assert.match(audit, /7 · Academic journey visualisation/)
assert.match(audit, /interest → source → competing idea → investigation\/project → unresolved question/)

// Step 8: every claim becomes interview pressure with a real handoff to the panel interview.
assert.match(depthEngine, /buildInterviewVulnerabilities/)
assert.match(depthEngine, /strongest counterargument, alternative interpretation or limitation/)
assert.match(audit, /8 · Interview Vulnerability Map/)
assert.match(audit, /oxbridge-panel-written-work-v1/)
assert.match(audit, /Personal statement vulnerability interview/)
assert.match(audit, /window\.location\.href = "\/panel-interview"/)

// Existing application profile context and the detailed AI/offline writing review remain connected.
assert.match(page, /APPLICATION_KEY/)
assert.match(page, /analysePersonalStatementV3/)
assert.match(page, /ReviewPanel essay=\{combined\}/)
assert.match(page, /Open whole application profile/)

console.log('PASS: personal statement analysis steps 1-8 and interview handoff are integrated')
