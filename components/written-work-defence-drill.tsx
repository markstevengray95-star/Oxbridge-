"use client"

import { useMemo, useState } from "react"
import { Brain, CheckCircle2, Loader2, MessageSquareText, RotateCcw, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { PROGRESS_KEY } from "@/lib/personal-tutor"

type Analysis = {
  summary: string
  claims: string[]
  assumptions: string[]
  evidenceQuestions: string[]
  defenceQuestions: string[]
  openingQuestion: string
}

type Turn = { role: "interviewer" | "candidate"; text: string }
type Result = { reply?: string; classification?: string; issue?: string; moveKind?: string; branchReason?: string; provider?: string; error?: string }

export function WrittenWorkDefenceDrill({ title, course, analysis }: { title: string; course: string; analysis: Analysis }) {
  const questionBank = useMemo(() => [analysis.openingQuestion, ...analysis.defenceQuestions, ...analysis.evidenceQuestions].filter(Boolean), [analysis])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState("")
  const [turns, setTurns] = useState<Turn[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const question = questionBank[questionIndex % Math.max(questionBank.length, 1)] || analysis.openingQuestion

  async function challenge() {
    if (!answer.trim() || busy) return
    setBusy(true); setSaved(false)
    try {
      const response = await fetch("/api/interview-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course,
          track: "Written work defence",
          difficulty: "Stretch",
          persona: "Socratic",
          mode: "Written Work Defence",
          question,
          answer: answer.trim(),
          turns,
        }),
      })
      const data = await response.json() as Result
      if (!response.ok || !data.reply) throw new Error(data.error || "The defence interviewer could not respond.")
      const nextTurns: Turn[] = [...turns, { role: "interviewer", text: question }, { role: "candidate", text: answer.trim() }, { role: "interviewer", text: data.reply }]
      setTurns(nextTurns)
      setResult(data)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "The defence drill could not continue." })
    } finally { setBusy(false) }
  }

  function nextQuestion() {
    setQuestionIndex(index => (index + 1) % Math.max(questionBank.length, 1))
    setAnswer(""); setResult(null); setSaved(false)
  }

  function saveDrill() {
    if (!answer.trim() || !result?.reply) return
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as Record<string, unknown>
      const previous = Array.isArray(progress.writtenWorkDefenceDrills) ? progress.writtenWorkDefenceDrills as unknown[] : []
      const record = { id: `written-drill-${Date.now()}`, title: title || "Written work", course, question, answer: answer.trim(), classification: result.classification, issue: result.issue, followUp: result.reply, date: new Date().toISOString() }
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, writtenWorkDefenceDrills: [record, ...previous].slice(0, 50) }))
      setSaved(true)
      window.dispatchEvent(new Event("oxbridge-cloud-state-updated"))
    } catch { setSaved(true) }
  }

  return <Card className="shadow-none">
    <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="font-serif text-2xl">Live written-work defence drill</CardTitle><CardDescription>Answer one question from your own work, then the interview engine challenges the reasoning you actually give.</CardDescription></div><Badge variant="outline"><Brain className="size-3.5" />Adaptive challenge</Badge></div></CardHeader>
    <CardContent className="space-y-4">
      <div className="rounded-xl bg-[#edf7f8] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Current question</p><p className="mt-2 font-serif text-lg leading-7">{question}</p></div>
      <Textarea rows={6} value={answer} onChange={event => { setAnswer(event.target.value); setResult(null); setSaved(false) }} placeholder="Defend the claim aloud in writing: state the reasoning, evidence and any assumption you are relying on…" />
      <div className="flex flex-wrap gap-2"><Button onClick={() => void challenge()} disabled={!answer.trim() || busy}>{busy ? <Loader2 className="animate-spin" /> : <MessageSquareText />}{busy ? "Testing reasoning…" : "Challenge my answer"}</Button><Button variant="outline" onClick={nextQuestion}><RotateCcw />Different question</Button>{result?.reply ? <Button variant="outline" onClick={saveDrill} disabled={saved}><Save />{saved ? "Saved" : "Save attempt"}</Button> : null}</div>
      {result?.error ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{result.error}</div> : null}
      {result?.reply ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex flex-wrap items-center gap-2"><CheckCircle2 className="size-5 text-emerald-700" />{result.classification ? <Badge variant="outline">{result.classification}</Badge> : null}{result.moveKind ? <Badge variant="outline">{result.moveKind}</Badge> : null}{result.provider ? <Badge variant="outline">{result.provider}</Badge> : null}</div><p className="mt-3 text-sm font-semibold text-emerald-950">Interviewer follow-up</p><p className="mt-1 leading-7 text-emerald-950">{result.reply}</p>{result.branchReason ? <p className="mt-3 text-xs text-emerald-800"><strong>Branch logic:</strong> {result.branchReason}</p> : null}</div> : null}
    </CardContent>
  </Card>
}
