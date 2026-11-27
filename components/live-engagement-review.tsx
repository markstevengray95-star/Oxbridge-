import { liveSupportLevels, type LiveEngagementReport } from "@/lib/gemini/live-adaptive-support"

function estimatedTime(seconds: number | null) {
  if (seconds === null) return "Not available"
  return Math.floor(seconds / 60) + "m " + (seconds % 60) + "s"
}

export function LiveEngagementReview({ report }: { report: LiveEngagementReport }) {
  const totalWords = report.candidateWords + report.interviewerWords
  const share = totalWords ? Math.round(100 * report.candidateWords / totalWords) : 0
  const metrics = [
    ["Student responses", report.candidateTurns],
    ["Follow-up question turns", report.followUpQuestionTurns],
    ["Student questions", report.candidateQuestions],
    ["Clarification requests", report.clarificationRequests],
    ["Explicit help requests", report.helpRequests],
    ["Explicit uncertainty statements", report.explicitUncertaintyTurns],
    ["Revisions of reasoning", report.revisionTurns],
    ["Responses with reasoning links", report.reasoningLinks],
    ["Longest sequence of reasoning-linked responses", report.longestReasoningSequence],
  ] as const
  return <section className="rounded-xl border bg-white p-5 text-sm" aria-label="Conversation and academic support review">
    <h2 className="font-serif text-xl font-bold">Conversation and support review</h2>
    <p className="mt-2 text-xs text-slate-600">Based on available transcripts, not an emotion, engagement or ability score. Transcription and punctuation can be incomplete.</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg bg-slate-50 p-3"><p>Student estimated speaking time</p><strong className="text-lg">{estimatedTime(report.candidateEstimatedSeconds)}</strong><p className="text-xs">{report.candidateWords} transcribed words</p></div>
      <div className="rounded-lg bg-slate-50 p-3"><p>Interviewer estimated speaking time</p><strong className="text-lg">{estimatedTime(report.interviewerEstimatedSeconds)}</strong><p className="text-xs">{report.interviewerWords} transcribed words</p></div>
    </div>
    {totalWords > 0 && <div className="mt-3"><div className="flex justify-between text-xs"><span>Student words {share}%</span><span>Interviewer words {100-share}%</span></div><div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-200"><div className="bg-teal-700" style={{width: share + "%"}}/></div></div>}
    <p className="mt-2 text-xs text-slate-500">Time estimates assume 130 words per minute; actual speaking and silence durations were not measured.</p>
    <dl className="mt-4 grid gap-2 sm:grid-cols-2">{metrics.map(([label,value]) => <div key={label} className="flex justify-between gap-3 rounded-lg border p-2"><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>
    <h3 className="mt-5 font-semibold">Explicitly signalled academic hints</h3>
    <p className="mt-1 text-xs text-slate-600">Session support cap: level {report.modeCap}. Unsignalled support may be missed; zero recorded hints does not establish independent reasoning. No automatic marks penalty is applied.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{liveSupportLevels.filter(item => item.level > 0).map(item => <div key={item.level} className="rounded-lg border p-3"><p className="font-medium">Level {item.level} · {item.label}</p><p className="text-xs text-slate-600">{item.description}</p><p className="mt-1 font-semibold">{report.supportEvents.filter(event => event.level === item.level).length} recorded</p></div>)}</div>
    {report.supportEvents.length > 0 && <details className="mt-3 rounded-lg border p-3"><summary className="cursor-pointer font-medium">Review recorded hint excerpts</summary>{report.supportEvents.map(event => <blockquote key={event.turn} className="mt-2 border-l-2 pl-3 text-xs"><strong>Turn {event.turn} · level {event.level}</strong>{event.aboveModeCap && <span className="ml-1 font-semibold text-amber-800">Above selected mode cap — review</span>}<p>{event.quote}</p></blockquote>)}</details>}
  </section>
}
