"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Brain, ChevronDown, ClipboardCheck, GraduationCap, LayoutDashboard, MessageSquareText, Target, Users } from "lucide-react"

type NavItem = { href: string; label: string; description?: string }
type NavGroup = { label: string; icon: typeof Brain; items: NavItem[]; align?: "left" | "right" }

const groups: NavGroup[] = [
  {
    label: "Interviews",
    icon: MessageSquareText,
    items: [
      { href: "/interviews", label: "Interview Hub", description: "Choose an interview format" },
      { href: "/interview-feedback", label: "Structured Feedback", description: "Answer-by-answer reasoning analysis and re-answer practice" },
      { href: "/mock-day", label: "Mock Interview Day", description: "Unseen material, two interviews and end-of-day review" },
      { href: "/live-interview", label: "Gemini Live Voice", description: "Native realtime Gemini audio interview" },
      { href: "/natural-ai-interview", label: "Gemini Natural Voice", description: "Adaptive Gemini interview with high-quality TTS" },
      { href: "/elevenlabs-interview", label: "ElevenLabs Voice", description: "Alternative realtime interviewer voices" },
      { href: "/interview-room", label: "Formal Interview", description: "Structured realistic practice" },
      { href: "/ai-interview", label: "AI Interview", description: "Adaptive Gemini transcript-based follow-up" },
      { href: "/panel-interview", label: "Panel Interview", description: "Two academic interviewers" },
      { href: "/cambridge-interview-day", label: "Cambridge Interview Day", description: "Cambridge-style simulation" },
      { href: "/mock-week", label: "Mock Week", description: "No-feedback interview block" },
    ],
  },
  {
    label: "Admissions Tests",
    icon: Target,
    items: [
      { href: "/full-papers", label: "Full Papers", description: "Timed full-length TMUA, ESAT, TARA, LNAT and UCAT mocks" },
      { href: "/paper-intervention", label: "Paper Intervention", description: "Automatic weakness → mini-lesson → retest loop" },
      { href: "/advanced-practice", label: "Advanced Practice", description: "Challenge ladders and question bank" },
      { href: "/adaptive-paper", label: "Adaptive Paper", description: "Weak-area paper generator" },
      { href: "/timing-trainer", label: "Timing Trainer", description: "Skip, flag and pacing decisions" },
      { href: "/essay-tutor", label: "Essay Tutor", description: "Detailed LNAT/TARA argument analysis" },
      { href: "/question-quality", label: "Question Quality", description: "Question-bank validation" },
    ],
  },
  {
    label: "Application",
    icon: ClipboardCheck,
    items: [
      { href: "/application-profile", label: "Application Digital Twin", description: "Connect course, reading, projects, EPQ and written work" },
      { href: "/application-defence", label: "Application Defence", description: "Practise questions generated from your own academic evidence" },
      { href: "/requirements", label: "Requirements & Audit", description: "Course and application requirements" },
      { href: "/timeline", label: "Timeline", description: "Application deadlines and next actions" },
      { href: "/cambridge-assessments", label: "Cambridge Assessments", description: "College assessment guidance" },
      { href: "/personal-statement-map", label: "Personal Statement Defence", description: "Defend every academic claim" },
      { href: "/written-work-vault", label: "Written Work", description: "Written-work defence preparation" },
      { href: "/technology-rehearsal", label: "Technology Rehearsal", description: "Camera, mic and interview setup" },
      { href: "/source-health", label: "Official Source Watcher", description: "Check guidance freshness" },
      { href: "/backup-center", label: "Backup Centre", description: "Encrypted profile export/import" },
    ],
  },
  {
    label: "Learning",
    icon: BookOpen,
    items: [
      { href: "/tutorial-lab", label: "Tutorial Lab", description: "Draw, calculate and get multimodal reasoning feedback" },
      { href: "/daily-challenge", label: "Daily Challenge", description: "One high-quality course-specific reasoning challenge" },
      { href: "/supercurricular-coach", label: "Supercurricular Coach", description: "Turn reading and projects into interview-ready reasoning" },
      { href: "/course-bank", label: "Course Bank", description: "Deep course-specific questions" },
      { href: "/unseen-lab", label: "Unseen Material Lab", description: "Graphs, sources and unfamiliar data" },
      { href: "/reading-room", label: "Reading Room", description: "Academic extracts and tutorial questions" },
      { href: "/knowledge-graph", label: "Knowledge Graph", description: "Connect supercurricular ideas" },
      { href: "/research-project", label: "Research Project", description: "Evidence, thesis and defence" },
      { href: "/reasoning-lab", label: "Reasoning Lab", description: "Rewind, argument map and misconceptions" },
      { href: "/intervention-session", label: "Intervention Session", description: "Target recurring weaknesses" },
      { href: "/working-analysis", label: "Working Analysis", description: "Analyse handwritten reasoning" },
      { href: "/learning-support", label: "Learning Support", description: "EAL and Mandarin scaffolds" },
    ],
  },
  {
    label: "Progress & Teacher",
    icon: Users,
    align: "right",
    items: [
      { href: "/mistake-dna", label: "Mistake DNA", description: "Recurring reasoning and test-error patterns" },
      { href: "/progress-proof", label: "Progress Proof", description: "Evidence timeline showing what has actually improved" },
      { href: "/school-classroom", label: "Student Classroom", description: "Join a school cohort and complete assigned preparation" },
      { href: "/school-dashboard", label: "School Dashboard", description: "School-plan cohorts, assignments, analytics and reports" },
      { href: "/human-review", label: "Human + AI Review", description: "Teacher/tutor comments alongside automated analysis" },
      { href: "/parent-summary", label: "Parent Summary", description: "Opt-in privacy-safe progress overview" },
      { href: "/premium", label: "Free / Pro / School", description: "What each plan unlocks" },
      { href: "/account", label: "Account & Billing", description: "Sign in, subscription and saved cloud progress" },
      { href: "/accessibility-profiles", label: "Accessibility", description: "Saved accessibility profiles" },
    ],
  },
]

