import { expect, test } from "@playwright/test";

import { providerFor } from "./fixtures/providers";

/**
 * Local guard for "the public booking flow does not change" while the
 * dashboard is redesigned. Opt-in (E2E_VISUAL=1): baselines depend on the
 * machine's fonts, so CI never runs it. Capture baselines on main with
 * --update-snapshots, then compare on the branch.
 */
test.skip(!process.env.E2E_VISUAL, "local visual guard; set E2E_VISUAL=1");

for (const width of [390, 1280]) {
  test(`public booking page is unchanged at ${width}px`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-12T10:00:00"));
    await page.setViewportSize({ width, height: 1000 });
    // The healthcare vertical serves public pages under /doctors.
    await page.goto(`/doctors/${providerFor("billingPremium").slug}`);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(`public-step1-${width}.png`, { fullPage: true, animations: "disabled" });

    // Pick the first open day: the time slots and summary appear.
    await page.locator("main button:not([disabled])").filter({ hasText: /^\d{1,2}$/ }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(`public-day-selected-${width}.png`, { fullPage: true, animations: "disabled" });
  });
}
