"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import { ArrowLeft, CheckCircle2, ClipboardCopy, GraduationCap, KeyRound, Link2, Loader2, School, ShieldCheck, Users, UserPlus, UserX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type SchoolRow={id:string;name:string;seat_limit:number;status:string;join_code:string}
type AccountRow={userId:string;username:string;displayName:string;active:boolean;schoolId:string|null;role?:string|null}
type StudentLink={organization_id:string;teacher_user_id:string;student_user_id:string;linked_at:string}
type Data={schools:SchoolRow[];teachers:AccountRow[];students:AccountRow[];links:StudentLink[]}
type Created={username:string;password:string;displayName:string;schoolName:string;role:string}
type Action={action:string;schoolId:string;teacherUserId?:string;studentUserId?:string;username?:string;displayName?:string;password?:string;role?:string}

export default function AdminManagedSchoolLoginsPage(){
  const [data,setData]=useState<Data|null>(null)
  const [schoolId,setSchoolId]=useState("")
  const [schoolName,setSchoolName]=useState("")
  const [username,setUsername]=useState("")
  const [displayName,setDisplayName]=useState("")
  const [password,setPassword]=useState("")
  const [resetTarget,setResetTarget]=useState("")
  const [resetPassword,setResetPassword]=useState("")
  const [role,setRole]=useState<"teacher"|"school_admin">("teacher")
  const [teacherId,setTeacherId]=useState("")
  const [studentId,setStudentId]=useState("")
  const [linkStudentId,setLinkStudentId]=useState("")
  const [created,setCreated]=useState<Created|null>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState("")
  const [notice,setNotice]=useState("")

  async function load(){
    setLoading(true);setError("")
    try{
      const res=await fetch("/api/admin/managed-school-logins",{cache:"no-store"})
      const result=await res.json() as Data&{error?:string}
      if(!res.ok)throw new Error(result.error||"Could not load managed school accounts")
      setData(result)
      setSchoolId(prev=>result.schools.some(s=>s.id===prev)?prev:(result.schools[0]?.id||""))
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not load managed school accounts")}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  const school=data?.schools.find(s=>s.id===schoolId)
  const teachers=useMemo(()=>(data?.teachers||[]).filter(t=>t.schoolId===schoolId&&t.active),[data,schoolId])
  const attachedStudents=useMemo(()=>(data?.students||[]).filter(s=>s.schoolId===schoolId&&s.active),[data,schoolId])
  const attachable=useMemo(()=>(data?.students||[]).filter(s=>!s.schoolId&&s.active),[data])
  const links=useMemo(()=>(data?.links||[]).filter(l=>l.organization_id===schoolId),[data,schoolId])
  const currentTeacher=teachers.find(t=>t.userId===teacherId)||teachers[0]||null
  const linkedStudents=currentTeacher?links.filter(l=>l.teacher_user_id===currentTeacher.userId):[]
  const existingLinks=new Set(linkedStudents.map(l=>l.student_user_id))
  const studentById=new Map((data?.students||[]).map(s=>[s.userId,s]))

  async function api(body:Action){
    const res=await fetch("/api/admin/managed-school-logins",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
    })
    const result=await res.json() as {error?:string;ok?:boolean;teacher?:{username:string;displayName:string;role:string;schoolName:string}}
    if(!res.ok)throw new Error(result.error||"Could not update school accounts")
    return result
  }
  async function doAction(body:Action,message:string){
    setBusy(true);setError("");setNotice("")
    try{await api(body);setNotice(message);await load()}
    catch(cause){setError(cause instanceof Error?cause.message:"Could not update school accounts")}
    finally{setBusy(false)}
  }

  async function createSchool(event:FormEvent){
    event.preventDefault()
    setBusy(true);setError("");setNotice("")
    try{
      const r=await fetch("/api/school",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"createSchool"})})
      const response=await r.json() as {error?:string}
      if(!r.ok)throw new Error(response.error||"Could not create school")
      const name=schoolName.trim()
      if(name){
        const named=await fetch("/api/school",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"updateSchoolName",name})})
        if(!named.ok)throw new Error("School created, but its name could not be saved. Rename it in School Workspace.")
      }
      setNotice("School workspace created. You can now issue teacher accounts and attach practice students.")
      await load()
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not create school")}
    finally{setBusy(false)}
  }
  async function createTeacher(event:FormEvent){
    event.preventDefault()
    if(!school)return
    setBusy(true);setError("");setNotice("");setCreated(null)
    const chosenPassword=password
    try{
      const result=await api({action:"createTeacher",schoolId,username,displayName,password:chosenPassword,role})
      if(!result.teacher)throw new Error("Teacher was created but the account details could not be displayed")
      setCreated({...result.teacher,password:chosenPassword})
      setNotice("Teacher account created and linked to the school. Copy the login credentials below.")
      setUsername("");setDisplayName("");setPassword("")
      await load()
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not create teacher")}
    finally{setBusy(false)}
  }
  async function copyCreated(){
    if(!created)return
    await navigator.clipboard.writeText(`Fellow teacher login\nSign in: ${window.location.origin}/practice-login\nSchool: ${created.schoolName}\nUsername: ${created.username}\nPassword: ${created.password}`)
    setNotice("Teacher login details copied. Share them privately with the intended teacher.")
  }
  async function resetTeacher(t:AccountRow){
    if(resetPassword.length<8||resetPassword.length>128){setError("Password must be 8–128 characters");return}
    setBusy(true);setError("");setNotice("")
    try{
      await api({action:"resetTeacherPassword",schoolId,teacherUserId:t.userId,password:resetPassword})
      setCreated({username:t.username,password:resetPassword,displayName:t.displayName,role:t.role||"teacher",schoolName:school?.name||""})
      setNotice("Teacher password updated. Copy the new login details securely.")
      setResetTarget("");setResetPassword("")
      await load()
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not reset teacher password")}
    finally{setBusy(false)}
  }
  async function changeRole(t:AccountRow,next:"teacher"|"school_admin"){
    if(!window.confirm(`Change ${t.username} to ${next==="teacher"?"Teacher":"School Admin"}? School Admins can manage teacher–student links.`))return
    await doAction({action:"setTeacherRole",schoolId,teacherUserId:t.userId,role:next},"Teacher permissions updated.")
  }

  return <main className="min-h-screen bg-[#f5f7f7] px-4 py-8 text-[#172b3a] sm:px-6">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost"><Link href="/admin"><ArrowLeft/>Admin dashboard</Link></Button>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/admin/practice-access"><KeyRound/>Practice logins</Link></Button>
          <Button asChild variant="outline"><Link href="/teacher-dashboard"><GraduationCap/>Teacher progress</Link></Button>
          <Button variant="outline" onClick={()=>void load()} disabled={loading||busy}>Refresh</Button>
        </div>
      </header>
      <section>
        <Badge variant="outline"><ShieldCheck className="size-3.5"/>Platform administrator</Badge>
        <h1 className="mt-3 font-serif text-4xl font-bold">Teacher and student logins</h1>
        <p className="mt-3 max-w-3xl text-slate-600">Create teacher usernames and passwords as easily as practice accounts. Link them to a school and attach existing practice students without changing those students' logins or saved progress.</p>
      </section>

      {error&&<div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{error}</div>}
      {notice&&<div role="status" className="rounded-xl border border-[#b5d8de] bg-[#edf7f8] p-4 text-sm text-[#234754]">{notice}</div>}
      {loading&&!data&&<Card><CardContent className="flex items-center gap-2 p-6"><Loader2 className="animate-spin"/>Loading school accounts…</CardContent></Card>}

      {data&&<>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><School className="size-5"/>1. Select or create a school</CardTitle><CardDescription>Staff and students must be members of the same school before progress can be shared.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {data.schools.length?<>
              <label className="block space-y-1.5"><span className="text-sm font-semibold">School workspace</span>
                <select className="h-11 w-full rounded-lg border bg-white px-3 text-sm" value={schoolId} onChange={e=>{setSchoolId(e.target.value);setStudentId("");setLinkStudentId("");setTeacherId("")}}>
                  {data.schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              {school&&<div className="flex flex-wrap gap-3 text-sm"><Badge variant="outline">{school.status}</Badge><Badge variant="outline">Capacity {school.seat_limit} accounts</Badge><span>School code: <strong className="font-mono">{school.join_code}</strong></span></div>}
            </>:<form className="flex flex-col gap-3 sm:flex-row" onSubmit={createSchool}>
              <label className="flex-1 space-y-1.5"><span className="text-sm font-semibold">School name</span><Input value={schoolName} onChange={e=>setSchoolName(e.target.value)} placeholder="Enter the school name" maxLength={120} required/></label>
              <Button className="self-end" disabled={busy||!schoolName.trim()}><School/>Create school</Button>
            </form>}
          </CardContent>
        </Card>

        {school&&<>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><UserPlus className="size-5"/>2. Create a teacher login</CardTitle><CardDescription>You choose their username and password. The teacher receives school access without needing an email registration.</CardDescription></CardHeader>
              <CardContent><form className="space-y-4" onSubmit={createTeacher}>
                <label className="block space-y-1"><span className="text-sm font-semibold">Teacher name</span><Input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={80} placeholder="Teacher display name" required/></label>
                <label className="block space-y-1"><span className="text-sm font-semibold">Username</span><Input value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} minLength={3} maxLength={32} autoCapitalize="none" autoCorrect="off" placeholder="e.g. mrs.smith" required/></label>
                <label className="block space-y-1"><span className="text-sm font-semibold">Initial password</span><Input value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength={8} maxLength={128} autoComplete="new-password" required/></label>
                <label className="block space-y-1"><span className="text-sm font-semibold">School role</span>
                  <select className="h-11 w-full rounded-lg border bg-white px-3 text-sm" value={role} onChange={e=>setRole(e.target.value as "teacher"|"school_admin")}>
                    <option value="teacher">Teacher — assigned students only</option>
                    <option value="school_admin">School Admin — can also manage student links</option>
                  </select>
                </label>
                <Button disabled={busy||!username.trim()||password.length<8||!displayName.trim()} className="w-full">{busy?<><Loader2 className="animate-spin"/>Saving…</>:<><UserPlus/>Create teacher account</>}</Button>
              </form></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><Users className="size-5"/>3. Attach an existing practice student</CardTitle><CardDescription>Choose a username you already issued. Their current password, test results and previous work remain unchanged.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <label className="block space-y-1"><span className="text-sm font-semibold">Existing practice username</span>
                  <select className="h-11 w-full rounded-lg border bg-white px-3 text-sm" value={studentId} onChange={e=>setStudentId(e.target.value)}>
                    <option value="">Choose an account</option>
                    {attachable.map(s=><option value={s.userId} key={s.userId}>{s.displayName} ({s.username})</option>)}
                  </select>
                </label>
                <Button className="w-full" disabled={busy||!studentId} onClick={()=>void doAction({action:"attachStudent",schoolId,studentUserId:studentId},"Practice student added to the school. You can now assign them to a teacher.")}><Link2/>Link student to school</Button>
                <div className="rounded-xl bg-[#edf7f8] p-4 text-sm"><strong>{attachedStudents.length}</strong> practice student{attachedStudents.length===1?"":"s"} currently linked to this school.</div>
                <div className="max-h-44 space-y-2 overflow-auto">{attachedStudents.map(s=><div key={s.userId} className="flex justify-between gap-3 rounded-lg border bg-white p-2 text-sm"><span>{s.displayName}</span><span className="font-mono text-slate-500">{s.username}</span></div>)}</div>
                {!attachable.length&&<p className="text-sm text-slate-500">No unlinked practice usernames are available. Existing accounts in another school must be reviewed before moving them.</p>}
                <p className="text-xs leading-5 text-slate-500">School staff may access authorised progress summaries after you assign students. Make sure your school's pupil-data privacy information covers this use.</p>
              </CardContent>
            </Card>
          </div>

          {created&&<Card className="border-[#9acdd5] bg-[#edf7f8]">
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="size-5"/>Teacher login ready to give out</CardTitle><CardDescription>Copy the credentials securely now. Existing passwords cannot be viewed later; you can reset them.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="rounded-xl bg-white p-4">
                <p><strong>Sign in:</strong> /practice-login</p><p><strong>School:</strong> {created.schoolName}</p>
                <p><strong>Username:</strong> <span className="font-mono">{created.username}</span></p>
                <p><strong>Password:</strong> <span className="font-mono">{created.password}</span></p>
                <p><strong>Role:</strong> {created.role==="school_admin"?"School Admin":"Teacher"}</p>
              </div>
              <Button onClick={()=>void copyCreated()}><ClipboardCopy/>Copy teacher credentials</Button>
            </CardContent>
          </Card>}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-2xl"><GraduationCap className="size-5"/>4. Assign practice students to a teacher</CardTitle><CardDescription>Each teacher sees progress only for the students assigned to them. A student can have multiple teachers.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <label className="space-y-1"><span className="text-sm font-semibold">Teacher account</span>
                  <select className="h-11 w-full rounded-lg border bg-white px-3 text-sm" value={currentTeacher?.userId||""} onChange={e=>{setTeacherId(e.target.value);setLinkStudentId("")}}>
                    {!teachers.length&&<option value="">Create a teacher first</option>}
                    {teachers.map(t=><option key={t.userId} value={t.userId}>{t.displayName} ({t.username})</option>)}
                  </select>
                </label>
                <label className="space-y-1"><span className="text-sm font-semibold">School-linked student</span>
                  <select className="h-11 w-full rounded-lg border bg-white px-3 text-sm" value={linkStudentId} onChange={e=>setLinkStudentId(e.target.value)}>
                    <option value="">Choose a student</option>
                    {attachedStudents.filter(s=>!existingLinks.has(s.userId)).map(s=><option key={s.userId} value={s.userId}>{s.displayName} ({s.username})</option>)}
                  </select>
                </label>
                <Button className="self-end" disabled={busy||!currentTeacher||!linkStudentId} onClick={()=>void doAction({action:"linkStudent",schoolId,teacherUserId:currentTeacher?.userId,studentUserId:linkStudentId},"Teacher–student link saved.")}><Link2/>Assign</Button>
              </div>
              <div className="space-y-2">{linkedStudents.map(link=>{
                const student=studentById.get(link.student_user_id)
                return <div key={link.student_user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div><strong>{student?.displayName||"Student"}</strong><p className="font-mono text-xs text-slate-500">{student?.username||""}</p></div>
                  <Button size="sm" variant="outline" disabled={busy} onClick={()=>{if(window.confirm("Remove this student's link to this teacher? Their account and progress will remain saved."))void doAction({action:"unlinkStudent",schoolId,teacherUserId:currentTeacher?.userId,studentUserId:link.student_user_id},"Teacher–student link removed; student's account was preserved.")}}><UserX/>Unlink</Button>
                </div>
              })}</div>
              {!linkedStudents.length&&<p className="text-sm text-slate-500">No students are assigned to this teacher yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-serif text-2xl">Teacher accounts issued</CardTitle><CardDescription>Passwords are never read from the database. Reset a password to give a teacher new credentials.</CardDescription></CardHeader>
            <CardContent className="space-y-3">{teachers.length?teachers.map(t=><div key={t.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div><strong>{t.displayName}</strong><p className="font-mono text-sm text-slate-500">{t.username}</p><Badge variant="outline">{t.role==="school_admin"?"School Admin":"Teacher"}</Badge><p className="mt-1 text-xs text-slate-500">{links.filter(l=>l.teacher_user_id===t.userId).length} assigned students</p></div>
              <div className="flex flex-wrap gap-2">
                {t.role!=="school_admin"&&<Button variant="outline" size="sm" disabled={busy} onClick={()=>void changeRole(t,"school_admin")}>Make School Admin</Button>}
                {t.role==="school_admin"&&<Button variant="outline" size="sm" disabled={busy} onClick={()=>void changeRole(t,"teacher")}>Make Teacher</Button>}
                <Button size="sm" variant="outline" disabled={busy} onClick={()=>{setResetTarget(resetTarget===t.userId?"":t.userId);setResetPassword("")}}><KeyRound/>Reset password</Button>
              </div>
              {resetTarget===t.userId&&<div className="flex w-full flex-wrap items-center gap-2 border-t pt-3">
                <label className="flex-1 space-y-1"><span className="text-xs font-semibold">New password for {t.username}</span><Input type="password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)} minLength={8} maxLength={128} autoComplete="new-password" placeholder="8–128 characters"/></label>
                <Button className="self-end" disabled={busy||resetPassword.length<8} onClick={()=>void resetTeacher(t)}>Save new password</Button>
              </div>}
            </div>):<p className="text-sm text-slate-500">No teacher usernames have been created for this school yet.</p>}</CardContent>
          </Card>
        </>}
      </>}
    </div>
  </main>
}
