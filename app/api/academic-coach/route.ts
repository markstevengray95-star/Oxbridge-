import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { PROFILE_KEY, PROGRESS_KEY } from "@/lib/personal-tutor"
import { coachPacks, COACH_STATE_PREFIX, chooseCoachPack, gradeCoachAttempt, readCoachAttempt, type CoachAttempt } from "@/lib/academic-coach"

export const dynamic = "force-dynamic"
function reply(data:unknown,status=200){
 return NextResponse.json(data,{status,headers:{"Cache-Control":"no-store, private"}})
}
const keys=coachPacks.map(p=>COACH_STATE_PREFIX+p.id)
export async function GET(){
 const supabase=await createClient()
 const {data:auth,error:authError}=await supabase.auth.getUser()
 if(authError||!auth.user)return reply({error:"Sign in to use the academic coach."},401)
 const {data,error}=await supabase.from("user_state").select("state_key,state_value").eq("user_id",auth.user.id).in("state_key",[PROFILE_KEY,PROGRESS_KEY,...keys])
 if(error)return reply({error:"Your coaching records could not be loaded. Please retry."},503)
 const state=new Map<string,unknown>((data??[]).map(row=>[row.state_key,row.state_value]))
 const attempts=coachPacks.map(p=>readCoachAttempt(state.get(COACH_STATE_PREFIX+p.id),p.id)).filter((a):a is CoachAttempt=>a!==null)
 const recommendation=chooseCoachPack(state.get(PROGRESS_KEY),state.get(PROFILE_KEY),attempts)
 return reply({attempts,recommendation})
}
export async function POST(request:Request){
 const supabase=await createClient()
 const {data:auth,error:authError}=await supabase.auth.getUser()
 if(authError||!auth.user)return reply({error:"Sign in to save your coaching practice."},401)
 // Reject cross-origin requests; authenticated identity is never supplied in a body.
 const origin=request.headers.get("origin")
 if(!origin||origin!==new URL(request.url).origin)return reply({error:"Invalid request origin."},403)
 if(!request.headers.get("content-type")?.startsWith("application/json"))return reply({error:"Expected JSON."},415)
 let body:unknown
 try{const raw=await request.text();if(raw.length>2048)return reply({error:"Request too large."},413);body=JSON.parse(raw)}catch{return reply({error:"Invalid practice submission."},400)}
 if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"Invalid practice submission."},400)
 const input=body as Record<string,unknown>
 const attempt=gradeCoachAttempt(input.packId,input.diagnostic,input.transfer)
 if(!attempt)return reply({error:"Invalid exercise or answer choice."},400)
 const key=COACH_STATE_PREFIX+attempt.packId
 // One immutable first completed pair per pack. Duplicate requests cannot inflate progress.
 const {error}=await supabase.from("user_state").upsert({user_id:auth.user.id,state_key:key,state_value:attempt,updated_at:attempt.completedAt},{onConflict:"user_id,state_key",ignoreDuplicates:true})
 if(error)return reply({error:"Practice could not be saved. Your selections are still available to retry."},503)
 const {data:saved,error:readError}=await supabase.from("user_state").select("state_value").eq("user_id",auth.user.id).eq("state_key",key).maybeSingle()
 const verified=readCoachAttempt(saved?.state_value,attempt.packId)
 if(readError||!verified)return reply({error:"Save could not be verified. Please retry."},503)
 return reply({attempt:verified})
}
