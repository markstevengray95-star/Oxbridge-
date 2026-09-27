"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  BookOpen,
  Brain,
  ChevronDown,
  ClipboardCheck,
  GraduationCap,
  Home,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Search,
  Smartphone,
  Target,
  Users,
  X,
} from "lucide-react"

type NavItem = { href: string; label: string; description?: string }
type NavSection = { label: string; items: NavItem[] }
type NavGroup = { label: string; icon: typeof Brain; sections: NavSection[]; align?: "left" | "right" }

const groups: NavGroup[] = [
  {
    label: "Practice",
    icon: Target,
    sections: [
      {
        label: "Interviews",
        items: [
          { href: "/interviews", label: "Interview Hub", description: "Choose the right interview format" },
          { href: "/live-interview", label: "Gemini Live Voice", description: "Realtime voice interview" },
          { href: "/natural-ai-interview", label: "Natural Voice", description: "Adaptive spoken interview" },
          { href: "/interview-room", label: "Formal Interview", description: "Structured realistic practice" },
          { href: "/panel-interview", label: "Panel Interview", description: "Two academic interviewers" },
          { href: "/cambridge-interview-day", label: "Cambridge Interview Day", description: "Cambridge-style simulation" },
          { href: "/mock-day", label: "Mock Interview Day", description: "Two interviews and end-of-day review" },
          { href: "/mock-week", label: "Mock Week", description: "Longer no-feedback interview block" },
          { href: "/interview-feedback", label: "Interview Feedback", description: "Reasoning analysis and re-answer practice" },
          { href: "/elevenlabs-interview", label: "ElevenLabs Voice", description: "Alternative realtime voices" },
          { href: "/ai-interview", label: "AI Interview", description: "Transcript-based adaptive follow-up" },
        ],
      },
      {
        label: "Admissions tests",
        items: [
          { href: "/full-papers", label: "Full Papers", description: "Timed TMUA, ESAT, TARA, LNAT and UCAT mocks" },
          { href: "/advanced-practice", label: "Question Practice", description: "Challenge ladders and question bank" },
          { href: "/adaptive-paper", label: "Adaptive Paper", description: "Weak-area paper generator" },
          { href: "/paper-intervention", label: "Paper Intervention", description: "Weakness → mini-lesson → retest" },
          { href: "/timing-trainer", label: "Timing Trainer", description: "Pacing, flag and skip decisions" },
          { href: "/essay-tutor", label: "Essay Tutor", description: "LNAT/TARA argument analysis" },
          { href: "/question-quality", label: "Question Quality", description: "Question-bank validation" },
        ],
      },
    ],
  },
  {
    label: "Application",
    icon: ClipboardCheck,
    sections: [
      {
        label: "Application preparation",
        items: [
          { href: "/application-profile", label: "Application Digital Twin", description: "Connect course, reading, projects and written work" },
          { href: "/application-defence", label: "Application Defence", description: "Practise questions from your own evidence" },
          { href: "/requirements", label: "Requirements & Audit", description: "Course and application requirements" },
          { href: "/timeline", label: "Timeline", description: "Deadlines and next actions" },
          { href: "/personal-statement-map", label: "Personal Statement Defence", description: "Defend every academic claim" },
          { href: "/written-work-vault", label: "Written Work", description: "Written-work defence preparation" },
        ],
      },
      {
        label: "Readiness",
        items: [
          { href: "/cambridge-assessments", label: "Cambridge Assessments", description: "College assessment guidance" },
          { href: "/technology-rehearsal", label: "Technology Rehearsal", description: "Camera, mic and interview setup" },
          { href: "/source-health", label: "Official Source Watcher", description: "Check guidance freshness" },
          { href: "/backup-center", label: "Backup Centre", description: "Encrypted profile export/import" },
        ],
      },
    ],
  },
  {
    label: "Learn",
    icon: BookOpen,
    sections: [
      {
        label: "Build knowledge",
        items: [
          { href: "/daily-challenge", label: "Daily Challenge", description: "One course-specific reasoning challenge" },
          { href: "/course-bank", label: "Course Bank", description: "Deep course-specific questions" },
          { href: "/reading-room", label: "Reading Room", description: "Academic extracts and tutorial questions" },
          { href: "/supercurricular-coach", label: "Supercurricular Coach", description: "Turn reading and projects into interview reasoning" },
          { href: "/knowledge-graph", label: "Knowledge Graph", description: "Connect supercurricular ideas" },
          { href: "/research-project", label: "Research Project", description: "Evidence, thesis and defence" },
        ],
      },
      {
        label: "Build reasoning",
        items: [
          { href: "/tutorial-lab", label: "Tutorial Lab", description: "Draw, calculate and explain reasoning" },
          { href: "/unseen-lab", label: "Unseen Material Lab", description: "Graphs, sources and unfamiliar data" },
          { href: "/reasoning-lab", label: "Reasoning Lab", description: "Argument maps and misconceptions" },
          { href: "/intervention-session", label: "Intervention Session", description: "Target recurring weaknesses" },
          { href: "/working-analysis", label: "Working Analysis", description: "Analyse handwritten reasoning" },
          { href: "/learning-support", label: "Learning Support", description: "EAL and Mandarin scaffolds" },
        ],
      },
    ],
  },
  {
    label: "Progress",
    icon: Users,
    align: "right",
    sections: [
      {
        label: "Student progress",
        items: [
          { href: "/mistake-dna", label: "Mistake DNA", description: "Recurring reasoning and test-error patterns" },
          { href: "/progress-proof", label: "Progress Proof", description: "Evidence of what has improved" },
          { href: "/human-review", label: "Human + AI Review", description: "Teacher comments alongside automated analysis" },
          { href: "/parent-summary", label: "Parent Summary", description: "Privacy-safe progress overview" },
        ],
      },
      {
        label: "School & account",
        items: [
          { href: "/school-classroom", label: "Student Classroom", description: "Join a cohort and complete assigned preparation" },
          { href: "/school-dashboard", label: "School Dashboard", description: "Cohorts, assignments, analytics and reports" },
          { href: "/premium", label: "Plans", description: "Free, Pro and School access" },
          { href: "/account", label: "Account & Billing", description: "Sign in, subscription and cloud progress" },
          { href: "/accessibility-profiles", label: "Accessibility", description: "Saved accessibility profiles" },
        ],
      },
    ],
  },
]

