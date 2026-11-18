const assert = require("node:assert/strict")
const fs = require("node:fs")

const read = path => fs.readFileSync(path, "utf8")
const flag = read("lib/billing/plans.ts")
const proxy = read("lib/supabase/proxy.ts")
const login = read("app/post-login/page.tsx")
const signup = read("app/login/page.tsx")
const usage = read("lib/billing/usage.ts")
const school = read("app/api/school/route.ts")
const targeted = read("app/api/school-targeted/route.ts")
const weekly = read("app/api/weekly-programme/route.ts")
const cron = read("app/api/cron/weekly-programmes/route.ts")
const account = read("app/account/page.tsx")
const premium = read("app/premium/page.tsx")
const terms = read("app/terms/page.tsx")

assert.match(flag, /export const FREE_FULL_ACCESS = true\b/, "free full-access switch must be enabled")
assert.match(flag, /if \(FREE_FULL_ACCESS\) return "school"/, "effective tier must include all features")
assert.match(proxy, /if \(!userId\) return "free"[\s\S]*?if \(FREE_FULL_ACCESS\) return "school"/, "anonymous visitors must not inherit premium access")
assert.match(proxy, /if\(!FREE_FULL_ACCESS&&!isApi/, "onboarding and premium page gates must be disabled only during preview")
assert.match(proxy, /if \(!userId\) return NextResponse\.json/, "protected API endpoints must still authenticate users")
assert.match(proxy, /guardAiRequest\(/, "AI safety and request limiting must remain enabled")
assert.match(login, /isAdmin \|\| isPracticeAccount \|\| FREE_FULL_ACCESS/, "every signed-in user should bypass plan selection")
assert.match(signup, /full free access/, "signup experience must not advertise a paid plan")
assert.match(usage, /const paidTier = effectiveTier\(/, "usage tier must be derived from shared entitlement logic")
assert.match(usage, /oxbridge_reserve_gemini_minutes/, "atomic monthly Gemini Live limits must remain")
assert.match(school, /if\(body\.action==="createSchool"\)/, "users must be able to create a free school workspace")
assert.match(school, /teacherOwns\(/, "class editing should still require ownership")
assert.match(school, /if\(!isOwner\)return\{\.\.\.org,join_code:""/, "nonowners must not see private join codes or rosters")
assert.match(targeted, /if \(FREE_FULL_ACCESS\) return true/, "student and school features must be available to all accounts")
assert.match(targeted, /cohort\?\.owner_user_id !== userId/, "free access must not permit changes to another person's cohort")
assert.match(weekly, /if \(FREE_FULL_ACCESS\) return "school"/, "weekly programme must be accessible")
assert.match(cron, /if \(FREE_FULL_ACCESS\)/, "weekly refresh should include users with free accounts")
assert.match(account, /Free full access/, "account should display current access")
assert.match(account, /action="\/api\/billing\/portal"/, "preexisting subscriptions must remain manageable")
assert.match(premium, /All preparation features are included/, "pricing page should not present subscription checkout")
assert.match(terms, /Existing recurring Stripe subscriptions are not cancelled automatically/, "existing billing must be transparently disclosed")

for (const route of [
  "app/api/billing/checkout/route.ts",
  "app/api/billing/addon-checkout/route.ts",
  "app/api/billing/school-seats/route.ts",
]) {
  const source = read(route)
  assert.match(source, /if\s*\(FREE_FULL_ACCESS\)\s*return/, route + " must reject new payments before checkout")
  assert.ok(source.indexOf("if(FREE_FULL_ACCESS)") < 0 || source.indexOf("if(FREE_FULL_ACCESS)") < source.indexOf("supabase.functions.invoke"), route + " must block before calling billing service")
}
assert.match(read("app/live-credits/page.tsx"), /FREE_FULL_ACCESS/, "live credit sales should be hidden")
assert.match(read("app/expert-review/page.tsx"), /!FREE_FULL_ACCESS/, "paid human-review sales should be hidden")
assert.match(read("app/school-seats/page.tsx"), /!FREE_FULL_ACCESS/, "paid seat sales should be hidden")

console.log("PASS: registered accounts have all features while authentication, school privacy, AI fair-use limits, and existing billing controls remain protected.")
