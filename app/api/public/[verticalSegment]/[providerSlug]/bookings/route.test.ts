import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirmPublicBooking: vi.fn(),
  sendBookingEmailImmediately: vi.fn(),
  recordPublicPageEvent: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/bookings", () => ({
  confirmPublicBooking: mocks.confirmPublicBooking,
  PublicBookingWriteError: class PublicBookingWriteError extends Error {},
}));
vi.mock("@/lib/analytics/record", () => ({
  recordPublicPageEvent: mocks.recordPublicPageEvent,
}));
vi.mock("@/lib/email/booking-created", () => ({
  sendBookingEmailImmediately: mocks.sendBookingEmailImmediately,
}));

import { POST } from "@/app/api/public/[verticalSegment]/[providerSlug]/bookings/route";

const booking = { id: "booking-1", status: "confirmed" };

function request(extra: Record<string, unknown> = {}) {
  return new Request("https://haab.example/api/public/professionals/test-provider/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      serviceId: "service-1",
      dateKey: "2026-10-12",
      clientName: "Ada Lovelace",
      clientEmail: "ada@example.com",
      clientPhone: "+525512345678",
      ...extra,
    }),
  }) as unknown as NextRequest;
}

const context = {
  params: Promise.resolve({ verticalSegment: "professionals", providerSlug: "test-provider" }),
};

describe("POST public booking emails", () => {
  beforeEach(() => {
    mocks.confirmPublicBooking.mockReset();
    mocks.sendBookingEmailImmediately.mockReset();
    mocks.recordPublicPageEvent.mockReset();
    mocks.recordPublicPageEvent.mockResolvedValue(true);
    mocks.confirmPublicBooking.mockResolvedValue({
      booking,
      canonicalPath: "/professionals/test-provider",
      providerId: "provider-1",
    });
    mocks.sendBookingEmailImmediately.mockResolvedValue({ outcome: "succeeded" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("attempts both emails before returning confirmed booking", async () => {
    const response = await POST(request(), context);

    expect(response.status).toBe(201);
    expect(mocks.sendBookingEmailImmediately).toHaveBeenCalledWith({
      bookingId: "booking-1",
      providerId: "provider-1",
    });
    await expect(response.json()).resolves.toEqual({
      booking,
      canonicalPath: "/professionals/test-provider",
    });
  });

  it("keeps successful booking response when email needs outbox retry", async () => {
    mocks.sendBookingEmailImmediately.mockResolvedValue({
      outcome: "retryable_failure",
      errorCode: "email_send_failed",
    });

    const response = await POST(request(), context);

    expect(response.status).toBe(201);
    expect(mocks.sendBookingEmailImmediately).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith("booking_email_deferred", {
      bookingId: "booking-1",
      errorCode: "email_send_failed",
    });
  });
});

describe("POST public booking analytics", () => {
  beforeEach(() => {
    mocks.confirmPublicBooking.mockReset();
    mocks.recordPublicPageEvent.mockReset();
    mocks.confirmPublicBooking.mockResolvedValue({
      booking,
      canonicalPath: "/professionals/test-provider",
      providerId: "provider-1",
    });
    mocks.sendBookingEmailImmediately.mockResolvedValue({ outcome: "succeeded" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("records the conversion with the visit's campaign on the server", async () => {
    mocks.recordPublicPageEvent.mockResolvedValue(true);

    const response = await POST(
      request({
        attribution: { utmSource: "Instagram", utmCampaign: "fall", referrer: "https://l.instagram.com/" },
      }),
      context,
    );

    expect(response.status).toBe(201);
    expect(mocks.recordPublicPageEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        providerId: "provider-1",
        event: "booking_confirmed",
        serviceId: "service-1",
        bookingId: "booking-1",
        attribution: {
          utmSource: "instagram",
          utmMedium: undefined,
          utmCampaign: "fall",
          referrer: "https://l.instagram.com/",
        },
      }),
    );
  });

  it("stores the campaign on the booking itself", async () => {
    mocks.recordPublicPageEvent.mockResolvedValue(true);
    await POST(
      request({
        attribution: { utmSource: "Instagram", utmCampaign: "fall", referrer: "https://l.instagram.com/x" },
      }),
      context,
    );
    expect(mocks.confirmPublicBooking).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        campaign: {
          source: "instagram",
          medium: undefined,
          campaign: "fall",
          referrerHost: "l.instagram.com",
        },
      }),
    );
  });

  it("records untagged bookings too", async () => {
    mocks.recordPublicPageEvent.mockResolvedValue(true);
    await POST(request({ attribution: "garbage" }), context);
    expect(mocks.recordPublicPageEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ attribution: {} }),
    );
  });

  it("still confirms the booking when analytics fails", async () => {
    mocks.recordPublicPageEvent.mockRejectedValue(new Error("db down"));

    const response = await POST(request(), context);

    expect(response.status).toBe(201);
    expect(console.warn).toHaveBeenCalledWith("booking_analytics_failed", {
      bookingId: "booking-1",
      error: "db down",
    });
  });

  it("records nothing when the booking fails", async () => {
    mocks.confirmPublicBooking.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await POST(request(), context)).status).toBe(500);
    expect(mocks.recordPublicPageEvent).not.toHaveBeenCalled();
  });
});
