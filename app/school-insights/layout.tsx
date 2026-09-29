import Link from "next/link"
import { Target, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SchoolInsightsLayout({ children }: { children: React.ReactNode }) {
  return <>
    <div className="border-b border-cyan-100 bg-[#edf7f8]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-[#173f4a]"><div className="flex items-center gap-2"><Target className="size-4 text-[#147d91]"/><span><strong>Differentiation Planner</strong> can now turn each student’s current priority into a private targeted assignment.</span></div><Button asChild size="sm" variant="outline" className="bg-white"><Link href="/school-differentiation">Open planner <ArrowRight/></Link></Button></div></div>
    {children}
  </>
}
