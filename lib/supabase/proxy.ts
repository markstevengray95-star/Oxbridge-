import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { aiScopeForPath, guardAiRequest } from "@/lib/ai/request-guard"
import { isConfiguredAdminEmail } from "@/lib/auth/admin-access"
import { E2E_SESSION_COOKIE, E2E_USER_EMAIL, E2E_USER_ID, e2eSessionActive } from "@/lib/auth/e2e-session"
import { FREE_PLAN_COOKIE, PLAN_ONBOARDING_STATE_KEY, onboardingCompleted } from "@/lib/onboarding"
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config"

const PRO_ROUTES = [
  "/mistake-dna","/progress-proof","/application-profile","/application-defence","/application-command-centre","/tutorial-lab","/mock-day","/supercurricular-coach","/paper-intervention","/essay-tutor","/essay-comparison","/interview-feedback","/parent-summary","/tutor-autopilot","/written-work-defence","/reading-curriculum","/preparation-readiness","/panel-interview","/video-interview",
  "/digital-twin","/socratic-whiteboard","/personal-statement-defence","/source-notebook","/evidence-locker","/offline-pack","/interview-pressure",
  "/interview-academy","/interview-difficulty","/thinking-aloud","/reasoning-replay","/retry-moment","/interview-profile","/unseen-lab",
  "/full-papers","/advanced-practice","/adaptive-paper","/admissions-test-courses","/preparation-report","/weekly-programme","/research-project","/knowledge-graph",
]
const SCHOOL_ROUTES = [
  "/school-classroom","/school-dashboard","/school-data","/school-differentiation","/school-insights","/school-overview","/school-reports","/school-seats",
  "/human-review","/teacher-coach","/teacher-live-console","/human-interviewer",
]

// Page gates are only a UX convenience. These API gates are the security boundary for
// premium server work so a Free user cannot bypass a locked page and call the endpoint directly.
const PRO_API_ROUTES = [
  "/api/essay-analysis",
  "/api/extract-written-work",
  "/api/interview-feedback",
  "/api/reasoning-interview-turn",
  "/api/targeted-practice",
  "/api/weekly-programme",
  "/api/written-work-defence",
]
const SCHOOL_API_ROUTES = ["/api/school", "/api/school-targeted"]

const PUBLIC_PAGE_ROUTES = [
  "/login",
  "/practice-login",
  "/reset-password",
  "/auth/confirm",
  "/admin/login",
  "/privacy",
  "/privacy-centre",
  "/terms",
  "/cookies",
  "/safeguarding",
  "/support",
  "/status",
  "/opengraph-image",
]
const PUBLIC_ASSET_ROUTES = ["/manifest.webmanifest", "/sw.js", "/robots.txt", "/sitemap.xml", "/offline.html"]
const PLAN_GATE_ROUTES = ["/premium", "/post-login"]

type AccessTier = "free" | "pro" | "school"

