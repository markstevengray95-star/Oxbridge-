import { NextResponse } from "next/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type ExportTable = { name: string; ownerColumns: string[] }

// Only ScholarBridge/Oxbridge tables are listed here. The Supabase project is shared with
// other products, so a schema-wide user_id scan would risk exporting unrelated application data.
const userTables: ExportTable[] = [
  { name: "student_intelligence", ownerColumns: ["user_id"] },
  { name: "interview_sessions", ownerColumns: ["user_id"] },
  { name: "interview_turns", ownerColumns: ["user_id"] },
  { name: "memory_items", ownerColumns: ["user_id"] },
  { name: "test_results", ownerColumns: ["user_id"] },
  { name: "user_state", ownerColumns: ["user_id"] },
  { name: "usage_events", ownerColumns: ["user_id"] },
  { name: "subscriptions", ownerColumns: ["user_id"] },
  { name: "legal_acceptances", ownerColumns: ["user_id"] },
  { name: "privacy_requests", ownerColumns: ["user_id"] },
  { name: "safeguarding_reports", ownerColumns: ["user_id"] },
  { name: "human_review_orders", ownerColumns: ["user_id"] },
  { name: "practice_access_accounts", ownerColumns: ["user_id"] },
  { name: "school_seat_entitlements", ownerColumns: ["user_id"] },
  { name: "school_organization_members", ownerColumns: ["user_id"] },
  { name: "school_memberships", ownerColumns: ["user_id"] },
  { name: "school_assignment_progress", ownerColumns: ["user_id"] },
  { name: "school_assignment_submissions", ownerColumns: ["user_id"] },
  { name: "school_cohorts", ownerColumns: ["owner_user_id"] },
  { name: "school_assignments", ownerColumns: ["created_by", "target_user_id"] },
  { name: "school_organizations", ownerColumns: ["owner_user_id"] },
  { name: "school_seat_addons", ownerColumns: ["owner_user_id"] },
]

async function selectOwned(admin: ReturnType<typeof createAdminClient>, table: ExportTable, userId: string) {
  let query = admin.from(table.name).select("*")
  if (table.ownerColumns.length === 1) query = query.eq(table.ownerColumns[0], userId)
  else query = query.or(table.ownerColumns.map(column => `${column}.eq.${userId}`).join(","))
  return query
}

export async function GET(){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const claims=data?.claims
  const userId=typeof claims?.sub==="string"?claims.sub:null
  const email=typeof claims?.email==="string"?claims.email:null
  if(!userId) return NextResponse.json({error:"Sign in to download your data."},{status:401})
  if(!hasSupabaseAdminConfig()) return NextResponse.json({error:"Secure data export is temporarily unavailable. Please use the privacy contact instead."},{status:503})

  const admin=createAdminClient()
  const result:Record<string,unknown>={
    exported_at:new Date().toISOString(),
    account:{id:userId,email},
    note:"This file contains ScholarBridge account data available through the self-service export. Payment-card details are held by Stripe and are not stored by ScholarBridge. Security-only logs that cannot be safely exposed through self-service may require a separate privacy request.",
  }
  const unavailable:string[]=[]

  const profile=await admin.from("profiles").select("*").eq("id",userId).maybeSingle()
  if(profile.error) unavailable.push("profiles"); else result.profiles=profile.data

  for(const table of userTables){
    const query=await selectOwned(admin,table,userId)
    if(query.error) unavailable.push(table.name)
    else result[table.name]=query.data??[]
  }
  result.unavailable_or_not_accessible=unavailable

  return new NextResponse(JSON.stringify(result,null,2),{
    status:200,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Content-Disposition":`attachment; filename="scholarbridge-data-${new Date().toISOString().slice(0,10)}.json"`,
      "Cache-Control":"no-store",
      "X-Content-Type-Options":"nosniff",
    },
  })
}
