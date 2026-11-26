import {NextResponse} from "next/server"
import {createClient} from "@/lib/supabase/server"
import {PROFILE_KEY,PROGRESS_KEY} from "@/lib/personal-tutor"
import {coachPacks,COACH_STATE_PREFIX,chooseCoachPack,coachReviewSchedule,readCoachAttempt,type CoachAttempt} from "@/lib/academic-coach"
import {homeProfile,weeklyCount,type HomeSummary} from "@/lib/student-home"
export const dynamic="force-dynamic"
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}})
export async function GET(){
 const supabase=await createClient()
 const {data:auth,error:authError}=await supabase.auth.getUser()
 if(authError||!auth.user)return reply({error:"Sign in to view your preparation."},401)
 const userId=auth.user.id,now=new Date(),since=new Date(now.getTime()-7*86400000).toISOString(),asOf=now.toISOString()
 const keys=[PROFILE_KEY,PROGRESS_KEY,...coachPacks.map(p=>COACH_STATE_PREFIX+p.id)]
 const [state,profile,interviews,tests]=await Promise.all([
  supabase.from("user_state").select("state_key,state_value,updated_at").eq("user_id",userId).in("state_key",keys),
  supabase.from("profiles").select("target_course,target_university,application_year").eq("id",userId).maybeSingle(),
  supabase.from("interview_sessions").select("id",{count:"exact",head:true}).eq("user_id",userId).gte("created_at",since).lte("created_at",asOf),
  supabase.from("test_results").select("id",{count:"exact",head:true}).eq("user_id",userId).gte("completed_at",since).lte("completed_at",asOf),
 ])
 if(state.error||profile.error)return reply({error:"Your saved preparation could not be loaded. Please try again."},503)
 const rows=state.data??[],saved=new Map<string,unknown>(rows.map(r=>[r.state_key,r.state_value]))
 const goals=homeProfile(saved.get(PROFILE_KEY),profile.data)
 const attempts=coachPacks.map(p=>readCoachAttempt(saved.get(COACH_STATE_PREFIX+p.id),p.id)).filter((a):a is CoachAttempt=>a!==null)
 const recommendation=chooseCoachPack(saved.get(PROGRESS_KEY),goals,attempts,now)
 const pack=coachPacks.find(p=>p.id===recommendation.packId)
 const due=coachReviewSchedule(attempts,now).some(r=>r.due&&r.packId===pack?.id)
 const summary:HomeSummary={
  profile:goals,
  week:{interviews:interviews.error?null:interviews.count,tests:tests.error?null:tests.count,coaching:weeklyCount(attempts.map(a=>a.completedAt),now.getTime())},
  coach:pack?{title:pack.title,reason:recommendation.reason,due}:null,
  latest:rows.filter(r=>r.state_key===PROGRESS_KEY||r.state_key.startsWith(COACH_STATE_PREFIX)).map(r=>r.updated_at).filter((v):v is string=>typeof v==="string").sort().at(-1)??null,
  asOf,
 }
 return reply(summary)
}
