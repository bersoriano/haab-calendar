import { expect, test, type Page } from "@playwright/test";

import { authStatePath, providerFor } from "./fixtures/providers";

/**
 * The bookings as a month: a look at how full each day is, and nothing to
 * press on it. The list stays the place where a booking is moved or cancelled.
 */

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

// The seeded booking's day: pinned, so the month it falls in never moves.
const bookingDate = providerFor("publicManage").bookingDate!;
const [bookingYear, bookingMonth] = bookingDate.split("-").map(Number);

function monthHeading(page: Page) {
  return page.locator("#bookings-month-label");
}

/** Turns the month, a click at a time, to the one the seeded booking is in. */
async function openBookingMonth(page: Page) {
  const shown = new Date(`1 ${await monthHeading(page).innerText()}`);
  const turns = (bookingYear - shown.getFullYear()) * 12 + (bookingMonth - 1 - shown.getMonth());
  const turn = page.getByRole("button", { name: turns < 0 ? "Previous" : "Next", exact: true });

  for (let step = 0; step < Math.abs(turns); step += 1) {
    await turn.click();
  }
}

test.describe("bookings as a month", () => {
  test.use({ storageState: authStatePath("publicManage") });

  for (const width of WIDTHS) {
    test(`shows how full each day is at ${width.name} width`, async ({ page }) => {
      await page.setViewportSize({ width: width.width, height: width.height });
      await page.goto("/dashboard/bookings");

      // The list is what the section opens on.
      const layout = page.getByRole("radiogroup", { name: "Show as" });
      await expect(layout.getByRole("radio", { name: "List" })).toBeChecked();
      await expect(page.locator('main input[type="search"]')).toBeVisible();

      await layout.getByRole("radio", { name: "Month" }).click();
      const month = page.getByRole("table");
      await expect(month).toBeVisible();
      await expect(page.locator('main input[type="search"]')).toHaveCount(0);
      await expect(month.locator('td[aria-current="date"]')).toHaveCount(1);

      await openBookingMonth(page);
      await expect(monthHeading(page)).toHaveText("January 2027");
      await expect(page.locator("[data-month-total]")).toHaveText("1 appointment in January 2027");

      const day = month.locator(`td[data-date="${bookingDate}"]`);
      await expect(day).toHaveAttribute("data-level", "1");
      await expect(day.locator("[data-count]")).toBeVisible();
      await expect(day.locator("[data-count]")).toHaveText("1 appointment");
      // Every other day of the month is empty.
      await expect(month.locator("[data-count]")).toHaveCount(1);

      // For reading: no day can be pressed, and the page does not scroll sideways.
      await expect(month.locator("button, a")).toHaveCount(0);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      await page.getByRole("button", { name: "Today", exact: true }).click();
      await expect(month.locator('td[aria-current="date"]')).toHaveCount(1);

      await layout.getByRole("radio", { name: "List" }).click();
      await expect(page.locator('main input[type="search"]')).toBeVisible();
    });
  }
});
