import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const types=new Set(["access","correction","erasure","restriction","objection","portability","other"])

export async function POST(request:Request){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=typeof data?.claims?.sub==="string"?data.claims.sub:null
  if(!userId) return NextResponse.json({error:"Sign in to submit a privacy-rights request."},{status:401})
  if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({error:"Invalid request origin."},{status:403})
  let body:{requestType?:unknown;details?:unknown}
  try{const raw=await request.text();if(raw.length>16000)throw Error();body=JSON.parse(raw) as typeof body;if(!body||typeof body!=="object"||Array.isArray(body))throw Error()}catch{return NextResponse.json({error:"The request could not be read."},{status:400})}
  const requestType=typeof body.requestType==="string"?body.requestType:"other"
  const details=typeof body.details==="string"?body.details.trim():""
  if(!types.has(requestType)) return NextResponse.json({error:"Choose a valid request type."},{status:400})
  if(details.length>3000) return NextResponse.json({error:"Keep the request under 3000 characters."},{status:400})
  const {error}=await supabase.from("privacy_requests").insert({user_id:userId,request_type:requestType,details:details||null,status:"open"})
  if(error){console.error("Privacy request insert failed",{code:error.code});return NextResponse.json({error:"The privacy request queue is not available yet. Please use the privacy contact in the Privacy Notice."},{status:503})}
  return NextResponse.json({message:"Your privacy-rights request has been recorded for human review."})
}
