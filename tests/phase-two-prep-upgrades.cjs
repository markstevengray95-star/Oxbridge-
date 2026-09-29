const assert = require('node:assert/strict')
const fs = require('node:fs')

const targetedApi = fs.readFileSync('app/api/school-targeted/route.ts', 'utf8')
const classroom = fs.readFileSync('app/school-classroom/page.tsx', 'utf8')
const differentiation = fs.readFileSync('app/school-differentiation/page.tsx', 'utf8')
const mockReport = fs.readFileSync('app/mock-day-report/page.tsx', 'utf8')
const mockLayout = fs.readFileSync('app/mock-day/layout.tsx', 'utf8')
const repair = fs.readFileSync('app/mistake-repair-plan/page.tsx', 'utf8')
const mistakeLayout = fs.readFileSync('app/mistake-intelligence/layout.tsx', 'utf8')
const workback = fs.readFileSync('app/deadline-workback/page.tsx', 'utf8')
const deadlineLayout = fs.readFileSync('app/deadline-command-centre/layout.tsx', 'utf8')

// 5. Differentiated classroom work must be account-scoped, not merely labelled as differentiated.
assert.match(targetedApi, /target_user_id\.is\.null,target_user_id\.eq\.\$\{userId\}/)
assert.match(targetedApi, /Target student is not in this cohort/)
assert.match(targetedApi, /cohort\?\.owner_user_id !== userId/)
assert.match(targetedApi, /target_user_id: targetUserId/)
assert.match(classroom, /fetch\("\/api\/school-targeted"/)
assert.match(classroom, /Personalised/)
assert.match(differentiation, /createTargetedAssignment/)
assert.match(differentiation, /Assign personalised tasks/)

// 6. Mock Admissions Day must produce a saved evidence report and repair route.
assert.match(mockReport, /mockAdmissionsDays/)
assert.match(mockReport, /reasoningMarkers/)
assert.match(mockReport, /End-of-day reflection/)
assert.match(mockReport, /\/interview-replay/)
assert.match(mockReport, /\/digital-twin/)
assert.match(mockLayout, /\/mock-day-report/)

// 7. Mistake Intelligence must close the loop with replay, transfer and fresh-paper verification.
assert.match(repair, /baselineRate/)
assert.match(repair, /Replay an old error/)
assert.match(repair, /Test the skill in a changed context/)
assert.match(repair, /Verify on the next full paper/)
assert.match(repair, /\/adaptive-paper/)
assert.match(repair, /\/full-papers/)
assert.match(mistakeLayout, /\/mistake-repair-plan/)

// 8. Deadline work-back checkpoints must remain separate from official deadlines.
for (const days of [28, 14, 7, 2]) assert.match(workback, new RegExp(`days: ${days}`))
assert.match(workback, /ScholarBridge planning checkpoint derived from the official milestone, not a university deadline/)
assert.match(workback, /CUSTOM_KEY = "oxbridge-custom-deadlines-v1"/)
assert.match(workback, /category: "Personal"/)
assert.match(deadlineLayout, /\/deadline-workback/)

console.log('PASS: differentiated classroom privacy, mock-day evidence, mistake repair loop and deadline work-back planning are integrated')
