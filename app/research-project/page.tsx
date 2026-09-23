"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, GraduationCap, Lightbulb, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"

type Project = {
  question:string
  thesis:string
  evidence:string
  counter:string
  revised:string
  next:string
  updated:string
}

const KEY="oxbridge-research-project-v1"
const empty:Project={question:"",thesis:"",evidence:"",counter:"",revised:"",next:"",updated:""}

const defencePrompts=(p:Project)=>[
  `What is the strongest reason someone could reject your current thesis${p.thesis?` (“${p.thesis.slice(0,100)}${p.thesis.length>100?"…":""}”)`:""}?`,
  "Which piece of evidence in your project is most diagnostic rather than merely interesting?",
  "What assumption connects your evidence to your conclusion?",
  "What evidence would make you change your mind?",
  "If you had one more week, what would you investigate next and why?",
]

export default function ResearchProjectPage(){
  const [project,setProject]=useState<Project>(empty)
  const [saved,setSaved]=useState(false)
  const [defenceIndex,setDefenceIndex]=useState(0)
  const [loaded,setLoaded]=useState(false)

  useEffect(()=>{try{const s=localStorage.getItem(KEY);if(s)setProject({...empty,...JSON.parse(s)})}catch{}setLoaded(true)},[])
  useEffect(()=>{if(loaded)localStorage.setItem(KEY,JSON.stringify(project))},[project,loaded])

  const complete=useMemo(()=>[project.question,project.thesis,project.evidence,project.counter,project.revised,project.next].filter(x=>x.trim()).length,[project])
  const prompts=useMemo(()=>defencePrompts(project),[project])
  const update=(key:keyof Project,value:string)=>{setProject(p=>({...p,[key]:value,updated:new Date().toISOString()}));setSaved(false)}
  const saveToProgress=()=>{
    try{
      const progress=JSON.parse(localStorage.getItem("oxbridge-tutor-progress-v2")||"{}")
      progress.researchProject={question:project.question,evidence:project.evidence,counter:project.counter,next:project.next}
      const activities=Array.isArray(progress.activities)?progress.activities:[]
      const activity={title:project.question||"Research project",type:"Research project",learned:project.revised||project.thesis,question:project.next}
      progress.activities=[activity,...activities.filter((x:{type?:string})=>x.type!=="Research project")].slice(0,100)
      localStorage.setItem("oxbridge-tutor-progress-v2",JSON.stringify(progress))
      setSaved(true)
    }catch{}
  }

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge variant="outline"><BookOpenCheck className="size-3.5"/>Research Project Coach</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Long-form academic preparation</p><h1 className="mt-2 font-serif text-4xl font-bold">Build an argument you can actually defend.</h1><p className="mt-2 max-w-3xl text-slate-600">Use one substantial question over several weeks. The project becomes stronger when the thesis changes in response to evidence rather than simply collecting more sources.</p></section>

      <section className="mb-5 grid gap-4 sm:grid-cols-3"><Card className="shadow-none"><CardHeader><CardDescription>Project completeness</CardDescription><CardTitle className="font-serif text-4xl">{Math.round(complete/6*100)}%</CardTitle></CardHeader><CardContent><Progress value={complete/6*100}/></CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>Current stage</CardDescription><CardTitle className="font-serif text-xl">{complete<2?"Frame the question":complete<4?"Test the thesis":complete<6?"Revise and extend":"Ready to defend"}</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">The coach emphasises revision after counter-evidence rather than a fixed first answer.</p></CardContent></Card><Card className="shadow-none"><CardHeader><CardDescription>Last updated</CardDescription><CardTitle className="font-serif text-xl">{project.updated?new Date(project.updated).toLocaleDateString("en-GB"):"Not started"}</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">Saved locally as you type.</p></CardContent></Card></section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-4"><Field title="1. Research question" description="Narrow enough to argue, broad enough to matter." value={project.question} onChange={v=>update("question",v)} rows={3}/><Field title="2. Provisional thesis" description="Your current best answer—not a conclusion you are obliged to keep." value={project.thesis} onChange={v=>update("thesis",v)} rows={4}/><Field title="3. Strongest evidence" description="Prefer evidence that discriminates between competing explanations." value={project.evidence} onChange={v=>update("evidence",v)} rows={6}/><Field title="4. Strongest counterargument" description="Build the best objection, not the easiest one to defeat." value={project.counter} onChange={v=>update("counter",v)} rows={5}/><Field title="5. Revised thesis" description="State exactly what changed after confronting the counterargument." value={project.revised} onChange={v=>update("revised",v)} rows={5}/><Field title="6. Next investigation" description="What evidence, reading or test would most improve the argument now?" value={project.next} onChange={v=>update("next",v)} rows={4}/></div>

        <aside className="space-y-4"><Card className="border-[#147d91]/20 bg-[#edf7f8] shadow-none"><CardHeader><Lightbulb className="size-6 text-[#147d91]"/><CardTitle className="font-serif text-2xl">Oral defence prompt</CardTitle><CardDescription>Answer aloud before moving to the next one.</CardDescription></CardHeader><CardContent className="space-y-4"><p className="font-serif text-xl leading-relaxed">{prompts[defenceIndex%prompts.length]}</p><Button variant="outline" onClick={()=>setDefenceIndex(i=>(i+1)%prompts.length)}><RotateCcw/>Another defence question</Button></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Save into your wider preparation profile</CardTitle><CardDescription>This adds the project to the same academic-activity and research state used elsewhere in the app.</CardDescription></CardHeader><CardContent><Button onClick={saveToProgress}>{saved?<CheckCircle2/>:<GraduationCap/>}{saved?"Saved to profile":"Save project to profile"}</Button></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Next step</CardTitle></CardHeader><CardContent className="space-y-2"><Button asChild className="w-full"><Link href="/interview-room">Defend project in Interview Room <ArrowRight/></Link></Button><Button asChild variant="outline" className="w-full"><Link href="/knowledge-graph">Connect it to your knowledge graph</Link></Button></CardContent></Card></aside>
      </section>
    </div>
  </main>
}

function Field({title,description,value,onChange,rows}:{title:string;description:string;value:string;onChange:(v:string)=>void;rows:number}){return <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><Textarea rows={rows} value={value} onChange={e=>onChange(e.target.value)}/></CardContent></Card>}
