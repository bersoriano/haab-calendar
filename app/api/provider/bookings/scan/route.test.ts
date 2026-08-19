import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getProviderBookingByManageToken: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
  }),
}));

vi.mock("@/lib/supabase/bookings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/bookings")>();
  return {
    ...actual,
    getProviderBookingByManageToken: mocks.getProviderBookingByManageToken,
  };
});

import { POST } from "@/app/api/provider/bookings/scan/route";

const booking = {
  id: "booking-1",
  serviceId: "service-1",
  serviceName: "Consultation",
  bookingType: "appointment",
  dateKey: "2026-08-20",
  startTime: "09:00",
  endTime: "09:30",
  clientName: "Ana Rivera",
  clientEmail: "ana@example.com",
  clientPhone: "555-0100",
  notes: "Bring results",
  cost: "$95",
  status: "confirmed",
  createdAt: "2026-08-19T10:00:00.000Z",
  updatedAt: "2026-08-19T10:00:00.000Z",
  manageToken: "",
};

function request(body: unknown) {
  return new Request("https://haab.example/api/provider/bookings/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/provider/bookings/scan", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.getProviderBookingByManageToken.mockReset();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "owner-1" } },
      error: null,
    });
  });

  it("requires a current provider session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(
      request({ code: "https://haab.example/doctors/rivera/manage/private-token" }),
    );

    expect(response.status).toBe(401);
    expect(mocks.getProviderBookingByManageToken).not.toHaveBeenCalled();
  });

  it("rejects QR data that is not a same-origin appointment link", async () => {
    const response = await POST(request({ code: "BEGIN:VCALENDAR" }));

    expect(response.status).toBe(400);
    expect(mocks.getProviderBookingByManageToken).not.toHaveBeenCalled();
  });

  it("returns booking selected through authenticated provider RLS", async () => {
    mocks.getProviderBookingByManageToken.mockResolvedValue(booking);

    const response = await POST(
      request({
        code: "https://haab.example/doctors/rivera-family/manage/private-token?lang=en",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ booking });
    expect(mocks.getProviderBookingByManageToken).toHaveBeenCalledWith(
      expect.objectContaining({ auth: expect.any(Object) }),
      "private-token",
    );
  });
});
