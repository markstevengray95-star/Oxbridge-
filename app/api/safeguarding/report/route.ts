import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const categories = new Set(["safety","bullying","inappropriate-content","privacy","school-concern","other"])

export async function POST(request:Request){
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const claims=data?.claims
  const userId=typeof claims?.sub==="string"?claims.sub:null
  if(!userId) return NextResponse.json({error:"Please sign in before submitting a safeguarding report. If you cannot sign in, use the safeguarding contact shown on the page."},{status:401})

  let body:{category?:unknown;details?:unknown;contactRequested?:unknown}
  try{body=await request.json()}catch{return NextResponse.json({error:"The report could not be read."},{status:400})}
  const category=typeof body.category==="string"?body.category:"other"
  const details=typeof body.details==="string"?body.details.trim():""
  const contactRequested=body.contactRequested===true
  if(!categories.has(category)) return NextResponse.json({error:"Choose a valid concern category."},{status:400})
  if(details.length<10||details.length>3000) return NextResponse.json({error:"Please give a brief description between 10 and 3000 characters."},{status:400})

  const {error}=await supabase.from("safeguarding_reports").insert({user_id:userId,category,details,contact_requested:contactRequested,status:"open"})
  if(error){
    console.error("Could not store safeguarding report",error)
    return NextResponse.json({error:"The secure safeguarding queue is not available yet. Please use the safeguarding contact shown on the page."},{status:503})
  }
  return NextResponse.json({message:"Your concern has been recorded for human review. If the situation is urgent, also tell a trusted adult or use the appropriate emergency service."})
}
