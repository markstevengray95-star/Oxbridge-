import { NextResponse } from "next/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(request:Request){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const claims=data?.claims
  const userId=typeof claims?.sub==="string"?claims.sub:null
  if(!userId) return NextResponse.json({error:"Sign in before deleting your account."},{status:401})

  let body:{confirmation?:unknown}
  try{body=await request.json()}catch{return NextResponse.json({error:"The deletion request could not be read."},{status:400})}
  if(body.confirmation!=="DELETE MY ACCOUNT") return NextResponse.json({error:'Type "DELETE MY ACCOUNT" exactly to confirm.'},{status:400})

  const {data:subscription}=await supabase.from("subscriptions").select("tier,status,stripe_subscription_id,cancel_at_period_end").eq("user_id",userId).maybeSingle()
  const paidStatus=subscription&&["active","trialing","past_due"].includes(String(subscription.status))&&["pro","school"].includes(String(subscription.tier))
  if(paidStatus&&!subscription?.cancel_at_period_end){
    return NextResponse.json({error:"Cancel the paid subscription from Account → Manage billing first. This prevents account deletion from leaving a live Stripe subscription behind.",billingActionRequired:true},{status:409})
  }

  if(!hasSupabaseAdminConfig()) return NextResponse.json({error:"Secure account deletion is temporarily unavailable because the server deletion key is not configured. Use the privacy contact instead."},{status:503})

  try{
    const admin=createAdminClient()
    const {data:addons}=await admin.from("school_seat_addons").select("id,status,cancel_at_period_end").eq("owner_user_id",userId).in("status",["active","trialing","past_due"])
    if((addons??[]).some(row=>!row.cancel_at_period_end)) return NextResponse.json({error:"Cancel active School seat add-ons in billing before deleting this account.",billingActionRequired:true},{status:409})

    const {error}=await admin.auth.admin.deleteUser(userId)
    if(error){console.error("Account deletion failed",error);return NextResponse.json({error:"The account could not be deleted automatically. Please contact the privacy team so the request can be completed safely."},{status:500})}
    return NextResponse.json({message:"Your ScholarBridge login and user-linked cloud data have been deleted. Some transaction records may remain with payment providers where retention is legally required."})
  }catch(error){
    console.error("Account deletion error",error)
    return NextResponse.json({error:"The account could not be deleted automatically. Please contact the privacy team."},{status:500})
  }
}
