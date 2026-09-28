"use client"

import { useRef, useState } from "react"
import { Eraser, PencilLine, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { InterviewWhiteboardTask } from "@/lib/interview-questioning-engine"

type Point = { x: number; y: number }

type Props = {
  task?: InterviewWhiteboardTask | null
  onUse?: () => void
  onUsed?: () => void
}

export function InterviewWhiteboard({ task, onUse, onUsed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokesRef = useRef<Point[][]>([])
  const activeRef = useRef<Point[] | null>(null)
  const [strokeCount, setStrokeCount] = useState(0)
  const [erasing, setErasing] = useState(false)

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
    context.lineWidth = erase ? 20 : 3
    context.globalCompositeOperation = erase ? "destination-out" : "source-over"
    context.strokeStyle = "#102a43"
    context.beginPath()
    context.moveTo(from.x, from.y)
    context.lineTo(to.x, to.y)
    context.stroke()
    context.globalCompositeOperation = "source-over"
  }

  function redraw() {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    for (const stroke of strokesRef.current) {
      for (let index = 1; index < stroke.length; index += 1) drawSegment(stroke[index - 1], stroke[index])
    }
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = pointFromEvent(event)
    if (!point) return
    event.currentTarget.setPointerCapture(event.pointerId)
    activeRef.current = [point]
    if (!erasing) {
      onUse?.()
      onUsed?.()
    }
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const active = activeRef.current
    const point = pointFromEvent(event)
    if (!active || !point) return
    const previous = active[active.length - 1]
    drawSegment(previous, point, erasing)
    active.push(point)
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const active = activeRef.current
    if (!active) return
    if (!erasing && active.length > 1) {
      strokesRef.current.push(active)
      setStrokeCount(strokesRef.current.length)
    }
    activeRef.current = null
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
    const canvas = canvasRef.current
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
  }

  return <div className="space-y-3">
    {task ? <div className="rounded-xl border border-[#cfe1e4] bg-[#edf7f8] p-3">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-[#147d91]">{task.title}</p>
      <p className="mt-1 text-sm leading-6 text-[#526a75]">{task.prompt}</p>
    </div> : <p className="text-sm leading-6 text-slate-500">Use this for sketches, graphs, diagrams or working. The drawing itself is not scored; explain the important part in your answer.</p>}

    <div className="overflow-hidden rounded-2xl border bg-white shadow-inner">
      <canvas
        ref={canvasRef}
        width={900}
        height={360}
        aria-label="Interview whiteboard"
        className="h-[260px] w-full touch-none bg-white sm:h-[320px]"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      />
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={erasing ? "outline" : "default"} onClick={() => setErasing(false)}><PencilLine className="size-4" />Draw</Button>
        <Button type="button" size="sm" variant={erasing ? "default" : "outline"} onClick={() => setErasing(true)}><Eraser className="size-4" />Erase</Button>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={undo} disabled={!strokeCount}><RotateCcw className="size-4" />Undo</Button>
        <Button type="button" size="sm" variant="outline" onClick={clear} disabled={!strokeCount}>Clear</Button>
      </div>
    </div>
  </div>
}
