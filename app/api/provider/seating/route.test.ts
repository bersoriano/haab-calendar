import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOwnerProvider: vi.fn(),
  assignSeats: vi.fn(),
  setSeatingPublished: vi.fn(),
  createSeatingTable: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/supabase/provider-clients", () => ({ getOwnerProvider: mocks.getOwnerProvider }));
vi.mock("@/lib/supabase/seating", () => ({
  assignSeats: mocks.assignSeats,
  setSeatingPublished: mocks.setSeatingPublished,
  createSeatingTable: mocks.createSeatingTable,
  listSeatingTables: vi.fn(),
  getSeatingState: vi.fn(),
}));

import { POST as ASSIGN } from "@/app/api/provider/seating/assign/route";
import { POST as PUBLISH } from "@/app/api/provider/seating/publish/route";
import { POST as CREATE } from "@/app/api/provider/seating/route";
import { InvitationWriteError } from "@/lib/supabase/invitations";

function post(body: unknown) {
  return new NextRequest("http://localhost/api/provider/seating", { method: "POST", body: JSON.stringify(body) });
}

describe("seating routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    mocks.getOwnerProvider.mockResolvedValue({ id: "provider-1", timezone: "UTC" });
  });

  it("refuses a visitor who is not signed in", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await ASSIGN(post({}))).status).toBe(401);
    expect(mocks.assignSeats).not.toHaveBeenCalled();
  });

  it("seats guests on the owner's own page and says how many moved", async () => {
    mocks.assignSeats.mockResolvedValue(2);
    const body = { serviceId: "svc", guestIds: ["g1", "g2"], tableId: "t1" };

    const response = await ASSIGN(post(body));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ moved: 2 });
    expect(mocks.assignSeats).toHaveBeenCalledWith(expect.anything(), "provider-1", body);
  });

  it("passes a planner's mistake through as a 400", async () => {
    mocks.assignSeats.mockRejectedValue(new InvitationWriteError("That table is not at this event.", 400));
    const response = await ASSIGN(post({ serviceId: "svc", guestIds: ["g1"], tableId: "other" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ userMessage: "That table is not at this event." });
  });

  it("publishes only on an explicit true or false", async () => {
    expect((await PUBLISH(post({ published: "yes" }))).status).toBe(400);
    mocks.setSeatingPublished.mockResolvedValue({ published: true, publishedAt: "2026-11-11T00:00:00Z" });
    const response = await PUBLISH(post({ published: true }));
    expect(await response.json()).toEqual({ published: true, publishedAt: "2026-11-11T00:00:00Z" });
  });

  it("adds a table", async () => {
    mocks.createSeatingTable.mockResolvedValue({ id: "t1", name: "Mesa 1" });
    const response = await CREATE(post({ serviceId: "svc", name: "Mesa 1", seatCount: 8 }));
    expect(response.status).toBe(201);
  });
});
