import { expect, test } from "@playwright/test";

import { authStatePath } from "./fixtures/providers";

/**
 * Transient confirmations go to one live region instead of inline banners:
 * copying the booking link and every finished save each announce themselves.
 */
test.describe("dashboard toasts", () => {
  test.use({ storageState: authStatePath("billingPremium") });

  test("copying the booking link confirms with a toast", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/dashboard");
    // The top bar's copy button; Overview has a second one in its booking card.
    await page.locator("header").getByRole("button", { name: /Copy link|Copiar enlace/ }).click();
    await expect(
      page.getByRole("status").filter({ hasText: /Booking link copied|Enlace de reservas copiado/ }),
    ).toBeVisible();
  });

  test("copying from the overview's booking page card confirms with a toast", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/dashboard");
    await page.locator("main").getByRole("button", { name: /^(Copy link|Copiar enlace)$/ }).click();
    await expect(
      page.getByRole("status").filter({ hasText: /Booking link copied|Enlace de reservas copiado/ }),
    ).toBeVisible();
  });

  test("every save is confirmed, including the same message twice", async ({ page }) => {
    await page.goto("/dashboard/appearance");
    const field = page.getByLabel(/Hero text|Texto principal/);
    await expect(field).toBeVisible();
    const saved = page.getByRole("status").getByText(/^(Changes saved|Cambios guardados)$/);

    for (const suffix of ["A", "B"]) {
      await field.fill(`Welcome ${Date.now()} ${suffix}`);
      await page.getByRole("button", { name: /Save changes|Guardar cambios/ }).click();
      await expect(saved.first()).toBeVisible();
      // The toast lands where the save bar was, under the pointer, and a
      // hovered toast waits on purpose. Move away so it can time out.
      await page.mouse.move(0, 0);
      await expect(saved).toHaveCount(0, { timeout: 8_000 });
    }
  });

  test("a toast with keyboard focus waits, and dismissing it returns focus", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/dashboard");
    const copy = page.locator("header").getByRole("button", { name: /Copy link|Copiar enlace/ });
    await copy.click();

    const toast = page.getByRole("status").filter({ hasText: /Booking link copied|Enlace de reservas copiado/ });
    const dismiss = toast.getByRole("button", { name: /Dismiss notification|Cerrar aviso/ });
    await dismiss.focus();
    await page.mouse.move(0, 0);

    // Past the 4s timeout: focus inside keeps it open even with the mouse away.
    await page.waitForTimeout(5_000);
    await expect(dismiss).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(dismiss).toHaveCount(0);
    await expect(copy).toBeFocused();
  });

  test("toasts follow a dashboard-language switch made mid-session", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/dashboard/settings");
    // Not saved: the switch lives in this tab's store only.
    await page.getByRole("radio", { name: "Español" }).click();

    await page.locator("header").getByRole("button", { name: "Copiar enlace" }).click();
    const toast = page.getByRole("status").filter({ hasText: "Enlace de reservas copiado" });
    await expect(toast.getByRole("button", { name: "Cerrar aviso" })).toBeVisible();
  });
});

test.describe("booking actions", () => {
  test.use({ storageState: authStatePath("bookingActions") });

  test("reschedule and cancel confirm with a toast once the dialog has closed", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard/bookings");

    await page.getByRole("button", { name: "Reschedule", exact: true }).first().click();
    let dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The last open day in the window — well clear of "today" in any time
    // zone — then its first free slot.
    await dialog.locator("button[data-date]:not([disabled])[aria-pressed=\"false\"]").last().click();
    await dialog.getByRole("button", { name: /^\d{1,2}:\d{2} (AM|PM)$/ }).first().click();
    await dialog.getByRole("button", { name: "Save new time" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status").getByText("New time saved")).toBeVisible();

    await page.getByRole("button", { name: "Cancel", exact: true }).first().click();
    dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: /^Keep / })).toBeVisible();
    await dialog.getByRole("button", { name: "Confirm cancellation" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("status").getByText("Cancellation saved")).toBeVisible();
    // A cancelled booking offers no more actions.
    await expect(page.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
  });
});

