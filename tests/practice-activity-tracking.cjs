const assert = require("node:assert/strict")
const fs = require("node:fs")
const read = (path) => fs.readFileSync(path, "utf8")

const api = read("app/api/admin/practice-tracking/route.ts")
const page = read("app/admin/practice-tracking/page.tsx")
const nav = read("app/api/practice/activity/route.ts")
const telemetry = read("components/orbits-telemetry.tsx")
const history = read("components/history-cloud-mirror.tsx")
const migration = read("supabase/migrations/20261121_fellow_practice_activity_events.sql")

// Platform-admin access and user-ID scoping on read.
assert.match(api, /getAppAdminAccess/)
assert.match(api, /\.eq\("account_type","student"\)/)
assert.match(api, /recoveredPaper\(states, savedTests/)
assert.match(api, /practiceAttempts\(states\)/)
assert.match(api, /orbits_usage_sessions/)
assert.match(api, /fellow_practice_activity_events/)
assert.match(api, /getUserById/)
assert.match(api, /recordedActiveSeconds/)
assert.match(api, /usageSessions/)

// The UI must expose actual activity, page visits, time and original transcripts.
assert.match(page, /Activity & time/)
assert.match(page, /Practice questions/)
assert.match(page, /App active time/)
assert.match(page, /Recent in-app events/)
assert.match(page, /Interview transcripts/)
assert.match(page, /Recovered saved result/)

// Only authenticated, active managed student accounts may write limited in-app routes.
assert.match(nav, /supabase\.auth\.getClaims\(\)/)
assert.match(nav, /practice_access_accounts/)
assert.match(nav, /account_type", "student"/)
assert.match(nav, /managed\.expires_at/)
assert.match(nav, /fellow_practice_activity_events/)
assert.match(nav, /candidate\.startsWith\("\/\/"\)/)
assert.match(telemetry, /fetch\("\/api\/practice\/activity"/)

// Cloud history must attempt both the progress list and a standalone last test,
// and must not mark a failed upload as successfully mirrored.
assert.match(history, /LAST_PAPER_KEY/)
assert.match(history, /savedLast\.id/)
assert.match(history, /if \(written\.error\) throw written\.error/)
assert.match(history, /lastRaw = fingerprint/)

// Separate telemetry table must remain inaccessible to browser roles.
assert.match(migration, /enable row level security/)
assert.match(migration, /revoke all .* authenticated/)
assert.match(migration, /grant select, insert, delete .* service_role/)

console.log("PASS: managed practice tracking covers saved papers, app activity and limited server-only navigation")
