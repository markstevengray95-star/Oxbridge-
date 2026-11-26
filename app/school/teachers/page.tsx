"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ClipboardCopy, GraduationCap, Loader2, RefreshCw, ShieldCheck, UserPlus, Users, UserX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Member = {
  userId: string; displayName: string; email: string; emailConfirmed: boolean
  role: "owner" | "teacher" | "school_admin" | null
  joinedAt: string; targetCourse: string | null; applicationYear: number | null
}
type Connection = { teacher_user_id: string; student_user_id: string; linked_at: string }
type StaffData = {
  organization:{id:string;name:string;joinCode:string|null}
  permission:{role:string;canManageRoles:boolean;canManageLinks:boolean}
  members:Member[];links:Connection[]
}
type Action = { action:string;teacherUserId:string;studentUserId?:string;role?:string }

export default function SchoolTeachersPage() {
  const [data,setData] = useState<StaffData|null>(null)
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState("")
  const [error,setError] = useState("")
  const [message,setMessage] = useState("")
  const [teacherId,setTeacherId] = useState("")
  const [studentId,setStudentId] = useState("")
  const [search,setSearch] = useState("")

  async function load() {
    setLoading(true);setError("")
    try {
      const response=await fetch("/api/school/staff",{cache:"no-store"})
      const payload=await response.json() as StaffData & {error?:string}
      if(!response.ok)throw new Error(payload.error||"Could not load teacher management")
      setData(payload)
      if(!teacherId || !payload.members.some(x => x.userId===teacherId && (x.role==="teacher"||x.role==="school_admin"))) {
        setTeacherId(payload.members.find(x => x.role==="teacher"||x.role==="school_admin")?.userId||"")
      }
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not load teacher management")}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  async function change(payload:Action,confirmation?:string) {
    if(confirmation&&!window.confirm(confirmation))return
    setBusy(payload.action+payload.teacherUserId+(payload.studentUserId||""));setMessage("");setError("")
    try{
      const response=await fetch("/api/school/staff",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)
      })
      const result=await response.json() as {error?:string}
      if(!response.ok)throw new Error(result.error||"Could not update teacher access")
      setMessage(payload.action==="grantRole"?"Staff permissions updated.":payload.action==="revokeRole"?"Staff permissions removed.":"Student links updated.")
      if (payload.action === "linkStudent") setStudentId("")
      await load()
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not update teacher access")}
    finally{setBusy("")}
  }

  const staff=useMemo(()=>data?.members.filter(x=>x.role==="teacher"||x.role==="school_admin")??[],[data])
  const students=useMemo(()=>data?.members.filter(x=>x.role===null)??[],[data])
  const candidates=useMemo(()=>{
    const term=search.trim().toLowerCase()
    return data?.members.filter(x=>x.role!=="owner"&&(!term||[x.email,x.displayName].some(s=>s.toLowerCase().includes(term))))??[]
  },[data,search])
  const assigned=new Set((data?.links??[]).filter(x=>x.teacher_user_id===teacherId).map(x=>x.student_user_id))
  const teacher=data?.members.find(m=>m.userId===teacherId)
  const linksForTeacher=(data?.links??[]).filter(x=>x.teacher_user_id===teacherId)

  return <main className="fellow-ui min-h-screen text-[#172b3a]">
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost"><Link href="/school-seats"><ArrowLeft/>School workspace</Link></Button>
        <div className="flex gap-2"><Button asChild variant="outline"><Link href="/teacher-dashboard"><GraduationCap/>Teacher dashboard</Link></Button><Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw/>Refresh</Button></div>
      </header>

      <section className="fellow-page-header"><Badge variant="outline"><ShieldCheck className="size-3.5"/>School staff permissions</Badge>
        <h1 className="fellow-page-title mt-3">Teachers and assigned students</h1>
        <p className="mt-3 max-w-3xl text-slate-600">Give teachers their own staff access and link the students they are responsible for. Teachers see progress summaries for their linked students, not private tutor conversations or interview transcripts.</p>
        {data&&<p className="mt-2 text-sm font-semibold text-[#326d71]">{data.organization.name} · Signed in as {data.permission.role.replace("_"," ")}</p>}
      </section>
      {error&&<div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{error}</div>}
      {message&&<div role="status" className="rounded-xl border border-[#b9d8dd] bg-[#edf7f8] p-4 text-sm text-[#234754]">{message}</div>}

      {loading&&!data?<Card><CardContent className="flex items-center gap-2 p-6"><Loader2 className="animate-spin"/>Loading school staff…</CardContent></Card>:data?<>
        <Card><CardHeader><CardTitle className="font-serif text-2xl">1. Give each teacher their own login</CardTitle><CardDescription>Teachers create a normal Fellow account and join your school using its join code. The school owner then grants Teacher or School Admin access. No passwords need to be shared.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {data.organization.joinCode?<div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#edf7f8] p-4">
              <span className="font-mono text-xl font-bold tracking-wider">{data.organization.joinCode}</span>
              <Button variant="outline" size="sm" onClick={()=>void navigator.clipboard.writeText(data.organization.joinCode||"")}><ClipboardCopy/>Copy school join code</Button>
            </div>:<p className="text-sm text-slate-600">Ask the school owner for the join code. School administrators cannot reveal or regenerate it.</p>}
            <p className="text-sm text-slate-600">Share the <Link href="/login" className="font-semibold text-[#326d71] underline">account registration page</Link> and the code with trusted teachers. Students must join the same school workspace before you can assign them to staff. Joining a school allows authorised staff to see learning progress summaries.</p>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><Users className="size-5 text-[#326d71]"/><CardDescription>Staff accounts</CardDescription><CardTitle className="font-serif text-4xl">{staff.length}</CardTitle></CardHeader></Card>
          <Card><CardHeader><GraduationCap className="size-5 text-[#326d71]"/><CardDescription>Students in school</CardDescription><CardTitle className="font-serif text-4xl">{students.length}</CardTitle></CardHeader></Card>
          <Card><CardHeader><ShieldCheck className="size-5 text-[#326d71]"/><CardDescription>Teacher–student links</CardDescription><CardTitle className="font-serif text-4xl">{data.links.length}</CardTitle></CardHeader></Card>
        </section>

        <Card><CardHeader><CardTitle className="font-serif text-2xl">2. Set staff permissions</CardTitle><CardDescription>Teacher: sees only their assigned students. School Admin: also manages teacher–student links. Neither role can access platform-wide administration or safeguarding records.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <input className="h-10 w-full rounded-lg border bg-white px-3 text-sm" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a school member by name or email"/>
            {candidates.map(member=><div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div><p className="font-semibold">{member.displayName}</p><p className="text-sm text-slate-500">{member.email}</p>
                <Badge variant="outline">{member.role?member.role.replace("_"," "):"Student / member"}</Badge>
                {!member.emailConfirmed&&<p className="mt-1 text-xs text-amber-700">Email confirmation required before promotion</p>}
              </div>
              {data.permission.canManageRoles?<div className="flex flex-wrap gap-2">
                <Button size="sm" variant={member.role==="teacher"?"default":"outline"} disabled={!member.emailConfirmed||Boolean(busy)} onClick={()=>void change({action:"grantRole",teacherUserId:member.userId,role:"teacher"})}><UserPlus/>Teacher</Button>
                <Button size="sm" variant={member.role==="school_admin"?"default":"outline"} disabled={!member.emailConfirmed||Boolean(busy)} onClick={()=>void change({action:"grantRole",teacherUserId:member.userId,role:"school_admin"},"School Admins can assign students to any teacher in this school. Grant this permission?")}><ShieldCheck/>School Admin</Button>
                {member.role&&<Button size="sm" variant="destructive" disabled={Boolean(busy)} onClick={()=>void change({action:"revokeRole",teacherUserId:member.userId},"Remove this teacher's staff access and all their assigned student links?")}><UserX/>Revoke</Button>}
              </div>:<p className="text-xs text-slate-500">Only the school owner can change staff roles.</p>}
            </div>)}
            {!candidates.length&&<p className="text-sm text-slate-500">No matching members. Ask teachers to create an account and join your school first.</p>}
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="font-serif text-2xl">3. Link students to teachers</CardTitle><CardDescription>Select a teacher and add or remove students. Each teacher can then track only those students on their personal Teacher Dashboard. A student can have more than one teacher.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1.5"><span className="text-sm font-semibold">Teacher</span><select className="h-10 w-full rounded-lg border bg-white px-3 text-sm" value={teacherId} onChange={e=>{setTeacherId(e.target.value);setStudentId("")}}>
              <option value="">Choose a teacher</option>{staff.map(s=><option key={s.userId} value={s.userId}>{s.displayName} ({s.role==="school_admin"?"School Admin":"Teacher"})</option>)}
            </select></label>
            {teacher&&<>
              <div className="rounded-xl bg-[#edf7f8] p-4 text-sm"><strong>{teacher.displayName}</strong> currently has {linksForTeacher.length} linked student{linksForTeacher.length===1?"":"s"}.</div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <select aria-label="Student to link" className="h-10 rounded-lg border bg-white px-3 text-sm" value={studentId} onChange={e=>setStudentId(e.target.value)}>
                  <option value="">Choose a student to link</option>{students.filter(s=>!assigned.has(s.userId)).map(s=><option key={s.userId} value={s.userId}>{s.displayName} ({s.email})</option>)}
                </select>
                <Button disabled={!studentId||Boolean(busy)} onClick={()=>void change({action:"linkStudent",teacherUserId:teacherId,studentUserId:studentId})}><UserPlus/>Link student</Button>
              </div>
              <div className="space-y-2">{students.filter(s=>assigned.has(s.userId)).map(s=><div key={s.userId} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><strong>{s.displayName}</strong><p className="text-sm text-slate-500">{s.email}</p></div><Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={()=>void change({action:"unlinkStudent",teacherUserId:teacherId,studentUserId:s.userId},"Remove this student from the teacher's progress dashboard?")}><UserX/>Unlink</Button></div>)}</div>
            </>}
            {!staff.length&&<p className="text-sm text-slate-600">Promote a confirmed school member to Teacher first.</p>}
          </CardContent>
        </Card>
      </>:null}
    </div>
  </main>
}
