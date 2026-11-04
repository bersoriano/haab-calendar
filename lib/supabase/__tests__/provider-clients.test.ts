import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { listProviderClients } from "@/lib/supabase/provider-clients";

function row(id: string, lastBookedAt: string) {
  return {
    id,
    client_name: `Client ${id}`,
    client_email: `${id}@example.com`,
    client_phone: "",
    first_booked_at: lastBookedAt,
    last_booked_at: lastBookedAt,
    booking_count: 1,
  };
}

/** Serves `all` in id order, `limit` at a time, as PostgREST would. */
function fakeClient(all: ReturnType<typeof row>[]) {
  const gtCalls: string[] = [];
  const from = () => {
    let after = "";
    let limit = 0;
    const query = {
      select: () => query,
      eq: () => query,
      order: () => query,
      limit: (value: number) => {
        limit = value;
        return query;
      },
      gt: (_column: string, value: string) => {
        after = value;
        gtCalls.push(value);
        return query;
      },
      returns: async () => ({
        data: all.filter((item) => item.id > after).slice(0, limit),
        error: null,
      }),
    };
    return query;
  };
  return { client: { from } as unknown as SupabaseClient, gtCalls };
}

describe("listProviderClients", () => {
  it("reads past the 1000-row page limit without losing or repeating anyone", async () => {
    const all = Array.from({ length: 2500 }, (_, index) =>
      row(String(index).padStart(5, "0"), "2026-01-01T00:00:00.000Z"),
    );
    const { client, gtCalls } = fakeClient(all);

    const clients = await listProviderClients(client, "provider-1");

    expect(clients).toHaveLength(2500);
    expect(new Set(clients.map((item) => item.id)).size).toBe(2500);
    expect(gtCalls).toHaveLength(2);
  });

  it("stops after an exact page rather than failing on an empty one", async () => {
    const all = Array.from({ length: 1000 }, (_, index) =>
      row(String(index).padStart(5, "0"), "2026-01-01T00:00:00.000Z"),
    );

    expect(await listProviderClients(fakeClient(all).client, "provider-1")).toHaveLength(1000);
  });

  it("puts the most recent booking first", async () => {
    const { client } = fakeClient([
      row("a", "2026-01-01T00:00:00.000Z"),
      row("b", "2026-06-01T00:00:00.000Z"),
    ]);

    expect((await listProviderClients(client, "provider-1")).map((item) => item.id)).toEqual(["b", "a"]);
  });
});
