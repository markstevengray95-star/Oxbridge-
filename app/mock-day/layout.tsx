import Link from "next/link"
import { FileText, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MockDayLayout({ children }: { children: React.ReactNode }) {
  return <>
    <div className="border-b border-cyan-100 bg-[#edf7f8]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-[#173f4a]"><div className="flex items-center gap-2"><FileText className="size-4 text-[#147d91]"/><span><strong>End-of-day evidence</strong> turns the full mock day into a saved preparation report and repair plan.</span></div><Button asChild size="sm" variant="outline" className="bg-white"><Link href="/mock-day-report">Open report <ArrowRight/></Link></Button></div></div>
    {children}
  </>
}
