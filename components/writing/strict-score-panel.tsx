import { scoreStrictEssay } from "@/lib/writing/strict-score"
import type { WritingReport } from "@/lib/writing/review"

export function StrictScorePanel({ report, prompt, essay }: { report: WritingReport; prompt: string; essay: string }) {
  const mark = scoreStrictEssay(report, prompt, essay)
  if (!mark) return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-serif text-xl font-bold">Strict practice mark unavailable</h2><p className="mt-2 text-sm">Add the exact essay question to receive a defensible 0–100 mark and grade. Without the question, relevance cannot be marked strictly.</p></section>

  return <section className="rounded-2xl border bg-white p-5" aria-label="Strict essay mark">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.15em] text-slate-500">Strict practice marking</p><h2 className="mt-1 font-serif text-3xl font-bold">{mark.score}/100 · Grade {mark.grade}</h2><p className="mt-1 text-sm font-semibold text-teal-800">{mark.descriptor}</p></div>
      <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm"><strong>Raw weighted mark:</strong> {mark.rawScore}/100<br/><strong>Task:</strong> {mark.taskLabel}<br/><strong>Topic:</strong> {mark.topicLabel}</div>
    </div>
    {mark.caps.length > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold">Strict ceilings applied</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{mark.caps.map((cap, index) => <li key={`${cap.maximum}-${index}`}><strong>Maximum {cap.maximum}/100:</strong> {cap.reason}</li>)}</ul></div>}
    <div className="mt-5 grid gap-3 md:grid-cols-2">{mark.components.map(component => <div key={component.label} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><strong>{component.label}</strong><span className="font-semibold">{component.earned}/{component.weight}</span></div><p className="mt-2 text-xs text-slate-600">{component.reason}</p></div>)}</div>
    <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600"><strong>Score confidence: {mark.confidence}.</strong> {mark.note}</div>
  </section>
}
