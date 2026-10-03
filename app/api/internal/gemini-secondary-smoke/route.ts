import { NextResponse } from "next/server"
import { POST as answerFeedback } from "@/app/api/answer-feedback/route"
import { POST as analyseWorking } from "@/app/api/analyse-working/route"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"
export const maxDuration = 60

function makeRequest(path: string, body: unknown) {
  return new Request(`http://internal${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode") || "answer"

  if (mode === "vision") {
    const onePixelPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    const response = await analyseWorking(makeRequest("/api/analyse-working", {
      image: onePixelPng,
      subject: "Physics mechanics",
      context: "Reliability smoke test. If no academic working is visible, say so clearly rather than inventing content."
    }))
    const body = await response.json() as Record<string, unknown>
    return NextResponse.json({ mode, status: response.status, ok: response.ok, provider: body.provider ?? null, hasAnalysis: typeof body.analysis === "string" && body.analysis.length > 0, error: body.error ?? null }, { headers: { "Cache-Control": "no-store, max-age=0" } })
  }

  const response = await answerFeedback(makeRequest("/api/answer-feedback", {
    test: "ESAT-style physics practice",
    section: "Mechanics",
    difficulty: "Stretch",
    prompt: "A car travels at constant speed around a circular track. Which quantity must be changing?",
    options: ["Mass", "Velocity", "Kinetic energy", "Speed"],
    selectedAnswer: "Velocity",
    correctAnswer: "Velocity",
    correct: true,
    explanation: "Velocity changes because its direction changes even when speed is constant."
  }))
  const body = await response.json() as Record<string, unknown>
  return NextResponse.json({ mode: "answer", status: response.status, ok: response.ok, provider: body.provider ?? null, degraded: body.degraded ?? false, hasFeedback: Boolean(body.feedback) }, { headers: { "Cache-Control": "no-store, max-age=0" } })
}