function matchesAny(pathname: string, routes: string[]) { return routes.some(route => pathname === route || pathname.startsWith(`${route}/`)) }
function effectiveTier(tier: unknown, status: unknown): AccessTier { const active=status==="active"||status==="trialing"; if(active&&tier==="school")return "school";if(active&&tier==="pro")return "pro";return "free" }
function redirectTo(request: NextRequest, pathname: string, next?: string) { const url=request.nextUrl.clone();url.pathname=pathname;url.search="";if(next)url.searchParams.set("next",next);return NextResponse.redirect(url) }
function hasPracticeAccess(user: unknown) {
  if (!user || typeof user !== "object") return false
  const appMetadata = (user as { app_metadata?: unknown }).app_metadata
  if (!appMetadata || typeof appMetadata !== "object") return false
  const metadata = appMetadata as Record<string, unknown>
  return metadata.account_type === "practice" && metadata.practice_access === "unlimited"
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll(){return request.cookies.getAll()}, setAll(cookiesToSet){cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options))} } })
  const { data } = await supabase.auth.getClaims()
  const user=data?.claims
  const e2eSession=e2eSessionActive(request.headers.get("host"),request.cookies.get(E2E_SESSION_COOKIE)?.value)
  const userId=e2eSession?E2E_USER_ID:typeof user?.sub==="string"?user.sub:null
  const userEmail=e2eSession?E2E_USER_EMAIL:typeof user?.email==="string"?user.email:null
  const pathname=request.nextUrl.pathname
  const isApi=pathname.startsWith("/api/")
  const isPublicPage=matchesAny(pathname,PUBLIC_PAGE_ROUTES)
  const isPublicAsset=matchesAny(pathname,PUBLIC_ASSET_ROUTES)
  const adminLogin=pathname==="/admin/login"
  const requiresAdmin=pathname==="/admin"||(pathname.startsWith("/admin/")&&!adminLogin)
  const isAdmin=isConfiguredAdminEmail(userEmail)
  const isPractice=e2eSession||hasPracticeAccess(user)

  let resolvedTier: AccessTier | null = null
  async function accessTier(): Promise<AccessTier> {
    if (resolvedTier) return resolvedTier
    if (!userId) return "free"
    const [{data:subscription},{data:seat}] = await Promise.all([
      supabase.from("subscriptions").select("tier,status").eq("user_id",userId).maybeSingle(),
      supabase.from("school_seat_entitlements").select("active").eq("user_id",userId).maybeSingle(),
    ])
    const paidTier=effectiveTier(subscription?.tier,subscription?.status)
    resolvedTier=seat?.active?"school":paidTier
    return resolvedTier
  }

  const apiRequiresSchool=matchesAny(pathname,SCHOOL_API_ROUTES)
  const apiRequiresPro=matchesAny(pathname,PRO_API_ROUTES)
  if (apiRequiresSchool || apiRequiresPro) {
    if (!userId) return NextResponse.json({ error: "Sign in to use this feature.", requiredTier: apiRequiresSchool ? "school" : "pro" }, { status: 401 })
    if (!isAdmin && !isPractice) {
      const tier=await accessTier()
      const hasPro=tier==="pro"||tier==="school"
      const hasSchool=tier==="school"
      if ((apiRequiresSchool&&!hasSchool)||(apiRequiresPro&&!hasPro)) {
        return NextResponse.json({ error: apiRequiresSchool ? "A School plan is required for this feature." : "A Pro or School plan is required for this feature.", requiredTier: apiRequiresSchool ? "school" : "pro" }, { status: 403 })
      }
    }
  }

  const aiScope=aiScopeForPath(pathname)
  if(aiScope){
    let aiTier: "anonymous"|"free"|"pro"|"school"|"practice"|"admin" = userId?"free":"anonymous"
    if(userId){
      if(isAdmin) aiTier="admin"
      else if(isPractice) aiTier="practice"
      else aiTier=await accessTier()
    }
    const guard=await guardAiRequest({pathname,headers:request.headers,userId,tier:aiTier})
    if(!guard.allowed){
      const unavailable=guard.reason==="guard_unavailable"
      return NextResponse.json(
        { error: unavailable ? "AI request protection is temporarily unavailable. Please try again shortly." : "Too many AI requests. Please wait before trying again.", reason: guard.reason },
        { status: unavailable?503:429, headers: { "Retry-After": String(Math.max(1,guard.retryAfterSeconds)), "X-RateLimit-Reason": guard.reason, "X-RateLimit-Burst-Remaining": String(guard.burstRemaining), "X-RateLimit-Hour-Remaining": String(guard.hourRemaining) } },
      )
    }
    response.headers.set("X-RateLimit-Burst-Remaining",String(guard.burstRemaining))
    response.headers.set("X-RateLimit-Hour-Remaining",String(guard.hourRemaining))
  }

  if(pathname==="/") return redirectTo(request,userId?"/post-login":"/login",userId?undefined:"/post-login")

  if(!userId&&!isApi&&!isPublicPage&&!isPublicAsset){
    if(requiresAdmin) return redirectTo(request,"/admin/login",pathname)
    return redirectTo(request,"/login",pathname)
  }

  if(!userId) return response
  if(pathname==="/login"||pathname==="/practice-login") return redirectTo(request,"/post-login")

  const requiresPro=matchesAny(pathname,PRO_ROUTES)
  const requiresSchool=matchesAny(pathname,SCHOOL_ROUTES)

  if(adminLogin&&isAdmin) return redirectTo(request,"/admin")
  if(requiresAdmin&&!isAdmin){const url=request.nextUrl.clone();url.pathname="/admin/login";url.search="";url.searchParams.set("error","not-authorized");return NextResponse.redirect(url)}

  if(!isApi&&!isPublicPage&&!isPublicAsset&&!matchesAny(pathname,PLAN_GATE_ROUTES)&&!requiresAdmin&&!isAdmin){
    const [{data:onboarding}, tier] = await Promise.all([
      supabase.from("user_state").select("state_value").eq("user_id",userId).eq("state_key",PLAN_ONBOARDING_STATE_KEY).maybeSingle(),
      accessTier(),
    ])
    const cookieFreePlan=request.cookies.get(FREE_PLAN_COOKIE)?.value===userId
    const hasChosenPlan=isPractice||tier==="pro"||tier==="school"||cookieFreePlan||onboardingCompleted(onboarding?.state_value)
    if(!hasChosenPlan){const url=request.nextUrl.clone();url.pathname="/premium";url.search="";url.searchParams.set("onboarding","required");return NextResponse.redirect(url)}
    const hasPro=isPractice||tier==="pro"||tier==="school", hasSchool=tier==="school"
    if((requiresSchool&&!hasSchool)||(requiresPro&&!hasPro)){const url=request.nextUrl.clone();url.pathname="/premium";url.search="";url.searchParams.set("feature",pathname);url.searchParams.set("required",requiresSchool?"school":"pro");return NextResponse.redirect(url)}
  }

  return response
}
