import Link from "next/link"
import { Brain, BookOpenCheck, Beaker } from "lucide-react"
import AdmissionsTestSimulator from "@/components/admissions-test-simulator"
import { UcatBasicCalculator } from "@/components/ucat-basic-calculator"

export default function TestPlayerPage() {
  return <>
    <div className="border-b bg-[#102a43] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 text-sm sm:px-6 lg:px-8">
        <span className="mr-auto font-semibold">Choose fixed simulation or adaptive diagnostic practice</span>
        <Link href="/exam-intelligence" className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-bold text-[#102a43]"><Brain className="size-4"/>Exam Intelligence</Link>
        <Link href="/lnat-passage-intelligence" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 font-semibold"><BookOpenCheck className="size-4"/>LNAT Passage Mode</Link>
        <Link href="/question-quality-lab" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 font-semibold"><Beaker className="size-4"/>Question Quality Lab</Link>
      </div>
    </div>
    <AdmissionsTestSimulator />
    <UcatBasicCalculator autoDetect />
  </>
}
