import Link from "next/link"
import { CalendarClock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DeadlineCommandCentreLayout({ children }: { children: React.ReactNode }) {
  return <>
    <div className="border-b border-cyan-100 bg-[#edf7f8]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-[#173f4a]"><div className="flex items-center gap-2"><CalendarClock className="size-4 text-[#147d91]"/><span><strong>Work-back Planner</strong> turns each dated milestone into 28-, 14-, 7- and 2-day preparation checkpoints.</span></div><Button asChild size="sm" variant="outline" className="bg-white"><Link href="/deadline-workback">Build work-back plan <ArrowRight/></Link></Button></div></div>
    {children}
  </>
}
