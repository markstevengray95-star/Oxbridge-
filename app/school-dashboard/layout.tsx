import Link from "next/link"
import { BarChart3, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SchoolDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>
    <div className="border-b border-cyan-100 bg-[#edf7f8]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-[#173f4a]"><div className="flex items-center gap-2"><BarChart3 className="size-4 text-[#147d91]"/><span><strong>Classroom Intelligence</strong> groups recurring priorities and creates targeted cohort follow-up.</span></div><Button asChild size="sm" variant="outline" className="bg-white"><Link href="/school-insights">Open insights <ArrowRight/></Link></Button></div></div>
    {children}
  </>
}
