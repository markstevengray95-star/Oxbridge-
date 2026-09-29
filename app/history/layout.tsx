import Link from "next/link"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>
    <div className="border-b border-cyan-100 bg-[#edf7f8]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-[#173f4a]"><span><strong>Found a weak interview moment?</strong> Re-answer that exact branch without repeating the whole session.</span><Button asChild size="sm" variant="outline" className="bg-white"><Link href="/interview-replay"><RotateCcw />Open Replay Lab</Link></Button></div></div>
    {children}
  </>
}
