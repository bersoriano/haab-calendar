import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const HOLD_ID = "00000000-0000-4000-8000-000000000004";
const DATE = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        gte: () => query,
        lte: () => query,
        gt: () => query,
        in: () => query,
        returns: async () => ({
          data: table === "booking_holds"
            ? [{
                id: HOLD_ID,
                service_id: "service-1",
                booking_type: "appointment",
                date: DATE,
                start_time: "09:00",
                end_time: "09:30",
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 600_000).toISOString(),
                allows_shared_capacity: false,
              }]
            : [],
          error: null,
        }),
      };
      return query;
    },
  }),
}));

import { loadPublicSchedule } from "@/lib/public-booking-resolver";

describe("public schedule holds", () => {
  it("keeps occupied time visible without exposing the hold credential", async () => {
    const schedule = await loadPublicSchedule("provider-1", 90, "America/Mexico_City");

    expect(schedule.bookingHolds).toHaveLength(1);
    expect(schedule.bookingHolds[0]).toMatchObject({
      serviceId: "service-1",
      dateKey: DATE,
      startTime: "09:00",
    });
    expect(schedule.bookingHolds[0].id).not.toBe(HOLD_ID);
  });
});
