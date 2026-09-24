import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { effectiveTier, geminiReservationMinutes, monthStartIso, monthlyGeminiMinutes, type SubscriptionStatus, type SubscriptionTier } from "@/lib/billing/plans"

type UsageState = {
  tier: SubscriptionTier
  status: SubscriptionStatus
  usedMinutes: number
  limitMinutes: number
  baseRemainingMinutes: number
  creditMinutes: number
  remainingMinutes: number
  reservationMinutes: number
  enforced: boolean
  isAdmin: boolean
  unlimited: boolean
}

function numeric(value: unknown) { const parsed=typeof value==="number"?value:Number(value); return Number.isFinite(parsed)?parsed:0 }

export async function getGeminiUsageState(userId: string, email?: string | null): Promise<UsageState> {
  const reservationMinutes = geminiReservationMinutes()
  const adminAccess = await getAppAdminAccess(userId, email)
  if (adminAccess.isAdmin) return { tier:"school",status:"active",usedMinutes:0,limitMinutes:0,baseRemainingMinutes:0,creditMinutes:0,remainingMinutes:0,reservationMinutes,enforced:false,isAdmin:true,unlimited:true }
  if (!hasSupabaseAdminConfig()) {
    const limit=monthlyGeminiMinutes("free")
    return { tier:"free",status:"inactive",usedMinutes:0,limitMinutes:limit,baseRemainingMinutes:limit,creditMinutes:0,remainingMinutes:limit,reservationMinutes,enforced:false,isAdmin:false,unlimited:false }
  }

  const admin=createAdminClient()
  const [{data:subscription},{data:seat},{data:baseEvents},{data:creditPurchases},{data:creditUses}] = await Promise.all([
    admin.from("subscriptions").select("tier,status").eq("user_id",userId).maybeSingle(),
    admin.from("school_seat_entitlements").select("active").eq("user_id",userId).maybeSingle(),
    admin.from("usage_events").select("quantity").eq("user_id",userId).eq("event_type","gemini_live_reserved_minutes").gte("created_at",monthStartIso()),
    admin.from("usage_events").select("quantity").eq("user_id",userId).eq("event_type","gemini_live_credit_minutes"),
    admin.from("usage_events").select("quantity").eq("user_id",userId).eq("event_type","gemini_live_credit_consumed_minutes"),
  ])
  const rawTier=(subscription?.tier??"free") as SubscriptionTier
  const rawStatus=(subscription?.status??"inactive") as SubscriptionStatus
  const paidTier=effectiveTier(rawTier,rawStatus)
  const tier: SubscriptionTier=seat?.active?"school":paidTier
  const status: SubscriptionStatus=seat?.active?"active":rawStatus
  const usedMinutes=(baseEvents??[]).reduce((total,row)=>total+numeric(row.quantity),0)
  const limitMinutes=monthlyGeminiMinutes(tier)
  const baseRemainingMinutes=Math.max(0,limitMinutes-usedMinutes)
  const purchased=(creditPurchases??[]).reduce((total,row)=>total+numeric(row.quantity),0)
  const consumed=(creditUses??[]).reduce((total,row)=>total+numeric(row.quantity),0)
  const creditMinutes=Math.max(0,purchased-consumed)
  return { tier,status,usedMinutes,limitMinutes,baseRemainingMinutes,creditMinutes,remainingMinutes:baseRemainingMinutes+creditMinutes,reservationMinutes,enforced:true,isAdmin:false,unlimited:false }
}

export async function reserveGeminiSession(userId: string, email?: string | null) {
  const state=await getGeminiUsageState(userId,email)
  if(state.unlimited||!state.enforced)return{allowed:true as const,state,reservationId:null as string|null}
  const amount=state.reservationMinutes
  if(state.remainingMinutes<amount)return{allowed:false as const,state,reservationId:null as string|null}
  const eventType=state.baseRemainingMinutes>=amount?"gemini_live_reserved_minutes":"gemini_live_credit_consumed_minutes"
  if(eventType==="gemini_live_credit_consumed_minutes"&&state.creditMinutes<amount)return{allowed:false as const,state,reservationId:null as string|null}
  const admin=createAdminClient()
  const {data,error}=await admin.from("usage_events").insert({
    user_id:userId,
    event_type:eventType,
    quantity:amount,
    metadata:{source:"server",feature:"gemini_live",reservation_minutes:amount,source_bucket:eventType==="gemini_live_reserved_minutes"?"monthly_allowance":"purchased_credit"},
  }).select("id").single()
  if(error)throw new Error(`Could not reserve Gemini Live usage: ${error.message}`)
  const nextBase=eventType==="gemini_live_reserved_minutes"?Math.max(0,state.baseRemainingMinutes-amount):state.baseRemainingMinutes
  const nextCredit=eventType==="gemini_live_credit_consumed_minutes"?Math.max(0,state.creditMinutes-amount):state.creditMinutes
  return{allowed:true as const,reservationId:data.id as string,state:{...state,usedMinutes:eventType==="gemini_live_reserved_minutes"?state.usedMinutes+amount:state.usedMinutes,baseRemainingMinutes:nextBase,creditMinutes:nextCredit,remainingMinutes:nextBase+nextCredit}}
}

export async function releaseGeminiReservation(reservationId: string | null) {
  if(!reservationId||!hasSupabaseAdminConfig())return
  const admin=createAdminClient()
  await admin.from("usage_events").delete().eq("id",reservationId).in("event_type",["gemini_live_reserved_minutes","gemini_live_credit_consumed_minutes"])
}
