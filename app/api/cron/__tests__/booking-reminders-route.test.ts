import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/booking-reminders", () => ({
  runBookingReminderWorker: vi.fn(async () => ({ claimed: 1, sent: 1, cancelled: 0, failed: 0 })),
}));

import { GET } from "@/app/api/cron/booking-reminders/route";
import { runBookingReminderWorker } from "@/lib/email/booking-reminders";

afterEach(() => {
  delete process.env.CRON_SECRET;
  vi.clearAllMocks();
});

describe("booking reminder cron", () => {
  it("fails closed without configured secret", async () => {
    const response = await GET(new Request("http://localhost/api/cron/booking-reminders") as never);
    expect(response.status).toBe(401);
    expect(runBookingReminderWorker).not.toHaveBeenCalled();
  });

  it("requires bearer secret and returns only counts", async () => {
    process.env.CRON_SECRET = "test-secret";
    const unauthorized = await GET(new Request("http://localhost/api/cron/booking-reminders") as never);
    expect(unauthorized.status).toBe(401);
    const authorized = await GET(new Request("http://localhost/api/cron/booking-reminders", {
      headers: { authorization: "Bearer test-secret" },
    }) as never);
    expect(authorized.status).toBe(200);
    expect(await authorized.json()).toEqual({ claimed: 1, sent: 1, cancelled: 0, failed: 0 });
  });
});
