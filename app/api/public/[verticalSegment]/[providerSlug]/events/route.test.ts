import type { NextRequest } from "next/server";
import { NextRequest as RealNextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublishedProvider: vi.fn(),
  insert: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseServiceKey: () => "service-key",
  createAdminClient: () => ({
    from: (table: string) => {
      const recent = {
        eq: () => recent,
        gte: async () => ({ count: 0, error: null }),
      };
      return { insert: (row: unknown) => mocks.insert(table, row), select: () => recent };
    },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/supabase/bookings", () => {
  class PublicBookingWriteError extends Error {
    constructor(
      readonly userMessage: string,
      readonly status: number,
    ) {
      super(userMessage);
    }
  }
  return { getPublishedProvider: mocks.getPublishedProvider, PublicBookingWriteError };
});

import { POST } from "@/app/api/public/[verticalSegment]/[providerSlug]/events/route";
import { PublicBookingWriteError } from "@/lib/supabase/bookings";

const BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148";

function request(body: unknown, userAgent: string | null = BROWSER, cookie?: string) {
  const headers = new Headers({ "content-type": "application/json", "x-forwarded-for": "203.0.113.9" });
  if (cookie) {
    headers.set("cookie", cookie);
  }
  if (userAgent) {
    headers.set("user-agent", userAgent);
  }
  return new RealNextRequest("https://haabcalendar.com/api/public/professionals/ai-automation/events", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as NextRequest;
}

const params = (verticalSegment = "professionals", providerSlug = "ai-automation") => ({
  params: Promise.resolve({ verticalSegment, providerSlug }),
});

describe("POST public page events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPublishedProvider.mockResolvedValue({ id: "provider-1", owner_user_id: "owner-1" });
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it("records a campaign page view without storing the ip", async () => {
    const response = await POST(
      request({
        event: "page_view",
        utmSource: "Instagram",
        utmCampaign: "fall",
        referrer: "https://l.instagram.com/path?secret=1",
      }),
      params(),
    );

    expect(response.status).toBe(204);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    const [table, row] = mocks.insert.mock.calls[0];
    expect(table).toBe("public_page_events");
    expect(row).toMatchObject({
      provider_id: "provider-1",
      event: "page_view",
      service_id: null,
      booking_id: null,
      utm_source: "instagram",
      utm_campaign: "fall",
      referrer_host: "l.instagram.com",
      device_class: "mobile",
    });
    expect(row.visitor_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain("203.0.113.9");
  });

  it("ignores booking beacons, which the booking route records", async () => {
    const response = await POST(request({ event: "booking_confirmed" }), params());
    expect(response.status).toBe(204);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("does not count the owner viewing their own page", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } });
    const response = await POST(
      request({ event: "page_view" }, BROWSER, "sb-abc-auth-token.0=x"),
      params(),
    );
    expect(response.status).toBe(204);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("counts other signed-in people, and skips the session lookup for anonymous visitors", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "someone-else" } } });
    await POST(request({ event: "page_view" }, BROWSER, "sb-abc-auth-token=x"), params());
    expect(mocks.insert).toHaveBeenCalledTimes(1);

    mocks.getUser.mockClear();
    await POST(request({ event: "page_view" }), params());
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("skips bots quietly", async () => {
    const response = await POST(request({ event: "page_view" }, "WhatsApp/2.24"), params());
    expect(response.status).toBe(204);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects invalid links, bodies and events", async () => {
    expect((await POST(request({ event: "page_view" }), params("nope"))).status).toBe(400);
    expect((await POST(request("{not json"), params())).status).toBe(400);
    expect((await POST(request({ event: "purchase" }), params())).status).toBe(400);
    expect((await POST(request("x".repeat(5000)), params())).status).toBe(413);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("returns 404 for unpublished pages", async () => {
    mocks.getPublishedProvider.mockRejectedValue(
      new PublicBookingWriteError("This booking link was not found.", 404),
    );
    expect((await POST(request({ event: "page_view" }), params())).status).toBe(404);
  });

  it("never surfaces a failed insert to the visitor", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.insert.mockResolvedValue({ error: { message: "boom" } });
    expect((await POST(request({ event: "page_view" }), params())).status).toBe(204);
  });
});
