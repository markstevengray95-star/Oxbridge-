import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { learningSectionPath, safeLearningSeconds, shouldRecordLearningEvent, type LearningEventKind } from "@/lib/school/learning-activity"

export const runtime="nodejs"
export const dynamic="force-dynamic"
const headers={"Cache-Control":"private, no-store"}
function reply(message:string,status:number){
  return NextResponse.json({error:message},{status,headers})
}

async function eligibleLearner(admin:ReturnType<typeof createAdminClient>,userId:string){
  // Managed practice students are eligible only while their account is active.
  const {data:practice,error:practiceError}=await admin.from("practice_access_accounts")
    .select("user_id,active,expires_at").eq("user_id",userId)
    .eq("account_type","student").maybeSingle()
  if(practiceError)throw Error("Practice eligibility unavailable")
  if(practice){
    return Boolean(practice.active)&&(!practice.expires_at||Date.parse(practice.expires_at)>Date.now())
  }

  // Schools may assign ordinary student accounts. Staff and owners are
  // explicitly excluded from student activity monitoring.
  const {data:seats,error:seatError}=await admin.from("school_seat_entitlements")
    .select("organization_id,active").eq("user_id",userId).eq("active",true).limit(10)
  if(seatError)throw Error("School eligibility unavailable")
  for(const seat of seats||[]){
    const [{data:member,error:memberError},{data:staff,error:staffError},{data:org,error:orgError}]=await Promise.all([
      admin.from("school_organization_members").select("role").eq("organization_id",seat.organization_id).eq("user_id",userId).maybeSingle(),
      admin.from("school_staff_roles").select("active").eq("organization_id",seat.organization_id).eq("user_id",userId).maybeSingle(),
      admin.from("school_organizations").select("owner_user_id,status").eq("id",seat.organization_id).maybeSingle(),
    ])
    if(memberError||staffError||orgError)throw Error("School membership verification unavailable")
    if(org?.status==="active"&&org.owner_user_id!==userId&&member&&member.role!=="owner"&&!staff?.active)return true
  }
  return false
}

export async function POST(request:Request){
  if(!hasSupabaseAdminConfig())return reply("Learning activity is not configured.",503)
  const origin=request.headers.get("origin")
  if(origin){
    try { if(new URL(origin).host!==new URL(request.url).host)return reply("Invalid request origin.",403) }
    catch {return reply("Invalid request origin.",403)}
  }
  const length=Number(request.headers.get("content-length")||0)
  if(length>1024)return reply("Activity event is too large.",413)

  const supabase=await createClient()
  const {data,error}=await supabase.auth.getClaims()
  if(error||typeof data?.claims?.sub!=="string")return new NextResponse(null,{status:204,headers})
  const userId=data.claims.sub
  let supplied:unknown
  try{supplied=await request.json()}catch{return reply("Invalid activity event.",400)}
  const body=supplied&&typeof supplied==="object"&&!Array.isArray(supplied)?supplied as Record<string,unknown>:{}
  const page=learningSectionPath(body.pagePath)
  if(!page)return new NextResponse(null,{status:204,headers})
  const rawKind=body.eventKind
  if(rawKind!=="heartbeat"&&rawKind!=="visit")return reply("Invalid activity event type.",400)
  const kind:LearningEventKind=rawKind
  const seconds=safeLearningSeconds(kind,body.activeSeconds)

  const admin=createAdminClient()
  try{
    if(!await eligibleLearner(admin,userId))return new NextResponse(null,{status:204,headers})
    const {data:latest,error:lookupError}=await admin.from("fellow_learning_activity_events")
      .select("page_path,event_kind,occurred_at").eq("user_id",userId)
      .order("occurred_at",{ascending:false}).limit(1).maybeSingle()
    if(lookupError)return reply("Learning activity is not configured.",503)
    if(!shouldRecordLearningEvent(latest,{page_path:page,event_kind:kind},Date.now())){
      return NextResponse.json({ok:true,duplicate:true},{headers})
    }
    const {error:saveError}=await admin.from("fellow_learning_activity_events")
      .insert({user_id:userId,page_path:page,event_kind:kind,active_seconds:seconds})
    if(saveError)return reply("Could not save activity.",503)
    return NextResponse.json({ok:true},{headers})
  }catch{
    return reply("Could not verify learner activity permissions.",503)
  }
}
