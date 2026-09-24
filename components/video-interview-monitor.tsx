"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Eye, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export type VideoInterviewMetrics = {
  samples: number
  faceVisible: number
  cameraFacing: number
  framing: number
  expressionVariation: number
  headSteadiness: number
}

type Props = {
  active: boolean
  onMetrics?: (metrics: VideoInterviewMetrics) => void
}

type Point = { x: number; y: number; z?: number }
type Category = { categoryName?: string; displayName?: string; score?: number }

type FaceResult = {
  faceLandmarks?: Point[][]
  faceBlendshapes?: Array<{ categories?: Category[] }>
}

const EMPTY: VideoInterviewMetrics = { samples: 0, faceVisible: 0, cameraFacing: 0, framing: 0, expressionVariation: 0, headSteadiness: 0 }
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const pct = (n: number) => Math.round(clamp01(n) * 100)

export function VideoInterviewMonitor({ active, onMetrics }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<{ detectForVideo: (video: HTMLVideoElement, time: number) => FaceResult; close?: () => void } | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastSampleRef = useRef(0)
  const statsRef = useRef({ samples: 0, visible: 0, facing: 0, framing: 0, expressionValues: [] as number[], movementValues: [] as number[], lastNose: null as Point | null })
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [metrics, setMetrics] = useState<VideoInterviewMetrics>(EMPTY)

  function publish() {
    const s = statsRef.current
    if (!s.samples) return
    const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const expressionMean = mean(s.expressionValues)
    const expressionVariance = s.expressionValues.length > 1 ? mean(s.expressionValues.map(v => (v - expressionMean) ** 2)) : 0
    const movementMean = mean(s.movementValues)
    const next: VideoInterviewMetrics = {
      samples: s.samples,
      faceVisible: s.visible / s.samples,
      cameraFacing: s.facing / s.samples,
      framing: s.framing / s.samples,
      expressionVariation: clamp01(Math.sqrt(expressionVariance) * 6),
      headSteadiness: clamp01(1 - movementMean * 9),
    }
    setMetrics(next)
    onMetrics?.(next)
  }

  async function start() {
    if (loading || enabled) return
    setLoading(true)
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      const vision = await import("@mediapipe/tasks-vision")
      const files = await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm")
      const landmarker = await vision.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
      })
      landmarkerRef.current = landmarker as unknown as typeof landmarkerRef.current
      statsRef.current = { samples: 0, visible: 0, facing: 0, framing: 0, expressionValues: [], movementValues: [], lastNose: null }
      setMetrics(EMPTY)
      setEnabled(true)
    } catch (cause) {
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setError(cause instanceof Error ? cause.message : "Camera analysis could not start")
    } finally {
      setLoading(false)
    }
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    landmarkerRef.current?.close?.()
    landmarkerRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setEnabled(false)
  }

  useEffect(() => {
    if (!active && enabled) stop()
    return () => { if (!active) stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useEffect(() => {
    if (!enabled || !active) return
    let cancelled = false
    const loop = () => {
      if (cancelled) return
      const now = performance.now()
      const video = videoRef.current
      const landmarker = landmarkerRef.current
      if (video && landmarker && video.readyState >= 2 && now - lastSampleRef.current >= 180) {
        lastSampleRef.current = now
        try {
          const result = landmarker.detectForVideo(video, now)
          const s = statsRef.current
          s.samples += 1
          const points = result.faceLandmarks?.[0]
          if (points?.length) {
            s.visible += 1
            const xs = points.map(p => p.x), ys = points.map(p => p.y)
            const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
            const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, width = maxX - minX
            const centerDistance = Math.hypot(cx - 0.5, cy - 0.47)
            const centered = clamp01(1 - centerDistance / 0.26)
            const sizeScore = width < 0.18 ? width / 0.18 : width > 0.58 ? clamp01(1 - (width - 0.58) / 0.22) : 1
            const framingScore = centered * sizeScore
            s.framing += framingScore

            const nose = points[1] ?? points[Math.floor(points.length / 2)]
            const leftEye = points[33], rightEye = points[263]
            let frontal = centered
            if (nose && leftEye && rightEye) {
              const eyeMid = (leftEye.x + rightEye.x) / 2
              frontal = clamp01(1 - Math.abs(nose.x - eyeMid) / 0.065)
            }
            const categories = result.faceBlendshapes?.[0]?.categories ?? []
            const blend = new Map(categories.map(item => [item.categoryName || item.displayName || "", Number(item.score || 0)]))
            const gazeAway = Math.max(
              blend.get("eyeLookDownLeft") || 0, blend.get("eyeLookDownRight") || 0,
              blend.get("eyeLookUpLeft") || 0, blend.get("eyeLookUpRight") || 0,
              blend.get("eyeLookInLeft") || 0, blend.get("eyeLookInRight") || 0,
              blend.get("eyeLookOutLeft") || 0, blend.get("eyeLookOutRight") || 0,
            )
            const blink = ((blend.get("eyeBlinkLeft") || 0) + (blend.get("eyeBlinkRight") || 0)) / 2
            const contact = frontal * clamp01(1 - gazeAway * 1.35) * (blink > 0.65 ? 1 : 1)
            s.facing += contact

            const expressive = ["mouthSmileLeft","mouthSmileRight","browInnerUp","browOuterUpLeft","browOuterUpRight","jawOpen","mouthPucker","mouthFrownLeft","mouthFrownRight"]
              .map(key => blend.get(key) || 0)
              .reduce((sum, value) => sum + value, 0) / 9
            s.expressionValues.push(expressive)
            if (s.expressionValues.length > 160) s.expressionValues.shift()

            if (nose && s.lastNose) s.movementValues.push(Math.hypot(nose.x - s.lastNose.x, nose.y - s.lastNose.y))
            if (s.movementValues.length > 160) s.movementValues.shift()
            s.lastNose = nose ?? null
          }
          publish()
        } catch { /* skip a dropped frame */ }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { cancelled = true; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, active])

  return <Card className="overflow-hidden border-[#b9d8dd] shadow-none">
    <CardHeader className="bg-[#edf7f8]">
      <div className="flex items-start justify-between gap-3">
        <div><CardTitle className="flex items-center gap-2 font-serif text-xl"><Camera className="size-5"/>Video interview coach</CardTitle><CardDescription>On-device presentation analysis. It measures visible interview behaviours; it does not identify emotions, personality or mental state.</CardDescription></div>
        <Badge variant="outline"><ShieldCheck className="size-3.5"/>Local video</Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-4 p-4">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#102a43]">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full scale-x-[-1] object-cover"/>
        {!enabled && <div className="absolute inset-0 grid place-items-center p-6 text-center text-white"><div><CameraOff className="mx-auto mb-3 size-8 opacity-70"/><p className="font-semibold">Camera is off</p><p className="mt-1 text-xs text-white/65">Turn it on when you want presentation feedback.</p></div></div>}
      </div>
      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">{error}</div>}
      <div className="flex gap-2">{enabled?<Button type="button" variant="outline" onClick={stop}><CameraOff/>Stop camera</Button>:<Button type="button" onClick={()=>void start()} disabled={loading}>{loading?<Sparkles className="animate-pulse"/>:<Camera/>}{loading?"Starting…":"Start camera analysis"}</Button>}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Metric label="Face visible" value={metrics.faceVisible} hint="Keeps you in frame"/>
        <Metric label="Camera-facing eye-contact proxy" value={metrics.cameraFacing} hint="Uses gaze/head direction, not true eye tracking" icon={<Eye className="size-3.5"/>}/>
        <Metric label="Framing" value={metrics.framing} hint="Centered and sensible distance"/>
        <Metric label="Expression variation" value={metrics.expressionVariation} hint="Visible facial movement only; no emotion labels"/>
        <Metric label="Head steadiness" value={metrics.headSteadiness} hint="Avoids excessive movement; natural movement is fine"/>
      </div>
      <p className="text-[11px] leading-5 text-slate-500">Your camera frames are processed in the browser with MediaPipe and are not sent to the Oxbridge server. These scores are coaching signals, not psychological or admissions judgments.</p>
    </CardContent>
  </Card>
}

function Metric({ label, value, hint, icon }: { label: string; value: number; hint: string; icon?: React.ReactNode }) {
  return <div className="rounded-xl border bg-white p-3"><div className="mb-1 flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-1 font-semibold">{icon}{label}</span><strong>{value ? `${pct(value)}%` : "—"}</strong></div><Progress value={pct(value)}/><p className="mt-1 text-[10px] leading-4 text-slate-500">{hint}</p></div>
}
