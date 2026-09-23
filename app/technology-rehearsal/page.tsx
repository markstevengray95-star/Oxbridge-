"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Camera, CheckCircle2, Mic, MonitorCheck, RotateCcw, ShieldCheck, Video } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const CHECK_KEY="oxbridge-tech-rehearsal-v1"

type CheckState={camera:boolean;microphone:boolean;layout:boolean;whiteboard:boolean;timed:boolean;completedAt?:string}
const empty:CheckState={camera:false,microphone:false,layout:false,whiteboard:false,timed:false}

export default function TechnologyRehearsalPage(){
  const [checks,setChecks]=useState<CheckState>(empty)
  const [status,setStatus]=useState("")
  const [running,setRunning]=useState(false)
  const [seconds,setSeconds]=useState(60)
  const videoRef=useRef<HTMLVideoElement>(null)
  const streamRef=useRef<MediaStream|null>(null)

  useEffect(()=>{try{const s=localStorage.getItem(CHECK_KEY);if(s)setChecks({...empty,...JSON.parse(s)})}catch{};return()=>streamRef.current?.getTracks().forEach(t=>t.stop())},[])
  useEffect(()=>{localStorage.setItem(CHECK_KEY,JSON.stringify(checks))},[checks])
  useEffect(()=>{if(!running||seconds<=0)return;const id=window.setInterval(()=>setSeconds(s=>s-1),1000);return()=>window.clearInterval(id)},[running,seconds])
  useEffect(()=>{if(seconds===0&&running){setRunning(false);setChecks(c=>({...c,timed:true}))}},[seconds,running])

  const testMedia=async()=>{
    setStatus("Requesting camera and microphone access…")
    try{
      streamRef.current?.getTracks().forEach(t=>t.stop())
      const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true})
      streamRef.current=stream
      if(videoRef.current) videoRef.current.srcObject=stream
      const hasVideo=stream.getVideoTracks().length>0
      const hasAudio=stream.getAudioTracks().length>0
      setChecks(c=>({...c,camera:hasVideo,microphone:hasAudio}))
      setStatus(hasVideo&&hasAudio?"Camera and microphone are working.":"One device could not be detected.")
    }catch{setStatus("Camera/microphone access was unavailable. Check browser permissions and device settings.")}
  }

  const mark=(key:keyof CheckState)=>setChecks(c=>({...c,[key]:!c[key]}))
  const completed=[checks.camera,checks.microphone,checks.layout,checks.whiteboard,checks.timed].filter(Boolean).length
  const complete=completed===5
  const saveCompletion=()=>{
    const next={...checks,completedAt:new Date().toISOString()}
    setChecks(next)
    try{
      const tasks:string[]=JSON.parse(localStorage.getItem("oxbridge-platform-tasks-v1")||"[]")
      if(!tasks.includes("interview-prep")) localStorage.setItem("oxbridge-platform-tasks-v1",JSON.stringify([...tasks,"interview-prep"]))
    }catch{}
    setStatus("Technology rehearsal saved to your application checklist.")
  }

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge variant="outline"><MonitorCheck className="size-3.5"/>Technology rehearsal</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Interview readiness</p><h1 className="mt-2 font-serif text-4xl font-bold">Test the setup before interview day.</h1><p className="mt-2 max-w-3xl text-slate-600">Use the actual device, browser, camera position, microphone and working area you expect to use. This is a rehearsal checklist, not a guarantee about university platform compatibility.</p></section>

      <section className="mb-5 grid gap-4 sm:grid-cols-3"><Card className="shadow-none"><CardHeader><CardDescription>Checks complete</CardDescription><CardTitle className="font-serif text-4xl">{completed}/5</CardTitle></CardHeader><CardContent><Progress value={completed/5*100}/></CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>Status</CardDescription><CardTitle className="font-serif text-xl">{complete?"Ready for a full rehearsal":"Keep checking"}</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">Repeat this check if you change device, room or browser.</p></CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>Last saved</CardDescription><CardTitle className="font-serif text-xl">{checks.completedAt?new Date(checks.completedAt).toLocaleDateString("en-GB"):"Not yet"}</CardTitle></CardHeader></Card></section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="shadow-none"><CardHeader><Camera className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Camera & microphone</CardTitle><CardDescription>Grant access only for this test. The video/audio stream stays in the browser and is not uploaded by this page.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="overflow-hidden rounded-2xl border bg-slate-900"><video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover"/></div><Button onClick={testMedia}><Video/>Test camera and microphone</Button>{status&&<p className="text-sm text-slate-600">{status}</p>}<div className="grid gap-2 sm:grid-cols-2"><CheckRow checked={checks.camera} label="Camera detected" icon={<Camera/>}/><CheckRow checked={checks.microphone} label="Microphone detected" icon={<Mic/>}/></div></CardContent></Card>

        <aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Physical setup</CardTitle></CardHeader><CardContent className="space-y-2"><ToggleRow checked={checks.layout} onClick={()=>mark("layout")} label="Screen, camera and lighting position checked"/><ToggleRow checked={checks.whiteboard} onClick={()=>mark("whiteboard")} label="Paper/whiteboard working area tested and visible where needed"/></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">60-second spoken rehearsal</CardTitle><CardDescription>Answer aloud while looking at the camera naturally rather than reading from the screen.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="rounded-xl bg-[#edf7f8] p-4 font-serif text-lg">Explain a difficult idea from your subject as if the interviewer knows the fundamentals but wants to see how you organise the explanation.</div><div className="flex items-center justify-between"><strong className="text-3xl tabular-nums">0:{String(seconds).padStart(2,"0")}</strong><Button variant="outline" onClick={()=>{if(seconds===0)setSeconds(60);setRunning(v=>!v)}}>{running?"Pause":"Start"}</Button></div>{checks.timed&&<Badge><CheckCircle2 className="size-3.5"/>Timed rehearsal complete</Badge>}</CardContent></Card></aside>
      </section>

      <Alert className="mt-5"><ShieldCheck/><AlertTitle>Privacy note</AlertTitle><AlertDescription>This page does not record or save camera/microphone media. Closing the page stops the local stream.</AlertDescription></Alert>
      <div className="mt-5 flex flex-wrap gap-2"><Button onClick={saveCompletion} disabled={!complete}><CheckCircle2/>Save rehearsal to checklist</Button><Button variant="outline" onClick={()=>{setChecks(empty);setSeconds(60);setRunning(false);setStatus("")}}><RotateCcw/>Reset checks</Button><Button asChild variant="outline"><Link href="/interview-room">Open formal Interview Room</Link></Button></div>
    </div>
  </main>
}

function ToggleRow({checked,onClick,label}:{checked:boolean;onClick:()=>void;label:string}){return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${checked?"border-emerald-200 bg-emerald-50":"bg-white"}`}><span className={`grid size-6 place-items-center rounded-md border ${checked?"border-emerald-600 bg-emerald-600 text-white":"border-slate-300"}`}>{checked&&<CheckCircle2 className="size-4"/>}</span><span className="text-sm font-semibold">{label}</span></button>}
function CheckRow({checked,label,icon}:{checked:boolean;label:string;icon:React.ReactNode}){return <div className={`flex items-center gap-3 rounded-xl border p-3 ${checked?"border-emerald-200 bg-emerald-50":"bg-white"}`}><span className={checked?"text-emerald-700":"text-slate-400"}>{icon}</span><span className="text-sm font-semibold">{label}</span>{checked&&<CheckCircle2 className="ml-auto size-4 text-emerald-700"/>}</div>}