const allItems = groups.flatMap(group => group.sections.flatMap(section => section.items))

function pathMatches(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

function groupIsActive(pathname: string, group: NavGroup) {
  return group.sections.some(section => section.items.some(item => pathMatches(pathname, item.href)))
}

export function GlobalFocusNav() {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [isPhone, setIsPhone] = useState(false)
  const [forceCompact, setForceCompact] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsPhone(query.matches)
    sync()
    query.addEventListener("change", sync)
    setForceCompact(window.localStorage.getItem("scholarbridge-mobile-mode") === "compact")
    return () => query.removeEventListener("change", sync)
  }, [])

  const mobileMode = isPhone || forceCompact

  useEffect(() => {
    document.documentElement.dataset.mobileUi = mobileMode ? "true" : "false"
    return () => { delete document.documentElement.dataset.mobileUi }
  }, [mobileMode])

  useEffect(() => {
    setOpenGroup(null)
    setMobileMenuOpen(false)
    setSearch("")
  }, [pathname])

  useEffect(() => {
    const closeOnOutsideInteraction = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (navRef.current?.contains(target)) return
      setOpenGroup(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenGroup(null)
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideInteraction, true)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideInteraction, true)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileMenuOpen])

  const currentLabel = useMemo(() => {
    if (pathname === "/") return "Studio"
    if (pathMatches(pathname, "/tutor") || pathMatches(pathname, "/student-home")) return "Tutor"
    return allItems.find(item => pathMatches(pathname, item.href))?.label ?? "ScholarBridge"
  }, [pathname])

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return groups
    return groups.map(group => ({
      ...group,
      sections: group.sections.map(section => ({
        ...section,
        items: section.items.filter(item => `${item.label} ${item.description ?? ""}`.toLowerCase().includes(term)),
      })).filter(section => section.items.length > 0),
    })).filter(group => group.sections.length > 0)
  }, [search])

  const setCompactPreference = (enabled: boolean) => {
    setForceCompact(enabled)
    window.localStorage.setItem("scholarbridge-mobile-mode", enabled ? "compact" : "auto")
  }

  const closeMenus = () => {
    setOpenGroup(null)
    setMobileMenuOpen(false)
  }

  if (mobileMode) {
    return <>
      <nav ref={navRef} aria-label="Mobile navigation" className="mobile-app-header sticky top-0 z-[90] border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3">
          <Link href="/tutor" onClick={closeMenus} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-2">
            <GraduationCap className="size-5 shrink-0 text-[#147d91]" />
            <span className="truncate font-serif text-base font-bold text-[#102a43]">{currentLabel}</span>
          </Link>
          <button type="button" aria-label="Open all tools" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-[#102a43] shadow-sm">
            <Menu className="size-5" />
          </button>
        </div>
      </nav>

      <nav aria-label="Quick mobile navigation" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[90] border-t border-slate-200 bg-white/97 px-2 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_rgba(15,23,42,.08)] backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          <MobileNavLink href="/" label="Home" active={pathname === "/"} icon={Home} onClick={closeMenus} />
          <MobileNavLink href="/tutor" label="Tutor" active={pathMatches(pathname, "/tutor") || pathMatches(pathname, "/student-home")} icon={Brain} onClick={closeMenus} />
          <MobileNavLink href="/full-papers" label="Tests" active={pathMatches(pathname, "/full-papers") || pathMatches(pathname, "/advanced-practice") || pathMatches(pathname, "/adaptive-paper")} icon={Target} onClick={closeMenus} />
          <MobileNavLink href="/interviews" label="Interview" active={pathMatches(pathname, "/interviews") || pathname.includes("interview")} icon={MessageSquareText} onClick={closeMenus} />
          <button type="button" onClick={() => setMobileMenuOpen(true)} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold ${mobileMenuOpen ? "bg-[#edf7f8] text-[#102a43]" : "text-slate-500"}`}>
            <Menu className="size-5" /><span>More</span>
          </button>
        </div>
      </nav>

      {mobileMenuOpen && <div className="fixed inset-0 z-[120] bg-slate-950/35 backdrop-blur-[2px]" onPointerDown={event => { if (event.currentTarget === event.target) setMobileMenuOpen(false) }}>
        <section role="dialog" aria-modal="true" aria-label="All ScholarBridge tools" className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-hidden rounded-t-[1.6rem] bg-white shadow-2xl">
          <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-slate-200" />
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-3">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Navigation</p><h2 className="font-serif text-xl font-bold text-[#102a43]">All tools</h2></div>
            <button type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><X className="size-5" /></button>
          </div>
          <div className="px-4 pb-3">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Search className="size-4 text-slate-400" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a tool…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
          </div>
          <div className="max-h-[calc(88dvh-10rem)] overflow-y-auto px-3 pb-28">
            <div className="grid grid-cols-2 gap-2 px-1 pb-4">
              <Link href="/tutor" onClick={closeMenus} className="rounded-2xl bg-[#102a43] p-3 text-white"><Brain className="mb-2 size-5" /><span className="block text-sm font-bold">Tutor</span><span className="text-[11px] text-white/70">Your command centre</span></Link>
              <Link href="/" onClick={closeMenus} className="rounded-2xl bg-[#edf7f8] p-3 text-[#102a43]"><LayoutDashboard className="mb-2 size-5 text-[#147d91]" /><span className="block text-sm font-bold">Studio</span><span className="text-[11px] text-slate-500">Overview and tools</span></Link>
            </div>
            {filteredGroups.map(group => <div key={group.label} className="mb-5">
              <div className="mb-2 flex items-center gap-2 px-2"><group.icon className="size-4 text-[#147d91]" /><h3 className="text-sm font-extrabold text-[#102a43]">{group.label}</h3></div>
              {group.sections.map(section => <div key={section.label} className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{section.label}</div>
                {section.items.map(item => <Link key={item.href} href={item.href} onClick={closeMenus} className={`block border-b border-slate-100 px-3 py-3 last:border-0 ${pathMatches(pathname, item.href) ? "bg-[#edf7f8]" : ""}`}>
                  <span className="block text-sm font-semibold text-[#102a43]">{item.label}</span>
                  {item.description && <span className="mt-0.5 block text-xs leading-4 text-slate-500">{item.description}</span>}
                </Link>)}
              </div>)}
            </div>)}
            {filteredGroups.length === 0 && <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No tools match “{search}”.</div>}
            <label className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span><span className="flex items-center gap-2 text-sm font-bold text-[#102a43]"><Smartphone className="size-4 text-[#147d91]" />Keep compact mode</span><span className="mt-0.5 block text-xs text-slate-500">Use this mobile-style navigation on larger screens too.</span></span>
              <input type="checkbox" checked={forceCompact} onChange={event => setCompactPreference(event.target.checked)} className="size-5 accent-[#147d91]" />
            </label>
          </div>
        </section>
      </div>}
    </>
  }

  return <nav ref={navRef} aria-label="Primary navigation" className="sticky top-0 z-[80] border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur">
    <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
      <div className="flex min-h-14 items-center gap-2 py-1">
        <Link href="/tutor" onClick={closeMenus} className="mr-1 flex shrink-0 items-center gap-2 rounded-xl px-2 py-2 font-serif text-base font-bold text-[#102a43] hover:bg-[#edf7f8] lg:text-lg">
          <GraduationCap className="size-5 text-[#147d91]" /><span className="hidden lg:inline">ScholarBridge</span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Link href="/tutor" onClick={closeMenus} className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${pathMatches(pathname, "/tutor") || pathMatches(pathname, "/student-home") ? "bg-[#102a43] text-white" : "text-slate-600 hover:bg-[#edf7f8] hover:text-[#102a43]"}`}><Brain className="size-4" />Tutor</Link>
          <Link href="/" onClick={closeMenus} className={`hidden h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition md:inline-flex ${pathname === "/" ? "bg-[#102a43] text-white" : "text-slate-600 hover:bg-[#edf7f8] hover:text-[#102a43]"}`}><LayoutDashboard className="size-4" />Studio</Link>
          {groups.map(group => {
            const Icon = group.icon
            const active = groupIsActive(pathname, group)
            const isOpen = openGroup === group.label
            return <div key={group.label} className="relative shrink-0">
              <button type="button" aria-expanded={isOpen} aria-haspopup="menu" onClick={() => setOpenGroup(current => current === group.label ? null : group.label)} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition lg:px-3 ${active ? "bg-[#e5f3f4] text-[#102a43]" : "text-slate-600 hover:bg-[#edf7f8] hover:text-[#102a43]"}`}>
                <Icon className="size-4" /><span>{group.label}</span><ChevronDown className={`size-3.5 transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && <div role="menu" className={`absolute top-[calc(100%+.55rem)] z-[100] w-[min(44rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl ${group.align === "right" ? "right-0" : "left-0"}`}>
                <div className={`grid max-h-[72vh] gap-3 overflow-y-auto ${group.sections.length > 1 ? "md:grid-cols-2" : ""}`}>
                  {group.sections.map(section => <div key={section.label} className="min-w-0">
                    <div className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[.15em] text-[#147d91]">{section.label}</div>
                    {section.items.map(item => <Link key={item.href} href={item.href} role="menuitem" onClick={closeMenus} className={`block rounded-xl px-3 py-2.5 transition ${pathMatches(pathname, item.href) ? "bg-[#edf7f8] text-[#102a43]" : "text-slate-700 hover:bg-slate-50"}`}>
                      <span className="block text-sm font-semibold">{item.label}</span>{item.description && <span className="mt-0.5 block text-xs leading-4 text-slate-500">{item.description}</span>}
                    </Link>)}
                  </div>)}
                </div>
              </div>}
            </div>
          })}
        </div>
        <button type="button" title="Switch to compact mobile navigation" onClick={() => setCompactPreference(true)} className="hidden size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-[#edf7f8] hover:text-[#102a43] xl:grid"><Smartphone className="size-4" /></button>
      </div>
    </div>
  </nav>
}

function MobileNavLink({ href, label, active, icon: Icon, onClick }: { href: string; label: string; active: boolean; icon: typeof Home; onClick: () => void }) {
  return <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold ${active ? "bg-[#edf7f8] text-[#102a43]" : "text-slate-500"}`}>
    <Icon className="size-5" /><span>{label}</span>
  </Link>
}
