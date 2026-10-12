import { expect, test } from "@playwright/test";

import { authStatePath } from "./fixtures/providers";

/**
 * Above the bookings list, the history policy folds away: one line says how
 * long bookings are kept, and opening it gives the policy in full.
 */

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

const POLICY =
  "Current policy: bookings more than one month past are permanently deleted during daily cleanup.";

test.describe("history policy above the bookings list", () => {
  test.use({ storageState: authStatePath("publicManage") });

  for (const width of WIDTHS) {
    test(`folds away and opens at ${width.name} width`, async ({ page }) => {
      await page.setViewportSize({ width: width.width, height: width.height });
      await page.goto("/dashboard/bookings");

      const notice = page.locator("details[data-retention-notice]");
      const summary = notice.locator("summary");
      await expect(summary).toBeVisible();
      await expect(summary).toHaveText("Booking history · Kept for one month");

      // Closed to begin with: the policy and its link are there, but folded.
      await expect(notice).not.toHaveAttribute("open", /.*/);
      await expect(notice.getByText(POLICY)).toBeHidden();
      const folded = (await notice.boundingBox())!.height;

      await summary.click();
      await expect(notice.getByText(POLICY)).toBeVisible();
      const manage = notice.getByRole("button", { name: "Manage history in Settings" });
      await expect(manage).toBeVisible();
      expect((await notice.boundingBox())!.height).toBeGreaterThan(folded);

      await summary.click();
      await expect(notice.getByText(POLICY)).toBeHidden();

      // The keyboard opens it too, and its link still leads to the setting.
      await summary.focus();
      await page.keyboard.press("Enter");
      await expect(manage).toBeVisible();
      await manage.click();
      await expect(page).toHaveURL(/\/dashboard\/settings$/);
    });
  }
});
