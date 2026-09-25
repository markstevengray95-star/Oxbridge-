"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Clock3, Lightbulb, RefreshCcw, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { interviewChallenges } from "@/lib/interview-challenges"
import { tracks, type TrackId } from "@/lib/oxbridge-data"

type TrackFilter = "all" | TrackId

export default function InterviewChallengePage() {
  const [trackFilter, setTrackFilter] = useState<TrackFilter>("all")
  const [selectedId, setSelectedId] = useState(interviewChallenges[0]?.id ?? "")
  const [stageIndex, setStageIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [showInterviewerMove, setShowInterviewerMove] = useState(false)
  const [showGuidance, setShowGuidance] = useState(false)

  const filtered = useMemo(
    () => trackFilter === "all" ? interviewChallenges : interviewChallenges.filter(item => item.track === trackFilter),
    [trackFilter],
  )
  const challenge = interviewChallenges.find(item => item.id === selectedId) ?? filtered[0] ?? interviewChallenges[0]
  const stage = challenge?.stages[stageIndex]
  const track = challenge ? tracks.find(item => item.id === challenge.track) : undefined
  const responseKey = challenge && stage ? `${challenge.id}:${stageIndex}` : ""
  const complete = !!challenge && stageIndex === challenge.stages.length - 1

  function resetStageReveal() {
    setShowInterviewerMove(false)
    setShowGuidance(false)
  }

  function selectChallenge(id: string) {
    setSelectedId(id)
    setStageIndex(0)
    resetStageReveal()
  }

  function selectTrack(next: TrackFilter) {
    setTrackFilter(next)
    const first = next === "all" ? interviewChallenges[0] : interviewChallenges.find(item => item.track === next)
    if (first) selectChallenge(first.id)
  }

  function nextStage() {
    if (!challenge) return
    setStageIndex(index => Math.min(challenge.stages.length - 1, index + 1))
    resetStageReveal()
  }

  function previousStage() {
    setStageIndex(index => Math.max(0, index - 1))
    resetStageReveal()
  }

  if (!challenge || !stage) return null

  return (
    <main className="min-h-screen bg-[#f3f6f6] text-[#172b3a]">
      <section className="border-b bg-[#102a43] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-4xl">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-[#8dd7de]"><Brain className="size-5" /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8dd7de]">Interview Challenge</p>
                  <h1 className="font-serif text-3xl font-bold sm:text-4xl">Think aloud while the problem changes underneath you.</h1>
                </div>
              </div>
              <p className="mt-5 max-w-3xl text-base leading-7 text-blue-50/70">Ten original Oxford/Cambridge-style academic challenges across all seven subject families. Each problem unfolds in stages: commit to a line of reasoning, receive a follow-up, adapt to new information, then review the quality of your thinking.</p>
            </div>
            <Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="/interviews"><ArrowLeft />Interview Hub</Link></Button>
          </div>
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-blue-50/70">These are original practice questions, not official Oxford or Cambridge past interview questions. They are designed to train the same habits that demanding academic interviews reward: explicit assumptions, testable reasoning, responsiveness to challenge and intellectual flexibility.</div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => selectTrack("all")} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${trackFilter === "all" ? "border-[#147d91] bg-[#147d91] text-white" : "border-[#d5e1e3] bg-white text-[#536874] hover:border-[#8fc3ca]"}`}>All subjects</button>
          {tracks.map(item => <button key={item.id} onClick={() => selectTrack(item.id)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${trackFilter === item.id ? "border-[#147d91] bg-[#147d91] text-white" : "border-[#d5e1e3] bg-white text-[#536874] hover:border-[#8fc3ca]"}`}>{item.short}</button>)}
        </div>

        <div className="grid gap-6 lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="space-y-3 lg:sticky lg:top-5 lg:self-start">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Challenge bank</p><p className="mt-1 text-sm text-[#667984]">{filtered.length} available</p></div>
              <Badge variant="outline">{interviewChallenges.length} total</Badge>
            </div>
            {filtered.map(item => {
              const itemTrack = tracks.find(candidate => candidate.id === item.track)
              const active = item.id === challenge.id
              return <button key={item.id} onClick={() => selectChallenge(item.id)} className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-[#147d91] bg-[#edf7f8] shadow-sm" : "border-[#dbe5e7] bg-white hover:border-[#9fcbd1]"}`}>
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-[.12em] text-[#147d91]">{itemTrack?.short}</span><span className="text-xs text-[#7c8e97]">{item.minutes} min</span></div>
                <p className="mt-2 font-serif text-lg font-bold">{item.title}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-[#667984]"><span className="rounded-full bg-white px-2 py-1 ring-1 ring-[#dbe5e7]">{item.difficulty}</span><span>{item.stages.length} stages</span></div>
              </button>
            })}
          </aside>

          <section className="space-y-5">
            <Card className="overflow-hidden border-[#c9dde0] shadow-[0_18px_50px_rgba(16,42,67,.07)]">
              <div className="bg-[#102a43] px-6 py-5 text-white sm:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#8dd7de]">{track?.name}</p><h2 className="mt-2 font-serif text-3xl font-bold">{challenge.title}</h2></div>
                  <div className="flex gap-2"><Badge className="bg-white/10 text-white hover:bg-white/10"><Clock3 className="mr-1 size-3.5" />{challenge.minutes} min</Badge><Badge className="bg-[#147d91] text-white hover:bg-[#147d91]">{challenge.difficulty}</Badge></div>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-white/65">{challenge.setup}</p>
              </div>
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div>
                  <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Opening question</p><Button variant="ghost" size="sm" onClick={() => { setStageIndex(0); setResponses(current => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${challenge.id}:`)))); resetStageReveal() }}><RefreshCcw />Reset this challenge</Button></div>
                  <p className="mt-3 font-serif text-xl font-semibold leading-8 text-[#243b4a]">{challenge.opening}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {challenge.stages.map((item, index) => <button key={item.label} onClick={() => { setStageIndex(index); resetStageReveal() }} className={`rounded-xl border p-3 text-left transition ${index === stageIndex ? "border-[#147d91] bg-[#edf7f8]" : index < stageIndex ? "border-[#c7dfd3] bg-[#f2f8f5]" : "border-[#e0e8ea] bg-white"}`}><div className="flex items-center gap-2"><span className={`grid size-6 place-items-center rounded-full text-xs font-bold ${index < stageIndex ? "bg-[#2f7d5a] text-white" : index === stageIndex ? "bg-[#147d91] text-white" : "bg-[#eef2f3] text-[#71838c]"}`}>{index < stageIndex ? <CheckCircle2 className="size-3.5" /> : index + 1}</span><span className="text-sm font-semibold">{item.label}</span></div></button>)}
                </div>

                <div className="rounded-2xl border border-[#dbe5e7] bg-[#fbfcfc] p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-[#147d91]"><Target className="size-5" /><p className="text-xs font-bold uppercase tracking-[.16em]">Stage {stageIndex + 1} of {challenge.stages.length}</p></div>
                  <h3 className="mt-3 font-serif text-2xl font-bold">{stage.label}</h3>
                  <p className="mt-3 text-base leading-7 text-[#455d69]">{stage.prompt}</p>

                  <label className="mt-5 block"><span className="mb-2 block text-sm font-bold">Think aloud in writing</span><textarea value={responses[responseKey] ?? ""} onChange={event => setResponses(current => ({ ...current, [responseKey]: event.target.value }))} rows={7} placeholder="Write the reasoning you would say to an interviewer. State assumptions, test an idea, notice uncertainty and change course if needed…" className="w-full rounded-xl border border-[#cfdcdf] bg-white p-4 text-sm leading-6 outline-none transition focus:border-[#147d91] focus:ring-2 focus:ring-[#147d91]/15" /></label>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button onClick={() => setShowInterviewerMove(true)}><Brain />Reveal interviewer follow-up</Button>
                    <Button variant="outline" onClick={() => setShowGuidance(value => !value)}><Lightbulb />{showGuidance ? "Hide reasoning targets" : "Show reasoning targets"}</Button>
                  </div>

                  {showInterviewerMove && <div className="mt-5 rounded-xl border-l-4 border-[#147d91] bg-[#edf7f8] p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#147d91]">Interviewer pushes back</p><p className="mt-2 font-medium leading-7 text-[#294755]">{stage.interviewerMove}</p></div>}

                  {showGuidance && <div className="mt-4 rounded-xl border border-[#d9e5df] bg-[#f4f8f6] p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#2f7d5a]">A strong response should demonstrate</p><ul className="mt-3 space-y-2 text-sm leading-6 text-[#49625a]">{stage.lookFor.map(item => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-[#2f7d5a]" /><span>{item}</span></li>)}</ul></div>}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                  <Button variant="outline" disabled={stageIndex === 0} onClick={previousStage}><ArrowLeft />Previous stage</Button>
                  {!complete ? <Button onClick={nextStage}>Accept the challenge and continue <ArrowRight /></Button> : <Badge className="bg-[#2f7d5a] px-4 py-2 text-sm text-white hover:bg-[#2f7d5a]">Final stage reached</Badge>}
                </div>
              </CardContent>
            </Card>

            {complete && <Card className="border-[#bcd9c9] bg-[#f4f8f6]"><CardHeader><CardTitle className="font-serif text-2xl">Debrief the reasoning, not just the answer</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-[#526a60]">Academic interviews often become more revealing after the first answer. Use these checks to decide whether you showed a tutor how you think when the problem changed.</p><div className="mt-4 grid gap-3 md:grid-cols-3">{challenge.debrief.map(item => <div key={item} className="rounded-xl border border-[#d4e5dc] bg-white p-4 text-sm font-medium leading-6"><CheckCircle2 className="mb-2 size-5 text-[#2f7d5a]" />{item}</div>)}</div></CardContent></Card>}
          </section>
        </div>
      </div>
    </main>
  )
}
