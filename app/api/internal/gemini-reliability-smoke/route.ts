import { NextResponse } from "next/server"
import { POST as analyzeEssay } from "@/app/api/essay-analysis/route"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"
export const maxDuration = 60

const syntheticEssay = {
  mode: "essay" as const,
  test: "Gemini reliability smoke test",
  prompt: "Should scientific models be judged mainly by their predictive success?",
  course: "Physics",
  essay: `Scientific models are valuable because they simplify reality while still allowing useful predictions. A model does not need to copy every feature of the world to be useful; it needs to identify the relationships that matter for the question being studied. For example, an ideal-gas model ignores molecular volume and intermolecular forces, yet it can still predict how pressure, volume and temperature are related under many conditions.\n\nPredictive success, however, is not the only standard. A model can make accurate predictions for the wrong reason or only within a narrow range. Scientists therefore also test assumptions, compare competing explanations and identify where a model stops working. The ideal-gas model becomes less reliable at high pressures or low temperatures, so its limitations matter when deciding whether to use it.\n\nFor that reason, predictive success should be a major test of a scientific model but not the only one. A strong model should make useful predictions, state its assumptions clearly and help explain why the observed pattern occurs. Judging those features together gives a better basis for choosing between models than prediction alone.`,
}

const syntheticStatement = {
  mode: "statement" as const,
  test: "Gemini reliability personal statement smoke test",
  course: "Physics",
  essay: `I am drawn to physics because a small set of principles can explain systems that initially seem unrelated. Studying mechanics made this especially clear: conservation laws connect motion, collisions and orbital behaviour while also showing where an approximation has limits. I began reading beyond the syllabus about how models are chosen and tested, which led me to compare classical descriptions with cases where quantum ideas become necessary.\n\nOne topic I explored further was the photoelectric effect. Rather than treating the equation as something to memorise, I worked through why increasing intensity changes the number of emitted electrons while frequency determines whether emission occurs at all. I then used experimental graphs to connect stopping potential with maximum kinetic energy. This helped me see how experimental evidence can force a change in the model used to describe a phenomenon.\n\nI enjoy problems where the route to a solution is not obvious at first. In extended mechanics questions I often sketch limiting cases before calculating, because checking what should happen when a quantity becomes very large or very small can reveal a mistaken assumption. I would like to develop that habit further at university through problems that demand careful reasoning, mathematical modelling and discussion of the assumptions behind an answer.`,
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const payload = url.searchParams.get("mode") === "statement" ? syntheticStatement : syntheticEssay
  const internalRequest = new Request("http://internal/api/essay-analysis", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })

  const response = await analyzeEssay(internalRequest)
  const body = await response.json() as Record<string, unknown>
  const diagnostic = body.diagnostic && typeof body.diagnostic === "object" ? body.diagnostic : null

  return NextResponse.json({
    requestedMode: payload.mode,
    ok: response.ok,
    status: response.status,
    provider: body.provider ?? null,
    model: body.model ?? null,
    message: body.message ?? null,
    diagnostic,
    hasReport: Boolean(body.report),
    rubricVersion: body.rubricVersion ?? null,
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  })
}
