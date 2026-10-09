import { expect, test, type Page } from "@playwright/test";

import { authStatePath } from "./fixtures/providers";

/**
 * Every dashboard section has its own URL, and moving between them is a
 * client-side history change: no document request, so it keeps working when
 * the connection drops and never discards unsaved edits.
 */

const SECTIONS: Array<{ path: string; heading: RegExp }> = [
  { path: "/dashboard", heading: /^(Overview|Resumen)$/ },
  { path: "/dashboard/bookings", heading: /^(Appointments|Bookings|Citas|Reservas)$/ },
  { path: "/dashboard/calendar", heading: /^(Calendar|Calendario)$/ },
  { path: "/dashboard/analytics", heading: /^(Analytics|Analítica|Estadísticas)$/ },
  { path: "/dashboard/services", heading: /services|servicios|specialties|especialidades|events|eventos/i },
  { path: "/dashboard/availability", heading: /^(Availability|Disponibilidad)$/ },
  { path: "/dashboard/appearance", heading: /^(Appearance|Apariencia)$/ },
  { path: "/dashboard/integrations", heading: /^(Integrations|Integraciones)$/ },
  { path: "/dashboard/settings", heading: /^(Settings|Ajustes)$/ },
];

function heading(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

function sidebarLink(page: Page, path: string) {
  return page.getByRole("navigation").locator(`a[href="${path}"]`).first();
}

test.describe("signed-in provider", () => {
  test.use({ storageState: authStatePath("billingPremium") });

  test("is sent from the landing page to the dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(heading(page)).toHaveText(SECTIONS[0].heading);
  });

  test("keeps legacy tab links working", async ({ page }) => {
    await page.goto("/?tab=analytics&checkout=cancelled");
    await expect(page).toHaveURL(/\/dashboard\/analytics\?checkout=cancelled$/);
  });

  for (const section of SECTIONS) {
    test(`opens ${section.path} directly and keeps it on refresh`, async ({ page }) => {
      await page.goto(section.path);
      await expect(heading(page)).toHaveText(section.heading);
      await expect(sidebarLink(page, section.path)).toHaveAttribute("aria-current", "page");

      await page.reload();
      await expect(heading(page)).toHaveText(section.heading);
    });
  }

  test("switches sections without loading a new document", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(heading(page)).toHaveText(SECTIONS[0].heading);

    const documentRequests: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "document") documentRequests.push(request.url());
    });

    await sidebarLink(page, "/dashboard/calendar").click();
    await expect(page).toHaveURL(/\/dashboard\/calendar$/);
    await expect(heading(page)).toHaveText(/^(Calendar|Calendario)$/);

    await sidebarLink(page, "/dashboard/settings").click();
    await expect(page).toHaveURL(/\/dashboard\/settings$/);
    await expect(heading(page)).toHaveText(/^(Settings|Ajustes)$/);

    expect(documentRequests).toEqual([]);
  });

  test("moves back and forward through visited sections", async ({ page }) => {
    await page.goto("/dashboard");
    await sidebarLink(page, "/dashboard/bookings").click();
    await expect(page).toHaveURL(/\/dashboard\/bookings$/);
    await sidebarLink(page, "/dashboard/services").click();
    await expect(page).toHaveURL(/\/dashboard\/services$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard\/bookings$/);
    await expect(sidebarLink(page, "/dashboard/bookings")).toHaveAttribute("aria-current", "page");

    await page.goForward();
    await expect(page).toHaveURL(/\/dashboard\/services$/);
  });

  test("keeps a section switch working offline", async ({ page, context }) => {
    await page.goto("/dashboard");
    await expect(heading(page)).toHaveText(SECTIONS[0].heading);

    await context.setOffline(true);
    await sidebarLink(page, "/dashboard/availability").click();
    await expect(heading(page)).toHaveText(/^(Availability|Disponibilidad)$/);
    await context.setOffline(false);
  });

  test("leaves the in-app booking flow when another section is chosen", async ({ page }) => {
    await page.goto("/dashboard/calendar");
    const openDay = page.locator("main button:not([disabled])").filter({ hasText: /^\d+/ }).first();
    await expect(openDay).toBeVisible();
    await openDay.click();
    await expect(page.getByRole("button", { name: /Back to workspace|Volver/ })).toBeVisible();

    await sidebarLink(page, "/dashboard/bookings").click();
    await expect(page).toHaveURL(/\/dashboard\/bookings$/);
    await expect(page.getByRole("button", { name: /Back to workspace|Volver/ })).toHaveCount(0);
    await expect(page.locator('main input[type="search"]')).toBeVisible();
  });

  test("keeps the account controls inside the sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard");

    const sidebar = page.locator("aside[data-shell-sidebar]");
    const signOut = sidebar.getByRole("button", { name: /Sign out|Cerrar sesión/ });
    const [sidebarBox, signOutBox] = await Promise.all([
      sidebar.boundingBox(),
      signOut.boundingBox(),
    ]);

    expect(sidebarBox && signOutBox).toBeTruthy();
    expect(signOutBox!.x + signOutBox!.width).toBeLessThanOrEqual(
      sidebarBox!.x + sidebarBox!.width,
    );
    expect(await sidebar.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  });

  test("answers an unknown section with not found", async ({ page }) => {
    const response = await page.goto("/dashboard/not-a-section");
    expect(response?.status()).toBe(404);
  });

  test("opens and closes the navigation drawer on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");

    const menu = page.getByRole("button", { name: /Open menu|Abrir menú/ });
    await menu.click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();

    await menu.click();
    await drawer.locator('a[href="/dashboard/calendar"]').click();
    await expect(page).toHaveURL(/\/dashboard\/calendar$/);
    await expect(drawer).toBeHidden();
  });

  test("keeps the drawer's close button on screen at the narrowest width", async ({ page }) => {
    // 320 CSS px is the WCAG reflow width (a 1280px window at 400% zoom).
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Open menu|Abrir menú/ }).click();

    const drawer = page.getByRole("dialog");
    // Measure once the slide-in animation has finished.
    await expect.poll(async () => (await drawer.boundingBox())?.x).toBe(0);
    const close = drawer.getByRole("button", { name: /Close menu|Cerrar menú/ });
    const box = await close.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  });
});

test.describe("signed-out visitor", () => {
  test("is asked to sign in and returned to the section", async ({ page }) => {
    await page.goto("/dashboard/bookings");
    await expect(page).toHaveURL(/\/login\?.*next=%2Fdashboard%2Fbookings/);
  });
});
