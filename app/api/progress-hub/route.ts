import {NextResponse} from "next/server"
import {createClient} from "@/lib/supabase/server"
import {PROGRESS_KEY} from "@/lib/personal-tutor"
import {buildProgressRecords,progressTotals} from "@/lib/progress-hub"
export const dynamic="force-dynamic"
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"}
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers})
export async function GET(){
 const supabase=await createClient()
 const {data:auth,error:authError}=await supabase.auth.getUser()
 if(authError||!auth.user)return reply({error:"Sign in to review your saved preparation."},401)
 const userId=auth.user.id
 try{
  const [state,interviews,tests]=await Promise.all([
   supabase.from("user_state").select("state_value").eq("user_id",userId).eq("state_key",PROGRESS_KEY).maybeSingle(),
   supabase.from("interview_sessions").select("id,course,duration_seconds,summary,overall_feedback,source_ref,created_at,interview_turns(turn_index,role,content,feedback)").eq("user_id",userId).order("created_at",{ascending:false}).limit(50),
   supabase.from("test_results").select("id,source_ref,test,form,title,completed_at,raw_score,max_raw_marks,total_questions,accuracy,payload").eq("user_id",userId).order("completed_at",{ascending:false}).limit(50),
  ])
  const availability={interviews:!interviews.error,tests:!tests.error,writing:!state.error}
  if(!Object.values(availability).some(Boolean))return reply({error:"Your preparation records are temporarily unavailable."},503)
  const records=buildProgressRecords(interviews.error?[]:interviews.data,tests.error?[]:tests.data,state.error?{}:state.data?.state_value)
  const notices:string[]=[]
  if(interviews.error)notices.push("Some interview records could not be loaded.")
  if(tests.error)notices.push("Some admissions-test results could not be loaded.")
  if(state.error)notices.push("Synced writing and device records could not be loaded.")
  return reply({records,availability,totals:progressTotals(records,availability),notices,asOf:new Date().toISOString(),limitNote:"Shows up to 150 recent records. Use full activity history for older records. Detailed answers and transcripts may be shortened in this overview."})
 }catch{return reply({error:"Could not load your preparation records."},503)}
}
