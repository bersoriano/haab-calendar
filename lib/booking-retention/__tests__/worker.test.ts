import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => { throw new Error("Inject test client"); } }));
import { runBookingRetentionWorker } from "@/lib/booking-retention/worker";

function client(data: unknown, error: unknown = null) {
  const rpc = vi.fn(async () => ({ data, error }));
  return { rpc, client: { rpc } as unknown as SupabaseClient };
}

describe("booking retention worker", () => {
  it("calls bounded cleanup and returns counters only", async () => {
    const db = client({ deletedBookings: 500, hasMore: true });
    expect(await runBookingRetentionWorker(db.client)).toEqual({ deletedBookings: 500, hasMore: true });
    expect(db.rpc).toHaveBeenCalledWith("purge_expired_bookings", { p_batch_size: 500 });
  });
  it("propagates database failure without a success result", async () => {
    await expect(runBookingRetentionWorker(client(null, { code: "XX000" }).client)).rejects.toMatchObject({ code: "XX000" });
  });
  it.each([null, {}, { deletedBookings: -1, hasMore: false }, { deletedBookings: 501, hasMore: false }, { deletedBookings: 2, hasMore: "false" }])("rejects malformed counters: %j", async (data) => {
    await expect(runBookingRetentionWorker(client(data).client)).rejects.toThrow("Invalid booking cleanup response.");
  });
});
