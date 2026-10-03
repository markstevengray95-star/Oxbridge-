const fs = require('node:fs')
const path = require('node:path')

const root = process.cwd()
const apiRoot = path.join(root, 'app', 'api')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

function source(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

function requireContains(text, tokens, label) {
  const ok = tokens.some(token => text.includes(token))
  if (!ok) throw new Error(`${label}: expected one of ${tokens.join(', ')}`)
}

function requireAll(text, tokens, label) {
  const missing = tokens.filter(token => !text.includes(token))
  if (missing.length) throw new Error(`${label}: missing ${missing.join(', ')}`)
}

const routes = walk(apiRoot)
  .filter(file => file.endsWith(`${path.sep}route.ts`))
  .map(file => path.relative(root, file).replaceAll(path.sep, '/'))
  .sort()

const privileged = routes.filter(rel => {
  const text = source(rel)
  return text.includes('createAdminClient') || text.includes('.auth.admin.') || text.includes('SUPABASE_SERVICE_ROLE_KEY')
})

const violations = []
for (const rel of privileged) {
  const text = source(rel)
  try {
    if (rel === 'app/api/billing/webhook/route.ts') {
      requireAll(text, [
        'stripe-signature',
        'constructEvent',
        'oxbridge_claim_stripe_webhook_event',
        'oxbridge_finish_stripe_webhook_event',
      ], rel)
      continue
    }

    if (rel === 'app/api/auth/practice-login/route.ts') {
      requireAll(text, [
        'USERNAME_PATTERN',
        'password.length < 8',
        'practice_access_accounts',
        'username_normalized',
        'account.active',
        'signInWithPassword',
        'e2eCredentialsMatch',
      ], `${rel} credential verification`)
      continue
    }

    if (rel.startsWith('app/api/admin/')) {
      requireContains(text, ['getAppAdminAccess', 'isConfiguredAdminEmail'], `${rel} admin authorization`)
      requireContains(text, ['getClaims(', 'requireAdmin'], `${rel} authenticated actor`)
      continue
    }

    if (rel.startsWith('app/api/cron/')) {
      requireContains(text, ['CRON_SECRET', 'cronSecret'], `${rel} cron secret`)
      requireContains(text, ['authorization', 'Authorization'], `${rel} cron authorization header`)
      continue
    }

    requireContains(
      text,
      ['getClaims(', 'currentUserId(', 'requireUser(', 'getAppAdminAccess(', 'requireAuthenticated', 'authenticatedUser'],
      `${rel} authenticated actor`,
    )

    if (/body\.(userId|user_id)/.test(text) && !rel.startsWith('app/api/school/')) {
      requireContains(text, ['=== userId', '!== userId', '.eq("user_id", userId)', ".eq('user_id', userId)"], `${rel} caller user-id ownership`)
    }
  } catch (error) {
    violations.push(error instanceof Error ? error.message : String(error))
  }
}

const highRiskChecks = [
  ['app/api/school/route.ts', ['currentUserId()', 'teacherOwns(', 'school_memberships', 'oxbridge_join_school_seat']],
  ['app/api/school-targeted/route.ts', ['hasSchoolAccess(', 'cohort?.owner_user_id !== userId', 'target_user_id', '.eq("user_id", targetUserId)']],
  ['app/api/school/analytics/route.ts', ['getClaims(', '.eq("owner_user_id", userId)', 'School owner access required']],
  ['app/api/billing/webhook/route.ts', ['constructEvent', 'oxbridge_claim_stripe_webhook_event', 'oxbridge_fulfill_live_credit_pack', 'checkout.session.async_payment_succeeded']],
  ['app/api/billing/checkout/route.ts', ['getClaims(', 'legalIdentityReady()', 'subscriptions.list({ customer: customerId, status: "all", limit: 1 })', 'trialDaysForTier(tier)', 'allow_promotion_codes: true']],
  ['app/api/billing/addon-checkout/route.ts', ['getClaims(']],
  ['app/api/billing/portal/route.ts', ['getClaims(']],
  ['app/api/billing/school-seats/route.ts', ['getClaims(']],
  ['app/api/privacy/export/route.ts', ['getClaims(', 'createAdminClient()', 'school_assignment_submissions', 'human_review_orders', 'usage_events']],
  ['app/api/privacy/delete-account/route.ts', ['getClaims(', 'stripe.subscriptions.cancel(', 'admin.auth.admin.deleteUser(userId)', 'schoolActionRequired']],
  ['app/api/privacy/request/route.ts', ['getClaims(']],
]

for (const [rel, tokens] of highRiskChecks) {
  const full = path.join(root, rel)
  if (!fs.existsSync(full)) {
    violations.push(`${rel}: expected high-risk route is missing`)
    continue
  }
  try { requireAll(source(rel), tokens, rel) }
  catch (error) { violations.push(error instanceof Error ? error.message : String(error)) }
}

const proxy = source('lib/supabase/proxy.ts')
for (const token of [
  'const PRO_API_ROUTES',
  'const SCHOOL_API_ROUTES',
  '"/api/essay-analysis"',
  '"/api/interview-feedback"',
  '"/api/weekly-programme"',
  '"/api/written-work-defence"',
  '"/api/school"',
  'requiredTier: apiRequiresSchool ? "school" : "pro"',
  'status: 401',
  'status: 403',
]) {
  if (!proxy.includes(token)) violations.push(`lib/supabase/proxy.ts paid API boundary: missing ${token}`)
}
if (!proxy.includes('apiRequiresSchool || apiRequiresPro')) violations.push('lib/supabase/proxy.ts: paid API entitlement boundary is not evaluated before provider work')
if (!proxy.includes('tier==="pro"||tier==="school"')) violations.push('lib/supabase/proxy.ts: Pro entitlement does not recognise active Pro/School tiers')
if (!proxy.includes('tier==="school"')) violations.push('lib/supabase/proxy.ts: School entitlement check is missing')

const plans = source('lib/billing/plans.ts')
for (const token of ['pro: 5', 'school: 7', 'trialDaysForTier']) {
  if (!plans.includes(token)) violations.push(`lib/billing/plans.ts trial policy: missing ${token}`)
}

const usage = source('lib/billing/usage.ts')
if (!usage.includes('oxbridge_reserve_gemini_minutes')) violations.push('lib/billing/usage.ts: Gemini reservations are not atomic')

const migration = source('supabase/migrations/20260929_harden_billing_school_authorization.sql')
for (const token of [
  'oxbridge_claim_stripe_webhook_event',
  'oxbridge_finish_stripe_webhook_event',
  'oxbridge_fulfill_live_credit_pack',
  'oxbridge_reserve_gemini_minutes',
  'oxbridge_join_school_seat',
  'alter table public.human_review_orders enable row level security',
  'revoke all on table public.human_review_orders from anon, authenticated',
]) {
  if (!migration.includes(token)) violations.push(`hardening migration: missing ${token}`)
}

if (violations.length) {
  console.error(`Privileged API authorization audit failed (${violations.length} issue${violations.length === 1 ? '' : 's'}):`)
  for (const violation of violations) console.error(` - ${violation}`)
  process.exit(1)
}

console.log(`Privileged API authorization audit passed: ${privileged.length} service/admin route(s) reviewed across ${routes.length} API route(s), including paid-tier API and billing/deletion lifecycle boundaries.`)
