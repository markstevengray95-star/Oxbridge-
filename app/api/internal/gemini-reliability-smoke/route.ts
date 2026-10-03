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

export async function GET() {
  const request = new Request("http://internal/api/essay-analysis", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(syntheticEssay),
  })

  const response = await analyzeEssay(request)
  const body = await response.json() as Record<string, unknown>
  const diagnostic = body.diagnostic && typeof body.diagnostic === "object" ? body.diagnostic : null

  return NextResponse.json({
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
