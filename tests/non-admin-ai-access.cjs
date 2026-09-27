const assert = require('node:assert/strict')
const fs = require('node:fs')

const usage = fs.readFileSync('lib/billing/usage.ts', 'utf8')
const realtime = fs.readFileSync('app/api/realtime-session/route.ts', 'utf8')
const migration = fs.readFileSync('supabase/migrations/20260927_restore_usage_events_for_gemini.sql', 'utf8')
const envExample = fs.readFileSync('.env.example', 'utf8')
const supabaseConfig = fs.readFileSync('lib/supabase/config.ts', 'utf8')

assert.match(migration, /create table if not exists public\.usage_events/i)
assert.match(migration, /user_id uuid not null references auth\.users\(id\) on delete cascade/i)
assert.match(migration, /event_type text not null/i)
assert.match(migration, /quantity numeric not null/i)
assert.match(migration, /metadata jsonb not null/i)
assert.match(migration, /alter table public\.usage_events enable row level security/i)
assert.match(migration, /revoke all on table public\.usage_events from anon, authenticated/i)
assert.match(migration, /grant all on table public\.usage_events to service_role/i)

assert.match(usage, /admin\.from\("usage_events"\)/)
assert.match(usage, /assertUsageQuery\(baseEventsResult, "monthly Gemini usage"\)/)
assert.match(usage, /Could not reserve Gemini Live usage/)
assert.match(realtime, /reserveGeminiSession\(userId, email\)/)
assert.match(realtime, /AUTH_REQUIRED/)

const projectRef = 'emjmvgginijkupwuflla'
assert.match(envExample, new RegExp(`NEXT_PUBLIC_SUPABASE_URL=https://${projectRef}\\.supabase\\.co`))
assert.match(supabaseConfig, new RegExp(`https://${projectRef}\\.supabase\\.co`))

console.log('PASS: normal signed-in users have the required Gemini usage ledger schema and the public Supabase example matches the active app project')
