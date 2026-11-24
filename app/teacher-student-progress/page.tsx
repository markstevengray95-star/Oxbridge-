"use client"

import Link from "next/link"
import {useEffect,useState} from "react"
import {Activity,ArrowLeft,BookOpenCheck,Clock3,FileText,Loader2,RefreshCw,ShieldCheck,UserRound,Users} from "lucide-react"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from "@/components/ui/card"

type Question={
  number:number;questionId:string|null;section:string|null;difficulty:string|null
  prompt:string|null;answer:string|null;correctAnswer:string|null
  explanation:string|null;correct:boolean|null;rawMark:number|null;maxMarks:number|null
}
type Test={
  id:string;test:string|null;title:string|null;completedAt:string
  rawScore:number;maxRawMarks:number|null;totalQuestions:number;accuracy:number
  durationSeconds:number|null;review:Question[]
}
type Turn={
  turnIndex:number;role:"candidate"|"interviewer";content:string
  feedback:string|null;createdAt:string
}
type Interview={
  id:string;course:string|null;summary:string|null;createdAt:string;durationSeconds:number
  feedback:{score:number|null;source:string|null;practiceStatus:string|null;practiceTargetMinutes:number|null;priorities:Array<{target:string|null;task:string|null}>}
  turns:Turn[]
}
type ActivityEntry={page:string|null;kind:string;activeSeconds:number;at:string}
type UsageEntry={page:string|null;startedAt:string;lastSeenAt:string|null;activeSeconds:number;deviceClass:string|null}
type Detail={
  student:{userId:string;displayName:string;username:string|null;managedPractice:boolean;accessActive:boolean|null;targetCourse:string|null;targetUniversity:string|null;applicationYear:number|null}
  school:{name:string;role:string;assignedByTeacher:boolean}
  summary:{lastSignInAt:string|null;lastActiveAt:string|null;testsCompleted:number;averageAccuracy:number|null;interviewCount:number;transcriptTurns:number;candidateResponses:number;interviewSeconds:number;estimatedActiveSeconds:number;activitySessions:number;savedPracticeAttempts:number;lastCloudSyncAt:string|null}
  tests:Test[];interviews:Interview[];usage:UsageEntry[];activity:ActivityEntry[]
  dataStatus:{liveTrackingAvailable:boolean;legacyUsageAvailable:boolean;savedPracticeAvailable:boolean;incompleteHistory:boolean}
  notice:string
}
function date(value:string|null|undefined){
  if(!value||!Number.isFinite(Date.parse(value)))return "Not recorded"
  return new Date(value).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})
}
function elapsed(value:number|null|undefined){
  if(value===null||value===undefined)return "Not recorded"
  const n=Math.max(0,Math.floor(value))
  return n>=3600?Math.floor(n/3600)+"h "+Math.floor(n%3600/60)+"m":n>=60?Math.floor(n/60)+"m "+(n%60)+"s":n+"s"
}
export default function TeacherStudentProgressPage(){
  const [studentId,setStudentId]=useState("")
  const [detail,setDetail]=useState<Detail|null>(null)
  const [error,setError]=useState("")
  const [loading,setLoading]=useState(true)
  const [tab,setTab]=useState<"activity"|"tests"|"interviews">("activity")

  async function load(id:string){
    if(!id)return
    setLoading(true);setError("")
    try{
      const response=await fetch("/api/teacher/student-detail?studentId="+encodeURIComponent(id),{cache:"no-store"})
      const data=await response.json() as Detail&{error?:string}
      if(!response.ok)throw new Error(data.error||"Could not load authorized student tracking")
      setDetail(data)
    }catch(e){
      setDetail(null);setError(e instanceof Error?e.message:"Student tracking is unavailable")
    }finally{setLoading(false)}
  }
  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get("studentId")||""
    setStudentId(id)
    if(id)void load(id)
    else{setError("Choose a student from the teacher dashboard.");setLoading(false)}
  },[])

  const d=detail
  return <main className="min-h-screen bg-[#f4f7f7] text-[#172b3a]">
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild><Link href="/teacher-dashboard"><ArrowLeft/>Teacher dashboard</Link></Button>
        <div className="flex flex-wrap gap-2"><Badge variant="outline"><ShieldCheck className="size-3.5"/>School-scoped records</Badge><Button variant="outline" disabled={loading||!studentId} onClick={()=>void load(studentId)}><RefreshCw/>Refresh</Button></div>
      </header>
      <section><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#147d91]">Phase 9 · Account-linked activity</p>
        <h1 className="mt-2 font-serif text-4xl font-bold">{d?.student.displayName||"Student tracking"}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Review saved admissions practice, interview transcripts, responses and estimated time in FELLOW. These records belong to the signed-in learner account and are visible only to authorized school staff.</p>
        {d?<div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline"><Users className="size-3.5"/>{d.school.name}</Badge>{d.student.username?<Badge variant="outline"><UserRound className="size-3.5"/>Practice login: {d.student.username}</Badge>:null}{d.student.accessActive===false?<Badge variant="outline">Practice login disabled</Badge>:null}<Badge variant="outline">{d.student.targetCourse||"Course not yet set"}</Badge></div>:null}
      </section>
      {loading?<Card><CardContent className="flex items-center gap-3 p-8 text-sm text-slate-600"><Loader2 className="size-5 animate-spin"/>Checking school permission and loading saved learner records…</CardContent></Card>:error?<Card><CardHeader><CardTitle>Unable to display this student's records</CardTitle><CardDescription>{error}</CardDescription></CardHeader><CardContent><p className="text-sm text-slate-600">The student must belong to the same active school and, for teachers, be explicitly assigned to the account. Detailed tracking also requires the school access-audit migration.</p></CardContent></Card>:d?<>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Last sign-in",date(d.summary.lastSignInAt)],
            ["Last recorded activity",date(d.summary.lastActiveAt)],
            ["Tests completed",String(d.summary.testsCompleted)],
            ["Average test accuracy",d.summary.averageAccuracy===null?"Not recorded":d.summary.averageAccuracy+"%"],
            ["Interview sessions",String(d.summary.interviewCount)],
            ["Transcript answers",String(d.summary.candidateResponses)],
            ["Saved interview duration",elapsed(d.summary.interviewSeconds)],
            ["Estimated in-app activity",elapsed(d.summary.estimatedActiveSeconds)],
          ].map(([label,value])=><Card key={label} className="shadow-none"><CardContent className="p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-lg font-bold text-[#102a43]">{value}</p></CardContent></Card>)}
        </section>
        {d.dataStatus.incompleteHistory?<Card className="border-amber-200 bg-amber-50 shadow-none"><CardContent className="flex gap-3 p-4 text-sm text-amber-950"><Activity className="mt-1 size-5 shrink-0"/>Some telemetry or saved-progress sources could not be read. Counts and activity time may be incomplete. A blank activity record does not establish that this student has never used the app.</CardContent></Card>:null}
        <p className="rounded-xl border bg-white p-4 text-xs leading-6 text-slate-600">{d.notice} Last cloud state sync: {date(d.summary.lastCloudSyncAt)}. Practice attempts in saved progress: {d.summary.savedPracticeAttempts}.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Student tracking sections">
          <Button variant={tab==="activity"?"default":"outline"} onClick={()=>setTab("activity")}><Activity/>Activity & time</Button>
          <Button variant={tab==="tests"?"default":"outline"} onClick={()=>setTab("tests")}><BookOpenCheck/>Test results & answers</Button>
          <Button variant={tab==="interviews"?"default":"outline"} onClick={()=>setTab("interviews")}><FileText/>Interview transcripts</Button>
        </div>
        {tab==="activity"?<div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-none"><CardHeader><CardTitle>Learning activity</CardTitle><CardDescription>Only permitted FELLOW learning sections, with no queries or external browsing history.</CardDescription></CardHeader><CardContent className="space-y-2">{d.activity.length?d.activity.slice(0,80).map((item,i)=><div key={item.at+String(i)} className="flex flex-wrap justify-between gap-2 rounded-xl border p-3 text-sm"><div><strong>{item.page||"Learning section"}</strong><p className="mt-1 text-xs text-slate-500">{date(item.at)}</p></div><span className="text-xs text-slate-600">{item.kind==="heartbeat"?"Visible tab: "+elapsed(item.activeSeconds):"Page visit"}</span></div>):<p className="text-sm text-slate-600">No page activity saved yet. A missing log does not prove the student did not sign in.</p>}</CardContent></Card>
          <Card className="shadow-none"><CardHeader><CardTitle>Instrumented sessions</CardTitle><CardDescription>Existing FELLOW usage telemetry. Time is estimated rather than a direct observation of focused study.</CardDescription></CardHeader><CardContent className="space-y-2">{d.usage.length?d.usage.map((session,i)=><div key={String(i)+session.startedAt} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-3"><strong>{session.page||"Learning session"}</strong><span className="font-semibold">{elapsed(session.activeSeconds)}</span></div><p className="mt-1 text-xs text-slate-600">{date(session.startedAt)} · {session.deviceClass||"Device not recorded"} · last seen {date(session.lastSeenAt)}</p></div>):<p className="text-sm text-slate-600">No usage sessions were received by the existing telemetry service.</p>}</CardContent></Card>
        </div>:null}
        {tab==="tests"?<section className="space-y-4">{d.tests.length?d.tests.map(test=><Card key={test.id} className="shadow-none"><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="font-serif text-xl">{test.title||test.test||"Practice paper"}</CardTitle><Badge variant="outline">{Math.round(test.accuracy)}% recorded accuracy</Badge></div><CardDescription>{date(test.completedAt)} · {test.rawScore}/{test.maxRawMarks===null?"—":test.maxRawMarks} marks · {test.totalQuestions} questions · {elapsed(test.durationSeconds)}</CardDescription></CardHeader><CardContent>{test.review.length?<details><summary className="cursor-pointer text-sm font-semibold text-[#147d91]">View {test.review.length} saved question-level responses</summary><div className="mt-3 space-y-3">{test.review.map((q,i)=><div key={i} className="rounded-xl border p-4 text-sm"><p className="font-semibold">Question {q.number}{q.section?" · "+q.section:""}</p>{q.prompt?<p className="mt-2 whitespace-pre-wrap">{q.prompt}</p>:null}<p className="mt-2"><strong>Student answer:</strong> {q.answer||"Not recorded"}</p>{q.correctAnswer?<p className="mt-1"><strong>Recorded correct answer:</strong> {q.correctAnswer}</p>:null}<p className="mt-1 text-xs text-slate-600">Marks {q.rawMark??"—"}/{q.maxMarks??"—"} · Recorded status {q.correct===null?"Not available":q.correct?"Correct":"Incorrect"}</p>{q.explanation?<p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs">{q.explanation}</p>:null}</div>)}</div></details>:<p className="text-sm text-slate-600">This result contains summary marks only. Individual answers were not saved in the account's assessment payload.</p>}</CardContent></Card>):<Card><CardHeader><CardTitle>No cloud-saved tests</CardTitle><CardDescription>Completed tests will appear when the learner's signed-in account has synced them. Existing locally stored work may take time to upload.</CardDescription></CardHeader></Card>}</section>:null}
        {tab==="interviews"?<section className="space-y-4">{d.interviews.length?d.interviews.map(interview=><Card key={interview.id} className="shadow-none"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="font-serif text-xl">{interview.course||"Academic interview"}</CardTitle><Badge variant="outline"><Clock3 className="size-3.5"/>{elapsed(interview.durationSeconds)}</Badge></div><CardDescription>{date(interview.createdAt)} · {interview.summary||"Saved interview"}{interview.feedback.practiceStatus?" · "+interview.feedback.practiceStatus:""}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2">{interview.feedback.score!==null?<Badge>Practice score: {interview.feedback.score}/100</Badge>:null}<Badge variant="outline">{interview.turns.filter(t=>t.role==="candidate").length} candidate answers</Badge></div>{interview.feedback.priorities.length?<div className="rounded-xl bg-[#edf7f8] p-4"><strong className="text-sm">Recorded improvement priorities</strong>{interview.feedback.priorities.map((p,i)=><p key={i} className="mt-2 text-xs leading-5"><strong>{p.target}:</strong> {p.task}</p>)}</div>:null}{interview.turns.length?<details><summary className="cursor-pointer text-sm font-semibold text-[#147d91]">View full saved transcript</summary><div className="mt-3 space-y-2">{interview.turns.map((turn,i)=><div key={turn.turnIndex+"-"+i} className={"rounded-xl border p-3 text-sm "+(turn.role==="candidate"?"bg-cyan-50":"bg-white")}><p className="text-xs font-bold text-slate-500">{turn.role==="candidate"?"Student":"Interviewer"} · turn {turn.turnIndex+1}</p><p className="mt-2 whitespace-pre-wrap leading-6">{turn.content}</p>{turn.feedback?<p className="mt-2 text-xs text-slate-600"><strong>Recorded feedback:</strong> {turn.feedback}</p>:null}</div>)}</div></details>:<p className="text-sm text-slate-600">A session summary was saved, but no transcript turns have synced.</p>}</CardContent></Card>):<Card><CardHeader><CardTitle>No cloud-saved interviews</CardTitle><CardDescription>The student's interview history has not yet synced to their account. A missing transcript should not be treated as evidence of no practice.</CardDescription></CardHeader></Card>}</section>:null}
        <Card className="border-[#cfe1e4] shadow-none"><CardContent className="flex gap-3 p-4 text-sm leading-6 text-slate-600"><ShieldCheck className="mt-1 size-5 shrink-0 text-[#147d91]"/>Detailed record access is audited and requires an active school membership and, for teachers, an explicit student link. Only FELLOW's saved activity and assessments are shown. Students and schools should be told about this use before monitoring begins.</CardContent></Card>
      </>:null}
    </div>
  </main>
}
