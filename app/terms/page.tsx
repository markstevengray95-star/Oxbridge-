import Link from "next/link"
import { AlertTriangle, CreditCard, GraduationCap, Scale, ShieldCheck } from "lucide-react"

const operator = process.env.NEXT_PUBLIC_DATA_CONTROLLER_NAME || "ScholarBridge service operator"
const address = process.env.NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS || "Operator contact address to be configured before public launch"
const legalEmail = process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL || process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || "Legal contact email to be configured before public launch"

export const metadata = { title: "Terms of Service | ScholarBridge" }

export default function TermsPage() {
  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-teal-800"><GraduationCap className="size-5" />ScholarBridge</div>
      <section className="rounded-3xl bg-[#102a43] p-7 text-white sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-200">Terms of Service & consumer information</p>
        <h1 className="mt-3 font-serif text-4xl font-bold">Clear rules for using and buying ScholarBridge.</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-200">Last updated 25 September 2026. These terms explain the educational service, subscriptions, cancellation, AI limitations and account responsibilities. Your statutory consumer rights are not excluded.</p>
      </section>

      <Notice icon={<Scale />} title="Who provides the service"><p>ScholarBridge is operated by <strong>{operator}</strong>. Contact address: {address}. Legal/contact email: {legalEmail}.</p></Notice>
      <Notice icon={<GraduationCap />} title="Educational service — not an admissions decision"><p>ScholarBridge provides preparation, practice questions, writing feedback and simulated interview coaching. AI or offline scores are practice signals only. They are not official Oxford, Cambridge, UCAS, admissions-test-provider, school or university decisions, marks or guarantees of an offer.</p></Notice>
      <Notice icon={<ShieldCheck />} title="Accounts and younger users"><p>You must give accurate account information and keep login details private. Direct self-sign-up is intended for people aged 13 or over. Users under 18 receive the same high-privacy defaults and should involve a parent, guardian, teacher or other trusted adult where appropriate, especially for purchases or safeguarding concerns.</p></Notice>

      <Section title="Subscriptions, prices and renewal">
        <p>Paid plans are shown with the price and billing interval before checkout. Unless the checkout page says otherwise, subscriptions renew automatically for the selected monthly or annual interval until cancelled. Stripe processes payment information; ScholarBridge does not store full card details.</p>
        <p>You can manage or cancel an active Stripe subscription from the Account page. Cancelling normally stops future renewal while access continues until the end of the paid period, subject to the checkout terms and applicable consumer law.</p>
      </Section>

      <Section title="Cooling-off, cancellation and digital-service rights">
        <p>UK consumers may have statutory cancellation, refund, repair, repeat-performance or price-reduction rights depending on what was bought, when supply began and the circumstances. Nothing in these terms removes those rights.</p>
        <p>If ScholarBridge asks you to begin paid digital supply during a statutory cancellation period, any consent or acknowledgement required by law must be obtained clearly at checkout. If you believe you are entitled to cancel or obtain a remedy, contact {legalEmail} and include the account email and purchase date, not payment-card details.</p>
      </Section>

      <Section title="Fair use and acceptable conduct">
        <p>Do not attempt to break account security, access another person's data, misuse school workspaces, upload unlawful material, harass another user, or use the service to facilitate cheating in a live assessment. Practice and learning are encouraged; misrepresenting AI-generated work as your own where rules prohibit it is not.</p>
      </Section>

      <Section title="AI and third-party services">
        <p>Some features use external AI, voice, hosting, authentication and payment providers. AI can make mistakes. Important application requirements, deadlines and test rules must be checked against the official university or test-provider source. Do not enter information that is unnecessary for the learning task, particularly highly sensitive personal information.</p>
      </Section>

      <Section title="Availability and changes">
        <p>ScholarBridge may change features, models or practice content to improve accuracy, security or compliance. Reasonable efforts are made to keep the service available, but uninterrupted availability is not promised. Material changes to paid-plan features or these terms should be communicated clearly.</p>
      </Section>

      <Section title="Intellectual property">
        <p>ScholarBridge's original interface, explanations and practice materials remain protected by applicable intellectual-property law. Official university/test-provider names and materials belong to their respective owners. ScholarBridge is not presented as an official Oxford or Cambridge service.</p>
      </Section>

      <Section title="Liability">
        <p>Nothing limits liability where the law does not allow it to be limited, including liability for fraud or personal injury caused by negligence. Subject to those protections, ScholarBridge is an educational preparation tool and is not responsible for admissions decisions made by universities or for decisions based on ignoring official application guidance.</p>
      </Section>

      <Section title="Privacy, safeguarding and complaints">
        <p>How personal data is handled is explained in the <Link className="font-semibold text-teal-800 underline" href="/privacy">Privacy Notice</Link>. Privacy choices are described in the <Link className="font-semibold text-teal-800 underline" href="/cookies">Cookie Notice</Link>. Safety concerns can be raised through the <Link className="font-semibold text-teal-800 underline" href="/safeguarding">Safeguarding page</Link>. Other legal or consumer complaints can be sent to {legalEmail}.</p>
      </Section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><p><strong>Before public launch:</strong> the operator name, address and legal email shown above must be real and current. These product terms are a launch safeguard, not a substitute for professional legal review of your particular business and school contracts.</p></div></div>
      <div className="flex flex-wrap gap-4 text-sm font-semibold"><Link href="/privacy" className="text-teal-800 underline">Privacy Notice</Link><Link href="/safeguarding" className="text-teal-800 underline">Safeguarding</Link><Link href="/account" className="text-teal-800 underline">Account & billing</Link></div>
    </div>
  </main>
}

function Notice({icon,title,children}:{icon:React.ReactNode;title:string;children:React.ReactNode}){return <section className="rounded-2xl border bg-white p-5"><div className="flex items-start gap-3"><span className="mt-0.5 text-teal-700">{icon}</span><div><h2 className="font-serif text-xl font-bold">{title}</h2><div className="mt-2 text-sm leading-6 text-slate-600">{children}</div></div></div></section>}
function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="rounded-2xl border bg-white p-6"><h2 className="font-serif text-2xl font-bold">{title}</h2><div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{children}</div></section>}
