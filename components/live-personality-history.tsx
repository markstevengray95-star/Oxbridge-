"use client"

import { useEffect, useState } from "react"
import { livePersonalities, personalityPracticeHistory } from "@/lib/gemini/live-interview-personalities"
import { PROGRESS_KEY } from "@/lib/personal-tutor"

export function LivePersonalityHistory({ course }: { course: string }) {
  const [rows, setRows] = useState(() => personalityPracticeHistory([], course))
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}")
      setRows(personalityPracticeHistory(saved.logs, course))
    } catch {
      setRows(personalityPracticeHistory([], course))
    }
  }, [course])

  return <section className="rounded-xl border bg-white p-4 text-sm" aria-label="Interview practice by personality">
    <h3 className="font-semibold">Practice across interviewer styles</h3>
    <p className="mt-1 text-xs text-slate-600">Saved voice sessions for {course} on this device. Reasoning and checking figures are transcript observations, not marks or admission predictions.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {rows.map(row => <div key={row.key} className="rounded-lg border bg-slate-50 p-3">
        <p className="font-medium">{livePersonalities[row.key].label}</p>
        <p className="mt-1 text-xs text-slate-600">{row.count} saved {row.count === 1 ? "session" : "sessions"} · {row.answers} recorded responses</p>
        {row.observedAnswers > 0 ? <p className="mt-1 text-xs text-slate-600">Explicit reasoning: {row.reasoned}/{row.observedAnswers} · checks/evidence: {row.tested}/{row.observedAnswers}</p> : <p className="mt-1 text-xs text-slate-500">No comparable transcript observations yet.</p>}
      </div>)}
    </div>
    <p className="mt-2 text-xs text-slate-500">Older sessions without recorded styles are excluded. Different questions and support levels are not directly comparable.</p>
  </section>
}
