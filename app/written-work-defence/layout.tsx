import Link from "next/link"
import { MessageSquareText } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function WrittenWorkDefenceLayout({ children }: { children: React.ReactNode }) {
  return <>
    <div className="border-b border-cyan-100 bg-[#edf7f8]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-[#173f4a]"><span><strong>New:</strong> turn this defence map into a live adaptive interview.</span><Button asChild size="sm" variant="outline" className="bg-white"><Link href="/written-work-interview"><MessageSquareText />Open live defence simulator</Link></Button></div></div>
    {children}
  </>
}
