import { expect, test } from "@playwright/test"

async function expectAuthenticatedShell(page) {
  await expect(page.getByRole("link", { name: "ScholarBridge" }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "Tutor" }).first()).toBeVisible()
  await expect(page.getByLabel("Email")).toHaveCount(0)
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
    const username = process.env.E2E_TEST_USERNAME
    const password = process.env.E2E_TEST_PASSWORD
    expect(username).toBeTruthy()
    expect(password?.length || 0).toBeGreaterThanOrEqual(16)

    await page.goto("/practice-login?next=/student-home")
    await page.getByLabel("Username").fill(username)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Start practising" }).click()
    await page.waitForURL(/\/student-home$/)
    await expectAuthenticatedShell(page)

    const cookies = await context.cookies()
    const e2eCookie = cookies.find(cookie => cookie.name === "__sb_e2e_session")
    expect(e2eCookie).toBeTruthy()
    expect(e2eCookie?.httpOnly).toBeTruthy()

    await page.goto("/tutor")
    await expect(page).toHaveURL(/\/tutor$/)
    await expectAuthenticatedShell(page)

    const secondPage = await context.newPage()
    await secondPage.goto("/student-home")
    await expect(secondPage).toHaveURL(/\/student-home$/)
    await expect(secondPage.getByLabel("Email")).toHaveCount(0)
    await secondPage.close()

    await context.clearCookies()
    await page.goto("/student-home")
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)student-home/)
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  })
})
