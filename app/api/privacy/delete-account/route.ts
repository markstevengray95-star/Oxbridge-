import { NextResponse } from "next/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getStripe, isStripeConfigured } from "@/lib/stripe/server"

const LIVE_BILLING_STATUSES = new Set(["active", "trialing", "past_due"])

export async function POST(request:Request){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const claims=data?.claims
  const userId=typeof claims?.sub==="string"?claims.sub:null
  if(!userId) return NextResponse.json({error:"Sign in before deleting your account."},{status:401})

  let body:{confirmation?:unknown}
  try{body=await request.json()}catch{return NextResponse.json({error:"The deletion request could not be read."},{status:400})}
  if(body.confirmation!=="DELETE MY ACCOUNT") return NextResponse.json({error:'Type "DELETE MY ACCOUNT" exactly to confirm.'},{status:400})
  if(!hasSupabaseAdminConfig()) return NextResponse.json({error:"Secure account deletion is temporarily unavailable because the server deletion key is not configured. Use the privacy contact instead."},{status:503})

  try{
    const admin=createAdminClient()

    // A School owner can have other pupils/staff underneath resources that cascade from the owner.
    // Do not silently remove those users' school workspace data. The owner must offboard the
    // workspace first (or use support for an assisted transfer) before deleting their login.
    const {data:ownedOrg}=await admin.from("school_organizations").select("id").eq("owner_user_id",userId).maybeSingle()
    if(ownedOrg?.id){
      const {data:otherOrgMembers}=await admin.from("school_organization_members").select("user_id").eq("organization_id",ownedOrg.id).neq("user_id",userId).limit(1)
      if((otherOrgMembers??[]).length){
        return NextResponse.json({error:"This account owns a School workspace that still contains other members. Remove or transfer those members before deleting the owner account so their school data is not lost.",schoolActionRequired:true},{status:409})
      }
    }

    const {data:ownedCohorts}=await admin.from("school_cohorts").select("id").eq("owner_user_id",userId)
    const cohortIds=(ownedCohorts??[]).map(row=>row.id)
    if(cohortIds.length){
      const {data:otherCohortMembers}=await admin.from("school_memberships").select("user_id").in("cohort_id",cohortIds).neq("user_id",userId).limit(1)
      if((otherCohortMembers??[]).length){
        return NextResponse.json({error:"This account owns a class/cohort that still contains other users. Remove or transfer the class members before deleting the owner account so their assigned-work records are not lost.",schoolActionRequired:true},{status:409})
      }
    }

    const [{data:subscription},{data:addons}] = await Promise.all([
      admin.from("subscriptions").select("tier,status,stripe_subscription_id").eq("user_id",userId).maybeSingle(),
      admin.from("school_seat_addons").select("stripe_subscription_id,status").eq("owner_user_id",userId),
    ])

    const stripeIds = new Set<string>()
    if(subscription?.stripe_subscription_id && LIVE_BILLING_STATUSES.has(String(subscription.status))) stripeIds.add(subscription.stripe_subscription_id)
    for(const addon of addons??[]){
      if(addon.stripe_subscription_id && LIVE_BILLING_STATUSES.has(String(addon.status))) stripeIds.add(addon.stripe_subscription_id)
    }

    if(stripeIds.size){
      if(!isStripeConfigured()) return NextResponse.json({error:"Your account still has active billing, but Stripe cancellation is temporarily unavailable. Please use Manage billing or contact support before deleting the account.",billingActionRequired:true},{status:503})
      const stripe=getStripe()
      for(const subscriptionId of stripeIds){
        try{
          await stripe.subscriptions.cancel(subscriptionId)
        }catch(error){
          console.error("Could not cancel Stripe subscription before account deletion",subscriptionId,error)
          return NextResponse.json({error:"We could not safely cancel all active billing, so the account was not deleted. Please try again or contact support.",billingActionRequired:true},{status:502})
        }
      }
    }

    // Core ScholarBridge tables have auth.users ON DELETE CASCADE. Safeguarding reports use
    // ON DELETE SET NULL so a report can be retained independently where safeguarding/accountability
    // requires it, without retaining the deleted login as its owner.
    const {error}=await admin.auth.admin.deleteUser(userId)
    if(error){console.error("Account deletion failed",error);return NextResponse.json({error:"The account could not be deleted automatically. Please contact the privacy team so the request can be completed safely."},{status:500})}
    return NextResponse.json({message:"Your active ScholarBridge billing has been cancelled and your login and user-linked cloud data have been deleted. Limited safeguarding or transaction records may remain where they must be retained independently for legal, safety, accounting or provider obligations."})
  }catch(error){
    console.error("Account deletion error",error)
    return NextResponse.json({error:"The account could not be deleted automatically. Please contact the privacy team."},{status:500})
  }
}
