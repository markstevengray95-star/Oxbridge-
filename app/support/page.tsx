import type { Metadata } from "next"
import Link from "next/link"
import { CircleHelp, Mail, ShieldCheck, Activity, KeyRound, CreditCard } from "lucide-react"

export const metadata: Metadata = {
  title: "Support | ScholarBridge",
  description: "Get help with ScholarBridge accounts, preparation tools, billing, privacy and safeguarding.",
  alternates: { canonical: "/support" },
}

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim()

const helpAreas = [
  {
    title: "Sign-in and account help",
    description: "Use the normal sign-in and password-reset options first. Account and subscription controls are available from your Account page after signing in.",
    icon: KeyRound,
    href: "/login",
    label: "Open sign in",
  },
  {
    title: "Billing and subscription",
    description: "Plan access, billing status and available subscription controls are shown in Account & billing. Payment-card details are handled by Stripe rather than stored by ScholarBridge.",
    icon: CreditCard,
    href: "/account",
    label: "Account & billing",
  },
  {
    title: "Privacy and your data",
    description: "Export your data, make a privacy request, review your choices or start account deletion from the Privacy Centre.",
    icon: ShieldCheck,
    href: "/privacy-centre",
    label: "Privacy Centre",
  },
  {
    title: "Service availability",
    description: "Check whether the ScholarBridge web application is currently responding. The status page deliberately does not claim that every external AI or payment provider is healthy.",
    icon: Activity,
    href: "/status",
    label: "Service status",
  },
]

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#f5f7f7] px-4 py-10 text-[#172b3a] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#edf7f8] text-[#147d91]"><CircleHelp /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Help & support</p>
              <h1 className="mt-1 font-serif text-4xl font-bold text-[#102a43]">ScholarBridge Support</h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600">Find the right route for account, billing, privacy, safeguarding and service issues. This page does not expose private account information.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {helpAreas.map(({ title, description, icon: Icon, href, label }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <Icon className="size-5 text-[#147d91]" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-bold text-[#102a43]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                <Link href={href} className="mt-4 inline-flex font-semibold text-[#147d91] underline underline-offset-4">{label}</Link>
              </article>
            ))}
          </div>

          <section className="mt-6 rounded-2xl border border-[#cfe1e4] bg-[#f8fbfb] p-5">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-5 text-[#147d91]" aria-hidden="true" />
              <div>
                <h2 className="font-bold text-[#102a43]">Contact support</h2>
                {supportEmail ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">For an issue that cannot be solved in the app, email <a className="font-semibold text-[#147d91] underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>. Do not send passwords, API keys or unnecessary sensitive information.</p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-600">The public support inbox has not yet been configured. The launch checklist will keep this as an outstanding production-setting item until <code className="rounded bg-white px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPPORT_EMAIL</code> is set to a monitored address.</p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-bold text-amber-950">Safety concern?</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">Use the dedicated safeguarding route for concerns about a student or unsafe content. ScholarBridge is an educational preparation service, not an emergency or safeguarding authority.</p>
            <Link href="/safeguarding" className="mt-3 inline-flex font-semibold text-amber-950 underline underline-offset-4">Open safeguarding</Link>
          </section>
        </section>
      </div>
    </main>
  )
}
