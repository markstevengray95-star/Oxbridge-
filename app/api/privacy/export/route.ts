import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type ExportTable={name:string;ownerColumn:string}

const userTables:ExportTable[]=[
  {name:"student_intelligence",ownerColumn:"user_id"},
  {name:"interview_sessions",ownerColumn:"user_id"},
  {name:"interview_turns",ownerColumn:"user_id"},
  {name:"memory_items",ownerColumn:"user_id"},
  {name:"practice_attempts",ownerColumn:"user_id"},
  {name:"topic_progress",ownerColumn:"user_id"},
  {name:"study_plans",ownerColumn:"user_id"},
  {name:"mistake_events",ownerColumn:"user_id"},
  {name:"application_evidence",ownerColumn:"user_id"},
  {name:"progress_evidence",ownerColumn:"user_id"},
  {name:"supercurricular",ownerColumn:"user_id"},
  {name:"weekly_programmes",ownerColumn:"user_id"},
  {name:"daily_challenges",ownerColumn:"user_id"},
  {name:"user_state",ownerColumn:"user_id"},
  {name:"subscriptions",ownerColumn:"user_id"},
  {name:"legal_acceptances",ownerColumn:"user_id"},
  {name:"privacy_requests",ownerColumn:"user_id"},
  {name:"safeguarding_reports",ownerColumn:"user_id"},
  {name:"school_seat_entitlements",ownerColumn:"user_id"},
]

export async function GET(){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const claims=data?.claims
  const userId=typeof claims?.sub==="string"?claims.sub:null
  const email=typeof claims?.email==="string"?claims.email:null
  if(!userId) return NextResponse.json({error:"Sign in to download your data."},{status:401})

  const result:Record<string,unknown>={
    exported_at:new Date().toISOString(),
    account:{id:userId,email},
    note:"This file contains ScholarBridge account data available through your signed-in account. Payment-card details are held by Stripe and are not stored in this export.",
  }
  const unavailable:string[]=[]

  const profile=await supabase.from("profiles").select("*").eq("id",userId).maybeSingle()
  if(profile.error) unavailable.push("profiles"); else result.profiles=profile.data

  for(const table of userTables){
    const query=await supabase.from(table.name).select("*").eq(table.ownerColumn,userId)
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
    },
  })
}
