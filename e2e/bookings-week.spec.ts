import { expect, test, type Page } from "@playwright/test";

import { authStatePath, providerFor } from "./fixtures/providers";

/**
 * The bookings as a week: every booking of each day, and nothing to press on
 * them. The list stays the place where a booking is moved or cancelled.
 */

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

// The seeded booking's day: pinned, so the week it falls in never moves.
const bookingDate = providerFor("publicManage").bookingDate!;
const DAY = 86_400_000;

function utc(dateKey: string) {
  return Date.parse(`${dateKey}T00:00:00Z`);
}

function week(page: Page) {
  return page.locator("ol[data-week-start]");
}

/** Turns the week, a click at a time, to the one the seeded booking is in. */
async function openBookingWeek(page: Page) {
  const shown = await week(page).getAttribute("data-week-start");
  const turns = Math.floor((utc(bookingDate) - utc(shown!)) / (7 * DAY));
  const turn = page.getByRole("button", { name: turns < 0 ? "Previous" : "Next", exact: true });

  for (let step = 0; step < Math.abs(turns); step += 1) {
    await turn.click();
  }
}

test.describe("bookings as a week", () => {
  test.use({ storageState: authStatePath("publicManage") });

  for (const width of WIDTHS) {
    test(`shows each day's bookings at ${width.name} width`, async ({ page }) => {
      await page.setViewportSize({ width: width.width, height: width.height });
      await page.goto("/dashboard/bookings");

      const layout = page.getByRole("radiogroup", { name: "Show as" });
      await expect(layout.getByRole("radio")).toHaveText(["List", "Week", "Month"]);

      await layout.getByRole("radio", { name: "Week" }).click();
      await expect(week(page)).toBeVisible();
      await expect(page.locator('main input[type="search"]')).toHaveCount(0);
      await expect(week(page).locator("li[data-date]")).toHaveCount(7);
      await expect(week(page).locator('li[aria-current="date"]')).toHaveCount(1);

      await openBookingWeek(page);
      // January 15, 2027 is a Friday, in the week that starts on Sunday the 10th.
      await expect(week(page)).toHaveAttribute("data-week-start", "2027-01-10");
      await expect(page.locator("#bookings-week-label")).toHaveText(/^Jan 10\s–\s16, 2027$/);
      await expect(page.locator("[data-week-total]")).toHaveText("1 appointment in the week of Jan 10");

      const day = week(page).locator(`li[data-date="${bookingDate}"]`);
      await expect(day.locator("[data-count]")).toHaveText("1 appointment");
      // Stacked days have room for when a booking ends; columns say when it starts.
      await expect(
        day.getByText(width.name === "phone" ? "10:00 – 10:30 AM" : "10:00 AM", { exact: true }),
      ).toBeVisible();
      await expect(day.getByText("E2E Client")).toBeVisible();
      await expect(day.getByText("Consultation")).toBeVisible();
      // Every other day of the week is free.
      await expect(week(page).getByText("Nothing booked")).toHaveCount(6);

      // For reading: no booking can be pressed, and the page does not scroll sideways.
      await expect(week(page).locator("button, a")).toHaveCount(0);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      await page.getByRole("button", { name: "Today", exact: true }).click();
      await expect(week(page).locator('li[aria-current="date"]')).toHaveCount(1);

      await layout.getByRole("radio", { name: "List" }).click();
      await expect(page.locator('main input[type="search"]')).toBeVisible();
    });
  }
});
