import type { LiveFollowUpReview } from "@/lib/gemini/live-academic-followups"

const labels: Record<string,string> = { justification:"Justification", verification:"Verification", assumption:"Assumptions", prediction:"Predictions", alternative:"Alternative explanations", revision:"Revisions", transfer:"Transfer", synthesis:"Synthesis", clarification:"Clarification", other:"Other or unclassified" }

export function LiveAcademicFollowUpReview({ report }: { report: LiveFollowUpReview }) {
  return <section className="rounded-xl border bg-white p-5 text-sm" aria-label="Academic follow-up review">
    <h2 className="font-serif text-xl font-bold">Academic follow-up review</h2>
    <p className="mt-2 text-xs text-slate-600">Transcript signals show how the conversation developed. Shared words are not proof of relevant reasoning; a question may be well grounded without repeating the student's terminology. The review does not verify correctness or award marks.</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-3">{[["Follow-up questions",report.followUps],["With visible term links",report.visibleTermLinks],["Possible repeated questions",report.possibleRepeats]].map(([label,value])=><div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xs">{label}</p><strong className="text-xl">{value}</strong></div>)}</div>
    <h3 className="mt-5 font-semibold">Questioning approaches</h3>
    <dl className="mt-2 grid gap-2 sm:grid-cols-2">{Object.entries(report.moves).map(([move,count])=><div key={move} className="flex justify-between gap-3 rounded-lg border p-2"><dt>{labels[move]}</dt><dd className="font-semibold">{count}</dd></div>)}</dl>
    <p className="mt-2 text-xs text-slate-500">Question counts and categories rely on transcript punctuation and wording. Requested repetitions are excluded from repetition warnings.</p>
    {report.observations.length > 0 && <details className="mt-4 rounded-lg border p-3"><summary className="cursor-pointer font-medium">Review recent follow-up examples</summary>{report.observations.map(item=><div key={item.turn} className="mt-3 rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold">Turn {item.turn} · {labels[item.move]}{item.possibleRepeat?" · Possible repetition":""}</p><p className="mt-2 text-xs text-slate-600">Student: {item.previousResponse}</p><p className="mt-1 font-medium">Interviewer: {item.question}</p>{item.sharedTerms.length>=2&&<p className="mt-1 text-xs text-slate-600">Shared terms: {item.sharedTerms.join(", ")}</p>}</div>)}</details>}
  </section>
}
