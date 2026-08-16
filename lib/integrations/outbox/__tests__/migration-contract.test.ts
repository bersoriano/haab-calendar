import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A static reading of the migration.
 *
 * This is not proof that the triggers fire, that SKIP LOCKED behaves, or that
 * RLS holds — only a live PostgreSQL can show that, and those checks are listed
 * as unverified until one is available. What these guard is the set of
 * decisions that would be easy to undo later without noticing: the privileges,
 * the security context of the one SECURITY DEFINER function, and the columns
 * that must never appear in a payload.
 */

const sql = readFileSync(
  join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "..",
    "supabase",
    "migrations",
    "20260816131850_add_integration_outbox.sql",
  ),
  "utf8",
);

describe("outbox migration", () => {
  it("keeps the table out of reach of anon and authenticated", () => {
    expect(sql).toContain("alter table public.integration_outbox_events enable row level security");
    expect(sql).toContain(
      "revoke all on table public.integration_outbox_events from public, anon, authenticated",
    );
    // No policies at all: RLS with none means no role reaches it through the
    // Data API, and the service role bypasses RLS.
    expect(sql).not.toMatch(/create policy[\s\S]*integration_outbox_events/);
  });

  it("gives the service role no delete, because the worker never removes rows", () => {
    expect(sql).toContain(
      "grant select, update on table public.integration_outbox_events to service_role",
    );
    expect(sql).not.toMatch(/grant[^;]*delete[^;]*integration_outbox_events/);
  });

  it("uses SECURITY DEFINER only for the enqueue trigger, and pins its search path", () => {
    const definerCount = (sql.match(/security definer/g) ?? []).length;
    expect(definerCount).toBe(1);

    const enqueue = sql.slice(
      sql.indexOf("create or replace function private.enqueue_booking_integration_event"),
      sql.indexOf("revoke all on function private.enqueue_booking_integration_event"),
    );
    expect(enqueue).toContain("security definer");
    expect(enqueue).toContain("set search_path = ''");
    // Fully qualified, and no dynamic SQL to qualify at runtime.
    expect(enqueue).toContain("insert into public.integration_outbox_events");
    expect(enqueue).not.toContain("execute format");
  });

  it("locks the worker RPCs to the service role", () => {
    for (const fn of [
      "claim_integration_outbox_events",
      "complete_integration_outbox_event",
      "skip_integration_outbox_event",
      "retry_integration_outbox_event",
      "dead_letter_integration_outbox_event",
    ]) {
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${fn}[\\s\\S]{0,120}from public, anon, authenticated`));
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${fn}[\\s\\S]{0,120}to service_role`));
    }
  });

  it("claims with SKIP LOCKED and per-booking ordering", () => {
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("earlier.aggregate_version < o.aggregate_version");
    expect(sql).toContain("earlier.status not in ('succeeded', 'skipped', 'dead_letter')");
  });

  it("matches every completion on the lease token", () => {
    const completions = sql.match(/and lease_token = p_lease_token/g) ?? [];
    // complete, skip, retry, dead_letter
    expect(completions).toHaveLength(4);
    expect((sql.match(/and status = 'processing'/g) ?? []).length).toBe(4);
  });

  it("puts no client data in the payload", () => {
    const payload = sql.slice(
      sql.indexOf("jsonb_build_object"),
      sql.indexOf("on conflict (booking_id, aggregate_version)"),
    );

    for (const forbidden of [
      "client_name",
      "client_email",
      "client_phone",
      "notes",
      "manage_token_hash",
      "details",
    ]) {
      expect(payload).not.toContain(forbidden);
    }
    expect(payload).toContain("'bookingId'");
    expect(payload).toContain("'providerId'");
  });

  it("does not backfill history", () => {
    expect(sql).not.toMatch(/insert into public\.integration_outbox_events[\s\S]{0,200}select[\s\S]{0,200}from public\.bookings/);
  });

  it("leaves booking_events untouched", () => {
    // The comment header explains why it stays separate; no statement touches it.
    const statements = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");

    expect(statements).not.toContain("booking_events");
  });
});
