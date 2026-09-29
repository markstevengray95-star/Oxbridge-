import Link from "next/link"
import { Brain, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MistakeDnaLayout({ children }: { children: React.ReactNode }) {
  return <>
    <div className="border-b border-cyan-100 bg-[#edf7f8]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-[#173f4a]"><div className="flex items-center gap-2"><Brain className="size-4 text-[#147d91]"/><span><strong>Mistake Intelligence</strong> now tracks root causes and whether they are improving across papers.</span></div><Button asChild size="sm" variant="outline" className="bg-white"><Link href="/mistake-intelligence">Open intelligence <ArrowRight/></Link></Button></div></div>
    {children}
  </>
}
