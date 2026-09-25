"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getAppAdminAccess } from "@/lib/auth/admin"

const allowed=new Set(["open","in_progress","completed","rejected"])

export async function updatePrivacyRequestStatus(formData:FormData){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=typeof data?.claims?.sub==="string"?data.claims.sub:null
  const email=typeof data?.claims?.email==="string"?data.claims.email:null
  if(!userId)throw new Error("Not signed in")
  const access=await getAppAdminAccess(userId,email)
  if(!access.isAdmin)throw new Error("Not authorised")
  const id=String(formData.get("id")||"")
  const status=String(formData.get("status")||"")
  if(!id||!allowed.has(status))throw new Error("Invalid privacy request update")
  const admin=createAdminClient()
  const {error}=await admin.from("privacy_requests").update({status,updated_at:new Date().toISOString()}).eq("id",id)
  if(error)throw new Error("Could not update privacy request")
  revalidatePath("/admin/privacy-requests")
}
