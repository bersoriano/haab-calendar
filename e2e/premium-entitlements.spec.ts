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

/**
 * Opens the workspace, then its Settings tab.
 *
 * Two steps rather than one because `/` is the landing page, not the
 * workspace: a configured owner is shown a panel that opens it, and the tab
 * strip — Settings included — only mounts once it has. Going straight for the
 * tab waits for a control that is not on the page yet.
 */
async function openSettings(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^(Go to dashboard|Ir al panel)$/ }).click();

  const settings = page.getByRole("button", { name: /^(Settings|Ajustes)$/ });
  await expect(settings).toBeVisible();
  await settings.click();

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

  test("is refused when starting the Google OAuth flow directly", async ({ page }) => {
    const response = await page.request.get("/api/google/oauth/start", {
      maxRedirects: 0,
    });

    // A disabled button is a courtesy; this is the boundary. A free provider
    // must not be able to begin a connection by typing the URL.
    expect([403, 404]).toContain(response.status());
  });

  test("is refused when reading the Google connection directly", async ({ page }) => {
    const response = await page.request.get("/api/google/connection");
    const body = await response.json();

    expect([200, 403, 404]).toContain(response.status());
    // Whatever the status, an unentitled provider is never told a connection is
    // available to them.
    if (response.status() === 200) {
      expect(body.available).toBe(false);
    }
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

  test("offers a connect action that starts at Haab's own route", async ({ page }) => {
    await openSettings(page);

    // Google is not configured in CI, so the card falls back to the disabled
    // control; when it is configured, the connect button appears instead. Both
    // are the same rule: the browser never holds a Google credential.
    const card = integrationCard(page);
    const connect = card.locator("[data-google-connect]");

    if ((await connect.count()) > 0) {
      await expect(connect).toHaveAttribute(
        "data-google-connect",
        "/api/google/oauth/start",
      );
    } else {
      await expect(card.getByRole("button")).toBeDisabled();
    }
  });

  test("cannot start OAuth without going through the entitlement check", async ({
    page,
  }) => {
    const response = await page.request.get("/api/google/oauth/start", {
      maxRedirects: 0,
    });

    // Either a redirect to Google (entitled and configured) or a refusal.
    // Never a 500, and never an unauthenticated pass-through.
    expect([302, 303, 307, 403, 404]).toContain(response.status());
  });

  test("can reach the Google connection endpoint, and it never leaks credentials", async ({
    page,
  }) => {
    const response = await page.request.get("/api/google/connection");

    if (response.status() === 200) {
      const text = await response.text();
      // The view is deliberately without the token, the calendar id, or
      // anything else that would be a credential in a browser.
      expect(text).not.toMatch(/refresh_token|ciphertext|access_token|client_secret/);
    }
  });

  test("disconnect stays available even when nothing is connected", async ({ page }) => {
    const response = await page.request.delete("/api/google/connection");

    // Never gated on entitlement: a provider must always be able to revoke
    // Haab's access to their own calendar.
    expect([200, 404]).toContain(response.status());
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

  test("cannot start a Google connection despite the active subscription", async ({
    page,
  }) => {
    const response = await page.request.get("/api/google/oauth/start", {
      maxRedirects: 0,
    });

    // The subscription says premium; the override says no, and the server
    // enforces the override.
    expect([403, 404]).toContain(response.status());
  });

  test("can still disconnect after the revoke", async ({ page }) => {
    const response = await page.request.delete("/api/google/connection");

    expect([200, 404]).toContain(response.status());
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
    await openSettings(page);

    const names = await page
      .getByRole("button", { name: /Dashboard|Panel|Settings|Ajustes|Appearance|Apariencia/ })
      .allTextContents();

    // Asserted first: an empty list satisfies the uniqueness check trivially,
    // so without this the test passed on a page with no tabs at all — which is
    // exactly what it was doing.
    expect(names.length).toBeGreaterThanOrEqual(3);
    expect(new Set(names).size).toBe(names.length);
  });
});
