import { expect, test } from "@playwright/test";

/**
 * The wizard's progress steps at the widths where the connected layout first
 * appears, in the language with the longest labels.
 */
for (const width of [640, 768]) {
  test(`the Spanish progress steps fit without sideways scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?lang=es");
    await page.getByRole("button", { name: "Empezar con salud" }).first().click();

    await expect(page.getByRole("navigation", { name: "Progreso de la configuración" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
