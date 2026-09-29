const assert = require('node:assert/strict')
const fs = require('node:fs')

const guard = fs.readFileSync('lib/ai/request-guard.ts', 'utf8')
const proxy = fs.readFileSync('lib/supabase/proxy.ts', 'utf8')
const migration = fs.readFileSync('supabase/migrations/20260929_add_ai_request_rate_limits.sql', 'utf8')

for (const route of [
  '/api/essay-analysis',
  '/api/interview-turn',
  '/api/interview-feedback',
  '/api/personal-tutor',
  '/api/personalised-question',
  '/api/question-mutate',
]) {
  assert.ok(guard.includes(`"${route}"`), `AI request guard lost ${route}`)
}

for (const tier of ['anonymous', 'free', 'pro', 'school', 'practice', 'admin']) {
  assert.match(guard, new RegExp(`${tier}: \\{ burstLimit:`), `Missing ${tier} rate policy`)
}

assert.match(guard, /AI_RATE_LIMIT_SALT/)
assert.match(guard, /crypto\.subtle\.digest\("SHA-256"/)
assert.match(guard, /admin\.rpc\("guard_ai_request"/)
assert.match(proxy, /guardAiRequest\(\{pathname,headers:request\.headers,userId,tier:aiTier\}\)/)
assert.match(proxy, /status: unavailable\?503:429/)
assert.match(proxy, /"Retry-After"/)
assert.match(proxy, /"X-RateLimit-Hour-Remaining"/)

assert.match(migration, /create table if not exists public\.ai_request_buckets/)
assert.match(migration, /create table if not exists public\.ai_request_leases/)
assert.match(migration, /security definer/)
assert.match(migration, /revoke all on function public\.guard_ai_request[\s\S]*from public, anon, authenticated/)
assert.match(migration, /grant execute on function public\.guard_ai_request[\s\S]*to service_role/)
assert.match(migration, /v_active > p_concurrency_limit/)
assert.match(migration, /v_hour_count > p_hour_limit/)
assert.match(migration, /v_burst_count > p_burst_limit/)

console.log('PASS: tier-aware burst, hourly budget, anonymous hashing and parallel-request leases are wired')
