import { expect, test } from "@playwright/test"

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
  await expect.poll(async () => {
    const cookies = await page.context().cookies()
    return cookies.some(cookie => cookie.name === "__sb_e2e_session" && cookie.httpOnly)
  }, { timeout: 5000 }).toBe(true)
}

test.describe("personal statement evidence audit", () => {
  test("three-question UCAS structure drives evidence and course analysis", async ({ page }) => {
    await signInPractice(page)
    await page.goto("/personal-statement-map")
    await expect(page).toHaveURL(/\/personal-statement-map$/)
    await expect(page.getByRole("heading", { name: /build a statement you can actually defend/i })).toBeVisible()

    await page.getByLabel("University").selectOption("Oxford")
    await page.getByLabel("Target course").fill("Physics")

    const question1 = page.getByLabel("Question 1 answer")
    const question2 = page.getByLabel("Question 2 answer")
    const question3 = page.getByLabel("Question 3 answer")
    await expect(question1).toBeVisible()
    await expect(question2).toBeVisible()
    await expect(question3).toBeVisible()

    await question1.fill("I want to study physics because modelling lets me turn an observation into a question that can be tested mathematically. Reading about orbital mechanics made me question when a simple model stops being useful, so I compared idealised assumptions with situations where drag and non-uniform fields matter. That led me to explore how approximations can remain powerful even when they are not literally true, and why deciding what to neglect is itself part of physical reasoning. I now want to study the subject in greater depth because I enjoy the point where mathematical structure and physical intuition constrain one another.")
    await question2.fill("Studying Physics and Mathematics has trained me to move between diagrams, equations and verbal explanations rather than treating them as separate tasks. In mechanics problems I learned to define a system before choosing equations, because the wrong boundary can make an otherwise correct calculation meaningless. When solving unfamiliar problems I compare limiting cases and units before accepting a result. This has made me more careful about assumptions and more interested in why a method works, not only whether it gives the expected numerical answer. Further Mathematics has also helped me see how the same mathematical idea can describe apparently different physical situations.")
    await question3.fill("Outside lessons I built a small simulation to investigate projectile motion and changed one assumption at a time to see which effects mattered most. Comparing the numerical output with hand calculations exposed where my model was too simple, so I revised it and documented the limitations rather than hiding the mismatch. I also read articles on gravitational waves and followed unfamiliar terms into introductory papers, which made me think more carefully about how indirect measurements support claims about systems we cannot observe directly. These activities led me to ask how physicists decide when evidence is strong enough to favour one model over another.")

    await expect(question1).not.toHaveValue("")
    await expect(question2).not.toHaveValue("")
    await expect(question3).not.toHaveValue("")
    await expect(page.getByText("1 · Three-question UCAS audit", { exact: true })).toBeVisible()
    await expect(page.getByText("2 · Claim → evidence → thinking → development", { exact: true })).toBeVisible()
    await expect(page.getByText("3 · Academic depth map", { exact: true })).toBeVisible()
    await expect(page.getByText("4 · Course-specific criteria evidence", { exact: true })).toBeVisible()
    await expect(page.getByText("Mathematical expression", { exact: true })).toBeVisible()
    await expect(page.getByText("Physical intuition", { exact: true })).toBeVisible()
    await expect(page.getByText(/evidence strength, not an admissions score/i)).toBeVisible()

    await page.getByRole("button", { name: /save statement \+ analysis/i }).click()
    await expect(page.getByRole("button", { name: /saved analysis/i })).toBeVisible()
  })
})
