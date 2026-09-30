"use client"

import Link from "next/link"
import { useEffect } from "react"
import { CircleAlert, House, RotateCcw } from "lucide-react"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("ScholarBridge route error", error)
  }, [error])

  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#f5f7f7] px-4 py-12 text-[#172b3a]">
      <section className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700"><CircleAlert className="size-7" /></span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-amber-700">Something went wrong</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-[#102a43]">This page could not finish loading.</h1>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">Try the page again. If the problem continues, use Support or check the public service status. Avoid including passwords or sensitive personal information in a support message.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => reset()} className="inline-flex items-center gap-2 rounded-xl bg-[#102a43] px-5 py-3 text-sm font-bold text-white"><RotateCcw className="size-4" />Try again</button>
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-[#102a43]"><House className="size-4" />Home</Link>
          <Link href="/support" className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-[#147d91]">Support</Link>
        </div>
      </section>
    </main>
  )
}
