"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, BarChart3, BookOpenCheck, Brain, Check, CheckCircle2, ChevronRight, Clock3, Compass, FileText, Flame, GraduationCap, Lightbulb, MessageSquareText, ShieldCheck, Sparkles, Target, TimerReset, Trophy, X, Zap } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { courseTestMap, interviewQuestions, testQuestions, tracks, type TrackId, type University } from "@/lib/oxbridge-data"

type Result = { total: number; reasoning: number; subject: number; flexibility: number; clarity: number; strengths: string[]; nextSteps: string[] }
type ProgressState = { sessions: number; interviewScores: number[]; testCorrect: number; testAttempted: number; streak: number; completed: string[] }
const emptyProgress: ProgressState = { sessions: 0, interviewScores: [], testCorrect: 0, testAttempted: 0, streak: 0, completed: [] }

function scoreAnswer(answer: string, concepts: string[]): Result {
  const clean = answer.trim().toLowerCase()
  const words = clean ? clean.split(/\s+/).length : 0
  const reasoningHits = ["because", "therefore", "so", "if", "then", "implies", "since", "hence"].filter((word) => clean.includes(word)).length
  const flexibleHits = ["however", "although", "alternative", "depends", "unless", "counter", "assumption", "could"].filter((word) => clean.includes(word)).length
  const conceptHits = concepts.filter((word) => clean.includes(word.toLowerCase())).length
  const reasoning = Math.min(25, 8 + reasoningHits * 4 + (words > 55 ? 5 : 0))
  const subject = Math.min(25, 5 + Math.round((conceptHits / Math.max(concepts.length, 1)) * 20))
  const flexibility = Math.min(25, 6 + flexibleHits * 4 + (clean.includes("example") ? 3 : 0))
  const clarity = Math.min(25, words >= 55 && words <= 260 ? 22 : words >= 30 ? 17 : words >= 12 ? 11 : 5)
  const total = reasoning + subject + flexibility + clarity
  const strengths: string[] = []
  const nextSteps: string[] = []
  if (reasoning >= 18) strengths.push("Your reasoning is visible rather than hidden behind a final answer.")
  else nextSteps.push("Use ‘because’ and ‘therefore’ to make each logical step explicit.")
  if (subject >= 17) strengths.push("You used relevant subject ideas accurately.")
  else nextSteps.push(`Bring in more of the core ideas: ${concepts.slice(0, 3).join(", ")}.`)
  if (flexibility >= 17) strengths.push("You considered assumptions or another possible view.")
  else nextSteps.push("State one assumption, test a counterexample, or explain what would change your mind.")
  if (clarity >= 18) strengths.push("Your answer has enough development without becoming unfocused.")
  else nextSteps.push(words < 30 ? "Develop the answer with a method, example and conclusion." : "Give the answer a clearer claim → reason → test → conclusion structure.")
  return { total, reasoning, subject, flexibility, clarity, strengths, nextSteps }
}

function useTimer(minutes: number) {
  const [seconds, setSeconds] = useState(minutes * 60)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running || seconds <= 0) return
    const id = window.setInterval(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearInterval(id)
  }, [running, seconds])
  const reset = useCallback(() => { setSeconds(minutes * 60); setRunning(false) }, [minutes])
  return { seconds, running, setRunning, reset }
}
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

