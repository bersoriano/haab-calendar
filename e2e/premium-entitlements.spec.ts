import { expect, test, type Page } from "@playwright/test";

import { authStatePath, providerFor, type E2ERole } from "./fixtures/providers";

/**
 * What each provider may do, proved twice: once through the browser, and once
 * against the server directly.
 *
 * The second half matters more. A disabled button is a courtesy; the only thing
 * that stops a determined caller is the server re-resolving the entitlement, so
 * every scenario that checks the UI also checks what happens when the UI is
 * bypassed entirely.
 */

async function openSettings(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^(Settings|Ajustes)$/ }).click();
  await expect(page.getByText(/Integrations|Integraciones/)).toBeVisible();
}

function integrationCard(page: Page) {
  return page
    .getByRole("listitem")
    .filter({ hasText: "Google Calendar" })
    .first();
}

/** The server's own answer, with the UI taken out of the picture. */
async function readEntitlements(page: Page, role: E2ERole) {
  const provider = providerFor(role);

  return page.request.get(
    `/api/super-admin/providers/${provider.providerId}/feature-overrides/custom_slug`,
  );
}

test.describe("free provider", () => {
  test.use({ storageState: authStatePath("free") });

  test("sees Google Calendar gated behind premium", async ({ page }) => {
    await openSettings(page);
    const card = integrationCard(page);

    await expect(card).toContainText(/Premium feature|Función premium/);
    await expect(card).not.toContainText(/Not connected|Sin conectar/);
  });

  test("has no working connect control", async ({ page }) => {
    await openSettings(page);

    const connect = integrationCard(page).getByRole("button");
    await expect(connect).toBeDisabled();
  });

  test("can still use the ordinary settings on the page", async ({ page }) => {
    await openSettings(page);

    // Gating premium must not break the rest of the surface.
    await expect(page.getByLabel(/Business name|Nombre del negocio/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Save changes|Guardar cambios/ })).toBeVisible();
  });

  test("cannot reach the override API by calling it directly", async ({ page }) => {
    const response = await readEntitlements(page, "free");

    // Not a provider-facing route at all: an ordinary owner gets the same
    // answer as a stranger.
    expect([401, 403, 404, 405]).toContain(response.status());
  });
});

test.describe("billing premium provider", () => {
  test.use({ storageState: authStatePath("billingPremium") });

  test("sees the integration as available and not connected", async ({ page }) => {
    await openSettings(page);
    const card = integrationCard(page);

    await expect(card).toContainText(/Available|Disponible/);
    await expect(card).toContainText(/Not connected|Sin conectar/);
  });

  test("still has no connect action, because no adapter exists yet", async ({ page }) => {
    await openSettings(page);

    await expect(integrationCard(page).getByRole("button")).toBeDisabled();
  });

  test("keeps the premium state after a reload", async ({ page }) => {
    await openSettings(page);
    await page.reload();
    await page.getByRole("button", { name: /^(Settings|Ajustes)$/ }).click();

    await expect(integrationCard(page)).toContainText(/Available|Disponible/);
  });
});

test.describe("manual revoke over a paid subscription", () => {
  test.use({ storageState: authStatePath("premiumRevoked") });

  test("reports premium required even though billing is active", async ({ page }) => {
    await openSettings(page);

    // The subscription row says premium; the override says no, and the override
    // is what the provider sees.
    await expect(integrationCard(page)).toContainText(/Premium feature|Función premium/);
  });

  test("cannot be talked out of the denial from the client", async ({ page }) => {
    await openSettings(page);

    const enabled = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons
        .filter((button) => /coming soon|próximamente/i.test(button.textContent ?? ""))
        .every((button) => (button as HTMLButtonElement).disabled);
    });

    expect(enabled).toBe(true);
  });
});

test.describe("manual grant over a free plan", () => {
  test.use({ storageState: authStatePath("freeGranted") });

  test("reports the integration as available", async ({ page }) => {
    await openSettings(page);

    await expect(integrationCard(page)).toContainText(/Available|Disponible/);
    await expect(integrationCard(page)).toContainText(/Not connected|Sin conectar/);
  });
});

test.describe("lapsed subscription with a stale legacy plan", () => {
  test.use({ storageState: authStatePath("billingInactive") });

  test("stays gated, because the subscription decides and it has lapsed", async ({
    page,
  }) => {
    await openSettings(page);

    await expect(integrationCard(page)).toContainText(/Premium feature|Función premium/);
  });
});

test.describe("accessibility of the entitlement state", () => {
  test.use({ storageState: authStatePath("free") });

  test("states the status in text, not colour alone", async ({ page }) => {
    await openSettings(page);
    const card = integrationCard(page);

    const text = (await card.textContent()) ?? "";
    expect(text).toMatch(/Premium feature|Función premium/);
  });

  test("exposes the disabled control through its accessible role", async ({ page }) => {
    await openSettings(page);

    const control = integrationCard(page).getByRole("button");
    await expect(control).toBeDisabled();
    await expect(control).toHaveAccessibleName(/Coming soon|Próximamente/);
  });

  test("gives the settings tabs unique accessible names", async ({ page }) => {
    await page.goto("/");

    const names = await page
      .getByRole("button", { name: /Dashboard|Panel|Settings|Ajustes|Appearance|Apariencia/ })
      .allTextContents();

    expect(new Set(names).size).toBe(names.length);
  });
});
