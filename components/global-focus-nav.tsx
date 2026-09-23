"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Brain, Home, Sparkles, Target } from "lucide-react"

const items = [
  { href: "/", label: "Studio", icon: Home },
  { href: "/interview-room", label: "Interview Room", icon: Brain },
  { href: "/ai-interview", label: "AI Interview", icon: Sparkles },
  { href: "/advanced-practice", label: "Advanced Practice", icon: Target },
]

export function GlobalFocusNav() {
  const pathname = usePathname()
  return <nav aria-label="Focus tools" className="fixed bottom-20 right-3 z-[60] flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur lg:bottom-5 lg:right-5">
    {items.map(item => {
      const Icon = item.icon
      const active = pathname === item.href
      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${active ? "bg-[#102a43] text-white" : "text-slate-600 hover:bg-[#edf7f8] hover:text-[#102a43]"}`}><Icon className="size-4" /><span className={pathname === "/" ? "hidden 2xl:inline" : "hidden md:inline"}>{item.label}</span></Link>
    })}
  </nav>
}
