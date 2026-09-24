"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PLAN_ONBOARDING_STATE_KEY } from "@/lib/onboarding"

export async function chooseFreePlan() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : ""
  if (!userId) redirect("/login?next=/post-login")

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

  if (error) redirect("/premium?onboarding=save-error")
  redirect("/student-home")
}