export default function Home() {
  const [tab, setTab] = useState("today")
  const [university, setUniversity] = useState<University>("Undecided")
  const [track, setTrack] = useState<TrackId>("physical")
  const [course, setCourse] = useState("Physics")
  const [progress, setProgress] = useState<ProgressState>(emptyProgress)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("oxbridge-tutor-progress")
      if (saved) setProgress({ ...emptyProgress, ...JSON.parse(saved) })
      const profile = window.localStorage.getItem("oxbridge-tutor-profile")
      if (profile) {
        const parsed = JSON.parse(profile)
        setUniversity(parsed.university ?? "Undecided")
        setTrack(parsed.track ?? "physical")
        setCourse(parsed.course ?? "Physics")
      }
    } catch { /* safe defaults */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    window.localStorage.setItem("oxbridge-tutor-progress", JSON.stringify(progress))
    window.localStorage.setItem("oxbridge-tutor-profile", JSON.stringify({ university, track, course }))
  }, [progress, university, track, course, loaded])

  useEffect(() => {
    type ModelContext = { registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> }
    const context = (document as Document & { modelContext?: ModelContext }).modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()
    const register = async () => {
      await context.registerTool?.({ name: "start_interview_practice", title: "Start interview practice", description: "Open the interview room for the selected subject pathway.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async () => { setTab("interview"); return { status: "opened", track } } }, { signal: lifecycle.signal })
      await context.registerTool?.({ name: "open_admissions_test_practice", title: "Open test practice", description: "Open the admissions-test practice lab.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async () => { setTab("tests"); return { status: "opened" } } }, { signal: lifecycle.signal })
    }
    void register().catch(() => {})
    return () => lifecycle.abort()
  }, [track])

  const selectedTrack = tracks.find((item) => item.id === track) ?? tracks[1]
  const recentAverage = progress.interviewScores.length ? Math.round(progress.interviewScores.slice(-5).reduce((a, b) => a + b, 0) / Math.min(progress.interviewScores.length, 5)) : 0
  const testAccuracy = progress.testAttempted ? Math.round(progress.testCorrect / progress.testAttempted * 100) : 0

  return <main className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--navy)] text-white">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <button className="flex items-center gap-3 text-left" onClick={() => setTab("today")} aria-label="Go to dashboard"><span className="crest"><GraduationCap className="size-5" /></span><span><span className="block font-serif text-lg font-bold leading-none tracking-tight">Oxbridge Tutor</span><span className="mt-1 hidden text-[11px] tracking-[.12em] text-blue-100/70 sm:block">INTERVIEW & TEST STUDIO</span></span></button>
        <div className="flex items-center gap-2"><Badge className="hidden border-white/15 bg-white/10 text-white sm:inline-flex">2027 entry</Badge><div className="hidden text-right md:block"><p className="text-xs text-blue-100/70">Current pathway</p><p className="text-sm font-semibold">{university} · {course}</p></div></div>
      </div>
    </header>
    <Tabs value={tab} onValueChange={setTab} className="mx-auto max-w-[1480px] gap-0 lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="hidden min-h-[calc(100vh-64px)] border-r bg-white px-3 py-6 lg:block">
        <TabsList orientation="vertical" variant="line" className="w-full items-stretch gap-1"><NavTrigger value="today" icon={<Compass />}>Today</NavTrigger><NavTrigger value="interview" icon={<MessageSquareText />}>Interview room</NavTrigger><NavTrigger value="tests" icon={<TimerReset />}>Test lab</NavTrigger><NavTrigger value="toolkit" icon={<BookOpenCheck />}>Toolkit</NavTrigger><NavTrigger value="progress" icon={<BarChart3 />}>Progress</NavTrigger></TabsList>
        <div className="mt-8 rounded-2xl bg-[var(--ice)] p-4"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Flame className="size-4 text-[var(--coral)]" /> {progress.streak || 0} day streak</div><p className="text-xs leading-relaxed text-muted-foreground">A short, focused practice each day is more useful than memorising polished speeches.</p></div>
      </aside>
      <div className="min-w-0 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-9">
        <TabsContent value="today"><Dashboard university={university} setUniversity={setUniversity} track={track} setTrack={setTrack} course={course} setCourse={setCourse} selectedTrack={selectedTrack} recentAverage={recentAverage} testAccuracy={testAccuracy} sessions={progress.sessions} setTab={setTab} /></TabsContent>
        <TabsContent value="interview"><InterviewRoom track={track} onComplete={(score, id) => setProgress((p) => ({ ...p, sessions: p.sessions + 1, interviewScores: [...p.interviewScores, score], completed: [...new Set([...p.completed, id])], streak: Math.max(1, p.streak) }))} /></TabsContent>
        <TabsContent value="tests"><TestLab onResult={(correct) => setProgress((p) => ({ ...p, testAttempted: p.testAttempted + 1, testCorrect: p.testCorrect + (correct ? 1 : 0), streak: Math.max(1, p.streak) }))} /></TabsContent>
        <TabsContent value="toolkit"><Toolkit university={university} course={course} /></TabsContent>
        <TabsContent value="progress"><ProgressView progress={progress} recentAverage={recentAverage} testAccuracy={testAccuracy} reset={() => setProgress(emptyProgress)} /></TabsContent>
      </div>
      <TabsList className="fixed inset-x-3 bottom-3 z-50 h-16 w-auto justify-around rounded-2xl border bg-white/95 p-1.5 shadow-2xl backdrop-blur lg:hidden"><MobileTrigger value="today" icon={<Compass />} label="Today" /><MobileTrigger value="interview" icon={<MessageSquareText />} label="Interview" /><MobileTrigger value="tests" icon={<TimerReset />} label="Tests" /><MobileTrigger value="toolkit" icon={<BookOpenCheck />} label="Toolkit" /><MobileTrigger value="progress" icon={<BarChart3 />} label="Progress" /></TabsList>
    </Tabs>
  </main>
}

function NavTrigger({ value, icon, children }: { value: string; icon: React.ReactNode; children: React.ReactNode }) { return <TabsTrigger value={value} className="h-11 justify-start rounded-xl px-3 text-[15px] data-[state=active]:bg-[var(--ice)] data-[state=active]:text-[var(--navy)] data-[state=active]:shadow-none">{icon}{children}</TabsTrigger> }
function MobileTrigger({ value, icon, label }: { value: string; icon: React.ReactNode; label: string }) { return <TabsTrigger value={value} className="h-12 min-w-0 flex-col gap-0.5 rounded-xl px-2 text-[11px] data-[state=active]:bg-[var(--navy)] data-[state=active]:text-white">{icon}<span>{label}</span></TabsTrigger> }
function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">{description}</p></div>{action}</div> }

function Dashboard({ university, setUniversity, track, setTrack, course, setCourse, selectedTrack, recentAverage, testAccuracy, sessions, setTab }: { university:University; setUniversity:(value:University)=>void; track:TrackId; setTrack:(value:TrackId)=>void; course:string; setCourse:(value:string)=>void; selectedTrack:(typeof tracks)[number]; recentAverage:number; testAccuracy:number; sessions:number; setTab:(value:string)=>void }) {
  return <><PageIntro eyebrow="Personal study desk" title="Prepare to think, not perform." description="Build the habits tutors actually look for: make your reasoning visible, use evidence, respond to prompts and stay flexible when the problem changes." />
    <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Card className="hero-card overflow-hidden border-0 text-white shadow-none"><CardHeader className="relative z-10 pb-2"><Badge className="mb-4 border-white/15 bg-white/10 text-white">Recommended next</Badge><CardTitle className="max-w-xl font-serif text-2xl leading-tight sm:text-3xl">Run a guided {selectedTrack.short.toLowerCase()} interview</CardTitle><CardDescription className="max-w-xl text-base leading-relaxed text-blue-50/75">An unfamiliar prompt, adaptive follow-ups, a six-minute timer and instant rubric feedback on reasoning—not just the final answer.</CardDescription></CardHeader><CardContent className="relative z-10 flex flex-wrap items-center gap-3"><Button onClick={() => setTab("interview")} className="bg-white text-[var(--navy)] hover:bg-blue-50">Start practice <ArrowRight /></Button><span className="text-sm text-blue-100/75">About 10 minutes</span></CardContent></Card>
      <Card className="border-0 bg-[var(--ink)] text-white shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Your pathway</CardTitle><CardDescription className="text-white/55">Change this at any time. Progress stays on this device.</CardDescription></CardHeader><CardContent className="grid gap-3"><label className="field-label">University</label><NativeSelect value={university} onChange={(e) => setUniversity(e.target.value as University)} className="w-full border-white/15 bg-white/5 text-white"><NativeSelectOption>Undecided</NativeSelectOption><NativeSelectOption>Oxford</NativeSelectOption><NativeSelectOption>Cambridge</NativeSelectOption></NativeSelect><label className="field-label">Subject family</label><NativeSelect value={track} onChange={(e) => { const next=e.target.value as TrackId; setTrack(next); const found=tracks.find((x)=>x.id===next); if(found) setCourse(found.courses[0]) }} className="w-full border-white/15 bg-white/5 text-white">{tracks.map((item)=><NativeSelectOption key={item.id} value={item.id}>{item.short}</NativeSelectOption>)}</NativeSelect><label className="field-label">Course</label><NativeSelect value={course} onChange={(e)=>setCourse(e.target.value)} className="w-full border-white/15 bg-white/5 text-white">{selectedTrack.courses.map((item)=><NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></CardContent></Card>
    </section>
    <section className="mt-5 grid gap-4 sm:grid-cols-3"><Metric label="Interview average" value={recentAverage ? `${recentAverage}%` : "—"} note={recentAverage ? "Last five responses" : "Complete a response"} icon={<Brain />} /><Metric label="Test accuracy" value={testAccuracy ? `${testAccuracy}%` : "—"} note={testAccuracy ? "Across all tests" : "Try a test question"} icon={<Target />} /><Metric label="Practice sessions" value={String(sessions)} note="Saved automatically" icon={<Trophy />} /></section>
    <section className="mt-8 grid gap-4 xl:grid-cols-[1.1fr_.9fr]"><Card><CardHeader><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Your focus</p><CardTitle className="mt-2 font-serif text-xl">What strong candidates practise</CardTitle></div><span className="number-mark">01</span></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{selectedTrack.skills.map((skill,i)=><div key={skill} className="skill-row"><span>0{i+1}</span><div><p className="font-semibold capitalize">{skill}</p><p className="text-sm text-muted-foreground">Practise it through unfamiliar material and follow-up prompts.</p></div></div>)}</CardContent></Card><Card><CardHeader><p className="eyebrow">Admissions checks</p><CardTitle className="mt-2 font-serif text-xl">Likely test route</CardTitle></CardHeader><CardContent className="space-y-3">{selectedTrack.tests.map((test)=><div className="flex gap-3 rounded-xl bg-[var(--ice)] p-3" key={test}><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--blue)]"/><p className="text-sm leading-relaxed">{test}</p></div>)}<Button variant="outline" className="w-full" onClick={()=>setTab("tests")}>Open test lab <ChevronRight /></Button></CardContent></Card></section>
  </>
}

function Metric({ label, value, note, icon }: { label:string; value:string; note:string; icon:React.ReactNode }) { return <Card className="gap-3 py-4 shadow-none"><CardContent className="flex items-center gap-4 px-4"><span className="metric-icon">{icon}</span><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold tracking-tight">{value}</p><p className="text-xs text-muted-foreground">{note}</p></div></CardContent></Card> }

function InterviewRoom({ track, onComplete }: { track:TrackId; onComplete:(score:number,id:string)=>void }) {
  const questions = useMemo(() => interviewQuestions.filter((q)=>q.track===track), [track])
  const [index, setIndex] = useState(0), [answer, setAnswer] = useState(""), [result, setResult] = useState<Result | null>(null), [probe, setProbe] = useState<number | null>(null), [showModel, setShowModel] = useState(false)
  const question = questions[index % questions.length]
  const timer = useTimer(question?.time ?? 6)
  useEffect(() => { setIndex(0); setAnswer(""); setResult(null); setProbe(null); setShowModel(false) }, [track])
  useEffect(() => { timer.reset() }, [index, timer.reset])
  const submit = () => { if (!answer.trim() || !question) return; const nextResult = scoreAnswer(answer, question.concepts); setResult(nextResult); timer.setRunning(false); onComplete(nextResult.total, question.id) }
  const next = () => { setIndex((i)=>(i+1)%questions.length); setAnswer(""); setResult(null); setProbe(null); setShowModel(false) }
  if (!question) return <Alert><Lightbulb/><AlertTitle>More questions are being prepared</AlertTitle><AlertDescription>Select another subject pathway from Today.</AlertDescription></Alert>
  return <><PageIntro eyebrow="Guided interview room" title={question.title} description="Treat this as a tutorial. Clarify the problem, think aloud and respond to the prompt. A strong interview is a train of thought—not a rehearsed speech." action={<div className="timer"><Clock3 /> <span>{formatTime(timer.seconds)}</span><button onClick={()=>timer.setRunning(!timer.running)}>{timer.running?"Pause":"Start"}</button></div>} />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)]"><Card className="question-card"><CardHeader className="border-b"><div className="flex flex-wrap gap-2"><Badge>{question.difficulty}</Badge><Badge variant="outline">Original practice question</Badge><Badge variant="outline">{question.time} min</Badge></div>{question.stimulus&&<blockquote className="stimulus">{question.stimulus}</blockquote>}<CardTitle className="font-serif text-2xl leading-snug">{question.prompt}</CardTitle></CardHeader><CardContent className="space-y-4 pt-0"><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={()=>setProbe(probe===null?0:Math.min(probe+1,question.probes.length-1))}><Sparkles/>Give me a tutor prompt</Button>{probe!==null&&<Button variant="ghost" size="sm" onClick={()=>setProbe(null)}>Hide prompt</Button>}</div>{probe!==null&&<Alert className="border-[var(--blue)]/20 bg-[var(--ice)]"><Lightbulb/><AlertTitle>Tutor follow-up</AlertTitle><AlertDescription>{question.probes[probe]}</AlertDescription></Alert>}<label className="block"><span className="mb-2 block text-sm font-semibold">Your spoken-style answer</span><Textarea value={answer} onChange={(e)=>setAnswer(e.target.value)} rows={10} placeholder="Write as you would speak: clarify, state an approach, test it, respond to complications and conclude…" className="min-h-56 resize-y text-base leading-relaxed" /></label><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{answer.trim()?answer.trim().split(/\s+/).length:0} words · aim for clear reasoning, not a word target</span><Button onClick={submit} disabled={!answer.trim()}>Analyse my reasoning <Zap/></Button></div></CardContent></Card><aside>{!result ? <Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">How feedback works</CardTitle></CardHeader><CardContent className="space-y-3">{["Reasoning made visible","Subject ideas used accurately","Flexibility under challenge","Clear, focused communication"].map((item,i)=><div className="rubric-row" key={item}><span>{i+1}</span>{item}</div>)}<p className="pt-2 text-xs leading-relaxed text-muted-foreground">Feedback is a practice guide, not an admissions prediction. Tutors judge the whole academic conversation.</p></CardContent></Card> : <Feedback result={result} showModel={showModel} setShowModel={setShowModel} model={question.strongAnswer} next={next} />}</aside></div>
  </>
}

