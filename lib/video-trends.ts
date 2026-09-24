export const VIDEO_TREND_METRICS = [
  "cameraReady",
  "gazeConsistency",
  "framing",
  "framingStability",
  "distanceConsistency",
  "headSteadiness",
  "faceVisible",
] as const

export type VideoTrendMetricKey = (typeof VIDEO_TREND_METRICS)[number]

export type VideoTrendMetrics = Record<VideoTrendMetricKey, number>

export type VideoTrendSession = {
  id: string
  date: string
  title: string
  metrics: VideoTrendMetrics
  samples: number
}

export type VideoTrendComparison = {
  latest: VideoTrendSession | null
  previous: VideoTrendSession | null
  deltas: Record<VideoTrendMetricKey, number>
  rollingAverage: VideoTrendMetrics
  sessions: VideoTrendSession[]
}

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function clamp01(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0
}

function metric(source: JsonRecord, key: VideoTrendMetricKey) {
  if (key === "cameraReady") {
    const explicit = Number(source.cameraReady)
    if (Number.isFinite(explicit)) return clamp01(explicit)
    return clamp01(
      clamp01(source.faceVisible) * 0.3 +
      clamp01(source.framing) * 0.3 +
      clamp01(source.headSteadiness) * 0.2 +
      clamp01(source.cameraFacing) * 0.2,
    )
  }
  if (key === "gazeConsistency") {
    const explicit = Number(source.gazeConsistency)
    return Number.isFinite(explicit) ? clamp01(explicit) : clamp01(source.cameraFacing)
  }
  if (key === "framingStability") {
    const explicit = Number(source.framingStability)
    return Number.isFinite(explicit) ? clamp01(explicit) : clamp01(source.framing)
  }
  if (key === "distanceConsistency") {
    const explicit = Number(source.distanceConsistency)
    return Number.isFinite(explicit) ? clamp01(explicit) : clamp01(source.framing)
  }
  return clamp01(source[key])
}

function metricsFrom(value: unknown): VideoTrendMetrics {
  const source = record(value)
  return Object.fromEntries(VIDEO_TREND_METRICS.map(key => [key, metric(source, key)])) as VideoTrendMetrics
}

export function extractVideoTrendSessions(progressValue: unknown, limit = 24): VideoTrendSession[] {
  const progress = record(progressValue)
  const logs = Array.isArray(progress.logs) ? progress.logs : []
  const sessions: VideoTrendSession[] = []

  for (const [index, raw] of logs.entries()) {
    const log = record(raw)
    const video = record(log.video)
    const samples = Number(video.samples)
    if (!Object.keys(video).length || !Number.isFinite(samples) || samples <= 0) continue
    const rawDate = typeof log.date === "string" && !Number.isNaN(Date.parse(log.date)) ? log.date : new Date(0).toISOString()
    sessions.push({
      id: typeof log.id === "string" && log.id ? log.id : `video-${index}-${rawDate}`,
      date: rawDate,
      title: typeof log.title === "string" && log.title ? log.title : "Video interview practice",
      samples: Math.max(0, Math.round(samples)),
      metrics: metricsFrom(video),
    })
  }

  return sessions
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, Math.max(1, limit))
}

function emptyMetrics(): VideoTrendMetrics {
  return {
    cameraReady: 0,
    gazeConsistency: 0,
    framing: 0,
    framingStability: 0,
    distanceConsistency: 0,
    headSteadiness: 0,
    faceVisible: 0,
  }
}

export function compareVideoTrendSessions(sessionsValue: VideoTrendSession[], rollingWindow = 5): VideoTrendComparison {
  const sessions = [...sessionsValue].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  const latest = sessions[0] ?? null
  const previous = sessions[1] ?? null
  const deltas = emptyMetrics()

  for (const key of VIDEO_TREND_METRICS) {
    deltas[key] = latest && previous ? latest.metrics[key] - previous.metrics[key] : 0
  }

  const recent = sessions.slice(0, Math.max(1, rollingWindow))
  const rollingAverage = emptyMetrics()
  if (recent.length) {
    for (const key of VIDEO_TREND_METRICS) {
      rollingAverage[key] = recent.reduce((sum, session) => sum + session.metrics[key], 0) / recent.length
    }
  }

  return { latest, previous, deltas, rollingAverage, sessions }
}

export function videoMetricLabel(key: VideoTrendMetricKey) {
  const labels: Record<VideoTrendMetricKey, string> = {
    cameraReady: "Technical camera readiness",
    gazeConsistency: "Camera-facing gaze consistency",
    framing: "Framing",
    framingStability: "Framing stability",
    distanceConsistency: "Distance consistency",
    headSteadiness: "Head-position steadiness",
    faceVisible: "Face in frame",
  }
  return labels[key]
}
