import { scoreStrictEssay, UNIVERSITY_CLASSIFICATION_BANDS } from "@/lib/writing/strict-score"
import type { WritingReport } from "@/lib/writing/review"

export function StrictScorePanel({ report, prompt, essay }: { report: WritingReport; prompt: string; essay: string }) {
  const mark = scoreStrictEssay(report, prompt, essay)
  if (!mark) return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-serif text-xl font-bold">University-style classification unavailable</h2><p className="mt-2 text-sm">Add the exact essay question to receive a defensible 0–100 practice mark and academic classification. Without the question, relevance cannot be judged strictly.</p></section>

  const styleLabel = mark.essayStyle === "general" ? "General admissions-style essay" : `${mark.essayStyle} writing task`
  return <section className="rounded-2xl border bg-white p-5" aria-label="University-style essay classification">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.15em] text-slate-500">University-style practice marking</p><h2 className="mt-1 font-serif text-3xl font-bold">{mark.score}/100 · {mark.classification}</h2><p className="mt-1 max-w-2xl text-sm font-semibold text-teal-800">{mark.descriptor}</p></div>
      <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm"><strong>Raw weighted mark:</strong> {mark.rawScore}/100<br/><strong>Task:</strong> {mark.taskLabel}<br/><strong>Question engagement:</strong> {mark.topicLabel}<br/><strong>Marking profile:</strong> {styleLabel}</div>
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border p-3 text-sm"><strong>{mark.diagnostics.wordCount}</strong><span className="block text-xs text-slate-500">words</span></div>
      <div className="rounded-lg border p-3 text-sm"><strong>{mark.diagnostics.reasonedBodyParagraphs}</strong><span className="block text-xs text-slate-500">reasoned body paragraphs</span></div>
      <div className="rounded-lg border p-3 text-sm"><strong>{mark.diagnostics.reasoningLinks}</strong><span className="block text-xs text-slate-500">explicit reasoning links</span></div>
      <div className="rounded-lg border p-3 text-sm"><strong>{mark.diagnostics.evaluationLinks}</strong><span className="block text-xs text-slate-500">evaluation / qualification links</span></div>
    </div>
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      <span className={`rounded-full border px-3 py-1 ${mark.diagnostics.hasDefensibleConclusion ? "bg-emerald-50" : "bg-amber-50"}`}>Conclusion: {mark.diagnostics.hasDefensibleConclusion ? "identified" : "not secure"}</span>
      <span className={`rounded-full border px-3 py-1 ${mark.diagnostics.hasObjectionResponse ? "bg-emerald-50" : "bg-amber-50"}`}>Counter-position: {mark.diagnostics.hasObjectionResponse ? "developed and answered" : "not fully answered"}</span>
      {mark.diagnostics.repeatedPromptRisk && <span className="rounded-full border bg-red-50 px-3 py-1 text-red-800">Prompt repetition / body drift risk</span>}
    </div>

    <div className="mt-4 rounded-xl border bg-slate-50 p-4"><h3 className="font-semibold">Academic classification bands</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{UNIVERSITY_CLASSIFICATION_BANDS.map((band, index) => { const upper = index === 0 ? 100 : UNIVERSITY_CLASSIFICATION_BANDS[index - 1].minimum - 1; return <div key={band.label} className={`rounded-lg border px-3 py-2 text-xs ${mark.classification === band.label ? "bg-white font-semibold shadow-sm" : "bg-slate-50"}`}><div>{band.label}</div><div className="text-slate-500">{band.minimum}–{upper}</div></div> })}</div></div>

    {mark.caps.length > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold">Classification ceilings applied</h3><p className="mt-1 text-xs text-amber-900">These prevent polished writing from receiving an inflated class when the answer is insufficiently relevant, analytical or task-focused.</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{mark.caps.map((cap, index) => <li key={`${cap.maximum}-${index}`}><strong>Maximum {cap.maximum}/100:</strong> {cap.reason}</li>)}</ul></div>}

    <div className="mt-5 grid gap-3 md:grid-cols-2">{mark.components.map(component => <div key={component.label} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><strong>{component.label}</strong><span className="font-semibold">{component.earned}/{component.weight}</span></div><p className="mt-2 text-xs text-slate-600">{component.reason}</p></div>)}</div>
    <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600"><strong>Assessment confidence: {mark.confidence}.</strong> {mark.note}</div>
  </section>
}
