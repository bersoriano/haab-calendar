import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOwnerProvider: vi.fn(),
  getDoorList: vi.fn(),
  recordCheckins: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/supabase/provider-clients", () => ({ getOwnerProvider: mocks.getOwnerProvider }));
vi.mock("@/lib/supabase/checkin", () => ({ getDoorList: mocks.getDoorList, recordCheckins: mocks.recordCheckins }));

import { GET, POST } from "@/app/api/provider/checkin/route";

describe("/api/provider/checkin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    mocks.getOwnerProvider.mockResolvedValue({ id: "provider-1", timezone: "UTC" });
  });

  it("refuses a visitor who is not signed in", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET(new NextRequest("http://localhost/api/provider/checkin?event=svc"))).status).toBe(401);
  });

  it("returns the door list of the owner's event, uncached", async () => {
    mocks.getDoorList.mockResolvedValue({ serviceId: "svc", guests: [], invitations: [] });
    const response = await GET(new NextRequest("http://localhost/api/provider/checkin?event=svc&lang=es"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.getDoorList).toHaveBeenCalledWith(expect.anything(), "provider-1", "svc", "es");
  });

  it("says when the event is not the owner's", async () => {
    mocks.getDoorList.mockResolvedValue(null);
    expect((await GET(new NextRequest("http://localhost/api/provider/checkin?event=other"))).status).toBe(400);
  });

  it("records queued arrivals", async () => {
    mocks.recordCheckins.mockResolvedValue(2);
    const body = { serviceId: "svc", entries: [{ guestId: "g1", at: "2026-12-20T23:00:00.000Z" }] };
    const response = await POST(
      new NextRequest("http://localhost/api/provider/checkin", { method: "POST", body: JSON.stringify(body) }),
    );
    expect(await response.json()).toEqual({ changed: 2 });
    expect(mocks.recordCheckins).toHaveBeenCalledWith(expect.anything(), "provider-1", body);
  });
});
