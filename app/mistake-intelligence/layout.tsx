import Link from "next/link"
import { Target, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MistakeIntelligenceLayout({ children }: { children: React.ReactNode }) {
  return <>
    <div className="border-b border-cyan-100 bg-[#edf7f8]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-[#173f4a]"><div className="flex items-center gap-2"><Target className="size-4 text-[#147d91]"/><span><strong>Repair Plan</strong> turns the highest root cause into a four-stage intervention and verification loop.</span></div><Button asChild size="sm" variant="outline" className="bg-white"><Link href="/mistake-repair-plan">Open repair plan <ArrowRight/></Link></Button></div></div>
    {children}
  </>
}
