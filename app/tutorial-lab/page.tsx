"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { ArrowLeft, ArrowRight, Brain, Eraser, Loader2, PenLine, RotateCcw, ScanSearch, Sparkles, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { PROFILE_KEY, TUTORIAL_LAB_KEY, dailyChallengeFor } from "@/lib/personal-tutor"

type Point = { x: number; y: number }
type Stroke = { tool: "pen" | "eraser"; points: Point[] }
type SavedSession = { id: string; date: string; course: string; prompt: string; context: string; analysis: string; strokes: Stroke[] }

function readProfile() { try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") as { course?: string } } catch { return {} } }
function readSessions() { try { const raw = JSON.parse(localStorage.getItem(TUTORIAL_LAB_KEY) || "[]"); return Array.isArray(raw) ? raw as SavedSession[] : [] } catch { return [] } }

const mutations = [
  "Now remove one assumption you were relying on. What has to change?",
  "Test your model in an extreme or limiting case before continuing.",
  "Add one new piece of evidence that would make you revise the diagram or calculation.",
  "Find a second route to the same conclusion and compare the assumptions.",
]

export default function TutorialLabPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const [course, setCourse] = useState("Physics")
  const [tool, setTool] = useState<"pen" | "eraser">("pen")
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [context, setContext] = useState("")
  const [analysis, setAnalysis] = useState("")
  const [loading, setLoading] = useState(false)
  const [mutationIndex, setMutationIndex] = useState(0)
  const [sessions, setSessions] = useState<SavedSession[]>([])
  useEffect(() => { const profile = readProfile(); setCourse(profile.course ?? "Physics"); setSessions(readSessions()) }, [])
  const basePrompt = useMemo(() => dailyChallengeFor(course, new Date()), [course])
  const prompt = `${basePrompt}\n\nFollow-up condition: ${mutations[mutationIndex % mutations.length]}`

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    for (const stroke of strokes) {
      if (!stroke.points.length) continue
      ctx.save()
      ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over"
      ctx.strokeStyle = "#102a43"
      ctx.lineWidth = stroke.tool === "eraser" ? 30 : 4
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (const point of stroke.points.slice(1)) ctx.lineTo(point.x, point.y)
      ctx.stroke()
      ctx.restore()
    }
  }, [strokes])

  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = pointFromEvent(event)
    setStrokes(current => [...current, { tool, points: [point] }])
  }

  function moveDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const point = pointFromEvent(event)
    setStrokes(current => {
      if (!current.length) return current
      const next = current.slice()
      const last = next[next.length - 1]
      next[next.length - 1] = { ...last, points: [...last.points, point] }
      return next
    })
  }

  function stopDrawing() { drawingRef.current = false }

  async function analyseBoard() {
    const canvas = canvasRef.current
    if (!canvas || loading) return
    setLoading(true)
    try {
      const image = canvas.toDataURL("image/png")
      const response = await fetch("/api/analyse-working", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, subject: course, context: `${prompt}\nStudent note: ${context || "None"}` }) })
      const data = await response.json() as { analysis?: string; error?: string }
      const result = data.analysis ?? data.error ?? "No analysis was returned."
      setAnalysis(result)
      const entry: SavedSession = { id: `tutorial-${Date.now()}`, date: new Date().toISOString(), course, prompt, context, analysis: result, strokes }
      const next = [entry, ...sessions].slice(0, 10)
      setSessions(next)
      localStorage.setItem(TUTORIAL_LAB_KEY, JSON.stringify(next))
    } catch { setAnalysis("The board could not be analysed. Your drawing is still available, so you can continue working and try again.") } finally { setLoading(false) }
  }

  return <main className="min-h-screen bg-[#eef2f3] text-[#172b3a]"><header className="border-b bg-white"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4"><Button asChild variant="ghost"><Link href="/tutor"><ArrowLeft />Personal Tutor</Link></Button><div className="flex gap-2"><Badge variant="outline"><Sparkles className="size-3.5" />Tutorial Lab</Badge><Button asChild size="sm" variant="outline"><Link href="/gemini-live-interview">Open live voice interviewer</Link></Button></div></div></header><div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_380px]"><section className="space-y-4"><Card className="shadow-none"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Shared-style academic workspace</p><CardTitle className="mt-2 font-serif text-2xl leading-8 whitespace-pre-line">{prompt}</CardTitle></div><Badge>{course}</Badge></div><CardDescription>Sketch, calculate, annotate or build a graph. When you ask for analysis, the multimodal tutor reviews the reasoning visible on the board and gives a Socratic follow-up rather than simply revealing a final answer.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2"><Button variant={tool === "pen" ? "default" : "outline"} onClick={() => setTool("pen")}><PenLine />Pen</Button><Button variant={tool === "eraser" ? "default" : "outline"} onClick={() => setTool("eraser")}><Eraser />Eraser</Button><Button variant="outline" onClick={() => setStrokes(current => current.slice(0, -1))} disabled={!strokes.length}><RotateCcw />Undo</Button><Button variant="outline" onClick={() => setStrokes([])} disabled={!strokes.length}><Trash2 />Clear</Button><Button variant="outline" onClick={() => { setMutationIndex(value => value + 1); setAnalysis("") }}><Sparkles />Change condition</Button></div><div className="overflow-hidden rounded-2xl border bg-white shadow-inner"><canvas ref={canvasRef} width={1000} height={600} className="block aspect-[5/3] w-full touch-none cursor-crosshair" onPointerDown={startDrawing} onPointerMove={moveDrawing} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} onPointerLeave={stopDrawing} /></div><Textarea rows={3} value={context} onChange={event => setContext(event.target.value)} placeholder="Optional note: explain what you are trying to show, define variables, or state an assumption the board alone may not make clear." /><div className="flex flex-wrap justify-between gap-2"><span className="text-xs text-slate-500">Mouse, touch and stylus input supported.</span><Button onClick={() => void analyseBoard()} disabled={!strokes.length || loading}>{loading ? <Loader2 className="animate-spin" /> : <ScanSearch />}{loading ? "Analysing…" : "Analyse my working"}</Button></div></CardContent></Card></section><aside className="space-y-4"><Card className="border-0 bg-[#102a43] text-white shadow-none"><CardHeader><Brain className="size-5 text-[#8dd7de]" /><CardTitle className="font-serif text-2xl">Tutor analysis</CardTitle><CardDescription className="text-white/60">The analysis focuses on method, assumptions, equations, diagrams, units and whether each step follows.</CardDescription></CardHeader><CardContent>{analysis ? <p className="whitespace-pre-wrap text-sm leading-7 text-white/85">{analysis}</p> : <p className="text-sm leading-6 text-white/65">Build some working on the board, then ask the tutor to analyse it. Your board remains usable if the AI service is temporarily unavailable.</p>}</CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle className="font-serif text-xl">Session history</CardTitle></CardHeader><CardContent className="space-y-2">{sessions.slice(0, 4).map(item => <details key={item.id} className="rounded-xl border bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">{item.course} · {new Date(item.date).toLocaleDateString("en-GB")}</summary><p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-3">{item.analysis}</p></details>)}{!sessions.length && <p className="text-sm text-slate-600">No saved Tutorial Lab analysis yet.</p>}</CardContent></Card><Button asChild variant="outline" className="w-full"><Link href="/working-analysis">Upload handwritten working instead <ArrowRight /></Link></Button></aside></div></main>
}