function pathMatches(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

export function GlobalFocusNav() {
  const pathname = usePathname()

  return <nav aria-label="Primary navigation" className="sticky top-0 z-[80] border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur">
    <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
      <div className="flex min-h-14 flex-wrap items-center gap-2 py-1">
        <Link href="/tutor" className="mr-1 flex shrink-0 items-center gap-2 rounded-xl px-2 py-2 font-serif text-base font-bold text-[#102a43] hover:bg-[#edf7f8] sm:text-lg">
          <GraduationCap className="size-5 text-[#147d91]" />
          <span className="hidden sm:inline">Oxbridge Tutor</span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-1">
          <Link href="/tutor" aria-current={pathMatches(pathname, "/tutor") || pathMatches(pathname, "/student-home") ? "page" : undefined} className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${pathMatches(pathname, "/tutor") || pathMatches(pathname, "/student-home") ? "bg-[#102a43] text-white" : "text-slate-600 hover:bg-[#edf7f8] hover:text-[#102a43]"}`}><Brain className="size-4" />Tutor</Link>
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${pathname === "/" ? "bg-[#102a43] text-white" : "text-slate-600 hover:bg-[#edf7f8] hover:text-[#102a43]"}`}><LayoutDashboard className="size-4" />Studio</Link>

          {groups.map(group => {
            const Icon = group.icon
            const active = group.items.some(item => pathMatches(pathname, item.href))
            return <details key={group.label} className="group relative shrink-0">
              <summary className={`flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition [&::-webkit-details-marker]:hidden ${active ? "bg-[#e5f3f4] text-[#102a43]" : "text-slate-600 hover:bg-[#edf7f8] hover:text-[#102a43]"}`}>
                <Icon className="size-4" />{group.label}<ChevronDown className="size-3.5 transition group-open:rotate-180" />
              </summary>
              <div className={`absolute top-[calc(100%+.55rem)] z-[100] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl ${group.align === "right" ? "right-0" : "left-0"}`}>
                <div className="max-h-[70vh] overflow-y-auto">
                  {group.items.map(item => {
                    const itemActive = pathMatches(pathname, item.href)
                    return <Link key={item.href} href={item.href} className={`block rounded-xl px-3 py-2.5 transition ${itemActive ? "bg-[#edf7f8] text-[#102a43]" : "text-slate-700 hover:bg-slate-50"}`}>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      {item.description && <span className="mt-0.5 block text-xs leading-4 text-slate-500">{item.description}</span>}
                    </Link>
                  })}
                </div>
              </div>
            </details>
          })}
        </div>
      </div>
    </div>
  </nav>
}
