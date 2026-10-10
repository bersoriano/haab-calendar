import { expect, test, type Page } from "@playwright/test";

import { authStatePath, providerFor } from "./fixtures/providers";

/**
 * What an operator does on the accounts page, against one account seeded for
 * it. Every change made here is undone before the test ends, and a reseed
 * resets the rest.
 */
const target = providerFor("superAdminTarget");

test.use({ storageState: authStatePath("superAdmin") });

async function openAccounts(page: Page) {
  await page.goto(`/super-admin/accounts?q=${encodeURIComponent(target.email)}`);
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
}

/** The table row: the default viewport is wide enough for the table layout. */
function targetRow(page: Page) {
  return page.getByRole("row").filter({ hasText: target.email });
}

function toast(page: Page, text: string) {
  return page.getByRole("status").filter({ hasText: text });
}

test("disabling publishing asks first, and enabling does not", async ({ page }) => {
  await openAccounts(page);
  const row = targetRow(page);
  await expect(row).toContainText("Enabled");

  await row.getByRole("button", { name: "Disable publishing" }).click();
  const confirm = page.getByRole("dialog", { name: "Disable publishing?" });
  await expect(confirm).toContainText(
    `Disable all public URLs and booking actions for ${target.email}?`,
  );

  // Cancel changes nothing.
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toBeHidden();
  await expect(row).toContainText("Enabled");

  await row.getByRole("button", { name: "Disable publishing" }).click();
  await confirm.getByRole("button", { name: "Disable publishing" }).click();
  await expect(confirm).toBeHidden();
  await expect(toast(page, "Publication disabled.")).toBeVisible();
  await expect(row).toContainText("Disabled");

  await row.getByRole("button", { name: "Enable publishing" }).click();
  await expect(toast(page, "Publication enabled.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("Enabled");
});

test("the Features dialog grants a feature and clears the override", async ({ page }) => {
  await openAccounts(page);
  const row = targetRow(page);
  await expect(row).toContainText("0 of 6 enabled");

  await row.getByRole("button", { name: `Features for ${target.email}` }).click();
  const dialog = page.getByRole("dialog", { name: "Premium access" });
  const slug = dialog.getByRole("listitem").filter({ hasText: "Custom URL slug" });
  await expect(slug.getByText("Off", { exact: true })).toBeVisible();

  await slug.getByRole("button", { name: "Change access" }).click();
  await dialog.getByLabel("Reason").fill("E2E: grant for the super-admin spec");
  await slug.getByRole("button", { name: "Grant" }).click();
  await expect(dialog.getByRole("status")).toContainText("Feature granted.");
  await expect(slug.getByText("On", { exact: true })).toBeVisible();
  await expect(slug.getByText("Override", { exact: true })).toBeVisible();

  // The row reports what the server returned, not what was clicked.
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toContainText("1 of 6 enabled");

  await row.getByRole("button", { name: `Features for ${target.email}` }).click();
  await slug.getByRole("button", { name: "Change access" }).click();
  await dialog.getByLabel("Reason").fill("E2E: undo the grant");
  await slug.getByRole("button", { name: "Clear override" }).click();
  await expect(dialog.getByRole("status")).toContainText("Override cleared.");
  await expect(slug.getByText("Override", { exact: true })).toHaveCount(0);
  await expect(slug.getByText("Off", { exact: true })).toBeVisible();
});

test("deleting an account stays locked until its email is typed", async ({ page }) => {
  await openAccounts(page);
  const row = targetRow(page);

  await row.getByRole("button", { name: "Delete account" }).click();
  const dialog = page.getByRole("dialog", { name: `Delete ${target.email} permanently?` });
  const confirm = dialog.getByRole("button", { name: "Delete permanently" });
  const typed = dialog.getByLabel(`Type ${target.email} to confirm`);

  await expect(typed).toBeFocused();
  await expect(confirm).toBeDisabled();
  await typed.fill("someone-else@example.invalid");
  await expect(confirm).toBeDisabled();
  // Case and surrounding spaces do not matter.
  await typed.fill(` ${target.email.toUpperCase()} `);
  await expect(confirm).toBeEnabled();

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();
  // Focus goes back to the button that opened the dialog.
  await expect(row.getByRole("button", { name: "Delete account" })).toBeFocused();
});

test("the publishing filter follows the link and writes back to it", async ({ page }) => {
  await page.goto("/super-admin/accounts?status=disabled");

  await expect(page.getByRole("radio", { name: /^Publishing off/ })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("radio", { name: /^All/ }).click();
  await expect(page).toHaveURL(/\/super-admin\/accounts$/);
  await expect(page.getByRole("radio", { name: /^All/ })).toHaveAttribute("aria-checked", "true");
});

test("accounts stack as cards on a phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAccounts(page);

  await expect(page.getByRole("table")).toBeHidden();
  const card = page.getByRole("listitem").filter({ hasText: target.email });
  await expect(card.getByRole("button", { name: "Disable publishing" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the overview links each count to its accounts", async ({ page }) => {
  await page.goto("/super-admin");

  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await page.getByRole("link", { name: "View all Publishing off" }).click();
  await expect(page).toHaveURL(/\/super-admin\/accounts\?status=disabled$/);
  await expect(page.getByRole("radio", { name: /^Publishing off/ })).toHaveAttribute("aria-checked", "true");
});
