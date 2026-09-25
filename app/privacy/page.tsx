import Link from "next/link"
import { ShieldCheck } from "lucide-react"

export const metadata = {
  title: "Privacy Notice | ScholarBridge",
  description: "How ScholarBridge uses and protects personal data.",
}

const controllerName = process.env.NEXT_PUBLIC_DATA_CONTROLLER_NAME || "ScholarBridge service operator"
const controllerAddress = process.env.NEXT_PUBLIC_DATA_CONTROLLER_ADDRESS || "Add the controller's registered or contact address in Vercel"
const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || "Add a privacy contact email in Vercel"

export default function PrivacyPage() {
  return <main className="min-h-screen bg-[#f5f7f7] px-4 py-10 text-[#172b3a] sm:px-6">
    <article className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#edf7f8] text-[#147d91]"><ShieldCheck /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Privacy & UK GDPR</p><h1 className="mt-1 font-serif text-4xl font-bold">ScholarBridge Privacy Notice</h1><p className="mt-2 text-sm text-slate-500">Last updated: 25 September 2026</p></div></div>

      <section className="mt-7 rounded-2xl border border-[#cfe1e4] bg-[#f8fbfb] p-5">
        <h2 className="font-serif text-2xl font-bold">The short version</h2>
        <p className="mt-2 leading-7 text-slate-700">ScholarBridge stores the information needed to run your account, remember your preparation progress and provide personalised practice. We do not sell your personal data. Some features use specialist providers such as cloud hosting, payments and AI/voice services. We aim to collect only what is needed, keep it secure and give you control over optional technologies.</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">If you are unsure about sharing information, especially sensitive information, speak to a parent, guardian, teacher or another trusted adult before continuing.</p>
      </section>

      <div className="mt-8 space-y-8 leading-7 text-slate-700">
        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">1. Who is responsible for your data?</h2><p className="mt-2"><strong>{controllerName}</strong> is the data controller for ScholarBridge unless a school or other organisation using the School plan is the controller for particular school-managed data.</p><p className="mt-2"><strong>Contact address:</strong> {controllerAddress}<br/><strong>Privacy contact:</strong> {privacyEmail}</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">2. Information we may collect</h2><ul className="mt-2 list-disc space-y-2 pl-6"><li>Account details such as name, email address and authentication information.</li><li>Preparation profile information such as target university, course, application year and study preferences.</li><li>Your answers, scores, feedback, progress, reflections, written work and study-plan data.</li><li>Interview transcripts, recordings or audio only when you choose a voice/interview feature that requires them.</li><li>Files or text you choose to upload for analysis.</li><li>School/cohort information where a school account is used.</li><li>Subscription and payment status. Card details are handled by the payment provider rather than stored directly by ScholarBridge.</li><li>Technical and security information needed to keep accounts working safely.</li></ul></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">3. Why we use it</h2><p className="mt-2">We use personal data to provide and personalise the service, save progress across devices, mark and analyse practice work, operate interview and tutoring features, manage subscriptions, provide school dashboards where applicable, prevent abuse and keep the service secure.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">4. Lawful bases</h2><p className="mt-2">Depending on the activity, processing may be necessary to provide the service you ask for, necessary for legitimate interests such as security and improving the service where those interests do not override your rights, required by law, or based on your consent for optional technologies. Where consent is used, you can withdraw it.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">5. AI and third-party services</h2><p className="mt-2">ScholarBridge may use providers for hosting/database services, authentication, payments, AI text generation and optional realtime voice features. Depending on the feature, this can include services such as Supabase, Vercel, Stripe, Google Gemini, OpenAI and ElevenLabs. Only send information that is appropriate for the feature you are using. Do not upload highly sensitive personal information unless it is genuinely necessary.</p><p className="mt-2">Where providers process data outside the UK, appropriate contractual or other recognised transfer safeguards should be used where required.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">6. Children and young people</h2><p className="mt-2">ScholarBridge is designed to be understandable for students. Privacy information should be presented clearly and at the point a feature uses data. Optional tracking or external services are not treated as automatically necessary. Younger users should ask a trusted adult if they are uncertain about a privacy choice.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">7. How long we keep data</h2><p className="mt-2">Data should be kept only for as long as needed for the purpose it was collected for, account continuity, legal requirements and legitimate security/audit needs. Account and learning records should be reviewed periodically and deleted or anonymised when no longer required. Payment providers may retain transaction records for their own legal obligations.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">8. Your rights</h2><p className="mt-2">Depending on the circumstances, UK data protection law can give you rights to access your data, correct it, request deletion, restrict or object to certain processing, obtain portable copies of some data and withdraw consent. You can also complain to the UK Information Commissioner’s Office if you believe your data protection rights have not been respected.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">9. Automated feedback</h2><p className="mt-2">AI feedback, readiness indicators and practice scores are educational support tools. They should not be treated as official admissions decisions or as a substitute for a human judgement where an important decision about a student is being made.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">10. Cookies and device storage</h2><p className="mt-2">Essential storage is used for authentication, security, plan access and privacy preferences. Optional technologies are controlled separately. See the <Link href="/cookies" className="font-semibold text-[#147d91] hover:underline">Cookie & Storage Notice</Link> for details.</p></section>

        <section><h2 className="font-serif text-2xl font-bold text-[#102a43]">11. Changes to this notice</h2><p className="mt-2">We may update this notice when features, providers or legal requirements change. Material changes should be highlighted clearly in the service.</p></section>
      </div>
    </article>
  </main>
}
