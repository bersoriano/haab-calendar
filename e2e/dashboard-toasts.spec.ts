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
    await page.getByRole("button", { name: /Copy link|Copiar enlace/ }).click();
    await expect(
      page.getByRole("status").filter({ hasText: /Booking link copied|Enlace de reservas copiado/ }),
    ).toBeVisible();
  });

  test("every save is confirmed, including the same message twice", async ({ page }) => {
    await page.goto("/dashboard/appearance");
    const field = page.getByLabel(/Hero text|Texto principal/);
    await expect(field).toBeVisible();
    const saved = page.getByRole("status").getByText(/^(Saved\.|Guardado\.)$/);

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
});
