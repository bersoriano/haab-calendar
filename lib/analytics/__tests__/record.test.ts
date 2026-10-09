import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseServiceKey: () => "service-key" }));

import {
  NETWORK_HOURLY_EVENT_CAP,
  recordPublicPageEvent,
  VISITOR_HOURLY_EVENT_CAP,
} from "@/lib/analytics/record";

const insert = vi.fn();
/** Called with the hash column a rate-limit count filters on. */
const recentCount = vi.fn();
function recentQuery() {
  let column = "";
  const query = {
    eq: (name: string) => {
      if (name !== "provider_id") {
        column = name;
      }
      return query;
    },
    gte: () => recentCount(column),
  };
  return query;
}
const admin = { from: () => ({ insert, select: () => recentQuery() }) } as never;

const SERVICE_ID = "2f1c6a0e-9b7d-4c1e-8a55-0d6f3b2a9c11";

function bookingRequest() {
  return new Request("https://haabcalendar.com/api/public/professionals/x/bookings", {
    method: "POST",
    headers: { "user-agent": "Mozilla/5.0 (iPhone) Mobile", "x-forwarded-for": "203.0.113.4" },
  });
}

describe("recordPublicPageEvent", () => {
  beforeEach(() => {
    insert.mockReset();
    recentCount.mockReset();
    recentCount.mockResolvedValue({ count: 0, error: null });
  });

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

  it("stops counting a visitor past the hourly cap", async () => {
    recentCount.mockImplementation(async (column: string) => ({
      count: column === "visitor_hash" ? VISITOR_HOURLY_EVENT_CAP : 0,
      error: null,
    }));
    await expect(
      recordPublicPageEvent(admin, {
        providerId: "provider-1",
        event: "page_view",
        attribution: {},
        request: bookingRequest(),
      }),
    ).resolves.toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it("never caps a booking", async () => {
    recentCount.mockResolvedValue({ count: VISITOR_HOURLY_EVENT_CAP * 10, error: null });
    insert.mockResolvedValue({ error: null });
    await expect(
      recordPublicPageEvent(admin, {
        providerId: "provider-1",
        event: "booking_confirmed",
        bookingId: "booking-1",
        attribution: {},
        request: bookingRequest(),
      }),
    ).resolves.toBe(true);
    expect(recentCount).not.toHaveBeenCalled();
  });

  it("stops counting a network that rotates user agents", async () => {
    recentCount.mockImplementation(async (column: string) => ({
      count: column === "network_hash" ? NETWORK_HOURLY_EVENT_CAP : 0,
      error: null,
    }));
    await expect(
      recordPublicPageEvent(admin, {
        providerId: "provider-1",
        event: "page_view",
        attribution: {},
        request: bookingRequest(),
      }),
    ).resolves.toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it("stores a network hash that ignores the user agent", async () => {
    insert.mockResolvedValue({ error: null });
    const withAgent = (userAgent: string) =>
      new Request("https://haabcalendar.com/api/public/professionals/x/events", {
        method: "POST",
        headers: { "user-agent": userAgent, "x-forwarded-for": "198.51.100.20" },
      });

    for (const userAgent of ["Mozilla/5.0 (iPhone) Mobile", "Mozilla/5.0 (Macintosh)"]) {
      await recordPublicPageEvent(admin, {
        providerId: "provider-1",
        event: "page_view",
        attribution: {},
        request: withAgent(userAgent),
      });
    }

    const [first, second] = insert.mock.calls.map(([row]) => row);
    expect(first.visitor_hash).not.toBe(second.visitor_hash);
    expect(first.network_hash).toBe(second.network_hash);
    expect(first.network_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.network_hash).not.toBe(first.visitor_hash);
  });
});
