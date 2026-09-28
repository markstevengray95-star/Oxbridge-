"use client"

import { useRef, useState } from "react"
import { Eraser, Grid3X3, Minus, PencilLine, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { InterviewWhiteboardTask } from "@/lib/interview-questioning-engine"

type Point = { x: number; y: number }
type Tool = "draw" | "line" | "erase"
type Background = "blank" | "grid" | "axes"
type Stroke = { points: Point[]; erase: boolean; straight: boolean }

type Props = {
  task?: InterviewWhiteboardTask | null
  onUse?: () => void
  onUsed?: () => void
}

export function InterviewWhiteboard({ task, onUse, onUsed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokesRef = useRef<Stroke[]>([])
  const activeRef = useRef<Point[] | null>(null)
  const [strokeCount, setStrokeCount] = useState(0)
  const [tool, setTool] = useState<Tool>("draw")
  const [background, setBackground] = useState<Background>("blank")
  const [workingNote, setWorkingNote] = useState("")

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  function drawSegment(from: Point, to: Point, erase = false) {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return
    context.lineCap = "round"
    context.lineJoin = "round"
    context.lineWidth = erase ? 22 : 3
    context.globalCompositeOperation = erase ? "destination-out" : "source-over"
    context.strokeStyle = "#102a43"
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.lineTo(to.x, to.y)
    context.stroke()
    context.globalCompositeOperation = "source-over"
  }

  function drawStroke(stroke: Stroke) {
    if (stroke.points.length < 2) return
    if (stroke.straight) {
      drawSegment(stroke.points[0], stroke.points[stroke.points.length - 1], stroke.erase)
      return
    }
    for (let index = 1; index < stroke.points.length; index += 1) {
      drawSegment(stroke.points[index - 1], stroke.points[index], stroke.erase)
    }
  }

  function redraw(preview?: Stroke) {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    for (const stroke of strokesRef.current) drawStroke(stroke)
    if (preview) drawStroke(preview)
  }

  function markUsed() {
    onUse?.()
    onUsed?.()
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = pointFromEvent(event)
    if (!point) return
    event.currentTarget.setPointerCapture(event.pointerId)
    activeRef.current = [point]
    markUsed()
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const active = activeRef.current
    const point = pointFromEvent(event)
    if (!active || !point) return
    if (tool === "line") {
      active[1] = point
      redraw({ points: [active[0], point], erase: false, straight: true })
      return
    }
    const previous = active[active.length - 1]
    drawSegment(previous, point, tool === "erase")
    active.push(point)
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const active = activeRef.current
    if (!active) return
    const point = pointFromEvent(event)
    if (tool === "line" && point) active[1] = point
    if (active.length > 1) {
      strokesRef.current.push({ points: [...active], erase: tool === "erase", straight: tool === "line" })
      setStrokeCount(strokesRef.current.length)
    }
    activeRef.current = null
    redraw()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function undo() {
    strokesRef.current.pop()
    setStrokeCount(strokesRef.current.length)
    redraw()
  }

  function clear() {
    strokesRef.current = []
    setStrokeCount(0)
    setWorkingNote("")
    redraw()
  }

  const gridStyle = background === "grid" ? {
    backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
    backgroundSize: "24px 24px",
  } : undefined

  return <div className="space-y-3">
    {task ? <div className="rounded-xl border border-[#cfe1e4] bg-[#edf7f8] p-3">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-[#147d91]">{task.title}</p>
      <p className="mt-1 text-sm leading-6 text-[#526a75]">{task.prompt}</p>
    </div> : <p className="text-sm leading-6 text-slate-500">Use this for equations, graphs, free-body diagrams, ray diagrams, sketches or structured working. The drawing itself is not scored; explain the decisive step in your answer.</p>}

    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant={tool === "draw" ? "default" : "outline"} onClick={() => setTool("draw")}><PencilLine className="size-4" />Freehand</Button>
      <Button type="button" size="sm" variant={tool === "line" ? "default" : "outline"} onClick={() => setTool("line")}><Minus className="size-4" />Straight line</Button>
      <Button type="button" size="sm" variant={tool === "erase" ? "default" : "outline"} onClick={() => setTool("erase")}><Eraser className="size-4" />Erase</Button>
      <span className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />
      <Button type="button" size="sm" variant={background === "blank" ? "secondary" : "outline"} onClick={() => setBackground("blank")}>Blank</Button>
      <Button type="button" size="sm" variant={background === "grid" ? "secondary" : "outline"} onClick={() => setBackground("grid")}><Grid3X3 className="size-4" />Grid</Button>
      <Button type="button" size="sm" variant={background === "axes" ? "secondary" : "outline"} onClick={() => setBackground("axes")}>x–y axes</Button>
    </div>

    <div className="relative overflow-hidden rounded-2xl border bg-white shadow-inner" style={gridStyle}>
      {background === "axes" && <div className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-0 h-full w-px bg-slate-300"/><div className="absolute left-0 top-1/2 h-px w-full bg-slate-300"/><span className="absolute right-2 top-[52%] text-xs text-slate-400">x</span><span className="absolute left-[51%] top-2 text-xs text-slate-400">y</span></div>}
      <canvas
        ref={canvasRef}
        width={900}
        height={360}
        aria-label="Interview whiteboard maths and science working canvas"
        className="relative z-10 h-[260px] w-full touch-none bg-transparent sm:h-[320px]"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      />
    </div>

    <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
      <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Equation / reasoning notes</span><textarea value={workingNote} onChange={event => { setWorkingNote(event.target.value); if (event.target.value.trim()) markUsed() }} rows={2} className="w-full rounded-xl border bg-white px-3 py-2 text-sm" placeholder="e.g. assume negligible drag; F = ma; gradient represents…" /></label>
      <div className="flex gap-2 md:pb-0.5"><Button type="button" size="sm" variant="outline" onClick={undo} disabled={!strokeCount}><RotateCcw className="size-4" />Undo</Button><Button type="button" size="sm" variant="outline" onClick={clear} disabled={!strokeCount && !workingNote}>Clear</Button></div>
    </div>
    <p className="text-xs leading-5 text-slate-500">Use the grid for proportional reasoning and diagrams, axes for graph-based problems, and the straight-line tool for vectors, rays, construction lines and force arrows.</p>
  </div>
}