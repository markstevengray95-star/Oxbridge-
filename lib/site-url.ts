const LOCAL_FALLBACK = "http://localhost:3000"

function normaliseUrl(value: string | undefined) {
  const raw = value?.trim()
  if (!raw) return null

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    return new URL(candidate)
  } catch {
    return null
  }
}

export function getSiteUrl() {
  return (
    normaliseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normaliseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normaliseUrl(process.env.VERCEL_URL) ||
    new URL(LOCAL_FALLBACK)
  )
}

export function absoluteUrl(pathname = "/") {
  return new URL(pathname, getSiteUrl()).toString()
}
