import { expect, test, type Page } from "@playwright/test";

import { localAdminClient } from "./fixtures/local-supabase";
import { E2E_PASSWORD, providerFor } from "./fixtures/providers";
import { DEFAULT_STORAGE_KEY } from "../lib/constants";

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

test.describe("guest with a draft that has no business type yet", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("resumes on the welcome step, and choosing a type starts setup", async ({ page }) => {
    // A browser-owned draft with a name but no business type: resuming it
    // opens the welcome step, the one screen that asks for the type first.
    await page.addInitScript(
      ([key]) => {
        if (!window.localStorage.getItem(key)) {
          window.localStorage.setItem(key, JSON.stringify({ provider: { businessName: "Draft Without Type E2E" } }));
        }
      },
      [DEFAULT_STORAGE_KEY],
    );
    await page.goto("/?lang=en");

    await page.getByLabel("Open menu").click();
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("button", { name: "Create your page" }).click();

    const welcome = page.getByRole("heading", { level: 1, name: "What kind of business are we setting up today?" });
    await expect(welcome).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "No credit card required" })).toBeVisible();
    await expectNoSidewaysScroll(page);

    await page.getByRole("button", { name: /^Healthcare/ }).click();
    await expect(page.getByRole("navigation", { name: "Setup progress" })).toContainText("Step 1 of 4");
    await expect(welcome).toHaveCount(0);
  });
});

test.describe("signed-in account with no page yet", () => {
  // An account and nothing else: no provider row, so no page, finished or not.
  const account = {
    id: "00000000-0000-4000-8000-0000000e2ef0",
    email: "no-page-yet@example.invalid",
  };

  test.beforeEach(async () => {
    const admin = localAdminClient();
    await admin.auth.admin.deleteUser(account.id).catch(() => undefined);
    const { error } = await admin.auth.admin.createUser({
      id: account.id,
      email: account.email,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
  });

  test("sees on a desktop that the sign-in worked, and can sign back out", async ({ page }) => {
    await page.goto("/login?lang=en");
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Signing in lands on the landing page: there is no dashboard to open yet.
    // The bar used to lose "Log in" there and gain nothing. Its create button
    // is invisible until the hero scrolls away, so the page looked exactly as
    // it had before the form, minus the one link that mentioned accounts.
    const bar = page.getByRole("banner");
    await expect(bar.getByRole("button", { name: "Sign out" })).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(bar.getByRole("link", { name: "Log in" })).toHaveCount(0);
    await expect(
      page.getByRole("main").getByText(`Signed in as ${account.email}`),
    ).toBeVisible();
    // The bar is at its tightest here: the narrowest width that shows it whole.
    await expectNoSidewaysScroll(page);

    // The gallery wears the same bar.
    await page.goto("/gallery?lang=en");
    await expect(page.getByRole("banner").getByRole("button", { name: "Sign out" })).toBeVisible();

    await page.getByRole("banner").getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });

    await page.goto("/?lang=en");
    await expect(page.getByRole("banner").getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: "Sign out" })).toHaveCount(0);
  });

  test("is offered setup from the phone menu, not a dashboard it does not have", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login?lang=en");
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Signing in lands on the landing page: there is no dashboard to open yet.
    await expect(page.getByLabel("Open menu")).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).pathname).toBe("/");

    // The dashboard sends this account straight back, so the menu must not
    // offer it: "Your dashboard" was a button that left a new owner where
    // they already were.
    await page.getByLabel("Open menu").click();
    const menu = page.getByRole("navigation", { name: "Mobile" });
    await expect(menu.getByRole("button", { name: "Your dashboard" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Log in" })).toHaveCount(0);
    // Whose session this is, and the way out of it.
    await expect(menu.getByText(`Signed in as ${account.email}`)).toBeVisible();
    await expect(menu.getByRole("button", { name: "Sign out" })).toBeVisible();

    await menu.getByRole("button", { name: "Create your page" }).click();
    await expect(page.getByRole("heading", { name: "Claim your booking link." })).toBeVisible();
  });
});
