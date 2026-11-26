import {NextResponse} from "next/server"
import {createClient} from "@/lib/supabase/server"
import {safeRecentPapers} from "@/lib/admissions-centre"
export const dynamic="force-dynamic"
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"}
export async function GET(){
 const supabase=await createClient()
 const {data:auth,error:authError}=await supabase.auth.getUser()
 if(authError||!auth.user)return NextResponse.json({error:"Sign in to see your saved test results."},{status:401,headers})
 const {data,error}=await supabase.from("test_results")
  .select("id,test,title,completed_at,raw_score,max_raw_marks")
  .eq("user_id",auth.user.id)
  .order("completed_at",{ascending:false})
  .limit(5)
 if(error)return NextResponse.json({error:"Recent test results could not be loaded."},{status:503,headers})
 return NextResponse.json({results:safeRecentPapers(data),asOf:new Date().toISOString(),note:"Recent account-synced paper results only. Other local practice may not have synced yet."},{headers})
}
