import Link from "next/link"
import { ShieldCheck } from "lucide-react"

export const metadata = {
  title: "Privacy Notice | ScholarBridge",
  description: "How ScholarBridge uses and protects personal data, including information for young people.",
}

const controllerName =
  process.env.NEXT_PUBLIC_DATA_CONTROLLER_NAME || "ScholarBridge"
const controllerAddress =
  process.env.NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS ||
  "Cheshire, North West England, United Kingdom (full service address must be confirmed before paid launch)"
const privacyEmail =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || "scholarbridge@gmail.com"

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f5f7f7] px-4 py-10 text-[#172b3a] sm:px-6">
      <article className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#edf7f8] text-[#147d91]">
            <ShieldCheck />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Privacy & UK GDPR</p>
            <h1 className="mt-1 font-serif text-4xl font-bold">ScholarBridge Privacy Notice</h1>
            <p className="mt-2 text-sm text-slate-500">Last updated: 4 October 2026</p>
          </div>
        </div>

        <section className="mt-7 rounded-2xl border border-[#cfe1e4] bg-[#f8fbfb] p-5">
          <h2 className="font-serif text-2xl font-bold">The short version</h2>
          <p className="mt-2 leading-7 text-slate-700">
            ScholarBridge is an admissions-preparation service. We use the personal information needed to create and secure your account, remember your preparation progress, provide practice and feedback, run optional AI or voice features, manage subscriptions and support School-plan features. We do not sell your personal data. We aim to collect only what is reasonably needed for these purposes and apply high-privacy defaults for young users.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <Link href="/privacy-centre" className="text-[#147d91] underline">Open Privacy Centre</Link>
            <Link href="/safeguarding" className="text-[#147d91] underline">Report a safety concern</Link>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-serif text-xl font-bold text-emerald-950">If you are under 18</h2>
          <p className="mt-2 leading-7 text-emerald-950">
            ScholarBridge is designed to be usable by teenagers. Your account starts with high-privacy settings. We ask for an age band rather than your full date of birth. There are no public student profiles or student-to-student messages. You do not need to share unnecessary sensitive information to use the core service. Optional AI, voice or third-party features only process the information needed when you choose to use them. You can use the Privacy Centre to download available account data, make a privacy request or request account deletion.
          </p>
        </section>

        <div className="mt-8 space-y-8 leading-7 text-slate-700">
          <Section n="1" title="Who is responsible for your data?">
            <p>
              <strong>{controllerName}</strong> is responsible for ScholarBridge personal data where ScholarBridge decides why and how the information is used. A school or other organisation may instead be the controller for some school-managed activities, with ScholarBridge acting as its processor or in another documented role.
            </p>
            <p>
              <strong>Operating location:</strong> {controllerAddress}<br />
              <strong>Privacy contact:</strong> <a className="font-semibold text-[#147d91] underline" href={`mailto:${privacyEmail}`}>{privacyEmail}</a>
            </p>
            <p className="text-sm text-slate-500">
              ScholarBridge is the operator name supplied for the service. If ScholarBridge is a trading name rather than a separate incorporated legal entity, the underlying legal person or entity must also be identified in the legal records and disclosures that require it. The regional location above is not being treated as a complete geographic service address for paid launch.
            </p>
          </Section>

          <Section n="2" title="Information we collect or receive">
            <ul className="list-disc space-y-2 pl-6">
              <li>Account details such as name, email address and authentication information.</li>
              <li>A broad age band, such as 13–15, 16–17 or 18+, so age-appropriate protections can be applied without collecting a full date of birth.</li>
              <li>Versioned acknowledgement of the Terms and this Privacy Notice.</li>
              <li>Target university, course, application year and preparation preferences.</li>
              <li>Practice answers, scores, feedback, progress, reflections, study plans and revision activity.</li>
              <li>Written work, personal-statement text, files or other content you choose to submit for analysis.</li>
              <li>Interview transcripts and audio when you actively use a feature that needs them.</li>
              <li>School, cohort, assignment and authorised membership information where School-plan features are used.</li>
              <li>Subscription, entitlement and payment-status information. Full payment-card details are handled by Stripe rather than stored directly by ScholarBridge.</li>
              <li>Technical, security and usage information reasonably needed for authentication, rate limiting, fraud or abuse prevention and service reliability.</li>
              <li>Privacy-rights requests, support messages and safeguarding reports that you choose to submit.</li>
            </ul>
          </Section>

          <Section n="3" title="Why we use personal information">
            <p>We use personal information to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>create, authenticate and protect accounts;</li>
              <li>provide practice, marking, progress tracking, interview preparation and personalised learning features;</li>
              <li>provide optional AI and voice features when requested;</li>
              <li>manage subscriptions, entitlements and customer support;</li>
              <li>provide authorised School-plan dashboards and assignments;</li>
              <li>respond to privacy-rights requests and safeguarding concerns;</li>
              <li>prevent misuse, investigate security problems and keep the service reliable; and</li>
              <li>meet legal, accounting and regulatory obligations where they apply.</li>
            </ul>
          </Section>

          <Section n="4" title="Our lawful bases">
            <p>
              The lawful basis depends on the purpose. Core account and service processing may be necessary to provide a service requested by the user or to take steps requested before entering a contract. Security and limited service-protection processing may rely on legitimate interests where those interests do not override the rights and interests of users, especially children. Billing and record-keeping may also be required by law. Consent is used where it is the appropriate basis for genuinely optional processing. Where we rely on consent, it can be withdrawn without affecting processing that was already lawful before withdrawal.
            </p>
            <p>
              School-managed processing is assessed separately because the school may determine the purpose and lawful basis for pupil data. ScholarBridge and the school must document their respective roles before pupil information is imported or shared at scale.
            </p>
          </Section>

          <Section n="5" title="AI, voice and service providers">
            <p>
              Depending on the feature, ScholarBridge may use Supabase for authentication/database services, Vercel for hosting/server execution, Stripe for billing, and AI or voice providers such as Google Gemini, OpenAI and ElevenLabs. A provider should receive only the information reasonably required to deliver the feature being used.
            </p>
            <p>
              Do not include health information, passwords, financial details or other highly sensitive personal information in essays, prompts, interview responses or uploads unless it is genuinely necessary for the feature and you understand why it is being provided.
            </p>
          </Section>

          <Section n="6" title="International transfers">
            <p>
              Some service providers may process information outside the United Kingdom. Where UK data-protection law requires safeguards for an international transfer, ScholarBridge must use an applicable UK adequacy arrangement, approved contractual safeguard or other lawful transfer mechanism and keep the provider arrangement under review.
            </p>
          </Section>

          <Section n="7" title="Children and young people">
            <p>
              ScholarBridge is likely to be accessed by people under 18 and is designed with the ICO Children's Code in mind. Direct self-sign-up is intended for users aged 13 or over. We use an age band instead of a full date of birth and apply high-privacy defaults. Core use does not require geolocation, public profiles or student-to-student messaging. Personalisation is intended to support educational preparation rather than infer sensitive characteristics. If you are under 13, do not create a direct self-sign-up account; use an appropriate school-managed or parent/guardian-supported route if one is offered.
            </p>
          </Section>

          <Section n="8" title="How long we keep information">
            <p>
              Account and learning information is kept while reasonably needed to provide the account and associated service. When an account is deleted, user-linked data is designed to be removed through the deletion workflow, subject to lawful exceptions. Privacy-request and safeguarding records may be retained for a proportionate period where necessary for accountability, safety or legal obligations. Stripe and other payment providers may retain transaction records where financial or tax law requires them. Security and rate-limit records should be kept for the shortest operational period reasonably necessary.
            </p>
          </Section>

          <Section n="9" title="Your data-protection rights">
            <p>
              Depending on the circumstances, UK data-protection law may give you rights to access your information, correct inaccurate information, request deletion, restrict processing, object to some processing, receive certain information in a portable format and withdraw consent where consent is the lawful basis. These rights are not absolute in every situation.
            </p>
            <p>
              ScholarBridge provides a <Link href="/privacy-centre" className="font-semibold text-[#147d91] underline">Privacy Centre</Link> for available data export, privacy requests and account deletion. You can also email <a className="font-semibold text-[#147d91] underline" href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. You may complain to the UK Information Commissioner's Office if you are unhappy with how your information is handled.
            </p>
          </Section>

          <Section n="10" title="Automated and AI feedback">
            <p>
              AI-generated feedback, classifications, readiness indicators and practice scores are educational support tools. They are not official Oxford, Cambridge, school or admissions-test decisions and must not be used as the sole basis for a significant decision about a learner. ScholarBridge does not intend to infer sensitive traits such as health, ethnicity, religion or sexuality from voice, writing or interview behaviour.
            </p>
          </Section>

          <Section n="11" title="School-plan use">
            <p>
              Before a school imports pupil data, the school and ScholarBridge must identify their data-protection roles, document the purpose and lawful basis for the processing, agree appropriate data-processing terms where required and limit access to authorised staff and pupils. Schools remain responsible for information they choose to upload and for ensuring they have authority to use ScholarBridge for their pupils.
            </p>
          </Section>

          <Section n="12" title="Cookies and device storage">
            <p>
              Essential storage may be used for authentication, account security, plan access and privacy preferences. Non-essential cookies or similar technologies must not be enabled merely because a user visits ScholarBridge where consent is required. See the <Link href="/cookies" className="font-semibold text-[#147d91] underline">Cookie & Storage Notice</Link> for more information.
            </p>
          </Section>

          <Section n="13" title="Security and data breaches">
            <p>
              ScholarBridge uses technical and organisational safeguards intended to protect personal information, including access controls, server-side authorisation and account-security controls. No online service can guarantee absolute security. Suspected personal-data breaches must be recorded and assessed, and reportable breaches must be handled in accordance with UK data-protection law.
            </p>
          </Section>

          <Section n="14" title="Safeguarding and complaints">
            <p>
              Safety concerns can be raised through the <Link href="/safeguarding" className="font-semibold text-[#147d91] underline">Safeguarding page</Link>. Privacy questions or complaints can be sent to <a className="font-semibold text-[#147d91] underline" href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. AI is not used as the sole decision-maker for whether a safeguarding concern is valid or requires action.
            </p>
          </Section>

          <Section n="15" title="Changes to this notice">
            <p>
              We may update this notice when features, providers, business arrangements or laws change. Material changes should be highlighted to users, and a new acknowledgement may be requested where appropriate. The date at the top shows the current version.
            </p>
          </Section>
        </div>
      </article>
    </main>
  )
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-2xl font-bold text-[#102a43]">{n}. {title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  )
}
