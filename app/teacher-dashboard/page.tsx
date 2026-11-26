"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Activity, ArrowLeft, BarChart3, BookOpenCheck, GraduationCap, Loader2, RefreshCw, Search, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {filterTeacherRoster,followUpStudents,teacherViews,type TeacherView} from "@/lib/staff-dashboard"

type Skill = { label?:string;score?:number;status?:string }
type Student = {
  userId:string;displayName:string;targetCourse:string|null;targetUniversity:string|null
  applicationYear:number|null;preparationScore:number|null
  interviewCount:number;fullPaperCount:number;essayCount:number
  testsCompleted:number;averageTestAccuracy:number|null
  assignmentCompleted:number;assignmentTotal:number;assignmentPercent:number|null
  currentPriority:Skill|null;strongestArea:Skill|null
  lastActiveAt:string|null;activeThisWeek:boolean;recordedActiveSeconds:number;usageSessions:number
}
type Data = {
  organization:{name:string;role:"owner"|"school_admin"|"teacher"}
  summary:{assigned:number;activeThisWeek:number;averagePreparation:number|null;needsFollowUp:number;testsCompleted:number}
  students:Student[]
  telemetryStatus?:string
}
function lastActive(value:string|null) {
  if(!value)return "No activity recorded"
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return "No activity recorded"
  return date.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})
}
function activeDuration(value:number){const minutes=Math.floor(Math.max(0,value)/60);return minutes>=60?Math.floor(minutes/60)+"h "+minutes%60+"m":minutes+"m"}
function csvCell(value:unknown) {return '"'+String(value??"").replaceAll('"','""')+'"'}

