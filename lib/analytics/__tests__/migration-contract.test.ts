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
