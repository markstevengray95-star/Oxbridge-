import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config"

const PRO_ROUTES = [
  "/mistake-dna",
  "/progress-proof",
  "/application-profile",
  "/application-defence",
  "/tutorial-lab",
  "/mock-day",
  "/supercurricular-coach",
  "/paper-intervention",
  "/essay-tutor",
  "/interview-feedback",
  "/parent-summary",
]

const SCHOOL_ROUTES = [
  "/human-review",
  "/teacher-coach",
]

function matchesAny(pathname: string, routes: string[]) {
  return routes.some(route => pathname === route || pathname.startsWith(`${route}/`))
}

function effectiveTier(tier: unknown, status: unknown) {
  const active = status === "active" || status === "trialing"
  if (active && tier === "school") return "school" as const
  if (active && tier === "pro") return "pro" as const
  return "free" as const
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  const userId = typeof user?.sub === "string" ? user.sub : null
  const pathname = request.nextUrl.pathname
  const requiresPro = matchesAny(pathname, PRO_ROUTES)
  const requiresSchool = matchesAny(pathname, SCHOOL_ROUTES)
  const protectedRoute = pathname.startsWith("/account") || pathname.startsWith("/dashboard") || requiresPro || requiresSchool

  if (!userId && protectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (userId && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/account"
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (userId && (requiresPro || requiresSchool)) {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("tier,status")
      .eq("user_id", userId)
      .maybeSingle()

    const tier = effectiveTier(subscription?.tier, subscription?.status)
    const hasPro = tier === "pro" || tier === "school"
    const hasSchool = tier === "school"

    if ((requiresSchool && !hasSchool) || (requiresPro && !hasPro)) {
      const url = request.nextUrl.clone()
      url.pathname = "/premium"
      url.search = ""
      url.searchParams.set("feature", pathname)
      url.searchParams.set("required", requiresSchool ? "school" : "pro")
      return NextResponse.redirect(url)
    }
  }

  return response
}
