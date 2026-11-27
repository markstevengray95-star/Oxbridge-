import type {liveReliabilityReport} from "@/lib/gemini/live-reliability"

export function LiveReliabilityReview({report}:{report:ReturnType<typeof liveReliabilityReport>}){
 return <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">Voice session diagnostics</summary><p className="mt-2 text-xs text-slate-600">{report.measurementNote}</p><dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{[
 ["Connections",report.connections],["Unexpected disconnects",report.disconnects],["Audio frames dropped locally",report.droppedFrames],["Local interruptions",report.interruptions],["Audio / message errors",report.audioErrors],["Measured response samples",report.responseSamples],["Median observed response interval",report.medianObservedMs===null?"Not measured":report.medianObservedMs+" ms"],["95th percentile interval",report.p95ObservedMs===null?"Not measured":report.p95ObservedMs+" ms"]
 ].map(([label,value])=><div key={label} className="rounded-lg border p-3"><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl><p className="mt-3 text-xs text-slate-500">This diagnostic contains aggregate numbers only; it is not a recording or a student ability score.</p></details>
}