function Feedback({ result, showModel, setShowModel, model, next }: { result:Result; showModel:boolean; setShowModel:(v:boolean)=>void; model:string; next:()=>void }) {
  const dimensions = [["Reasoning",result.reasoning],["Subject use",result.subject],["Flexibility",result.flexibility],["Clarity",result.clarity]] as const
  return <Card className="border-0 bg-[var(--navy)] text-white shadow-none"><CardHeader><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-200/70">Practice feedback</p><div className="flex items-end gap-2"><CardTitle className="font-serif text-5xl">{result.total}</CardTitle><span className="pb-1 text-blue-100/60">/ 100</span></div><CardDescription className="text-blue-50/70">Focus on the next improvement, not the number.</CardDescription></CardHeader><CardContent className="space-y-4">{dimensions.map(([label,value])=><div key={label}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{value}/25</span></div><Progress value={value*4} className="bg-white/15 [&_[data-slot=progress-indicator]]:bg-[var(--aqua)]"/></div>)}<div className="rounded-xl bg-white/8 p-3"><p className="mb-2 text-sm font-semibold">What worked</p>{result.strengths.length?result.strengths.map(x=><p key={x} className="feedback-line"><Check/>{x}</p>):<p className="text-sm text-blue-50/70">You attempted an unfamiliar problem. Now make each step explicit.</p>}</div><div className="rounded-xl bg-white/8 p-3"><p className="mb-2 text-sm font-semibold">Next move</p>{result.nextSteps.slice(0,2).map(x=><p key={x} className="feedback-line"><ArrowRight/>{x}</p>)}</div><Button variant="outline" className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={()=>setShowModel(!showModel)}>{showModel?"Hide":"Compare with"} a strong approach</Button>{showModel&&<p className="rounded-xl border border-white/10 bg-black/10 p-3 text-sm leading-relaxed text-blue-50/80">{model}</p>}<Button className="w-full bg-white text-[var(--navy)] hover:bg-blue-50" onClick={next}>Next question <ArrowRight/></Button></CardContent></Card>
}

