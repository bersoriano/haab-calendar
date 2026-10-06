import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirmPublicBooking: vi.fn(),
  sendBookingEmailImmediately: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/bookings", () => ({
  confirmPublicBooking: mocks.confirmPublicBooking,
  PublicBookingWriteError: class PublicBookingWriteError extends Error {},
}));
vi.mock("@/lib/email/booking-created", () => ({
  sendBookingEmailImmediately: mocks.sendBookingEmailImmediately,
}));

import { POST } from "@/app/api/public/[verticalSegment]/[providerSlug]/bookings/route";

const booking = { id: "booking-1", status: "confirmed" };

function request() {
  return new Request("https://haab.example/api/public/professionals/test-provider/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      serviceId: "service-1",
      dateKey: "2026-10-12",
      clientName: "Ada Lovelace",
      clientEmail: "ada@example.com",
      clientPhone: "+525512345678",
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
