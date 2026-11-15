import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOwnerProvider: vi.fn(),
  listInvitations: vi.fn(),
  createInvitations: vi.fn(),
  deleteAllInvitations: vi.fn(),
  updateInvitation: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/supabase/provider-clients", () => ({ getOwnerProvider: mocks.getOwnerProvider }));
vi.mock("@/lib/supabase/invitations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/invitations")>();
  return {
    ...actual,
    listInvitations: mocks.listInvitations,
    createInvitations: mocks.createInvitations,
    deleteAllInvitations: mocks.deleteAllInvitations,
    updateInvitation: mocks.updateInvitation,
  };
});

import { DELETE, GET, POST } from "@/app/api/provider/invitations/route";
import { PATCH } from "@/app/api/provider/invitations/[invitationId]/route";
import { InvitationWriteError } from "@/lib/supabase/invitations";

function request(method: string, body?: unknown, query = "") {
  return new NextRequest(`http://localhost/api/provider/invitations${query}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("/api/provider/invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    mocks.getOwnerProvider.mockResolvedValue({ id: "provider-1", timezone: "UTC" });
    mocks.listInvitations.mockResolvedValue([]);
  });

  it("refuses a visitor who is not signed in", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.listInvitations).not.toHaveBeenCalled();
  });

  it("lists the signed-in owner's guest list without caching", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.listInvitations).toHaveBeenCalledWith(expect.anything(), "provider-1");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ invitations: [] });
  });

  it("refuses more than 500 invitations in one paste", async () => {
    const drafts = Array.from({ length: 501 }, (_, index) => ({ displayName: `G${index}`, seatLimit: 1, eventIds: [] }));

    const response = await POST(request("POST", { drafts }));

    expect(response.status).toBe(400);
    expect(mocks.createInvitations).not.toHaveBeenCalled();
  });

  it("adds invitations for the owner's own page", async () => {
    mocks.createInvitations.mockResolvedValue([{ id: "inv-1" }]);
    const drafts = [{ displayName: "Familia Ortiz", seatLimit: 2, eventIds: ["svc-1"] }];

    const response = await POST(request("POST", { drafts }));

    expect(response.status).toBe(201);
    expect(mocks.createInvitations).toHaveBeenCalledWith(expect.anything(), "provider-1", drafts);
  });

  it("deletes the whole list only when confirmed", async () => {
    const unconfirmed = await DELETE(request("DELETE", {}, "?all=1"));
    expect(unconfirmed.status).toBe(400);

    const missingFlag = await DELETE(request("DELETE", { confirm: "DELETE" }));
    expect(missingFlag.status).toBe(400);
    expect(mocks.deleteAllInvitations).not.toHaveBeenCalled();

    mocks.deleteAllInvitations.mockResolvedValue(12);
    const confirmed = await DELETE(request("DELETE", { confirm: "DELETE" }, "?all=1"));
    expect(confirmed.status).toBe(200);
    expect(await confirmed.json()).toEqual({ deleted: 12 });
  });

  it("passes a planner's mistake through as a 400 with its message", async () => {
    mocks.updateInvitation.mockRejectedValue(
      new InvitationWriteError("This invitation names more guests than that. Remove one first.", 400),
    );

    const response = await PATCH(request("PATCH", { seatLimit: 1 }), {
      params: Promise.resolve({ invitationId: "inv-1" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      userMessage: "This invitation names more guests than that. Remove one first.",
    });
  });

  it("hides an unexpected failure behind a generic 500", async () => {
    mocks.listInvitations.mockRejectedValue(new Error("connection reset"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ userMessage: "Could not load your guest list." });
    log.mockRestore();
  });
});
