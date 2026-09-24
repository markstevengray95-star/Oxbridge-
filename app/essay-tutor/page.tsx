"use client"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ReviewPanel } from "@/components/writing/review-panel"
import { lnatEssayPrompts, taraEssayPrompts } from "@/lib/question-bank"
import { lnatEssayPrompts2027, taraWritingPrompts2027 } from "@/lib/question-bank-2027"

export default function EssayTutorPage() {
  const [test,setTest] = useState("LNAT")
  const [seed,setSeed] = useState(1)
  const [essay,setEssay] = useState("")
  const [custom,setCustom] = useState("")
  const pool = test === "LNAT" ? [...lnatEssayPrompts2027,...lnatEssayPrompts] : [...taraWritingPrompts2027,...taraEssayPrompts]
  const prompt = test === "Custom" ? custom : pool[seed % pool.length]
  return <main className="min-h-screen bg-[#f5f7f7] px-4 py-8 text-[#172b3a]"><div className="mx-auto max-w-6xl space-y-6"><div className="flex flex-wrap gap-4 text-sm font-semibold"><Link href="/student-home">← Student home</Link><Link href="/essay-comparison">Compare saved drafts</Link><Link href="/personal-statement-map">Personal statement review</Link></div><header><h1 className="font-serif text-4xl font-bold">Essay analysis</h1><p className="mt-3 max-w-3xl text-slate-600">Find exactly where your argument succeeds, where the reasoning breaks down, and how to revise it. Each review examines the question, evidence, assumptions, objections and paragraph progression.</p></header><section className="space-y-4 rounded-2xl border bg-white p-5"><label className="block text-sm font-semibold">Writing task<select className="ml-3 rounded-md border p-2" value={test} onChange={e => setTest(e.target.value)}><option>LNAT</option><option>TARA</option><option>Custom</option></select></label>{test === "Custom" ? <label className="block text-sm">Question or task instructions<Textarea value={custom} maxLength={2500} onChange={e => setCustom(e.target.value)} placeholder="Paste the exact question so relevance can be assessed." /></label> : <div className="rounded-xl bg-teal-50 p-4"><p className="font-semibold">{prompt}</p><Button className="mt-3" variant="outline" onClick={() => setSeed(s => s+1)}>Another practice question</Button></div>}<label className="block font-semibold" htmlFor="essay-draft">Your draft</label><Textarea id="essay-draft" rows={20} value={essay} maxLength={20000} onChange={e => setEssay(e.target.value)} placeholder="Use blank lines between paragraphs. Your writing remains editable while analysis runs."/><p className="text-sm text-slate-500">{essay.trim() ? essay.trim().split(/\s+/).length : 0} words · {essay.length}/20,000 characters</p></section><ReviewPanel essay={essay} mode="essay" test={test} prompt={prompt}/></div></main>
}
