const GEMINI_KEY_ENV_NAMES = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
] as const

export type GeminiApiKeyCandidate = {
  source: typeof GEMINI_KEY_ENV_NAMES[number]
  value: string
}

function stripMatchingQuotes(value: string) {
  if (value.length < 2) return value
  const first = value[0]
  const last = value[value.length - 1]
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) return value.slice(1, -1).trim()
  return value
}

export function normalizeGeminiApiKey(raw: string | undefined | null) {
  let value = (raw ?? "").trim()
  if (!value) return ""

  value = stripMatchingQuotes(value)

  // Be forgiving when an entire .env assignment was pasted into a host UI.
  const assignment = value.match(/^(?:export\s+)?(?:GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY)\s*=\s*(.+)$/i)
  if (assignment?.[1]) value = stripMatchingQuotes(assignment[1].trim())

  // API-key clients expect the raw key, not an HTTP Authorization value.
  value = value.replace(/^Bearer\s+/i, "").trim()
  value = stripMatchingQuotes(value)

  return value.replace(/[\r\n\t]/g, "").trim()
}

export function getGeminiApiKeyCandidates(): GeminiApiKeyCandidate[] {
  const candidates: GeminiApiKeyCandidate[] = []
  const seen = new Set<string>()

  for (const source of GEMINI_KEY_ENV_NAMES) {
    const value = normalizeGeminiApiKey(process.env[source])
    if (!value || seen.has(value)) continue
    seen.add(value)
    candidates.push({ source, value })
  }

  return candidates
}

export function hasGeminiApiKey() {
  return getGeminiApiKeyCandidates().length > 0
}
