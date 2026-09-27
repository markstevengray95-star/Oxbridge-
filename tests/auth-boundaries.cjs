const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const { NextRequest, NextResponse } = require('next/server')

function load(file, mocks) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URL, require: name => {
    if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`)
    return mocks[name]
  } })
  return exports
}

const { safeLocalPath } = load('lib/auth/safe-path.ts', {})
for (const value of [null, 12, '//evil.example', '/\\evil.example', '/\t/evil.example', 'https://evil.example', 'javascript:alert(1)']) {
  assert.equal(safeLocalPath(value), '/post-login')
}
assert.equal(safeLocalPath('/tutor?tab=history#saved'), '/tutor?tab=history#saved')

let claims = null
let chosenPlan = false
const { updateSession } = load('lib/supabase/proxy.ts', {
  'next/server': { NextResponse },
  '@/lib/auth/admin-access': { isConfiguredAdminEmail: email => email === 'admin@example.test' },
  '@/lib/onboarding': { FREE_PLAN_COOKIE: 'free', PLAN_ONBOARDING_STATE_KEY: 'plan', onboardingCompleted: () => chosenPlan },
  '@/lib/supabase/config': { SUPABASE_URL: 'https://example.test', SUPABASE_PUBLISHABLE_KEY: 'test' },
  '@supabase/ssr': { createServerClient: (_url, _key, options) => ({
    auth: { getClaims: async () => {
      options.cookies.setAll([{ name: 'refreshed-session', value: 'fresh', options: { httpOnly: true, path: '/' } }], { 'Cache-Control': 'private, no-store' })
      options.cookies.setAll([{ name: 'second-cookie', value: 'second', options: { path: '/' } }], {})
      return { data: { claims } }
    } },
    from: () => ({ select() { return this }, eq() { return this }, async maybeSingle() { return { data: null } } }),
  }) },
})

async function main() {
  for (const path of ['/privacy', '/terms', '/cookies', '/safeguarding', '/login']) {
    const response = await updateSession(new NextRequest(`https://app.example${path}`))
    assert.equal(response.status, 200, path)
  }
  for (const path of ['/api/essay-analysis', '/api/natural-speech', '/api/interview-turn', '/api/analyse-working']) {
    assert.equal((await updateSession(new NextRequest(`https://app.example${path}`, { method: 'POST' }))).status, 401)
  }
  for (const path of ['/api/billing/webhook', '/api/cron/weekly-programmes']) {
    assert.equal((await updateSession(new NextRequest(`https://app.example${path}`))).status, 200)
  }
  claims = { sub: 'user-1', email: 'student@example.test' }
  for (const path of ['/', '/login', '/tutor', '/admin']) {
    const response = await updateSession(new NextRequest(`https://app.example${path}`))
    assert.equal(response.status, 307, path)
    assert.equal(response.cookies.get('refreshed-session')?.value, 'fresh', path)
    assert.equal(response.cookies.get('refreshed-session')?.httpOnly, true)
    assert.equal(response.cookies.get('second-cookie')?.value, 'second')
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
  }
  chosenPlan = true
  for (const path of ['/full-papers', '/school-dashboard']) {
    const response = await updateSession(new NextRequest(`https://app.example${path}`))
    assert.equal(response.status, 307)
    assert.equal(response.cookies.get('refreshed-session')?.value, 'fresh')
  }
  assert.equal((await updateSession(new NextRequest('https://app.example/api/essay-analysis'))).status, 200)
  const { GET } = load('app/auth/confirm/route.ts', {
    'next/server': { NextResponse },
    '@/lib/auth/safe-path': { safeLocalPath },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ error: null }) } }) },
  })
  const response = await GET(new NextRequest('https://app.example/auth/confirm?code=test&next=' + encodeURIComponent('/\\evil.example')))
  assert.equal(response.headers.get('location'), 'https://app.example/post-login')
  console.log('PASS: public policy access, API authentication, service exceptions, refreshed redirect cookies, and hostile redirect paths')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
