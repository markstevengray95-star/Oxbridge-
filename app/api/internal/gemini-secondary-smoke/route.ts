import { NextResponse } from "next/server"
import { POST as interviewAdjudicate } from "@/app/api/interview-adjudicate/route"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"
export const maxDuration = 60

export async function GET() {
  const request = new Request("http://internal/api/interview-adjudicate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      course: "Physics",
      track: "STEM",
      concepts: ["kinematics", "gravity", "acceleration"],
      referenceAnswer: "At the highest point the instantaneous velocity is zero while acceleration remains approximately 9.81 m s^-2 downward if air resistance is neglected.",
      turns: [
        { role: "interviewer", text: "A ball is thrown vertically upwards. What are its velocity and acceleration at the highest point?" },
        { role: "candidate", text: "The velocity is zero for an instant, but acceleration remains approximately g downwards because gravity is still acting." },
        { role: "interviewer", text: "How would you test whether that reasoning is consistent with a velocity-time graph?" },
        { role: "candidate", text: "I would draw a straight line with gradient minus g. It crosses zero velocity at the highest point, but the gradient is still negative there, showing acceleration has not become zero." }
      ]
    })
  })
  const response = await interviewAdjudicate(request)
  const body = await response.json() as Record<string, unknown>
  const adjudication = body.adjudication && typeof body.adjudication === "object" ? body.adjudication as Record<string, unknown> : null
  return NextResponse.json({ status: response.status, ok: response.ok, provider: adjudication?.provider ?? null, markerAgreement: adjudication?.markerAgreement ?? null, hasProfile: Boolean(body.evidenceProfile) }, { headers: { "Cache-Control": "no-store, max-age=0" } })
}
