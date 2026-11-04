import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { localAdminClient } from "./fixtures/local-supabase";
import { authStatePath, providerFor } from "./fixtures/providers";

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 720 },
] as const;

test.use({ storageState: authStatePath("free") });

for (const width of WIDTHS) {
  test(`a booking becomes a client who can be downloaded and deleted at ${width.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: width.width, height: width.height });

    const seed = providerFor("free");
    const admin = localAdminClient();
    const id = crypto.randomUUID();
    const email = `client-${width.name}-${id}@example.invalid`;
    const name = `Ana Peña ${width.name}`;

    const { error } = await admin.from("bookings").insert({
      id,
      provider_id: seed.providerId,
      service_name: "Clients e2e",
      booking_type: "full-day",
      client_name: name,
      client_email: email,
      client_phone: "+52 55 1234 5678",
      date: "2031-01-15",
      status: "confirmed",
      manage_token_hash: id,
      confirmation_number: id,
      idempotency_key: id,
    });
    if (error) throw error;

    try {
      // Purged bookings are the point of the list: the record must outlive this.
      const { error: deleteError } = await admin.from("bookings").delete().eq("id", id);
      if (deleteError) throw deleteError;

      await page.goto("/dashboard/clients");
      await expect(page.getByText(email)).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: /^(Download CSV|Descargar CSV)$/ }).click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/^(clients|clientes)-\d{4}-\d{2}-\d{2}\.csv$/);

      const csv = await readFile(await download.path(), "utf8");
      expect(csv).toContain(`${name},${email},+52 55 1234 5678,`);

      await page.getByRole("button", { name: new RegExp(`^(Delete|Eliminar a) ${name}$`) }).click();
      await page.getByRole("dialog").getByRole("button", { name: /^(Delete|Eliminar)$/ }).click();
      await expect(page.getByText(email)).toHaveCount(0);

      const { count } = await admin
        .from("provider_clients")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", seed.providerId)
        .eq("email_key", email);
      expect(count).toBe(0);
    } finally {
      await admin.from("bookings").delete().eq("id", id);
      await admin.from("provider_clients").delete().eq("provider_id", seed.providerId).eq("email_key", email);
    }
  });
}
