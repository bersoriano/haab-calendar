import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  ownerRow: vi.fn(),
  ownerFilter: vi.fn(),
  rpc: vi.fn(),
  requireEntitlement: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: (column: string, value: string) => {
          mocks.ownerFilter(column, value);
          return { maybeSingle: mocks.ownerRow };
        },
      }),
    }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/entitlements/server", () => ({
  requireEntitlement: mocks.requireEntitlement,
  EntitlementRequiredError: class EntitlementRequiredError extends Error {},
}));

import { GET } from "@/app/api/provider/analytics/route";
import { EntitlementRequiredError } from "@/lib/entitlements/server";

const SUMMARY = {
  totals: { views: 3, visitors: 2, serviceSelected: 1, slotSelected: 1, bookings: 1, bookingVisitors: 1 },
  daily: [],
  campaigns: [],
  referrers: [],
  services: [],
  devices: [],
};

function request(query = "") {
  return new NextRequest(`https://haabcalendar.com/api/provider/analytics${query}`);
}

describe("GET /api/provider/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    mocks.ownerRow.mockResolvedValue({
      data: { id: "provider-1", timezone: "America/Mexico_City" },
      error: null,
    });
    mocks.requireEntitlement.mockResolvedValue({});
    mocks.rpc.mockResolvedValue({ data: SUMMARY, error: null });
  });

  it("returns the summary for the signed-in owner's provider", async () => {
    const response = await GET(request("?range=7"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ range: 7, timeZone: "America/Mexico_City", ...SUMMARY });
    expect(mocks.ownerFilter).toHaveBeenCalledWith("owner_user_id", "owner-1");
    expect(mocks.requireEntitlement).toHaveBeenCalledWith("provider-1", "analytics", expect.anything());
    expect(mocks.rpc).toHaveBeenCalledWith("provider_analytics_summary", {
      p_provider_id: "provider-1",
      p_days: 7,
      p_time_zone: "America/Mexico_City",
    });
  });

  it("requires a session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET(request())).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("refuses providers without the analytics entitlement before reading", async () => {
    mocks.requireEntitlement.mockRejectedValue(new EntitlementRequiredError("provider-1", "analytics"));
    expect((await GET(request())).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("falls back to UTC and the default range for bad input", async () => {
    mocks.ownerRow.mockResolvedValue({ data: { id: "provider-1", timezone: "Mars/Olympus" }, error: null });
    await GET(request("?range=9999"));
    expect(mocks.rpc).toHaveBeenCalledWith("provider_analytics_summary", {
      p_provider_id: "provider-1",
      p_days: 30,
      p_time_zone: "UTC",
    });
  });
});
