import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  FileText,
  History,
  MessageSquareText,
} from "lucide-react"

const recordLinks = [
  {
    href: "#tutor-completed-work",
    title: "Saved work viewer",
    description: "See completed exam papers, question-by-question marking and saved interview transcripts directly inside Tutor.",
    icon: History,
    eyebrow: "In Tutor",
  },
  {
    href: "/interview-replay",
    title: "Interview transcripts",
    description: "Open previous interviews and replay the conversation turn by turn so you can review how your reasoning developed.",
    icon: MessageSquareText,
    eyebrow: "Interviews",
  },
  {
    href: "/interview-feedback",
    title: "Interview analysis",
    description: "Review feedback, strengths, reasoning quality and improvement targets from your interview practice.",
    icon: BarChart3,
    eyebrow: "Feedback",
  },
  {
    href: "/test-results",
    title: "Exam results",
    description: "See scores, accuracy, completed papers and performance breakdowns from admissions-test practice.",
    icon: FileText,
    eyebrow: "Tests",
  },
  {
    href: "/history",
    title: "Full activity history",
    description: "Open your wider preparation history so past practice, results and analysis are easier to find again.",
    icon: History,
    eyebrow: "History",
  },
  {
    href: "/written-work-vault",
    title: "Essay & written-work analysis",
    description: "Return to saved written work and use it alongside your essay analysis and comparison tools.",
    icon: BookOpenCheck,
    eyebrow: "Written work",
  },
  {
    href: "/personal-statement-map",
    title: "Personal statement analysis",
    description: "Review the evidence, themes and discussion points identified from your personal statement preparation.",
    icon: BookOpenCheck,
    eyebrow: "Application",
  },
  {
    href: "/exam-intelligence",
    title: "Exam intelligence",
    description: "Turn your previous test performance into patterns, priorities and targeted next-step practice.",
    icon: BarChart3,
    eyebrow: "Analysis",
  },
]

export function TutorProgressRecordsHub() {
  return (
    <section id="tutor-progress-records" className="scroll-mt-28 border-y border-[#dbe5e7] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Your preparation record</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-[#102a43] sm:text-4xl">Progress & Records</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              One place to find your interview transcripts, interview feedback, exam results, saved answers and the analysis produced from your practice.
            </p>
          </div>
          <Link
            href="#tutor-completed-work"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#102a43] px-4 text-sm font-semibold text-white transition hover:bg-[#173d59]"
          >
            Review saved work <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Progress and records shortcuts">
          {recordLinks.map(item => {
            const Icon = item.icon
            return (
              <Link
                key={`${item.href}-${item.title}`}
                href={item.href}
                className="group flex min-h-44 flex-col rounded-2xl border border-[#dbe5e7] bg-[#f9fcfc] p-5 transition hover:-translate-y-0.5 hover:border-[#9ac7cf] hover:bg-white hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[#e7f4f5] text-[#147d91]">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">{item.eyebrow}</span>
                </div>
                <h3 className="mt-4 font-semibold text-[#102a43]">{item.title}</h3>
                <p className="mt-1 flex-1 text-xs leading-5 text-slate-500">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#147d91]">
                  Open <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            )
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-[#cfe4e7] bg-[#edf7f8] px-4 py-3 text-sm text-[#35566a]">
          Your detailed saved exam papers, answers and interview transcripts are also shown immediately below, so you can review them without leaving Tutor.
        </div>
      </div>
    </section>
  )
}
