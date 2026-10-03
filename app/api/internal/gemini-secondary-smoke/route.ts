import { NextResponse } from "next/server"
import { POST as interviewFeedback } from "@/app/api/interview-feedback/route"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"
export const maxDuration = 60

export async function GET() {
  const request = new Request("http://internal/api/interview-feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      course: "Physics",
      sessionTitle: "Reliability smoke test",
      exchanges: [
        { question: "At the highest point of a vertical throw, what are velocity and acceleration?", answer: "Velocity is zero for an instant, while acceleration remains approximately g downwards because gravity still acts." },
        { question: "How does a velocity-time graph show that?", answer: "The graph crosses zero velocity at the top but still has a negative gradient, so acceleration is not zero." }
      ]
    })
  })
  const response = await interviewFeedback(request)
  const body = await response.json() as Record<string, unknown>
  return NextResponse.json({ status: response.status, ok: response.ok, provider: body.provider ?? null, configured: body.configured ?? null, degraded: body.degraded ?? false, hasAnalysis: Boolean(body.analysis) }, { headers: { "Cache-Control": "no-store, max-age=0" } })
}
