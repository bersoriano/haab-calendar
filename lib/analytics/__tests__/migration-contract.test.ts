import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PUBLIC_PAGE_EVENTS } from "@/lib/analytics/events";

/**
 * A static reading of the analytics migration: the privileges and privacy
 * decisions that would be easy to loosen later without noticing.
 */

const sql = readFileSync(
  join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "supabase",
    "migrations",
    "20261008120000_add_public_page_analytics.sql",
  ),
  "utf8",
);

describe("public page analytics migration", () => {
  it("keeps events out of reach of anon and authenticated", () => {
    expect(sql).toContain("alter table public.public_page_events enable row level security");
    expect(sql).toContain(
      "revoke all on table public.public_page_events from public, anon, authenticated",
    );
    expect(sql).not.toMatch(/create policy[\s\S]*public_page_events/);
  });

  it("lets only the service role run the summary", () => {
    expect(sql).toMatch(
      /revoke all on function public\.provider_analytics_summary\([^)]*\)\s+from public, anon, authenticated/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.provider_analytics_summary\([^)]*\)\s+to service_role/,
    );
    expect(sql).not.toContain("security definer");
  });

  it("stores no raw ip or user agent", () => {
    expect(sql).not.toMatch(/\b(ip_address|user_agent|ip)\s+(text|inet)/);
  });

  it("allows exactly the events the app sends", () => {
    for (const event of PUBLIC_PAGE_EVENTS) {
      expect(sql).toContain(`'${event}'`);
    }
  });

  it("purges old events on a schedule", () => {
    expect(sql).toContain("'purge-public-page-events'");
    expect(sql).toContain("interval '13 months'");
  });
});

describe("server-side booking events migration", () => {
  const bookingSql = readFileSync(
    join(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "supabase",
      "migrations",
      "20261009120000_record_booking_events_server_side.sql",
    ),
    "utf8",
  );

  it("counts each booking once, with a full unique index the insert can rely on", () => {
    expect(bookingSql).toMatch(/create unique index[^;]*on public\.public_page_events\(booking_id\);/);
  });

  it("keeps the conversion when a booking is deleted", () => {
    expect(bookingSql).toContain("references public.bookings(id) on delete set null");
  });
});

describe("trustworthy booking analytics migration", () => {
  const trustSql = readFileSync(
    join(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "supabase",
      "migrations",
      "20261009150000_trustworthy_booking_analytics.sql",
    ),
    "utf8",
  );

  it("counts only bookings that were not cancelled, and reports the cancelled ones", () => {
    expect(trustSql).toContain("bk.status is distinct from 'cancelled' as booking_live");
    expect(trustSql).toContain("'cancelledBookings'");
    expect(trustSql).not.toMatch(/filter \(where s?\.?event = 'booking_confirmed'\)/);
  });

  it("keeps the summary service-role only after replacing it", () => {
    expect(trustSql).toMatch(
      /grant execute on function public\.provider_analytics_summary\(uuid, integer, text\)\s+to service_role/,
    );
    expect(trustSql).not.toContain("security definer");
  });
});

describe("network rate-limit migration", () => {
  const networkSql = readFileSync(
    join(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "supabase",
      "migrations",
      "20261010120000_add_network_rate_limit_key.sql",
    ),
    "utf8",
  );

  it("stores only a hash shaped key, indexed for the hourly count", () => {
    expect(networkSql).toContain("network_hash ~ '^[0-9a-f]{64}$'");
    expect(networkSql).toMatch(/on public\.public_page_events\(provider_id, network_hash, occurred_at desc\)/);
    expect(networkSql).not.toMatch(/\b(ip|ip_address)\s+(text|inet)/);
  });
});

describe("booking insights migration", () => {
  const insightsSql = readFileSync(
    join(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "supabase",
      "migrations",
      "20261010150000_add_booking_insights_to_summary.sql",
    ),
    "utf8",
  );

  it("adds previous totals, booking health and popular times", () => {
    for (const key of ["'previousTotals'", "'bookingHealth'", "'popularTimes'"]) {
      expect(insightsSql).toContain(key);
    }
  });

  it("keeps cancelled bookings out of popular times and conversions", () => {
    expect(insightsSql).toContain("where c.status <> 'cancelled' and c.start_time is not null");
    expect(insightsSql).toContain("bk.status is distinct from 'cancelled' as booking_live");
  });

  it("keeps the summary service-role only", () => {
    expect(insightsSql).toMatch(
      /grant execute on function public\.provider_analytics_summary\(uuid, integer, text\)\s+to service_role/,
    );
    expect(insightsSql).not.toContain("security definer");
  });
});
