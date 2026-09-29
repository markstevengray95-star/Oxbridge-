export const E2E_SESSION_COOKIE = "__sb_e2e_session"
export const E2E_USER_ID = "00000000-0000-4000-8000-0000000000e2"
export const E2E_USER_EMAIL = "ci-e2e@local.invalid"

function localHostname(hostHeader: string | null) {
  if (!hostHeader) return false
  const host = hostHeader.trim().toLowerCase()
  if (host.startsWith("[::1]")) return true
  const hostname = host.split(":")[0]
  return hostname === "127.0.0.1" || hostname === "localhost"
}

export function e2eRuntimeEnabled(hostHeader: string | null) {
  return process.env.GITHUB_ACTIONS === "true"
    && process.env.E2E_TEST_MODE === "1"
    && localHostname(hostHeader)
}

export function e2eUsername() {
  return process.env.E2E_TEST_USERNAME || "ci-e2e"
}

export function e2ePassword() {
  return process.env.E2E_TEST_PASSWORD || ""
}

export function e2eCredentialsMatch(hostHeader: string | null, username: string, password: string) {
  const expectedPassword = e2ePassword()
  return e2eRuntimeEnabled(hostHeader)
    && expectedPassword.length >= 16
    && username === e2eUsername()
    && password === expectedPassword
}

export function e2eSessionActive(hostHeader: string | null, cookieValue: string | undefined) {
  const expectedPassword = e2ePassword()
  return e2eRuntimeEnabled(hostHeader)
    && expectedPassword.length >= 16
    && cookieValue === expectedPassword
}

export const E2E_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false,
  path: "/",
  maxAge: 60 * 60,
}
