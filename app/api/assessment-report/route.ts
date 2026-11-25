import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { PROFILE_KEY,PROGRESS_KEY } from "@/lib/personal-tutor"
import { coachPacks,COACH_STATE_PREFIX,readCoachAttempt,skillLabels } from "@/lib/academic-coach"
import { buildAssessmentReport,type AssessmentCoachRecord } from "@/lib/assessment-intelligence"

export const dynamic="force-dynamic"
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}})
export async function GET(){
 const supabase=await createClient()
 const {data:auth,error:authError}=await supabase.auth.getUser()
 if(authError||!auth.user)return reply({error:"Sign in to view your private assessment report."},401)
 const keys=[PROFILE_KEY,PROGRESS_KEY,...coachPacks.map(p=>COACH_STATE_PREFIX+p.id)]
 const {data,error}=await supabase.from("user_state").select("state_key,state_value").eq("user_id",auth.user.id).in("state_key",keys)
 if(error)return reply({error:"Your saved evidence could not be loaded. Please retry."},503)
 const state=new Map<string,unknown>((data??[]).map(row=>[row.state_key,row.state_value]))
 const coach:AssessmentCoachRecord[]=coachPacks.flatMap(p=>{
  const a=readCoachAttempt(state.get(COACH_STATE_PREFIX+p.id),p.id)
  return a?[{id:p.id,skill:skillLabels[p.skill],title:p.title,course:p.course,review:p.review,date:a.completedAt,diagnosticCorrect:a.diagnosticCorrect,transferCorrect:a.transferCorrect}]:[]
 })
 return reply(buildAssessmentReport(state.get(PROGRESS_KEY),state.get(PROFILE_KEY),coach))
}
