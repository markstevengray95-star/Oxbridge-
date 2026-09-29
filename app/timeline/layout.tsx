import Link from "next/link"
import { CalendarClock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return <>
    <div className="border-b border-cyan-100 bg-[#edf7f8]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-[#173f4a]"><div className="flex items-center gap-2"><CalendarClock className="size-4 text-[#147d91]"/><span><strong>Deadline Command Centre</strong> combines application milestones with your school and personal deadlines.</span></div><Button asChild size="sm" variant="outline" className="bg-white"><Link href="/deadline-command-centre">Open command centre <ArrowRight/></Link></Button></div></div>
    {children}
  </>
}