export default function TeacherDashboardPage() {
  const [data,setData]=useState<Data|null>(null)
  const [error,setError]=useState("")
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState("")
  const [view,setView]=useState<TeacherView>("all")
  const [selectedId,setSelectedId]=useState("")

  async function load() {
    setLoading(true);setError("")
    try{
      const response=await fetch("/api/teacher/progress",{cache:"no-store"})
      const payload=await response.json() as Data & {error?:string}
      if(!response.ok)throw new Error(payload.error||"Could not load assigned students")
      setData(payload)
      setSelectedId(current => payload.students.some(s=>s.userId===current)?current:payload.students[0]?.userId||"")
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not load student progress");setData(null)}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  const students=useMemo(()=>filterTeacherRoster(data?.students??[],search,view),[search,view,data])
  const followUp=useMemo(()=>followUpStudents(data?.students??[]),[data])
  const selected=students.find(s=>s.userId===selectedId)??students[0]??null

  function exportCsv(){
    if(!data)return
    const rows=[
      ["Student","University","Course","Application year","Preparation score","Interviews","Completed tests","Average test accuracy","Full papers","Essays","Assignments completed","Assignments total","Last active","Recorded in-app minutes","Usage sessions","Priority","Strength"],
      ...students.map(s=>[s.displayName,s.targetUniversity,s.targetCourse,s.applicationYear,s.preparationScore,s.interviewCount,s.testsCompleted,s.averageTestAccuracy,s.fullPaperCount,s.essayCount,s.assignmentCompleted,s.assignmentTotal,s.lastActiveAt,Math.round((s.recordedActiveSeconds||0)/60),s.usageSessions||0,s.currentPriority?.label,s.strongestArea?.label]),
    ]
    const blob=new Blob([rows.map(row=>row.map(csvCell).join(",")).join("\n")],{type:"text/csv;charset=utf-8"})
    const url=URL.createObjectURL(blob),a=document.createElement("a")
    a.href=url;a.download="fellow-assigned-student-progress.csv";a.click();URL.revokeObjectURL(url)
  }

  return <main className="fellow-ui min-h-screen">
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Fellow home</Link></Button>
        <div className="flex flex-wrap gap-2">{data&&data.organization.role!=="teacher"&&<Button asChild variant="outline"><Link href="/school/teachers"><Users/>Manage teachers</Link></Button>}<Button variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw/>Refresh</Button></div>
      </header>

      <section className="fellow-page-header"><Badge variant="outline"><GraduationCap className="size-3.5"/>Teacher dashboard</Badge>
        <h1 className="fellow-page-title mt-3">Your students' preparation progress</h1>
        <p className="fellow-description mt-3">See students you are authorized to monitor, including saved practice, completed tests and session activity. Open a student record to review their synced interview transcripts and individual assessment answers. All detailed access is audited.</p>
        {data&&<p className="mt-2 text-sm font-semibold text-[#326d71]">{data.organization.name} · {data.organization.role.replace("_"," ")}</p>}
      </section>

      {data?.telemetryStatus&&<p className="fellow-panel p-3 text-xs text-slate-600">{data.telemetryStatus}</p>}
      {error&&<Card><CardHeader><CardTitle>Teacher access is not yet available</CardTitle><CardDescription>{error}</CardDescription></CardHeader><CardContent><p className="mb-3 text-sm text-slate-600">Ask the school administrator to issue you a teacher login or to add your existing account to the school and assign students.</p><Button asChild variant="outline"><Link href="/school-seats">Join a school workspace</Link></Button></CardContent></Card>}
      {loading&&!data?<Card><CardContent className="flex items-center gap-2 p-6"><Loader2 className="animate-spin"/>Loading linked student progress…</CardContent></Card>:data?<>
        <section aria-label="Linked student summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Card><CardHeader><Users className="size-5 text-[#326d71]"/><CardDescription>Assigned students</CardDescription><CardTitle className="font-serif text-4xl">{data.summary.assigned}</CardTitle></CardHeader></Card>
          <Card><CardHeader><Activity className="size-5 text-[#326d71]"/><CardDescription>Active this week</CardDescription><CardTitle className="font-serif text-4xl">{data.summary.activeThisWeek}</CardTitle></CardHeader></Card>
          <Card><CardHeader><BarChart3 className="size-5 text-[#326d71]"/><CardDescription>Average preparation</CardDescription><CardTitle className="font-serif text-4xl">{data.summary.averagePreparation===null?"—":data.summary.averagePreparation+"%"}</CardTitle></CardHeader></Card>
          <Card><CardHeader><BookOpenCheck className="size-5 text-[#326d71]"/><CardDescription>No activity in past week</CardDescription><CardTitle className="font-serif text-4xl">{data.summary.needsFollowUp}</CardTitle></CardHeader></Card>
          <Card><CardHeader><GraduationCap className="size-5 text-[#326d71]"/><CardDescription>Practice tests completed</CardDescription><CardTitle className="font-serif text-4xl">{data.summary.testsCompleted}</CardTitle></CardHeader></Card>
        </section>

        <section aria-label="Teacher actions" className="fellow-panel p-5">
          <h2 className="fellow-section-title">Your next actions</h2><p className="fellow-description mt-1">Review recorded activity and manage students you have permission to support.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild><Link href="#teacher-roster"><BookOpenCheck/>Linked student progress</Link></Button>
            <Button asChild variant="outline"><Link href="/school-seats"><Users/>School access</Link></Button>
            {data.organization.role!=="teacher"&&<><Button asChild variant="outline"><Link href="/school-dashboard">Cohorts & assignments</Link></Button><Button asChild variant="outline"><Link href="/school-insights">Cohort insights</Link></Button><Button asChild variant="outline"><Link href="/school-reports">School reports</Link></Button></>}
          </div>
          <div className="mt-5 border-t pt-4"><h3 className="font-semibold">No recent recorded activity</h3><p className="mt-1 text-xs text-slate-600">Based on available account activity in the past week, not proof a student has done no independent study.</p>
          {followUp.length?<div className="mt-3 grid gap-2 sm:grid-cols-2">{followUp.map(s=><div key={s.userId} className="fellow-soft flex flex-wrap items-center justify-between gap-2 p-3"><div><p className="text-sm font-semibold">{s.displayName}</p><p className="text-xs text-slate-600">{s.targetCourse||"Course not set"} · {lastActive(s.lastActiveAt)}</p></div><Link className="fellow-link text-sm" href={"/teacher-student-progress?studentId="+encodeURIComponent(s.userId)}>Review evidence</Link></div>)}</div>:<p className="mt-3 text-sm text-slate-600">No students currently need this recorded-activity follow-up.</p>}
          </div>
        </section>

        <section id="teacher-roster" className="grid scroll-mt-24 gap-5 xl:grid-cols-[1.45fr_.9fr]">
          <Card className="fellow-panel"><CardHeader><div className="flex flex-wrap justify-between gap-3"><div><CardTitle className="font-serif text-2xl">School learner accounts</CardTitle><CardDescription>{data.organization.role==="teacher"?"Only students explicitly linked to this teacher account.":"School owner and administrator: students with active school seats."}</CardDescription></div><Button variant="outline" disabled={!students.length} onClick={exportCsv}>Export summary CSV</Button></div></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter linked student list">{teacherViews.map(item=><button key={item.id} type="button" aria-pressed={view===item.id} onClick={()=>{setView(item.id);setSelectedId("")}} className={"rounded-lg border px-3 py-2 text-xs font-semibold "+(view===item.id?"border-[#397c80] bg-[#e9f1ee] text-[#142d3e]":"bg-white text-slate-600")}>{item.label}</button>)}</div>
              <label className="relative block"><Search className="absolute left-3 top-3 size-4 text-slate-400"/><input className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm" value={search} onChange={e=>{setSearch(e.target.value);setSelectedId("")}} aria-label="Find a student by name, course or university" placeholder="Search by student, course or university" /></label>
              <p className="text-xs text-slate-600" role="status">Showing {students.length} of {data.students.length} authorised students. CSV exports the current filter.</p>
              <div className="overflow-x-auto"><table className="w-full min-w-[670px] text-left text-sm">
                <thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="p-3">Student</th><th className="p-3">Preparation</th><th className="p-3">Practice</th><th className="p-3">Assigned tasks</th><th className="p-3">Last activity</th></tr></thead>
                <tbody>{students.map(s=><tr key={s.userId} className={`border-b hover:bg-slate-50 ${selected?.userId===s.userId?"bg-[#e9f1ee]":""}`}>
                  <td className="p-3"><button type="button" aria-pressed={selected?.userId===s.userId} onClick={()=>setSelectedId(s.userId)} className="text-left font-semibold text-[#326d71] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2">{s.displayName}</button><p className="mt-1 text-xs text-slate-500">{s.targetCourse||"Course not set"}</p></td>
                  <td className="p-3">{s.preparationScore===null?"—":<div className="flex items-center gap-2"><Progress value={s.preparationScore} className="w-20"/><strong>{s.preparationScore}%</strong></div>}</td>
                  <td className="p-3 text-xs">{s.interviewCount} interviews<p>{s.testsCompleted} tests · {s.averageTestAccuracy===null?"—":s.averageTestAccuracy+"%"} average</p><p>{s.fullPaperCount} papers · {s.essayCount} essays</p></td>
                  <td className="p-3">{s.assignmentCompleted}/{s.assignmentTotal}{s.assignmentPercent!==null?<Progress className="mt-1 w-20" value={s.assignmentPercent}/>:null}</td>
                  <td className="p-3 text-xs"><Badge variant={s.activeThisWeek?"default":"outline"}>{lastActive(s.lastActiveAt)}</Badge></td>
                </tr>)}</tbody>
              </table></div>
              {!students.length&&<p className="p-4 text-center text-sm text-slate-500">{data.students.length?"No matching students.":"No students have been assigned to your account yet. Ask the school owner to link them under Manage teachers."}</p>}
            </CardContent>
          </Card>

          <Card className="fellow-panel"><CardHeader><CardTitle className="font-serif text-2xl">Student progress detail</CardTitle><CardDescription>Choose a student from the list.</CardDescription></CardHeader><CardContent>{selected?<div className="space-y-5">
            <div><h2 className="text-xl font-bold">{selected.displayName}</h2><p className="text-sm text-slate-500">{selected.targetUniversity||"University not selected"} · {selected.targetCourse||"Course not set"} {selected.applicationYear?(`· ${selected.applicationYear}`):""}</p></div>
            <div className="fellow-soft p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#234754]">Preparation score</p><p className="mt-2 font-serif text-3xl font-bold">{selected.preparationScore===null?"No baseline yet":selected.preparationScore+"%"}</p>{selected.preparationScore!==null&&<Progress className="mt-3" value={selected.preparationScore}/>}</div>
            <div className="space-y-2 text-sm"><p><strong>Current priority:</strong> {selected.currentPriority?.label||"Building a baseline"}</p><p><strong>Strongest area:</strong> {selected.strongestArea?.label||"Not enough evidence yet"}</p><p><strong>Interviews:</strong> {selected.interviewCount}</p><p><strong>Practice tests completed:</strong> {selected.testsCompleted}</p><p><strong>Average test accuracy:</strong> {selected.averageTestAccuracy===null?"No recorded tests":selected.averageTestAccuracy+"%"}</p><p><strong>Full papers:</strong> {selected.fullPaperCount}</p><p><strong>Essays:</strong> {selected.essayCount}</p><p><strong>School assignments:</strong> {selected.assignmentCompleted} of {selected.assignmentTotal} complete</p><p><strong>Last recorded activity:</strong> {lastActive(selected.lastActiveAt)}</p><p><strong>Instrumented activity:</strong> {activeDuration(selected.recordedActiveSeconds||0)} across {selected.usageSessions||0} sessions</p></div><Button asChild className="w-full"><Link href={"/teacher-student-progress?studentId="+encodeURIComponent(selected.userId)}><BookOpenCheck/>View saved tests, transcripts & activity</Link></Button>
            <p className="text-xs leading-5 text-slate-500">Scores are practice indicators, not university admissions predictions. Activity depends on account-linked saved records. Time estimates cannot verify focused study.</p>
          </div>:<p className="text-sm text-slate-500">Assign students to begin tracking.</p>}</CardContent></Card>
        </section>
      </>:null}
    </div>
  </main>
}
