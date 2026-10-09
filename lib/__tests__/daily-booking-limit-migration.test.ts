import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(import.meta.dirname, "..", "..", "supabase", "migrations", "20261010200000_add_daily_booking_limit.sql"),
  "utf8",
);

describe("daily booking limit migration", () => {
  it("is off unless a provider sets it, and bounded when they do", () => {
    expect(sql).toContain("add column if not exists max_bookings_per_day integer");
    expect(sql).not.toMatch(/max_bookings_per_day integer[^,;]*default/);
    expect(sql).toContain("max_bookings_per_day between 1 and 500");
  });

  it("lets owners edit it and the public page read it", () => {
    expect(sql).toContain("grant update (max_bookings_per_day) on table public.providers to authenticated");
    expect(sql).toContain("grant select (max_bookings_per_day) on table public.providers to anon");
    expect(sql).toMatch(/p\.public_theme,\s+p\.max_bookings_per_day\s+from public\.providers p/);
  });

  it("serialises racing confirmations and raises the token the app maps", () => {
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("HAAB_DAILY_LIMIT");
    expect(sql).toContain("before insert or update of date, status on public.bookings");
    expect(sql).toContain("set search_path = ''");
  });
});
