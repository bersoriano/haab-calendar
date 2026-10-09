import { expect, test, type Page } from "@playwright/test";

import { authStatePath } from "./fixtures/providers";

/**
 * Edits that wait for "Save changes" live in one store shared by every
 * section, so they survive moving around the dashboard, and one bar saves
 * them from wherever the owner is.
 */

function saveBar(page: Page) {
  return page.getByRole("region", { name: /Unsaved changes|Cambios sin guardar/ });
}

function sidebarLink(page: Page, path: string) {
  return page.getByRole("navigation").locator(`a[href="${path}"]`).first();
}

test.describe("unsaved changes", () => {
  test.use({ storageState: authStatePath("billingPremium") });

  test("survive a section switch and save from another section", async ({ page }) => {
    const heroText = `Welcome ${Date.now()}`;

    await page.goto("/dashboard/appearance");
    const field = page.getByLabel(/Hero text|Texto principal/);
    await expect(field).toBeVisible();
    await expect(saveBar(page)).toBeHidden();

    await field.fill(heroText);
    await expect(saveBar(page)).toBeVisible();

    await sidebarLink(page, "/dashboard/bookings").click();
    await expect(page).toHaveURL(/\/dashboard\/bookings$/);
    await expect(saveBar(page)).toBeVisible();

    await sidebarLink(page, "/dashboard/appearance").click();
    await expect(page.getByLabel(/Hero text|Texto principal/)).toHaveValue(heroText);

    await saveBar(page).getByRole("button", { name: /Save changes|Guardar cambios/ }).click();
    await expect(saveBar(page)).toBeHidden();

    await page.reload();
    await expect(page.getByLabel(/Hero text|Texto principal/)).toHaveValue(heroText);
  });

  test("asks before a reload drops them", async ({ page }) => {
    await page.goto("/dashboard/appearance");
    const field = page.getByLabel(/Hero text|Texto principal/);
    await expect(field).toBeVisible();
    await field.fill(`Draft ${Date.now()}`);
    await expect(saveBar(page)).toBeVisible();

    const dialog = page.waitForEvent("dialog");
    // beforeunload only fires after the page has seen a user gesture.
    await page.mouse.click(5, 5);
    void page.reload().catch(() => undefined);
    const prompt = await dialog;

    expect(prompt.type()).toBe("beforeunload");
    await prompt.dismiss();
  });
});

test.describe("custom booking link", () => {
  test.use({ storageState: authStatePath("freeGranted") });

  test("saves through its own button without leaving an unsaved change behind", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");
    const slug = page.locator('input[name="publicSlug"]');
    await expect(slug).toBeVisible();

    await slug.fill(`granted-${Date.now()}`);
    await page.getByRole("button", { name: /Save URL|Guardar URL|Guardar enlace/ }).click();

    await expect(page.getByRole("button", { name: /Save URL|Guardar URL|Guardar enlace/ })).toBeDisabled();
    await expect(saveBar(page)).toBeHidden();
  });
});
