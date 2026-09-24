"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, GraduationCap, MessageSquareText, RefreshCw, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { readingFor, readingSections, type ReadingSection } from "@/lib/reading-room"
import { INTERVIEW_CONTEXT_KEY } from "@/lib/nextgen-prep"
import type { TrackId } from "@/lib/oxbridge-data"

const labels: Record<TrackId,string> = { maths:"Mathematics", physical:"Physical sciences", life:"Life sciences", law:"Law", humanities:"Humanities", economics:"Economics & PPE", languages:"Languages" }
const sectionDescriptions: Record<ReadingSection,string> = {
  "Core Ideas":"Build a precise interpretation of one central academic idea before challenging it.",
  "Evidence & Data":"Practise deciding what evidence can and cannot justify, including uncertainty and causal claims.",
  "Counterargument":"Construct the strongest objection, then decide what should change in your first position.",
  "Stretch":"Handle denser material, hidden assumptions and transfer to unfamiliar conditions.",
}

export default function ReadingRoomPage() {
  const [track, setTrack] = useState<TrackId>("physical")
  const [section, setSection] = useState<ReadingSection>("Core Ideas")
  const [index, setIndex] = useState(0)
  const [notes, setNotes] = useState("")
  const [answers, setAnswers] = useState<Record<number,string>>({})
  const [showChallenge, setShowChallenge] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { try { const profile = JSON.parse(localStorage.getItem("oxbridge-tutor-profile-v2") || "{}"); if (profile.track) setTrack(profile.track) } catch {} }, [])
  const sectionItems = useMemo(() => readingFor(track, section), [track, section])
  const allTrackItems = useMemo(() => readingFor(track), [track])
  const item = sectionItems[index % Math.max(sectionItems.length, 1)] ?? allTrackItems[0]

  function resetReadingState() { setIndex(0); setNotes(""); setAnswers({}); setShowChallenge(false); setSaved(false) }

  const saveReflection = () => {
    if (!item) return
    try {
      const previous = JSON.parse(localStorage.getItem("oxbridge-reading-reflections-v1") || "[]")
      const record = { id:item.id, title:item.title, track, section:item.section, level:item.level, notes, answers, challenge:item.challenge, savedAt:new Date().toISOString() }
      const next = [record, ...previous.filter((x:{id?:string}) => x.id !== item.id)].slice(0, 100)
      localStorage.setItem("oxbridge-reading-reflections-v1", JSON.stringify(next))
      const progress = JSON.parse(localStorage.getItem("oxbridge-tutor-progress-v2") || "{}")
      const activities = Array.isArray(progress.activities) ? progress.activities : []
      progress.activities = [{ title:item.title, type:`Reading Room · ${item.section}`, learned:notes || "Saved reading reflection", question:item.challenge, level:item.level }, ...activities].slice(0, 150)
      localStorage.setItem("oxbridge-tutor-progress-v2", JSON.stringify(progress))
      setSaved(true)
    } catch {}
  }

  const nextReading = () => { setIndex(i => sectionItems.length ? (i + 1) % sectionItems.length : 0); setNotes(""); setAnswers({}); setShowChallenge(false); setSaved(false) }

  function defendLive() {
    if (!item) return
    try {
      localStorage.setItem(INTERVIEW_CONTEXT_KEY, JSON.stringify({ source:"reading-room", title:item.title, material:item.extract, prompts:[...item.prompts, item.challenge], notes:[notes, ...Object.values(answers)].filter(Boolean).join("\n"), course:labels[track] }))
    } catch {}
    window.location.href = "/gemini-live-interview"
  }

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft />Student Home</Link></Button><Badge variant="outline"><BookOpen className="size-3.5" />Reading Room</Badge></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Academic reading pathway</p><h1 className="mt-2 font-serif text-4xl font-bold">Read, annotate, challenge, defend.</h1><p className="mt-2 max-w-3xl text-slate-600">A larger bank of original academic extracts across four reading modes. Move from precise comprehension to evidence evaluation, counterargument and harder transfer tasks, then defend your interpretation in a live interview.</p></div><Card className="shadow-none"><CardContent className="grid grid-cols-2 gap-4 p-4 text-center"><div><p className="text-2xl font-bold">{allTrackItems.length}</p><p className="text-xs text-slate-500">extracts in {labels[track]}</p></div><div><p className="text-2xl font-bold">4</p><p className="text-xs text-slate-500">reading pathways</p></div></CardContent></Card></section>

      <div className="mb-4 flex flex-wrap gap-2">{Object.entries(labels).map(([id,label]) => <button key={id} onClick={() => { setTrack(id as TrackId); resetReadingState() }} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${track===id ? "border-[#102a43] bg-[#102a43] text-white" : "bg-white text-slate-600"}`}>{label}</button>)}</div>
      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{readingSections.map(name => { const count = readingFor(track, name).length; return <button key={name} onClick={() => { setSection(name); resetReadingState() }} className={`rounded-2xl border p-4 text-left transition ${section===name ? "border-[#147d91] bg-[#edf7f8] ring-2 ring-[#ccecee]" : "bg-white hover:border-slate-400"}`}><div className="flex items-center justify-between gap-2"><strong>{name}</strong><Badge variant="outline">{count}</Badge></div><p className="mt-2 text-xs leading-5 text-slate-500">{sectionDescriptions[name]}</p></button> })}</div>

      {item && <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="shadow-none"><CardHeader><div className="flex flex-wrap gap-2"><Badge>{item.section}</Badge><Badge variant="outline">{labels[track]}</Badge><Badge variant="outline">{item.level}</Badge><Badge variant="outline"><Clock3 className="size-3" />{item.estimatedMinutes} min</Badge></div><CardTitle className="font-serif text-3xl">{item.title}</CardTitle><CardDescription>{item.sourceType}</CardDescription></CardHeader><CardContent className="space-y-5"><blockquote className="rounded-2xl border-l-4 border-[#68c6d0] bg-[#edf7f8] p-5 font-serif text-lg leading-8 text-[#315261]">{item.extract}</blockquote><label><span className="mb-2 block text-sm font-semibold">Annotation / first reaction</span><Textarea rows={7} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What is the main claim? Which words are doing the most work? What evidence would change your interpretation?" /></label></CardContent></Card>

        <aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Tutorial questions</CardTitle><CardDescription>Answer before revealing the final challenge.</CardDescription></CardHeader><CardContent className="space-y-4">{item.prompts.map((prompt,i)=><label key={prompt} className="block"><span className="mb-1 block text-sm font-semibold">{i+1}. {prompt}</span><Textarea rows={3} value={answers[i]??""} onChange={e=>setAnswers(a=>({...a,[i]:e.target.value}))} /></label>)}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Interviewer challenge</CardTitle></CardHeader><CardContent>{showChallenge ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-serif text-lg">{item.challenge}</div> : <Button variant="outline" onClick={()=>setShowChallenge(true)}>Reveal challenge <MessageSquareText /></Button>}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Concepts in play</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{item.concepts.map(c=><Badge key={c} variant="outline">{c}</Badge>)}</CardContent></Card></aside>
      </section>}

      <div className="mt-5 flex flex-wrap gap-2"><Button onClick={saveReflection} disabled={!notes.trim() && Object.values(answers).every(x=>!x.trim())}>{saved ? <CheckCircle2 /> : <GraduationCap />}{saved ? "Saved to academic activity log" : "Save reflection"}</Button><Button variant="outline" onClick={nextReading}><RefreshCw />Another in this section</Button><Button variant="outline" onClick={defendLive}><Sparkles />Defend this reading in Gemini Live <ArrowRight /></Button></div>
    </div>
  </main>
}
