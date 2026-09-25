import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isConfiguredAdminEmail } from "@/lib/auth/admin-access"
import { PLAN_ONBOARDING_STATE_KEY, onboardingCompleted } from "@/lib/onboarding"
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config"

const PRO_ROUTES = [
  "/mistake-dna","/progress-proof","/application-profile","/application-defence","/application-command-centre","/tutorial-lab","/mock-day","/supercurricular-coach","/paper-intervention","/essay-tutor","/essay-comparison","/interview-feedback","/parent-summary","/tutor-autopilot","/written-work-defence","/reading-curriculum","/preparation-readiness","/panel-interview","/video-interview",
  "/digital-twin","/socratic-whiteboard","/personal-statement-defence","/source-notebook","/evidence-locker","/offline-pack","/interview-pressure",
  "/interview-academy","/interview-difficulty","/thinking-aloud","/reasoning-replay","/retry-moment","/interview-profile","/unseen-lab",
  "/full-papers","/advanced-practice","/adaptive-paper","/admissions-test-courses","/preparation-report","/weekly-programme","/research-project","/knowledge-graph",
]
const SCHOOL_ROUTES = ["/school-dashboard","/school-overview","/school-reports","/human-review","/teacher-coach","/teacher-live-console","/human-interviewer"]
const PUBLIC_PAGE_ROUTES = ["/login", "/reset-password", "/auth/confirm", "/admin/login"]
const PUBLIC_ASSET_ROUTES = ["/manifest.webmanifest", "/sw.js", "/robots.txt", "/sitemap.xml"]
const PLAN_GATE_ROUTES = ["/premium", "/post-login"]

function matchesAny(pathname: string, routes: string[]) { return routes.some(route => pathname === route || pathname.startsWith(`${route}/`)) }
function effectiveTier(tier: unknown, status: unknown) { const active=status==="active"||status==="trialing"; if(active&&tier==="school")return "school" as const;if(active&&tier==="pro")return "pro" as const;return "free" as const }
function redirectTo(request: NextRequest, pathname: string, next?: string) { const url=request.nextUrl.clone();url.pathname=pathname;url.search="";if(next)url.searchParams.set("next",next);return NextResponse.redirect(url) }

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll(){return request.cookies.getAll()}, setAll(cookiesToSet){cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options))} } })
  const { data } = await supabase.auth.getClaims()
  const user=data?.claims
  const userId=typeof user?.sub==="string"?user.sub:null
  const userEmail=typeof user?.email==="string"?user.email:null
  const pathname=request.nextUrl.pathname
  const isApi=pathname.startsWith("/api/")
  const isPublicPage=matchesAny(pathname,PUBLIC_PAGE_ROUTES)
  const isPublicAsset=matchesAny(pathname,PUBLIC_ASSET_ROUTES)
  const adminLogin=pathname==="/admin/login"
  const requiresAdmin=pathname==="/admin"||(pathname.startsWith("/admin/")&&!adminLogin)

  if(pathname==="/") return redirectTo(request,userId?"/post-login":"/login",userId?undefined:"/post-login")

  if(!userId&&!isApi&&!isPublicPage&&!isPublicAsset){
    if(requiresAdmin) return redirectTo(request,"/admin/login",pathname)
    return redirectTo(request,"/login",pathname)
  }

  if(!userId) return response
  if(pathname==="/login") return redirectTo(request,"/post-login")

  const requiresPro=matchesAny(pathname,PRO_ROUTES)
  const requiresSchool=matchesAny(pathname,SCHOOL_ROUTES)
  const isAdmin=isConfiguredAdminEmail(userEmail)

  if(adminLogin&&isAdmin) return redirectTo(request,"/admin")
  if(requiresAdmin&&!isAdmin){const url=request.nextUrl.clone();url.pathname="/admin/login";url.search="";url.searchParams.set("error","not-authorized");return NextResponse.redirect(url)}

  if(!isApi&&!isPublicPage&&!isPublicAsset&&!matchesAny(pathname,PLAN_GATE_ROUTES)&&!requiresAdmin&&!isAdmin){
    const [{data:subscription},{data:seat},{data:onboarding}] = await Promise.all([
      supabase.from("subscriptions").select("tier,status").eq("user_id",userId).maybeSingle(),
      supabase.from("school_seat_entitlements").select("active").eq("user_id",userId).maybeSingle(),
      supabase.from("user_state").select("state_value").eq("user_id",userId).eq("state_key",PLAN_ONBOARDING_STATE_KEY).maybeSingle(),
    ])
    const paidTier=effectiveTier(subscription?.tier,subscription?.status)
    const tier=seat?.active?"school":paidTier
    const hasChosenPlan=tier==="pro"||tier==="school"||onboardingCompleted(onboarding?.state_value)
    if(!hasChosenPlan){const url=request.nextUrl.clone();url.pathname="/premium";url.search="";url.searchParams.set("onboarding","required");return NextResponse.redirect(url)}
    const hasPro=tier==="pro"||tier==="school", hasSchool=tier==="school"
    if((requiresSchool&&!hasSchool)||(requiresPro&&!hasPro)){const url=request.nextUrl.clone();url.pathname="/premium";url.search="";url.searchParams.set("feature",pathname);url.searchParams.set("required",requiresSchool?"school":"pro");return NextResponse.redirect(url)}
  }

  return response
}
