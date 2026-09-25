"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FREE_PLAN_COOKIE, PLAN_ONBOARDING_STATE_KEY } from "@/lib/onboarding"

export async function chooseFreePlan() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : ""
  if (!userId) redirect("/login?next=/post-login")

  const cookieStore = await cookies()
  cookieStore.set(FREE_PLAN_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })

  const { error } = await supabase.from("user_state").upsert({
    user_id: userId,
    state_key: PLAN_ONBOARDING_STATE_KEY,
    state_value: {
      completed: true,
      selectedTier: "free",
      selectedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,state_key" })

  if (error) {
    console.warn("Free plan database save unavailable; continuing with secure per-user cookie fallback", error.message)
  }

  redirect("/student-home")
}