function TestLab({ onResult }: { onResult:(correct:boolean)=>void }) {
  const [test, setTest] = useState<"TMUA"|"ESAT"|"TARA"|"LNAT"|"UCAT">("ESAT"), [index, setIndex] = useState(0), [selected, setSelected] = useState<number|null>(null), [checked, setChecked] = useState(false)
  const filtered = testQuestions.filter((q)=>q.test===test), question = filtered[index%filtered.length]
  const check = () => { if(selected===null)return; setChecked(true); onResult(selected===question.answer) }
  const next = () => { setIndex((i)=>(i+1)%filtered.length); setSelected(null); setChecked(false) }
  useEffect(()=>{setIndex(0);setSelected(null);setChecked(false)},[test])
  return <><PageIntro eyebrow="Admissions test lab" title="Practise the method under pressure." description="Original questions mirror the reasoning style of current admissions tests. Use official providers for the definitive specification and full-length materials." action={<NativeSelect value={test} onChange={(e)=>setTest(e.target.value as typeof test)} className="min-w-36 bg-white">{["TMUA","ESAT","TARA","LNAT","UCAT"].map(x=><NativeSelectOption key={x}>{x}</NativeSelectOption>)}</NativeSelect>} />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]"><Card className="question-card"><CardHeader className="border-b"><div className="flex flex-wrap gap-2"><Badge>{test}</Badge><Badge variant="outline">{question.section}</Badge><Badge variant="outline">{question.difficulty}</Badge></div><CardTitle className="font-serif text-2xl leading-snug">{question.prompt}</CardTitle></CardHeader><CardContent className="space-y-3 pt-0">{question.options.map((option,i)=>{ const state=checked?(i===question.answer?"correct":i===selected?"wrong":""):i===selected?"selected":""; return <button key={option} className={`option ${state}`} onClick={()=>!checked&&setSelected(i)} disabled={checked}><span>{String.fromCharCode(65+i)}</span><strong>{option}</strong>{checked&&i===question.answer?<CheckCircle2/>:checked&&i===selected?<X/>:null}</button> })}<div className="flex justify-end pt-2">{checked?<Button onClick={next}>Next question <ArrowRight/></Button>:<Button onClick={check} disabled={selected===null}>Check answer</Button>}</div></CardContent></Card><aside className="space-y-4"><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Test technique</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground"><p><strong className="text-foreground">1. Identify the task.</strong> Separate what is stated from what is only plausible.</p><p><strong className="text-foreground">2. Work before options.</strong> Predict the form of an answer where possible.</p><p><strong className="text-foreground">3. Eliminate precisely.</strong> Name the flaw, unit error or missing condition.</p></CardContent></Card>{checked&&<Alert className={selected===question.answer?"border-emerald-200 bg-emerald-50":"border-amber-200 bg-amber-50"}>{selected===question.answer?<CheckCircle2/>:<Lightbulb/>}<AlertTitle>{selected===question.answer?"Correct — method secured":"Review the reasoning"}</AlertTitle><AlertDescription>{question.explanation}</AlertDescription></Alert>}</aside></div>
  </>
}

