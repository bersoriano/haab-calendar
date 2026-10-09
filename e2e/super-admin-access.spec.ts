import { expect, test } from "@playwright/test";

import { authStatePath } from "./fixtures/providers";

/**
 * Super admin is invisible to everyone else: an ordinary provider gets the
 * same not-found answer on every super-admin page as on a URL that does not
 * exist, and a visitor is asked to sign in first.
 */
const PAGES = [
  "/super-admin",
  "/super-admin/accounts",
  "/super-admin/demo-pages",
  "/super-admin/cleanups",
];

test.describe("an ordinary provider", () => {
  test.use({ storageState: authStatePath("billingPremium") });

  for (const path of PAGES) {
    test(`gets not found at ${path}`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(404);
      await expect(page.getByText(/Super admin/)).toHaveCount(0);
    });
  }

  test("sees no super-admin entry in the dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator('a[href="/super-admin"]')).toHaveCount(0);
  });
});

test.describe("a signed-out visitor", () => {
  test("is asked to sign in", async ({ page }) => {
    await page.goto("/super-admin/accounts");
    await expect(page).toHaveURL(/\/login\?.*next=%2Fsuper-admin%2Faccounts/);
  });
});
