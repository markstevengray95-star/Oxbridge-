import Link from "next/link"
import {ArrowRight,BookOpenCheck,MessageSquareText,RotateCcw} from "lucide-react"

/** Shared, non-scoring navigation following any completed practice interview. */
export function InterviewNextSteps(){
 return <section aria-label="Continue after interview" className="rounded-2xl border border-[#b9dce1] bg-[#f0fafb] p-5 text-[#102a43] sm:p-6">
  <p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">What next?</p>
  <h2 className="mt-2 font-serif text-2xl font-bold">Turn this interview into better reasoning</h2>
  <p className="mt-2 text-sm leading-6 text-slate-600">Review an exact example from your answer, practise a fresh problem, and compare evidence over time. This is formative feedback, not an admissions prediction.</p>
  <div className="mt-4 grid gap-3 sm:grid-cols-3">
   <Link href="/study/progress" className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-[#102a43] px-4 py-3 text-sm font-semibold text-white">Review my progress <ArrowRight className="size-4" aria-hidden="true"/></Link>
   <Link href="/interview-insights" className="flex min-h-12 items-center gap-2 rounded-xl border border-[#b9dce1] bg-white px-4 py-3 text-sm font-semibold"><MessageSquareText className="size-4 text-[#147d91]" aria-hidden="true"/> Transcript feedback</Link>
   <Link href="/interviews" className="flex min-h-12 items-center gap-2 rounded-xl border border-[#b9dce1] bg-white px-4 py-3 text-sm font-semibold"><RotateCcw className="size-4 text-[#147d91]" aria-hidden="true"/> Practise again</Link>
  </div>
  <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><BookOpenCheck className="size-4" aria-hidden="true"/> If a record has not finished syncing, open Progress again after the save completes.</p>
 </section>
}
