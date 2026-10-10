import { expect, test, type Page } from "@playwright/test";

import { E2E_PASSWORD, providerFor } from "./fixtures/providers";

/**
 * The signed-out surfaces: signing in, and the guest page builder's welcome
 * and wizard. Each test starts without a session.
 */
async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("sign in", () => {
  const owner = providerFor("free");

  test("refuses a wrong password, then signs in with the right one", async ({ page }) => {
    await page.goto("/login?lang=en");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByLabel("Email").fill(owner.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    // A refused attempt keeps the address; only the password is retyped.
    await expect(page.getByLabel("Email")).toHaveValue(owner.email);

    await page.getByLabel("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });

  test("keeps next and mode when the language changes", async ({ page }) => {
    await page.goto("/login?lang=en&mode=signup&next=%2Fdashboard%2Fbookings");

    await page.getByRole("link", { name: "Español" }).click();
    await expect(page).toHaveURL(/lang=es/);
    await expect(page).toHaveURL(/mode=signup/);
    await expect(page).toHaveURL(/next=%2Fdashboard%2Fbookings/);
  });

  test("asks for a reset link on the same frame, in Spanish", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login/reset?lang=es");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expectNoSidewaysScroll(page);
  });
});

test.describe("guest page builder on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("starts the wizard from a landing business type and refuses an empty step", async ({ page }) => {
    await page.goto("/?lang=en");
    await page.getByRole("button", { name: "Start with Healthcare" }).first().click();

    const progress = page.getByRole("navigation", { name: "Setup progress" });
    await expect(progress).toContainText("Step 1 of 4");
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    await expectNoSidewaysScroll(page);

    // Nothing filled in yet: the step says what is missing, in its own card.
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /required/i })).toBeVisible();
    await expect(progress).toContainText("Step 1 of 4");

    await page.getByLabel(/Full name/i).first().fill("Dr. E2E Guest");
    await page.getByLabel(/Business name/i).first().fill("Guest Clinic E2E");
    await page.getByLabel(/email/i).first().fill("guest@example.invalid");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(progress).toContainText("Step 2 of 4");
    await expect(page.getByRole("alert").filter({ hasText: /required/i })).toHaveCount(0);
    await expectNoSidewaysScroll(page);
  });
});
