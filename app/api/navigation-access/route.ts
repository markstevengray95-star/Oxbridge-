import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase/admin"
import { isConfiguredAdminEmail } from "@/lib/auth/admin-access"
import { loadStaffScope } from "@/lib/school/teacher-access"
export const dynamic="force-dynamic"
export async function GET(){
 const supabase=await createClient()
 const {data,error}=await supabase.auth.getUser()
 const access={signedIn:false,staff:false,manage:false,owner:false,admin:false}
 if(!error&&data.user){
  access.signedIn=true
  access.admin=isConfiguredAdminEmail(data.user.email)
  if(hasSupabaseAdminConfig())try{
   const admin=createAdminClient()
   const scope=await loadStaffScope(admin,data.user.id)
   access.staff=Boolean(scope)
   access.manage=Boolean(scope?.canManageLinks)
   access.owner=Boolean(scope?.isOwner)
   const {data:cohorts}=await admin.from("school_cohorts").select("id").eq("owner_user_id",data.user.id).limit(1)
   if(cohorts?.length)access.owner=true
  }catch{}
 }
 return NextResponse.json(access,{headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}})
}
