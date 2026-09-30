export const DEFAULT_GEMINI_WRITING_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
] as const

function normalizeModelName(value: string | undefined | null) {
  const raw = (value || "").trim()
  if (!raw) return ""
  const withoutQuery = raw.split("?", 1)[0].replace(/\/+$/, "")
  const marker = "/models/"
  const markerIndex = withoutQuery.lastIndexOf(marker)
  const candidate = markerIndex >= 0
    ? withoutQuery.slice(markerIndex + marker.length)
    : withoutQuery.replace(/^models\//i, "")
  return candidate.replace(/^\/+|\/+$/g, "").trim()
}

function isGenerateContentCompatible(model: string) {
  const lowered = model.toLowerCase()
  return Boolean(model)
    && !lowered.includes("live")
    && !lowered.includes("native-audio")
}

export function configuredWritingModels() {
  const writingModel = normalizeModelName(process.env.GEMINI_WRITING_MODEL)
  const textModel = normalizeModelName(process.env.GEMINI_TEXT_MODEL)
  const genericModel = normalizeModelName(process.env.GEMINI_MODEL)

  const configured = [writingModel, textModel]
  if (isGenerateContentCompatible(genericModel)) configured.push(genericModel)

  return [...new Set([
    ...configured.filter(isGenerateContentCompatible),
    ...DEFAULT_GEMINI_WRITING_MODELS,
  ])]
}

export function isWritingModelCompatible(value: string | undefined | null) {
  const model = normalizeModelName(value)
  return isGenerateContentCompatible(model)
}
