const assert = require('node:assert/strict')
const fs = require('node:fs')

const config = fs.readFileSync('lib/supabase/config.ts', 'utf8')
const sync = fs.readFileSync('components/cloud-progress-sync.tsx', 'utf8')

assert.match(config, /emjmvgginijkupwuflla\.supabase\.co/)
assert.match(config, /NEXT_PUBLIC_SUPABASE_URL/)
assert.match(sync, /APP_STATE_PREFIX = "oxbridge-"/)
assert.match(sync, /SYNC_BASELINE_KEY/)
assert.match(sync, /user_state/)
assert.match(sync, /interview_sessions/)
assert.match(sync, /interview_turns/)
assert.match(sync, /memory_items/)
assert.match(sync, /localDeletedSinceSync/)

console.log('PASS: active Supabase project, generic app-state sync, persistent offline baseline, and structured interview mirrors are wired')
