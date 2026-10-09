import { expect, test, type Page } from "@playwright/test";

import { authStatePath, providerFor } from "./fixtures/providers";

/**
 * Changing a published page's business type: stopped by upcoming bookings,
 * harmless to abandon, and — once published — a single swap that moves the
 * page and leaves the old link redirecting.
 */

async function openChangeDialog(page: Page) {
  await page.goto("/dashboard/settings");
  await page.getByRole("button", { name: /Change business type|Cambiar tipo de negocio/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function chooseSpaces(page: Page) {
  const dialog = await openChangeDialog(page);
  await dialog.getByRole("button", { name: /^Spaces/ }).click();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: /^Continue$/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/business-type\?to=spaces$/);
}

test.describe("a provider with an upcoming booking", () => {
  test.use({ storageState: authStatePath("businessTypeBlocked") });

  test("is asked to handle it before choosing a new type", async ({ page }) => {
    const dialog = await openChangeDialog(page);

    await expect(dialog).toContainText(/Handle upcoming bookings first/);
    await expect(dialog).toContainText("E2E Client");
    await expect(dialog.getByRole("button", { name: /^Continue$/ })).toHaveCount(0);

    await dialog.getByRole("button", { name: /Go to bookings/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/bookings$/);
  });
});

test.describe.serial("a provider changing business type", () => {
  test.use({ storageState: authStatePath("businessTypeSwitch") });
  const slug = providerFor("businessTypeSwitch").slug;

  test("can abandon the change without touching the live page", async ({ page }) => {
    await chooseSpaces(page);
    await expect(page.getByText(/Setting up your Spaces page/)).toBeVisible();

    await page.getByRole("button", { name: /Cancel change/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings$/);
    await expect(page.getByText("Healthcare", { exact: true })).toBeVisible();

    const response = await page.request.get(`/doctors/${slug}`);
    expect(response.status()).toBe(200);
  });

  test("replaces the page in one step and keeps the old link working", async ({ page }) => {
    await chooseSpaces(page);

    // The wizard opens on the carried-over profile and the Spaces starter setup.
    const next = page.getByRole("button", { name: /^Continue$/ });
    await next.click();
    await next.click();
    await page.getByRole("button", { name: /^Replace and publish$/ }).click();

    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: /^Replace and publish$/ }).click();

    await expect(page).toHaveURL(/\/dashboard\?switched=spaces$/, { timeout: 30_000 });
    await expect(page.getByText(/Your page is now a Spaces page/)).toBeVisible();

    await page.goto(`/doctors/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/spaces/${slug}$`));
  });
});
