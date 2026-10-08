import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseServiceKey: () => "service-key" }));

import { recordPublicPageEvent } from "@/lib/analytics/record";

const insert = vi.fn();
const admin = { from: () => ({ insert }) } as never;

const SERVICE_ID = "2f1c6a0e-9b7d-4c1e-8a55-0d6f3b2a9c11";

function bookingRequest() {
  return new Request("https://haabcalendar.com/api/public/professionals/x/bookings", {
    method: "POST",
    headers: { "user-agent": "Mozilla/5.0 (iPhone) Mobile", "x-forwarded-for": "203.0.113.4" },
  });
}

describe("recordPublicPageEvent", () => {
  beforeEach(() => insert.mockReset());

  it("writes a booking conversion with its campaign and booking id", async () => {
    insert.mockResolvedValue({ error: null });

    await expect(
      recordPublicPageEvent(admin, {
        providerId: "provider-1",
        event: "booking_confirmed",
        serviceId: SERVICE_ID,
        bookingId: "booking-1",
        attribution: { utmSource: "instagram", referrer: "https://haabcalendar.com/other" },
        request: bookingRequest(),
      }),
    ).resolves.toBe(true);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "booking_confirmed",
        service_id: SERVICE_ID,
        booking_id: "booking-1",
        utm_source: "instagram",
        // The site's own pages are not a referrer.
        referrer_host: null,
        device_class: "mobile",
      }),
    );
  });

  it("drops a service id the uuid column would reject", async () => {
    insert.mockResolvedValue({ error: null });
    await recordPublicPageEvent(admin, {
      providerId: "provider-1",
      event: "booking_confirmed",
      serviceId: "service-1",
      attribution: {},
      request: bookingRequest(),
    });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ service_id: null }));
  });

  it("treats a duplicate booking event as already recorded", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
    await expect(
      recordPublicPageEvent(admin, {
        providerId: "provider-1",
        event: "booking_confirmed",
        bookingId: "booking-1",
        attribution: {},
        request: bookingRequest(),
      }),
    ).resolves.toBe(true);
  });

  it("surfaces other insert failures", async () => {
    insert.mockResolvedValue({ error: { code: "42501", message: "denied" } });
    await expect(
      recordPublicPageEvent(admin, {
        providerId: "provider-1",
        event: "page_view",
        attribution: {},
        request: bookingRequest(),
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });
});
