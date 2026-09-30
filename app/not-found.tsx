import Link from "next/link"
import { ArrowLeft, CircleHelp, SearchX } from "lucide-react"

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#f5f7f7] px-4 py-12 text-[#172b3a]">
      <section className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf7f8] text-[#147d91]"><SearchX className="size-7" /></span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">404 · Page not found</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-[#102a43]">That ScholarBridge page is not here.</h1>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">The address may have changed or the link may be incomplete. Your saved preparation data has not been changed by reaching this page.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-[#102a43] px-5 py-3 text-sm font-bold text-white"><ArrowLeft className="size-4" />Back to ScholarBridge</Link>
          <Link href="/support" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-[#102a43]"><CircleHelp className="size-4" />Support</Link>
        </div>
      </section>
    </main>
  )
}
