import { expect, test, type Page } from "@playwright/test";

import { authStatePath } from "./fixtures/providers";

/**
 * Changing a published page's business type: stopped by upcoming bookings,
 * harmless to abandon, and — once published — a single swap that moves the
 * page and leaves the old link redirecting.
 *
 * The switching provider alternates between Healthcare and Spaces, and every
 * path is read from the page, so the suite can run again against the same
 * database.
 */

type Target = { id: "healthcare" | "spaces"; label: string; segment: string };

const SPACES: Target = { id: "spaces", label: "Spaces", segment: "spaces" };
const HEALTHCARE: Target = { id: "healthcare", label: "Healthcare", segment: "doctors" };

async function livePublicPath(page: Page) {
  const href = await page.getByRole("link", { name: /^View page$/ }).first().getAttribute("href");
  expect(href).toBeTruthy();
  return href as string;
}

function otherType(publicPath: string): Target {
  return publicPath.startsWith("/spaces/") ? HEALTHCARE : SPACES;
}

async function openChangeDialog(page: Page) {
  await page.getByRole("navigation").locator('a[href="/dashboard/settings"]').first().click();
  await page.getByRole("button", { name: /Change business type|Cambiar tipo de negocio/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function startDraft(page: Page, target: Target) {
  const dialog = await openChangeDialog(page);
  await dialog.getByRole("button", { name: new RegExp(`^${target.label}`) }).click();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: /^Continue$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/business-type\\?to=${target.id}$`));
}

test.describe("a provider with an upcoming booking", () => {
  test.use({ storageState: authStatePath("businessTypeBlocked") });

  test("is asked to handle it before choosing a new type", async ({ page }) => {
    await page.goto("/dashboard");
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

  test("can abandon the change without touching the live page", async ({ page }) => {
    await page.goto("/dashboard");
    const before = await livePublicPath(page);

    await startDraft(page, otherType(before));
    await expect(page.getByText(/Setting up your (Spaces|Healthcare) page/)).toBeVisible();

    await page.getByRole("button", { name: /Cancel change/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings$/);
    expect(await livePublicPath(page)).toBe(before);
    expect((await page.request.get(before)).status()).toBe(200);
  });

  test("replaces the page in one step, keeping the old link and unsaved edits", async ({
    page,
  }) => {
    await page.goto("/dashboard/appearance");
    const before = await livePublicPath(page);
    const target = otherType(before);

    // An edit not yet saved on the live dashboard. The draft starts from it,
    // so the switch carries it and the reload must not stop to ask.
    await page.getByLabel(/Hero text|Texto principal/).fill(`Welcome ${Date.now()}`);
    await expect(page.getByRole("region", { name: /Unsaved changes/ })).toBeVisible();

    let sawLeavePrompt = false;
    page.on("dialog", (dialog) => {
      sawLeavePrompt = true;
      void dialog.dismiss();
    });

    await startDraft(page, target);
    const next = page.getByRole("button", { name: /^Continue$/ });
    await next.click();
    await next.click();
    await page.getByRole("button", { name: /^Replace and publish$/ }).click();

    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: /^Replace and publish$/ }).click();

    await expect(page).toHaveURL(new RegExp(`/dashboard\\?switched=${target.id}$`), {
      timeout: 30_000,
    });
    expect(sawLeavePrompt).toBe(false);
    await expect(page.getByText(new RegExp(`Your page is now a ${target.label} page`))).toBeVisible();

    await page.goto(before);
    await expect(page).toHaveURL(new RegExp(`/${target.segment}/`));
  });
});
