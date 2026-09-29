import { expect, test } from "@playwright/test"

test.describe("public and protected navigation", () => {
  test("login and practice login render without browser errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", error => errors.push(error.message))

    await page.goto("/login")
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
    await expect(page.getByRole("link", { name: /practice username/i })).toBeVisible()

    await page.goto("/practice-login")
    await expect(page.getByRole("heading", { name: "Practice access" })).toBeVisible()
    await expect(page.getByLabel("Username")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    expect(errors).toEqual([])
  })

  test("protected student route redirects to sign in when logged out", async ({ page }) => {
    await page.goto("/student-home")
    await expect(page).toHaveURL(/\/login\?next=%2Fstudent-home|\/login\?next=\/student-home/)
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
  })

  test("protected school route redirects to sign in when logged out", async ({ page }) => {
    await page.goto("/school-dashboard")
    await expect(page).toHaveURL(/\/login/)
  })

  test("mobile navigation does not overflow or hide primary actions", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/login")
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)
  })
})

test.describe("authenticated account smoke", () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "E2E_EMAIL/E2E_PASSWORD are not configured")

  test("sign in, open tutor, persist session, and sign out", async ({ page, context }) => {
    const email = process.env.E2E_EMAIL!
    const password = process.env.E2E_PASSWORD!

    await page.goto("/login?next=/account")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForURL(/\/account|\/post-login|\/premium/)

    if (page.url().includes("/post-login") || page.url().includes("/premium")) {
      await page.goto("/account")
    }
    await expect(page.getByRole("heading", { name: /Welcome/i })).toBeVisible()

    await page.goto("/tutor")
    await expect(page.locator("body")).toContainText(/Tutor|preparation|practice/i)

    const cookies = await context.cookies()
    expect(cookies.some(cookie => cookie.name.includes("auth-token") || cookie.name.startsWith("sb-"))).toBeTruthy()

    await page.goto("/account")
    await page.getByRole("button", { name: /Sign out/i }).click()
    await page.waitForURL(/\/login|\/$/)
  })
})