function Toolkit({ university, course }: { university:University; course:string }) {
  const [checked, setChecked] = useState<number[]>([])
  const checklist=["I can explain why this course—not only the career after it.","I can discuss every academic claim in my application.","I have practised with an unfamiliar graph, text or problem.","I can say when I do not know and still propose a method.","My camera, audio, paper and quiet space are ready."]
  return <><PageIntro eyebrow="Preparation toolkit" title="Turn preparation into repeatable habits." description="No scripts to memorise. Use these structures to organise genuine thinking while keeping your answers responsive and natural." /><section className="grid gap-5 xl:grid-cols-2"><Card><CardHeader><p className="eyebrow">Answer framework</p><CardTitle className="font-serif text-2xl">The C–T–T–R method</CardTitle><CardDescription>Use it lightly; it is a thinking sequence, not a speech template.</CardDescription></CardHeader><CardContent className="space-y-3">{[["C","Clarify","Define terms and state a sensible assumption."],["T","Think aloud","Show the route you are choosing and why."],["T","Test","Use an example, edge case, estimate or piece of evidence."],["R","Respond","Adapt to the tutor’s prompt, then give a provisional conclusion."]].map(([letter,title,text])=><div className="method-row" key={title}><span>{letter}</span><div><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground">{text}</p></div></div>)}</CardContent></Card><Card><CardHeader><p className="eyebrow">Readiness check</p><CardTitle className="font-serif text-2xl">Before interview day</CardTitle></CardHeader><CardContent className="space-y-2">{checklist.map((item,i)=><button key={item} className="check-row" onClick={()=>setChecked((c)=>c.includes(i)?c.filter(x=>x!==i):[...c,i])}><span className={checked.includes(i)?"done":""}>{checked.includes(i)&&<Check/>}</span><p>{item}</p></button>)}<Progress value={checked.length/checklist.length*100} className="mt-4"/><p className="text-xs text-muted-foreground">{checked.length} of {checklist.length} ready</p></CardContent></Card><Card><CardHeader><p className="eyebrow">Application defence</p><CardTitle className="font-serif text-2xl">Questions generated from your statement</CardTitle></CardHeader><CardContent className="space-y-3">{["Which claim in your application would you most like to revise now—and why?","What did your wider reading change your mind about?","Choose one idea you mentioned. What is the strongest objection to it?","What question did your exploration leave unanswered?"].map((q,i)=><div key={q} className="prompt-card"><span>0{i+1}</span><p>{q}</p></div>)}</CardContent></Card><Card><CardHeader><p className="eyebrow">2027 route checker</p><CardTitle className="font-serif text-2xl">Which test might apply?</CardTitle><CardDescription>{university} · {course}</CardDescription></CardHeader><CardContent className="space-y-3">{Object.entries(courseTestMap).map(([route,test])=><div key={route} className="route-row"><p>{route}</p><strong>{test}</strong></div>)}<p className="pt-2 text-xs leading-relaxed text-muted-foreground">Requirements can change and joint courses may differ. Always confirm on the official Oxford or Cambridge course page before booking.</p></CardContent></Card></section></>
}

function ProgressView({ progress, recentAverage, testAccuracy, reset }: { progress:ProgressState; recentAverage:number; testAccuracy:number; reset:()=>void }) {
  const interviewReadiness=Math.min(100,Math.round(recentAverage*.7+Math.min(progress.sessions,10)*3)), testReadiness=Math.min(100,Math.round(testAccuracy*.75+Math.min(progress.testAttempted,20)*1.25))
  return <><PageIntro eyebrow="Progress studio" title="Evidence of better thinking." description="Scores are signals for what to practise next, not predictions of an offer. Look for a steady rise in reasoning quality and consistency." /><section className="grid gap-4 sm:grid-cols-3"><Metric label="Interview readiness" value={`${interviewReadiness || 0}%`} note={`${progress.sessions} completed sessions`} icon={<MessageSquareText/>}/><Metric label="Test readiness" value={`${testReadiness || 0}%`} note={`${progress.testAttempted} questions attempted`} icon={<FileText/>}/><Metric label="Active streak" value={`${progress.streak} day${progress.streak===1?"":"s"}`} note="Keep sessions short and focused" icon={<Flame/>}/></section><Card className="mt-5"><CardHeader><CardTitle className="font-serif text-2xl">Skill profile</CardTitle><CardDescription>Built from saved practice on this device.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">{[["Interview reasoning",interviewReadiness,"Complete answers using claim → reason → test."],["Admissions-test accuracy",testReadiness,"Review explanations, including correct guesses."],["Practice breadth",Math.min(100,progress.completed.length*14),"Mix foundation, stretch and challenge prompts."],["Consistency",Math.min(100,progress.sessions*8+progress.testAttempted*3),"Frequent short sessions beat last-minute cramming."]].map(([name,value,note])=><div key={String(name)}><div className="mb-2 flex justify-between text-sm"><strong>{name}</strong><span>{value}%</span></div><Progress value={Number(value)}/><p className="mt-2 text-xs text-muted-foreground">{note}</p></div>)}</CardContent></Card><Alert className="mt-5"><ShieldCheck/><AlertTitle>Your data stays in this browser</AlertTitle><AlertDescription>Progress and pathway choices are stored on this device. <button className="font-semibold underline" onClick={reset}>Reset all practice data</button>.</AlertDescription></Alert></>
}
