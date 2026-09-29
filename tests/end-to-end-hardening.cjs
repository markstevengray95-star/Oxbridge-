const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const proxy = fs.readFileSync('lib/supabase/proxy.ts', 'utf8')
const sync = fs.readFileSync('components/cloud-progress-sync.tsx', 'utf8')
const sw = fs.readFileSync('public/sw.js', 'utf8')
const offline = fs.readFileSync('public/offline.html', 'utf8')
const school = fs.readFileSync('app/api/school/route.ts', 'utf8')
const targeted = fs.readFileSync('app/api/school-targeted/route.ts', 'utf8')
const analytics = fs.readFileSync('app/api/school/analytics/route.ts', 'utf8')

// Every school/teacher page must be behind the School-plan gate.
const gatedDirectories = fs.readdirSync('app', { withFileTypes: true })
  .filter(entry => entry.isDirectory() && /^(school-|teacher-)/.test(entry.name))
  .filter(entry => fs.existsSync(path.join('app', entry.name, 'page.tsx')))
  .map(entry => `/${entry.name}`)

assert.ok(gatedDirectories.length >= 8, 'expected the current school and teacher workspace routes')
for (const route of gatedDirectories) {
  assert.ok(proxy.includes(`"${route}"`), `${route} must be listed in SCHOOL_ROUTES`)
}
for (const route of ['/human-review', '/human-interviewer']) {
  assert.ok(proxy.includes(`"${route}"`), `${route} must remain School-plan gated`)
}
assert.match(proxy, /"\/offline\.html"/)

// A failed first restore must not enable stale writes; it retries until a cloud baseline exists.
assert.match(sync, /let cloudReadyUserId: string \| null = null/)
assert.match(sync, /userId !== cloudReadyUserId/)
assert.match(sync, /cloudReadyUserId = null\n\s+window\.dispatchEvent\(new CustomEvent\("oxbridge-cloud-not-ready"/)
assert.match(sync, /Oxbridge cloud restore failed/)
assert.match(sync, /window\.setInterval\(\(\) => \{ if \(navigator\.onLine\) void initialise\(userId\) \}, 5000\)/)
assert.match(sync, /if \(userId !== cloudReadyUserId\) \{\n\s+await initialise\(userId\)/)

// Authenticated page HTML must never be persisted in the service-worker cache.
assert.match(sw, /const STATIC_SHELL=\['\/offline\.html','\/manifest\.webmanifest','\/favicon\.svg'\]/)
assert.doesNotMatch(sw, /student-home|teacher-coach|school-dashboard|school-classroom/)
assert.match(sw, /request\.mode==='navigate'/)
assert.match(sw, /fetch\(request\)\.catch\(\(\)=>caches\.match\('\/offline\.html'\)\)/)
assert.match(sw, /url\.pathname\.startsWith\('\/_next\/static\/'\)/)
assert.match(offline, /signed-in pages are not stored/i)

// Legacy school API must preserve the same per-student assignment privacy as the targeted API.
assert.match(school, /target_user_id,task_type,submission_required/)
assert.match(school, /\.or\(`target_user_id\.is\.null,target_user_id\.eq\.\$\{userId\}`\)/)
assert.match(school, /assignment\.target_user_id&&assignment\.target_user_id!==userId/)
assert.match(school, /This assignment is not assigned to your account/)
assert.match(school, /if\(body\.action==="joinCohort"\)\{if\(await tierFor\(admin,userId\)!=="school"\)/)

// Licence rosters and invite codes are owner-only; direct targeted API calls also require School access.
assert.match(school, /if\(!isOwner\)return\{\.\.\.org,join_code:"",isOwner:false,seatsUsed:0,seatsRemaining:0,members:\[\]\}/)
assert.match(targeted, /async function hasSchoolAccess/)
assert.match(targeted, /if \(!\(await hasSchoolAccess\(admin, userId\)\)\) return NextResponse\.json\(\{ error: "School plan required" \}, \{ status: 403 \}\)/)
assert.match(targeted, /target_user_id\.is\.null,target_user_id\.eq\.\$\{userId\}/)

// Teacher analytics must not count another learner's personalised task in this learner's completion denominator.
assert.match(analytics, /select\("id,cohort_id,target_user_id"\)/)
assert.match(analytics, /!assignment\.target_user_id \|\| assignment\.target_user_id === member\.user_id/)
assert.doesNotMatch(analytics, /assignmentsByCohort/)

console.log('PASS: cloud restore, private offline caching, School gates, roster privacy, targeted assignment isolation and analytics accuracy are hardened')
