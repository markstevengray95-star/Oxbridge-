"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpen, Mic2, Plus, Sparkles, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { SUPERCURRICULAR_KEY } from "@/lib/personal-tutor"
import { INTERVIEW_CONTEXT_KEY } from "@/lib/nextgen-prep"
import { createClient } from "@/lib/supabase/client"

type Item = { id: string; type: string; title: string; reflection: string; questions: string[]; date: string }

function questionsFor(type: string, title: string) {
  const subject = title.trim() || `this ${type.toLowerCase()}`
  return [
    `What is the most important claim or idea you took from ${subject}, and why?`,
    `What assumption, limitation or piece of evidence in ${subject} would you challenge?`,
    `How does ${subject} connect to something else you have studied?`,
    `If an interviewer disagreed with your interpretation of ${subject}, what would you defend and what might you revise?`,
  ]
}

export default function SupercurricularCoachPage() {
  const [items, setItems] = useState<Item[]>([])
  const [type, setType] = useState("Book / article")
  const [title, setTitle] = useState("")
  const [reflection, setReflection] = useState("")
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(SUPERCURRICULAR_KEY) || "[]"); if (Array.isArray(saved)) setItems(saved) } catch {} }, [])
  const activeQuestions = useMemo(() => questionsFor(type, title), [type, title])

  async function addItem() {
    if (!title.trim()) return
    const entry: Item = { id: `super-${Date.now()}`, type, title: title.trim(), reflection: reflection.trim(), questions: activeQuestions, date: new Date().toISOString() }
    const next = [entry, ...items].slice(0, 80)
    setItems(next)
    localStorage.setItem(SUPERCURRICULAR_KEY, JSON.stringify(next))
    setTitle(""); setReflection("")
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (data.user) await supabase.from("supercurricular_items").insert({ user_id: data.user.id, item_type: entry.type, title: entry.title, reflection: entry.reflection, tutor_questions: entry.questions, metadata: { local_id: entry.id } })
    } catch {}
  }

  function remove(id: string) { const next = items.filter(item => item.id !== id); setItems(next); localStorage.setItem(SUPERCURRICULAR_KEY, JSON.stringify(next)) }

  function sendToInterview(item: Item) {
    localStorage.setItem(INTERVIEW_CONTEXT_KEY, JSON.stringify({
      source: "supercurricular",
      title: item.title,
      material: `${item.type}: ${item.title}\nStudent reflection: ${item.reflection || "No reflection recorded yet."}\nPossible discussion prompts: ${item.questions.join(" | ")}`,
      notes: item.reflection,
      createdAt: new Date().toISOString(),
    }))
  }

  return <main className="min-h-screen bg-[#f5f7f7] text-[#172b3a]"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><Badge variant="outline"><BookOpen className="size-3.5" />Supercurricular Coach</Badge></div></header><div className="mx-auto max-w-7xl space-y-6 px-4 py-8"><section><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Turn reading into reasoning</p><h1 className="mt-2 font-serif text-4xl font-bold">Do more than collect a reading list.</h1><p className="mt-3 max-w-3xl text-slate-600">Record books, articles, lectures, projects or visits, then answer questions that force you to evaluate, connect and defend the ideas. Any saved item can now become the context for a live interview.</p></section><section className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Add academic activity</CardTitle></CardHeader><CardContent className="space-y-4"><label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Type</span><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={type} onChange={event => setType(event.target.value)}><option>Book / article</option><option>Lecture / podcast</option><option>Research paper</option><option>Project</option><option>Competition</option><option>Museum / visit</option></select></label><label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Title</span><input className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={title} onChange={event => setTitle(event.target.value)} placeholder="What did you read, attend or do?" /></label><label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">First reflection</span><Textarea rows={6} value={reflection} onChange={event => setReflection(event.target.value)} placeholder="What did you actually learn, question or disagree with?" /></label><Button onClick={() => void addItem()} disabled={!title.trim()}><Plus />Save activity</Button></CardContent></Card><Card className="shadow-none"><CardHeader><Sparkles className="size-5 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Tutor questions</CardTitle><CardDescription>These update as you type the activity title.</CardDescription></CardHeader><CardContent className="space-y-3">{activeQuestions.map((question, index) => <div key={question} className="rounded-2xl border bg-white p-4"><Badge variant="outline">{index + 1}</Badge><p className="mt-2 font-serif text-lg font-semibold leading-7">{question}</p></div>)}</CardContent></Card></section><Card className="shadow-none"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="font-serif text-2xl">Academic exploration journal</CardTitle><CardDescription>{items.length} saved item{items.length === 1 ? "" : "s"}.</CardDescription></div><Button asChild variant="outline"><Link href="/application-profile">Use in digital twin <ArrowRight /></Link></Button></div></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{items.map(item => <div key={item.id} className="rounded-2xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><Badge variant="outline">{item.type}</Badge><h3 className="mt-2 font-serif text-xl font-bold">{item.title}</h3></div><Button size="icon" variant="ghost" onClick={() => remove(item.id)}><Trash2 className="size-4" /></Button></div>{item.reflection && <p className="mt-3 text-sm leading-6 text-slate-600">{item.reflection}</p>}<details className="mt-3 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-semibold">Open interview prompts</summary>{item.questions.map(q => <p key={q} className="mt-2 text-sm leading-6">• {q}</p>)}</details><Button asChild size="sm" className="mt-3" onClick={() => sendToInterview(item)}><Link href="/gemini-live-interview"><Mic2 />Defend this in a live interview</Link></Button></div>)}</CardContent></Card></div></main>
}
