import { expect, test } from "@playwright/test";

import { authStatePath } from "./fixtures/providers";

/**
 * Destructive set-up actions ask first. Uses the bookingActions provider,
 * whose extra service is added and removed here and read by nothing else.
 */
test.describe("services", () => {
  test.use({ storageState: authStatePath("bookingActions") });

  test("deleting a service asks first, and keeping it changes nothing", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard/services");

    const name = `Temporary ${Date.now()}`;
    const editor = page.locator("#service-editor");
    await page.locator("#service-editor-name").fill(name);
    // Without a description the save is refused, and the dashboard says why.
    await editor.getByRole("button", { name: /^Add/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: /description/ })).toBeVisible();
    await editor.getByLabel("Description").fill("A short test visit.");
    await editor.getByRole("button", { name: /^Add/ }).click();
    const row = page.getByRole("listitem").filter({ hasText: name });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Delete", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(name);
    await dialog.getByRole("button", { name: "Keep", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);
  });
});
