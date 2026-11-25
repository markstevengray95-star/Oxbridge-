#!/usr/bin/env node
/**
 * Phase 10 FELLOW release gate: static checks always; optional production
 * environment + live smoke checks when explicitly requested by the operator.
 * Never print environment variable values or tokens.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import process from "node:process"

const checks = []
const root = process.cwd()
function check(name, ok, reason) {
  checks.push({ name, ok: Boolean(ok), reason })
}
function read(relative) {
  return readFileSync(resolve(root, relative), "utf8")
}
function json(relative) {
  return JSON.parse(read(relative))
}
function versionAtLeast(value, threshold) {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+$/.test(value)) return false
  const one = value.split(".").map(Number), two = threshold.split(".").map(Number)
  for (let i = 0; i < 3; i++) {
    if (one[i] > two[i]) return true
    if (one[i] < two[i]) return false
  }
  return true
}
function staticChecks() {
  const pkg = json("package.json")
  const lock = json("package-lock.json")
  const packages = lock.packages ?? {}
  const locked = (name) => packages["node_modules/" + name]?.version
  check("Pinned, patched Next.js",versionAtLeast(pkg.dependencies?.next,"16.4.6")&&versionAtLeast(locked("next"),"16.4.6"),"Next.js must be at least 16.4.6 in both manifest and lockfile")
  check("Patched Zod schema validator",versionAtLeast(pkg.dependencies?.zod,"4.6.6")&&versionAtLeast(locked("zod"),"4.6.6"),"Zod must be at least 4.6.6; migration requires writing-validation tests")
  check("Patched Sharp dependency",versionAtLeast(locked("sharp"),"0.35.5")&&pkg.overrides?.miniflare?.sharp==="0.35.5","Sharp must be patched in the dependency tree")
  check("Patched source-map dependency",versionAtLeast(locked("source-map-js"),"1.2.2"),"source-map-js must be patched in the dependency tree")
  check("Manifest and lockfile agree",pkg.dependencies?.next===packages[""]?.dependencies?.next&&pkg.dependencies?.zod===packages[""]?.dependencies?.zod,"Keep lockfile in sync: npm ci must succeed")
  const securityCI = read(".github/workflows/security-audit.yml")
  check("Production npm audit enforced",securityCI.includes("npm audit --omit=dev --audit-level=high")&&securityCI.includes("npm ci --legacy-peer-deps"),"CI must block high or critical production advisories")
  const migration=read("supabase/migrations/20261124_fellow_school_tracking_events_and_access_audit.sql")
  check("Student activity table is private",/alter table public\.fellow_learning_activity_events enable row level security/.test(migration)&&/revoke all on table public\.fellow_learning_activity_events from public,anon,authenticated/.test(migration),"Prevent direct client reads and writes of activity")
  check("School access audit table is private",/alter table public\.fellow_school_student_access_audit enable row level security/.test(migration)&&/revoke all on table public\.fellow_school_student_access_audit from public,anon,authenticated/.test(migration),"Access records must remain service-only")
  const detail = read("app/api/teacher/student-detail/route.ts")
  check("Detailed teacher reads are scoped and audited",detail.includes("authorizeSchoolStudentDetail(admin,scope,target)")&&detail.includes("fellow_school_student_access_audit")&&detail.includes("if(audit.error)return error"),"Fail closed when a school student or access audit is invalid")
  const cloud=read("components/cloud-progress-sync.tsx")
  check("Gemini Live cloud history handles missing mock metadata",cloud.includes("Number(mock?.elapsedSeconds)"),"Missing mock metadata must not break a production build")
  const telemetry = read("components/orbits-telemetry.tsx")
  check("App telemetry strips sensitive URL details",telemetry.includes("schoolSafePagePath(pathname)")&&!telemetry.includes("location.pathname + location.search"),"Do not send query strings or student IDs to telemetry")
  const newRoutes=["app/api/assessment-report/route.ts","app/api/academic-coach/route.ts"]
  for(const route of newRoutes){const source=read(route);check("Private academic records: "+route,source.includes("auth.getUser()")&&source.includes('.eq("user_id",auth.user.id)')&&source.includes("no-store"),"Keep account identity verified, records scoped and private responses uncached")}
  const school=read("app/api/school/route.ts")
  check("School mutation origin and input checks",school.includes('request.headers.get("origin")!==new URL(request.url).origin')&&school.includes("Array.isArray(body)")&&school.includes('membership?.role!=="student"'),"Reject untrusted mutation payloads and enforce student membership")
  const pathway=read("lib/preparation-pathway.ts")
  check("Entry-year requirement freshness",pathway.includes("unverified-year")&&pathway.includes("review-due"),"Do not reuse outdated deadlines for future admission cycles")
  check("Phase 11–15 regression suites registered",["test:academic-coach","test:exam-session-quality","test:interview-realism-phase13","test:assessment-intelligence","test:schools-pathways"].every(name=>pkg.scripts?.[name]&&pkg.scripts?.prebuild?.includes(name)),"All new feature suites must run before build")
  check("School tracking and Phase 8 are regression tested",pkg.scripts?.["test:school-tracking"]&&pkg.scripts?.["test:interview-feedback-intelligence"],"Keep both tracking/privacy and feedback checks in CI")
}
function envChecks() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_EMAILS",
    "GEMINI_API_KEY",
    "NEXT_PUBLIC_DATA_CONTROLLER_NAME",
    "NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS",
    "NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL",
    "NEXT_PUBLIC_SUPPORT_EMAIL",
  ]
  for(const name of required) {
    const valid=typeof process.env[name]==="string"&&process.env[name].trim().length>0
    check("Production configuration: "+name,valid,"Required production setting is missing or blank")
  }
  check("No test login bypass enabled",process.env.E2E_TEST_MODE!=="1","E2E_TEST_MODE must never be 1 on a public deployment")
  check("No leaked secret in public environment keys",!Object.keys(process.env).some(name=>name.startsWith("NEXT_PUBLIC_")&&/(?:SERVICE_ROLE|SECRET_KEY|API_KEY|PASSWORD|PRIVATE_KEY)/.test(name)&&!["NEXT_PUBLIC_SUPABASE_ANON_KEY","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"].includes(name)),"Do not expose privileged credentials via NEXT_PUBLIC_")
}
async function smoke(base) {
  let url
  try{url=new URL(base);if(!["https:","http:"].includes(url.protocol))throw Error("Unsupported protocol")}
  catch {check("Valid smoke-test URL",false,"Supply a complete http(s) URL");return}
  for(const route of ["/api/health","/privacy","/terms","/support","/safeguarding"]){
    try{
      const response=await fetch(new URL(route,url),{redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(12000)})
      const healthy=response.status>=200&&response.status<300
      check("Live "+route,healthy,"Expected a public HTTP 2xx response; got "+response.status)
      if(route==="/api/health"&&healthy){
        let body
        try{body=await response.json()}catch{}
        check("Live health contract",body?.status==="ok","Health endpoint must return status: ok")
        check("Live health no-store",/no-store/i.test(response.headers.get("cache-control")||""),"Health endpoint must not be cached")
      }
    }catch{
      check("Live "+route,false,"Endpoint not reachable or timed out")
    }
  }
  try{
    const response=await fetch(new URL("/api/teacher/student-detail?studentId=00000000-0000-4000-8000-000000000000",url),{redirect:"manual",signal:AbortSignal.timeout(12000)})
    check("Anonymous school-detail API locked",response.status===401||response.status===403,"Anonymous users must not read protected school data")
  }catch{check("Anonymous school-detail API locked",false,"Could not check anonymous access")}
  for(const route of ["/api/assessment-report","/api/academic-coach","/api/school","/api/school-targeted","/api/privacy/export"]){
    try{
      const response=await fetch(new URL(route,url),{redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(12000)})
      check("Anonymous access denied: "+route,response.status===401||response.status===403,"Expected explicit 401 or 403; got "+response.status)
    }catch{check("Anonymous access denied: "+route,false,"Protected endpoint not reachable")}
  }
}
staticChecks()
if(process.argv.includes("--strict-env"))envChecks()
const liveArg=process.argv.find(arg=>arg.startsWith("--live-url="))
if(liveArg)await smoke(liveArg.slice("--live-url=".length))
for(const item of checks){
  console.log((item.ok?"PASS":"FAIL")+" "+item.name+(item.ok?"":": "+item.reason))
}
const failed=checks.filter(item=>!item.ok)
console.log("FELLOW RELEASE GATE "+(failed.length?"BLOCKED":"PASSED")+" — "+(checks.length-failed.length)+"/"+checks.length+" checks")
if(failed.length)process.exitCode=1
