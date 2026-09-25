import Link from "next/link"
import { Cookie } from "lucide-react"

export const metadata = {
  title: "Cookie & Storage Notice | ScholarBridge",
  description: "How ScholarBridge uses cookies and similar storage technologies.",
}

export default function CookiesPage() {
  return <main className="min-h-screen bg-[#f5f7f7] px-4 py-10 text-[#172b3a] sm:px-6">
    <article className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#edf7f8] text-[#147d91]"><Cookie /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Cookies & device storage</p><h1 className="mt-1 font-serif text-4xl font-bold">Cookie & Storage Notice</h1><p className="mt-2 text-sm text-slate-500">Last updated: 25 September 2026</p></div></div>

      <div className="mt-8 space-y-8 leading-7 text-slate-700">
        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">Essential storage</h2><p className="mt-2">ScholarBridge uses essential cookies or similar browser storage for sign-in sessions, security, plan access, remembering privacy choices and keeping core app features working. These are used because the requested service would not work properly without them.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">Optional technologies</h2><p className="mt-2">Optional third-party tools are not loaded simply because you visit ScholarBridge. Where a feature needs an external embedded or realtime service, such as an optional voice provider, you are given a choice before that provider is enabled. If analytics or similar optional technologies are added in future, they should follow the same preference.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">Current ScholarBridge preference cookie</h2><div className="mt-3 overflow-x-auto rounded-2xl border"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Name</th><th className="p-3">Purpose</th><th className="p-3">Category</th><th className="p-3">Duration</th></tr></thead><tbody><tr className="border-t"><td className="p-3 font-mono text-xs">scholarbridge_privacy_choices_v1</td><td className="p-3">Remembers whether you chose essential-only or allowed optional services.</td><td className="p-3">Essential preference storage</td><td className="p-3">Up to 180 days</td></tr></tbody></table></div></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">Authentication and application storage</h2><p className="mt-2">Authentication providers may set session cookies required to keep you signed in securely. ScholarBridge also uses local browser storage for some offline-first preparation preferences and progress continuity. Where those items are required for a feature you ask to use, they are treated as functional storage rather than advertising or behavioural tracking.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">Changing your choice</h2><p className="mt-2">Use the <strong>Privacy choices</strong> button shown on ScholarBridge to change your preference at any time. You can also clear cookies or site data using your browser settings. Choosing “Essential only” does not stop the cookies or storage that are needed for sign-in, security and the service you request.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">Third-party services</h2><p className="mt-2">If you actively enable a third-party feature, that provider may use its own storage or process technical information needed to deliver the feature. ScholarBridge should provide a just-in-time explanation before enabling optional providers.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">More information</h2><p className="mt-2">See the <Link href="/privacy" className="font-semibold text-[#147d91] hover:underline">Privacy Notice</Link> for how personal data is used more generally.</p></section>
      </div>
    </article>
  </main>
}
