import type { Metadata } from "next"
import Link from "next/link"
import { Activity, ExternalLink } from "lucide-react"
import { ServiceStatusProbe } from "@/components/service-status-probe"

export const metadata: Metadata = {
  title: "Service Status | ScholarBridge",
  description: "Check whether the ScholarBridge web application is currently responding.",
  alternates: { canonical: "/status" },
}

export default function StatusPage() {
  return (
    <main className="min-h-screen bg-[#f5f7f7] px-4 py-10 text-[#172b3a] sm:px-6">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#edf7f8] text-[#147d91]"><Activity /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Service status</p>
            <h1 className="mt-1 font-serif text-4xl font-bold text-[#102a43]">Is ScholarBridge online?</h1>
            <p className="mt-3 leading-7 text-slate-600">This check confirms that the ScholarBridge web application can answer a fresh health request. It does not claim that every external AI, payment, email or university service is available.</p>
          </div>
        </div>

        <div className="mt-8"><ServiceStatusProbe /></div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="font-bold text-[#102a43]">A feature is not working</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">A successful app health check does not prove that a specific AI, voice, email or payment provider is healthy. Report persistent feature problems through Support.</p>
            <Link href="/support" className="mt-3 inline-flex items-center gap-1 font-semibold text-[#147d91] underline underline-offset-4">Open Support <ExternalLink className="size-3.5" /></Link>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="font-bold text-[#102a43]">Privacy or safety issue</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Use the dedicated Privacy Centre or Safeguarding route rather than placing sensitive information in a general support report.</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold"><Link href="/privacy-centre" className="text-[#147d91] underline">Privacy Centre</Link><Link href="/safeguarding" className="text-[#147d91] underline">Safeguarding</Link></div>
          </article>
        </div>
      </section>
    </main>
  )
}
