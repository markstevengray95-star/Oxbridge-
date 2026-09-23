"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, GraduationCap, MessageSquareText, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { readingFor } from "@/lib/reading-room"
import type { TrackId } from "@/lib/oxbridge-data"

const labels: Record<TrackId,string> = { maths:"Mathematics", physical:"Physical sciences", life:"Life sciences", law:"Law", humanities:"Humanities", economics:"Economics & PPE", languages:"Languages" }

export default function ReadingRoomPage() {
  const [track, setTrack] = useState<TrackId>("physical")
  const [index, setIndex] = useState(0)
  const [notes, setNotes] = useState("")
  const [answers, setAnswers] = useState<Record<number,string>>({})
  const [showChallenge, setShowChallenge] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2") || "{}")
      if (profile.track) setTrack(profile.track)
    } catch { /* default */ }
  }, [])

  const items = useMemo(() => readingFor(track), [track])
  const item = items[index % Math.max(items.length, 1)]

  const saveReflection = () => {
    if (!item) return
    try {
      const previous = JSON.parse(localStorage.getItem("oxbridge-reading-reflections-v1") || "[]")
      const record = { id:item.id, title:item.title, track, notes, answers, challenge:item.challenge, savedAt:new Date().toISOString() }
      const next = [record, ...previous.filter((x:{id?:string}) => x.id !== item.id)].slice(0, 50)
      localStorage.setItem("oxbridge-reading-reflections-v1", JSON.stringify(next))
      const progress = JSON.parse(localStorage.getItem("oxbridge-tutor-progress-v2") || "{}")
      const activities = Array.isArray(progress.activities) ? progress.activities : []
      progress.activities = [{ title:item.title, type:"Reading Room", learned:notes || "Saved reading reflection", question:item.challenge }, ...activities].slice(0, 100)
      localStorage.setItem("oxbridge-tutor-progress-v2", JSON.stringify(progress))
      setSaved(true)
    } catch { /* keep session usable */ }
  }

  const nextReading = () => { setIndex(i => (i + 1) % items.length); setNotes(""); setAnswers({}); setShowChallenge(false); setSaved(false) }

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft />Student Home</Link></Button><Badge variant="outline"><BookOpen className="size-3.5" />Reading Room</Badge></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Unseen academic material</p><h1 className="mt-2 font-serif text-4xl font-bold">Read, annotate, defend.</h1><p className="mt-2 max-w-3xl text-slate-600">Each extract is original practice material. The aim is to identify what the text actually claims before explaining, challenging or extending it.</p></section>

      <div className="mb-5 flex flex-wrap gap-2">{Object.entries(labels).map(([id,label]) => <button key={id} onClick={() => { setTrack(id as TrackId); setIndex(0); setAnswers({}); setNotes(""); setShowChallenge(false) }} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${track===id ? "border-[#102a43] bg-[#102a43] text-white" : "bg-white text-slate-600"}`}>{label}</button>)}</div>

      {item && <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="shadow-none"><CardHeader><div className="flex flex-wrap gap-2"><Badge>{item.sourceType}</Badge><Badge variant="outline">{labels[track]}</Badge></div><CardTitle className="font-serif text-3xl">{item.title}</CardTitle></CardHeader><CardContent className="space-y-5"><blockquote className="rounded-2xl border-l-4 border-[#68c6d0] bg-[#edf7f8] p-5 font-serif text-lg leading-8 text-[#315261]">{item.extract}</blockquote><label><span className="mb-2 block text-sm font-semibold">Annotation / first reaction</span><Textarea rows={7} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What is the main claim? Which words are doing the most work? What is uncertain or contestable?" /></label></CardContent></Card>

        <aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Tutorial questions</CardTitle><CardDescription>Answer before revealing the final challenge.</CardDescription></CardHeader><CardContent className="space-y-4">{item.prompts.map((prompt,i)=><label key={prompt} className="block"><span className="mb-1 block text-sm font-semibold">{i+1}. {prompt}</span><Textarea rows={3} value={answers[i]??""} onChange={e=>setAnswers(a=>({...a,[i]:e.target.value}))} /></label>)}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Interviewer challenge</CardTitle></CardHeader><CardContent>{showChallenge ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-serif text-lg">{item.challenge}</div> : <Button variant="outline" onClick={()=>setShowChallenge(true)}>Reveal challenge <MessageSquareText /></Button>}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Concepts in play</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{item.concepts.map(c=><Badge key={c} variant="outline">{c}</Badge>)}</CardContent></Card></aside>
      </section>}

      <div className="mt-5 flex flex-wrap gap-2"><Button onClick={saveReflection} disabled={!notes.trim() && Object.values(answers).every(x=>!x.trim())}>{saved ? <CheckCircle2 /> : <GraduationCap />}{saved ? "Saved to academic activity log" : "Save reflection"}</Button><Button variant="outline" onClick={nextReading}><RefreshCw />Another extract</Button><Button asChild variant="outline"><Link href="/interview-room">Defend this thinking in interview <ArrowRight /></Link></Button></div>
    </div>
  </main>
}
