"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, GraduationCap, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Links = { school:string|null;teachers:Array<{name:string;role:string}> }
export default function StudentTeacherLinksPage() {
  const [data,setData]=useState<Links|null>(null)
  const [error,setError]=useState("")
  useEffect(()=>{
    let active=true
    void fetch("/api/student/teacher-links",{cache:"no-store"}).then(async response=>{
      const body=await response.json() as Links & {error?:string}
      if(!response.ok)throw new Error(body.error||"Could not load teacher links")
      if(active)setData(body)
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not load teacher links")})
    return ()=>{active=false}
  },[])
  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <Button asChild variant="ghost"><Link href="/account"><ArrowLeft/>Account</Link></Button>
      <header><Badge variant="outline"><ShieldCheck className="size-3.5"/>School privacy</Badge><h1 className="mt-3 font-serif text-4xl font-bold">Teachers linked to your account</h1>
        <p className="mt-3 text-slate-600">Your school may assign teachers to review your academic preparation summaries. Teachers do not receive your private tutor conversations or full interview transcripts through this feature.</p></header>
      {error&&<Card><CardContent className="p-5 text-sm text-amber-800">{error}</CardContent></Card>}
      {!data&&!error&&<p className="text-sm text-slate-600">Loading school connections…</p>}
      {data&&<Card><CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><Users className="size-5"/>{data.school||"No school linked"}</CardTitle><CardDescription>{data.teachers.length? "These teachers can see your progress summary." : "No individual teacher currently has an assigned progress link."}</CardDescription></CardHeader>
        <CardContent className="space-y-3">{data.teachers.map((t,i)=><div className="flex items-center gap-3 rounded-xl border p-4" key={i}><GraduationCap className="size-5 text-[#147d91]"/><div><p className="font-semibold">{t.name}</p><p className="text-sm text-slate-500">{t.role==="school_admin"?"School administrator":"Teacher"}</p></div></div>)}
          <p className="text-xs leading-5 text-slate-500">If a link is incorrect or you have questions about school data sharing, contact your school administrator. The school's main account owner may also access school-wide summary information.</p>
        </CardContent>
      </Card>}
    </div>
  </main>
}
