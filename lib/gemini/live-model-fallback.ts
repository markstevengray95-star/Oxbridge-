import { getGeminiApiKeyCandidates } from "@/lib/gemini/api-key"

export const DEFAULT_GEMINI_LIVE_MODEL = "gemini-3.8-live"

// Keep automatic fallbacks protocol-compatible with the current Live client.
// 3.8 Extended Thinking is intentionally excluded until the UI tracks
// interactionStatus rather than treating every turnComplete as fully idle.
const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.1-flash-live-preview",
  "gemini-2.5-flash-native-audio-preview-12-2025",
]

function normalizeModelName(value: string | undefined) {
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

export function configuredLiveModels() {
  const primary = normalizeModelName(process.env.GEMINI_LIVE_MODEL) || DEFAULT_GEMINI_LIVE_MODEL
  const configuredFallbacks = (process.env.GEMINI_LIVE_FALLBACK_MODELS || "")
    .split(",")
    .map(value => normalizeModelName(value))
    .filter(Boolean)

  return [...new Set([primary, ...configuredFallbacks, ...DEFAULT_FALLBACK_MODELS])]
}

type ProbeResult = {
  model: string
  ok: boolean
  status: number | null
}

async function probeModel(apiKey: string, model: string): Promise<ProbeResult> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`,
      {
        headers: { "x-goog-api-key": apiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    )
    return { model, ok: response.ok, status: response.status }
  } catch {
    return { model, ok: false, status: null }
  }
}

export async function selectAvailableLiveModel(preferredCredentialSource?: string) {
  const models = configuredLiveModels()
  const allKeys = getGeminiApiKeyCandidates()
  const keys = preferredCredentialSource
    ? [
        ...allKeys.filter(item => item.source === preferredCredentialSource),
        ...allKeys.filter(item => item.source !== preferredCredentialSource),
      ]
    : allKeys

  const attempted: ProbeResult[] = []

  for (const model of models) {
    for (const key of keys) {
      const result = await probeModel(key.value, model)
      attempted.push(result)
      if (result.ok) {
        return {
          model,
          primaryModel: models[0],
          fallbackUsed: model !== models[0],
          configuredModels: models,
          attemptedModels: [...new Set(attempted.map(item => item.model))],
        }
      }

      // Authentication failures can be key-specific, so try the next key.
      // A 404/400 is model-specific for this key and moves naturally through
      // the candidate chain. Transient failures are also allowed to fall
      // through so another model can keep the interview available.
    }
  }

  // If Google's model metadata endpoint itself is unavailable, preserve the
  // configured primary instead of blocking all Live sessions on a health check.
  return {
    model: models[0],
    primaryModel: models[0],
    fallbackUsed: false,
    configuredModels: models,
    attemptedModels: [...new Set(attempted.map(item => item.model))],
  }
}
