"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LayoutDashboard, MessageSquareText, Target, ClipboardCheck } from "lucide-react"

const interviewPaths = ["/interviews", "/interview-room", "/ai-interview", "/elevenlabs-interview", "/live-interview", "/panel-interview", "/cambridge-interview-day"]
const platformPaths = ["/student-home", "/requirements", "/timeline", "/backup-center", "/course-bank", "/reading-room", "/knowledge-graph", "/research-project", "/mock-week", "/technology-rehearsal", "/reasoning-lab", "/intervention-session", "/written-work-vault", "/essay-tutor", "/adaptive-paper", "/accessibility-profiles", "/working-analysis", "/cambridge-assessments", "/question-quality", "/timing-trainer", "/source-health", "/personal-statement-map", "/learning-support", "/teacher-coach", "/unseen-lab"]
const items = [
  { href: "/student-home", label: "Student Home", icon: Home, active: (path: string) => platformPaths.some(prefix => path === prefix || path.startsWith(`${prefix}/`)) },
  { href: "/", label: "Studio", icon: LayoutDashboard, active: (path: string) => path === "/" },
  { href: "/interviews", label: "Interviews", icon: MessageSquareText, active: (path: string) => interviewPaths.some(prefix => path === prefix || path.startsWith(`${prefix}/`)) },
  { href: "/advanced-practice", label: "Practice", icon: Target, active: (path: string) => path === "/advanced-practice" || path.startsWith("/advanced-practice/") || path === "/adaptive-paper" || path === "/essay-tutor" || path === "/timing-trainer" || path === "/question-quality" },
  { href: "/requirements", label: "Audit", icon: ClipboardCheck, active: (path: string) => path === "/requirements" || path === "/cambridge-assessments" || path === "/source-health" },
]

export function GlobalFocusNav() {
  const pathname = usePathname()
  return <nav aria-label="Focus tools" className="fixed bottom-20 right-3 z-[60] flex max-w-[calc(100vw-1.5rem)] items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur lg:bottom-5 lg:right-5">
    {items.map(item => {
      const Icon = item.icon
      const active = item.active(pathname)
      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`inline-flex h-10 flex-none items-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${active ? "bg-[#102a43] text-white" : "text-slate-600 hover:bg-[#edf7f8] hover:text-[#102a43]"}`}><Icon className="size-4" /><span className="hidden sm:inline">{item.label}</span></Link>
    })}
  </nav>
}
