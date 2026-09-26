"use client"

import { useState } from "react"
import { ArrowRight, Brain, CalendarDays, Crosshair, FileQuestion, Loader2, Network, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type TutorMode = "review" | "plan"
type BriefAction = { label: string; prompt: string; mode: TutorMode; icon: typeof Brain }

const actions: BriefAction[] = [
  {
    label: "Explain my priority",
    mode: "review",
    icon: Crosshair,
    prompt: "Give me a deep evidence-based explanation of my current highest-priority preparation area. Separate the evidence you actually have from uncertainty, explain why it matters, show any repeated pattern behind it, and tell me what new task would best test whether it is genuinely improving.",
  },
  {
    label: "Connect the patterns",
    mode: "review",
    icon: Network,
    prompt: "Look across my interviews, admissions-test work, writing, application evidence, supercurricular work, mistakes and reflections. Identify any cross-domain reasoning patterns that appear in more than one place. Do not invent links. For each supported connection, explain the evidence and the most useful transfer task.",
  },
  {
    label: "Find missing evidence",
    mode: "review",
    icon: FileQuestion,
    prompt: "Audit my preparation evidence. Which important areas are currently under-evidenced, stale or based on too few observations to trust? Explain what you can and cannot conclude, then give the smallest useful activity that would fill each important evidence gap.",
  },
  {
    label: "Build a 7-day strategy",
    mode: "plan",
    icon: CalendarDays,
    prompt: "Build me a focused seven-day preparation strategy from my saved evidence. Prioritise no more than three underlying needs, mix interview/test/writing/application work only where justified, include at least one delayed retest or transfer task, and explain what evidence at the end of the week would show that the plan worked.",
  },
]

export function TutorStrategicBrief() {
  const [brief, setBrief] = useState("")
  const [active, setActive] = useState("")
  const [provider, setProvider] = useState("")
  const [loading, setLoading] = useState(false)

  async function generate(action: BriefAction) {
    if (loading) return
    setLoading(true)
    setActive(action.label)
    try {
      const response = await fetch("/api/personal-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: action.prompt, mode: action.mode }),
      })
      const data = await response.json() as { reply?: string; provider?: string; authRequired?: boolean }
      setBrief(data.reply || "The Tutor could not generate a strategic brief from the available evidence. Complete another preparation activity and try again.")
      setProvider(data.authRequired ? "local" : (data.provider || (response.ok ? "tutor" : "local")))
    } catch {
      setBrief("The cloud Tutor is temporarily unavailable. Your deterministic insight dashboard above is still available and remains based on your saved preparation evidence.")
      setProvider("local")
    } finally {
      setLoading(false)
    }
  }

  return <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
    <Card className="overflow-hidden border-[#cde4e7] bg-gradient-to-br from-white to-[#f4fbfb] shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#147d91]"><Sparkles className="size-4" />Tutor synthesis</div>
            <CardTitle className="mt-2 font-serif text-3xl">Turn the evidence into a strategy.</CardTitle>
            <CardDescription className="mt-2 max-w-3xl text-sm leading-6">The persistent Tutor can combine your cloud-saved plans, mistake events, progress evidence, application evidence, supercurricular work and reflections. It must distinguish what is evidenced from what is uncertain and does not predict admissions outcomes.</CardDescription>
          </div>
          <Badge variant="outline"><Brain className="size-3.5" />Evidence-aware</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map(action => {
            const Icon = action.icon
            return <Button key={action.label} variant={active === action.label ? "default" : "outline"} className="h-auto justify-start gap-3 py-3 text-left" onClick={() => void generate(action)} disabled={loading}>
              {loading && active === action.label ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
              <span>{action.label}</span>
            </Button>
          })}
        </div>

        <div className="rounded-2xl border bg-white p-5">
          {brief ? <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">{active}</p><Badge variant="outline">{provider === "local" ? "Local fallback" : "Persistent tutor"}</Badge></div>
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{brief}</div>
          </> : <div className="flex items-start gap-3 text-sm leading-6 text-slate-600"><Brain className="mt-0.5 size-5 shrink-0 text-[#147d91]" /><div><strong className="text-slate-800">Choose an analysis above.</strong><p className="mt-1">This layer is for synthesis. The deterministic dashboard remains the source for the visible scores, evidence counts and coverage calculations.</p></div></div>}
        </div>
        {brief && <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => setBrief("")}>Clear brief <ArrowRight className="size-3.5 rotate-180" /></Button></div>}
      </CardContent>
    </Card>
  </section>
}
