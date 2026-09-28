"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, RotateCcw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { PROGRESS_KEY } from "@/lib/personal-tutor"
import { MISTAKE_REPLAY_KEY, buildMistakeReplayGroups, replayCompletion, type ReplayAttempt } from "@/lib/mistake-replay"

function readObject(key:string){try{return JSON.parse(localStorage.getItem(key)||"{}") as Record<string,unknown>}catch{return{}}}
function readAttempts(){try{const value=JSON.parse(localStorage.getItem(MISTAKE_REPLAY_KEY)||"[]");return Array.isArray(value)?value as ReplayAttempt[]:[]}catch{return[]}}

export default function MistakeReplayPage(){
  const[progress,setProgress]=useState<Record<string,unknown>>({})
  const[attempts,setAttempts]=useState<ReplayAttempt[]>([])
  const[groupId,setGroupId]=useState("")
  const[index,setIndex]=useState(0)
  const[response,setResponse]=useState("")
  const[confidence,setConfidence]=useState(60)
  const[revealed,setRevealed]=useState(false)

  useEffect(()=>{const p=readObject(PROGRESS_KEY);const a=readAttempts();setProgress(p);setAttempts(a)},[])
  const groups=useMemo(()=>buildMistakeReplayGroups(progress),[progress])
  const activeGroup=groups.find(group=>group.id===groupId)||groups[0]
  const mistake=activeGroup?.mistakes[Math.min(index,Math.max(0,(activeGroup?.mistakes.length||1)-1))]
  const completion=activeGroup?replayCompletion(attempts,activeGroup):{done:0,total:0,percent:0}

  useEffect(()=>{if(!groupId&&groups[0])setGroupId(groups[0].id)},[groups,groupId])

  function selectGroup(id:string){setGroupId(id);setIndex(0);setResponse("");setConfidence(60);setRevealed(false)}
  function saveReveal(){
    if(!mistake||!activeGroup)return
    const attempt:ReplayAttempt={id:`replay-${Date.now()}`,mistakeId:mistake.id,skill:activeGroup.skill,response:response.trim(),confidence,revealed:true,createdAt:new Date().toISOString()}
    const next=[attempt,...attempts].slice(0,200)
    setAttempts(next);localStorage.setItem(MISTAKE_REPLAY_KEY,JSON.stringify(next));setRevealed(true)
  }
  function move(delta:number){if(!activeGroup)return;setIndex(current=>Math.max(0,Math.min(activeGroup.mistakes.length-1,current+delta)));setResponse("");setConfidence(60);setRevealed(false)}

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/mistake-dna"><ArrowLeft/>Mistake DNA</Link></Button><Badge variant="outline"><RotateCcw className="size-3.5"/>Mistake Replay</Badge></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Grouped by underlying skill</p><h1 className="mt-2 font-serif text-4xl font-bold">Replay the reasoning demand, not just the question number.</h1><p className="mt-3 max-w-3xl text-slate-600">Incorrect and partial-credit answers from full papers are grouped into repeatable skills. Reattempt each item before revealing the previous correct answer, then record how confident you were.</p></section>

      {!groups.length?<Card><CardHeader><Brain className="size-5 text-[#147d91]"/><CardTitle>No replay pack yet</CardTitle><CardDescription>Complete a full admissions-test paper first. Incorrect or partial-credit items will be grouped here automatically.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/test-player">Start a test simulation <ArrowRight/></Link></Button></CardContent></Card>:<div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-3"><Card><CardHeader><CardTitle className="font-serif text-xl">Skill groups</CardTitle><CardDescription>Most repeated patterns appear first.</CardDescription></CardHeader><CardContent className="space-y-2">{groups.map(group=>{const done=replayCompletion(attempts,group);return <button key={group.id} onClick={()=>selectGroup(group.id)} className={`w-full rounded-xl border p-3 text-left ${group.id===activeGroup?.id?"border-[#147d91] bg-cyan-50":"bg-white"}`}><div className="flex items-center justify-between gap-2"><strong className="text-sm">{group.skill}</strong><Badge variant="outline">{group.count}</Badge></div><p className="mt-1 text-xs text-slate-500">{done.done}/{done.total} replayed</p><Progress value={done.percent} className="mt-2"/></button>})}</CardContent></Card></aside>

        {activeGroup&&mistake&&<section className="space-y-4"><Card className="border-0 bg-[#102a43] text-white"><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge className="bg-white/10 text-white">{activeGroup.skill}</Badge><Badge className="bg-white/10 text-white">{mistake.test}</Badge><Badge className="bg-white/10 text-white">{mistake.section}</Badge></div><CardTitle className="font-serif text-2xl">Underlying-skill replay {index+1}/{activeGroup.mistakes.length}</CardTitle><CardDescription className="text-white/65">{activeGroup.practiceCue}</CardDescription></CardHeader></Card>

          <Card><CardHeader><CardTitle className="font-serif text-2xl">Attempt it again from scratch</CardTitle><CardDescription>Previous result: {mistake.severity==="partial"?"partial credit":"missed or unanswered"}. Your old answer stays hidden until you reveal it.</CardDescription></CardHeader><CardContent className="space-y-4"><p className="whitespace-pre-line rounded-xl bg-slate-50 p-4 font-semibold leading-7">{mistake.prompt}</p><Textarea value={response} onChange={event=>setResponse(event.target.value)} rows={6} placeholder="Write the reasoning or answer you would give now…"/><label className="block"><div className="mb-2 flex justify-between text-sm"><span>Confidence before reveal</span><strong>{confidence}%</strong></div><input className="w-full" type="range" min="0" max="100" step="5" value={confidence} onChange={event=>setConfidence(Number(event.target.value))}/></label>{!revealed?<Button onClick={saveReveal} disabled={!response.trim()}><Target/>Lock attempt & reveal comparison</Button>:<div className="space-y-3"><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Your previous attempt</p><p className="mt-1 text-sm leading-6">{mistake.previousAnswer}</p></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Previous correct answer</p><p className="mt-1 text-sm leading-6">{mistake.correctAnswer}</p></div><p className="text-sm leading-6 text-slate-600">Compare the logic, not just the final wording. If your new reasoning fixes the original error, move on; otherwise repeat the skill cue before trying another item.</p></div>}</CardContent></Card>

          <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" onClick={()=>move(-1)} disabled={index===0}>Previous replay</Button><div className="text-sm text-slate-500"><CheckCircle2 className="mr-1 inline size-4"/>{completion.done}/{completion.total} in this skill replayed</div><Button onClick={()=>move(1)} disabled={index>=activeGroup.mistakes.length-1}>Next replay <ArrowRight/></Button></div>
        </section>}
      </div>}
    </div>
  </main>
}
