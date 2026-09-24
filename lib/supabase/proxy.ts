import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isConfiguredAdminEmail } from "@/lib/auth/admin-access"
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config"

const PRO_ROUTES = [
  "/mistake-dna","/progress-proof","/application-profile","/application-defence","/application-command-centre","/tutorial-lab","/mock-day","/supercurricular-coach","/paper-intervention","/essay-tutor","/essay-comparison","/interview-feedback","/parent-summary","/tutor-autopilot","/written-work-defence","/reading-curriculum","/preparation-readiness","/panel-interview",
  "/digital-twin","/socratic-whiteboard","/personal-statement-defence","/source-notebook","/evidence-locker","/offline-pack","/interview-pressure",
]

const SCHOOL_ROUTES = [
  "/school-dashboard","/human-review","/teacher-coach","/teacher-live-console",
]

function matchesAny(pathname: string, routes: string[]) { return routes.some(route => pathname === route || pathname.startsWith(`${route}/`)) }
function effectiveTier(tier: unknown, status: unknown) { const active=status==="active"||status==="trialing"; if(active&&tier==="school")return "school" as const;if(active&&tier==="pro")return "pro" as const;return "free" as const }

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll(){return request.cookies.getAll()}, setAll(cookiesToSet){cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options))} } })
  const { data } = await supabase.auth.getClaims(); const user=data?.claims; const userId=typeof user?.sub==="string"?user.sub:null; const userEmail=typeof user?.email==="string"?user.email:null; const pathname=request.nextUrl.pathname
  const requiresPro=matchesAny(pathname,PRO_ROUTES), requiresSchool=matchesAny(pathname,SCHOOL_ROUTES), adminLogin=pathname==="/admin/login", requiresAdmin=pathname==="/admin"||(pathname.startsWith("/admin/")&&!adminLogin), protectedRoute=pathname.startsWith("/account")||pathname.startsWith("/dashboard")||pathname.startsWith("/school-classroom")||requiresPro||requiresSchool||requiresAdmin
  if(!userId&&requiresAdmin){const url=request.nextUrl.clone();url.pathname="/admin/login";url.search="";url.searchParams.set("next",pathname);return NextResponse.redirect(url)}
  if(!userId&&protectedRoute){const url=request.nextUrl.clone();url.pathname="/login";url.search="";url.searchParams.set("next",pathname);return NextResponse.redirect(url)}
  if(userId&&pathname==="/login"){const url=request.nextUrl.clone();url.pathname="/account";url.search="";return NextResponse.redirect(url)}
  let isAdmin=userId?isConfiguredAdminEmail(userEmail):false
  if(userId&&!isAdmin&&(requiresAdmin||requiresPro||requiresSchool||adminLogin)){const {data:adminRole}=await supabase.from("app_admins").select("role").eq("user_id",userId).maybeSingle();isAdmin=adminRole?.role==="admin"}
  if(userId&&adminLogin&&isAdmin){const url=request.nextUrl.clone();url.pathname="/admin";url.search="";return NextResponse.redirect(url)}
  if(userId&&requiresAdmin&&!isAdmin){const url=request.nextUrl.clone();url.pathname="/admin/login";url.search="";url.searchParams.set("error","not-authorized");return NextResponse.redirect(url)}
  if(userId&&(requiresPro||requiresSchool)&&!isAdmin){const {data:subscription}=await supabase.from("subscriptions").select("tier,status").eq("user_id",userId).maybeSingle();const tier=effectiveTier(subscription?.tier,subscription?.status),hasPro=tier==="pro"||tier==="school",hasSchool=tier==="school";if((requiresSchool&&!hasSchool)||(requiresPro&&!hasPro)){const url=request.nextUrl.clone();url.pathname="/premium";url.search="";url.searchParams.set("feature",pathname);url.searchParams.set("required",requiresSchool?"school":"pro");return NextResponse.redirect(url)}}
  return response
}
