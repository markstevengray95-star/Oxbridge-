import Link from "next/link"
import { redirect } from "next/navigation"
import { BarChart3, ShieldCheck, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAppAdminAccess } from "@/lib/auth/admin"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type Row={question_id:string|null;test_name:string|null;subject:string|null;score:number|null;max_score:number|null;created_at:string}
type Cal={id:string;test:string;subject:string;attempts:number;accuracy:number;classification:string}

export default async function QuestionCalibrationPage(){
 const supabase=await createClient();const {data}=await supabase.auth.getClaims();const claims=data?.claims;const userId=typeof claims?.sub==="string"?claims.sub:null;const email=typeof claims?.email==="string"?claims.email:null;if(!userId)redirect("/admin/login");const access=await getAppAdminAccess(userId,email);if(!access.isAdmin)redirect("/admin/login?error=not-authorized")
 const admin=createAdminClient();const {data:attempts,error}=await admin.from("practice_attempts").select("question_id,test_name,subject,score,max_score,created_at").not("question_id","is",null).order("created_at",{ascending:false}).limit(5000)
 const grouped=new Map<string,{test:string;subject:string;attempts:number;score:number;max:number}>();for(const row of (attempts??[]) as Row[]){const id=row.question_id||"unknown";const g=grouped.get(id)||{test:row.test_name||"Practice",subject:row.subject||"",attempts:0,score:0,max:0};g.attempts++;g.score+=Number(row.score||0);g.max+=Number(row.max_score||0);grouped.set(id,g)}
 const rows:Cal[]=Array.from(grouped.entries()).map(([id,g])=>{const accuracy=g.max>0?Math.round(g.score/g.max*100):0;const classification=g.attempts<5?"Needs more data":accuracy>=90?"Possibly too easy":accuracy<=25?"Possibly too hard":"Useful range";return{id,test:g.test,subject:g.subject,attempts:g.attempts,accuracy,classification}}).sort((a,b)=>b.attempts-a.attempts)
 const enough=rows.filter(r=>r.attempts>=5),tooEasy=enough.filter(r=>r.accuracy>=90).length,tooHard=enough.filter(r=>r.accuracy<=25).length
 return <main className="min-h-screen bg-[#f3f6f6] px-4 py-8 text-[#172b3a]"><div className="mx-auto max-w-7xl space-y-5"><div className="flex items-center justify-between"><Button asChild variant="ghost"><Link href="/admin">← Admin</Link></Button><Badge><ShieldCheck className="mr-1 size-3"/>Admin only</Badge></div><section><h1 className="font-serif text-4xl font-bold">Question Difficulty Calibration</h1><p className="mt-2 max-w-3xl text-slate-600">Uses real saved practice attempts to estimate observed question difficulty. It flags extremes for human review rather than automatically rewriting questions.</p></section>{error&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Could not load attempt data: {error.message}</div>}<div className="grid gap-4 md:grid-cols-4"><Metric label="Questions with usage" value={rows.length}/><Metric label="Calibratable (5+ attempts)" value={enough.length}/><Metric label="Possibly too easy" value={tooEasy}/><Metric label="Possibly too hard" value={tooHard}/></div><Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="size-5"/>Observed performance</CardTitle><CardDescription>Accuracy is aggregate practice evidence, not an official test difficulty statistic.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="p-2">Question</th><th className="p-2">Test</th><th className="p-2">Attempts</th><th className="p-2">Accuracy</th><th className="p-2">Signal</th></tr></thead><tbody>{rows.slice(0,300).map(r=><tr key={r.id} className="border-b"><td className="p-2 font-mono text-xs">{r.id}</td><td className="p-2">{r.test}</td><td className="p-2">{r.attempts}</td><td className="p-2"><div className="flex items-center gap-2"><div className="h-2 w-24 rounded bg-slate-100"><div className="h-2 rounded bg-[#147d91]" style={{width:`${r.accuracy}%`}}/></div>{r.accuracy}%</div></td><td className="p-2"><Badge variant="outline">{r.classification}</Badge></td></tr>)}</tbody></table></CardContent></Card></div></main>
}
function Metric({label,value}:{label:string;value:number}){return <Card><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="font-serif text-3xl">{value}</CardTitle></CardHeader><CardContent><Target className="size-4 text-[#147d91]"/></CardContent></Card>}
