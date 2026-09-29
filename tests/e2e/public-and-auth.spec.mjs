import { expect, test } from "@playwright/test"

async function expectAuthenticatedShell(page) {
  await expect(page.getByRole("link", { name: "ScholarBridge" }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "Tutor" }).first()).toBeVisible()
  await expect(page.getByLabel("Email")).toHaveCount(0)
}

async function expectProtectedAccess(page, pathname) {
  await expect(page).toHaveURL(new RegExp(`${pathname.replace("/", "\\/")}$`))
  await expect(page.getByLabel("Email")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Sign in" })).toHaveCount(0)
}

async function signInPractice(page) {
  const username = process.env.E2E_TEST_USERNAME
  const password = process.env.E2E_TEST_PASSWORD
  expect(username).toBeTruthy()
  expect(password?.length || 0).toBeGreaterThanOrEqual(16)
  await page.goto("/practice-login?next=/student-home")
  await page.getByLabel("Username").fill(username)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Start practising" }).click()
  await page.waitForURL(/\/student-home$/)
}

test.describe("public and protected navigation", () => {
  test("login and practice login render without browser errors", async ({ page }) => {
    const errors = []
    page.on("pageerror", error => errors.push(error.message))

    await page.goto("/login")
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
    await expect(page.getByRole("link", { name: /practice username/i })).toBeVisible()

    await page.goto("/practice-login")
    await expect(page.getByLabel("Username")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Start practising" })).toBeVisible()
    expect(errors).toEqual([])
  })

  test("protected student route redirects to working sign in when logged out", async ({ page }) => {
    await page.goto("/student-home")
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)student-home/)
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  })

  test("protected school route redirects to sign in when logged out", async ({ page }) => {
    await page.goto("/school-dashboard")
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByLabel("Email")).toBeVisible()
  })

  test("mobile sign-in stays inside the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/login")
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)
  })
})

test.describe("authenticated CI practice smoke", () => {
  test("practice sign in opens protected routes and persists the session", async ({ page, context }) => {
    await signInPractice(page)
    await expectAuthenticatedShell(page)

    await expect.poll(async () => {
      const cookies = await context.cookies()
      return cookies.some(cookie => cookie.name === "__sb_e2e_session" && cookie.httpOnly)
    }, { timeout: 5000 }).toBe(true)

    await page.goto("/tutor")
    await expectProtectedAccess(page, "/tutor")

    const secondPage = await context.newPage()
    await secondPage.goto("/student-home")
    await expectProtectedAccess(secondPage, "/student-home")
    await secondPage.close()

    await context.clearCookies()
    await page.goto("/student-home")
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)student-home/)
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  })

  test("practice access reaches Pro preparation but cannot cross School or admin boundaries", async ({ page, context }) => {
    await signInPractice(page)

    await page.goto("/full-papers")
    await expectProtectedAccess(page, "/full-papers")

    // Stop at the middleware boundary. The disposable CI session is deliberately not a
    // real Supabase session, so following the redirect into the server-rendered plan page
    // would test the CI harness rather than the production School gate.
    const schoolGate = await context.request.get("/school-dashboard", { maxRedirects: 0 })
    expect([307, 308]).toContain(schoolGate.status())
    const schoolLocation = schoolGate.headers().location || ""
    expect(schoolLocation).toMatch(/\/premium\?.*required=school/)

    const adminGate = await context.request.get("/admin", { maxRedirects: 0 })
    expect([307, 308]).toContain(adminGate.status())
    const adminLocation = adminGate.headers().location || ""
    expect(adminLocation).toMatch(/\/admin\/login\?.*error=not-authorized/)

    const schoolApi = await page.evaluate(async () => {
      const response = await fetch('/api/school', { credentials: 'include' })
      return { status: response.status, body: await response.json().catch(() => ({})) }
    })
    expect(schoolApi.status).toBe(401)
    expect(schoolApi.body?.error).toMatch(/sign in required/i)
  })
})
