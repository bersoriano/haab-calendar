import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOwnerProvider: vi.fn(),
  service: null as { id: string; name: string } | null,
  listInvitations: vi.fn(),
  getRsvpQuestions: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.service, error: null }) }) }),
      }),
    }),
  }),
}));
vi.mock("@/lib/supabase/provider-clients", () => ({ getOwnerProvider: mocks.getOwnerProvider }));
vi.mock("@/lib/supabase/invitations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/invitations")>();
  return { ...actual, listInvitations: mocks.listInvitations, getRsvpQuestions: mocks.getRsvpQuestions };
});

import { GET } from "@/app/api/provider/invitations/export/route";

function request(query: string) {
  return new NextRequest(`http://localhost/api/provider/invitations/export${query}`);
}

describe("GET /api/provider/invitations/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    mocks.getOwnerProvider.mockResolvedValue({ id: "provider-1", timezone: "UTC" });
    mocks.service = { id: "svc-1", name: "Ceremonia y recepción" };
    mocks.getRsvpQuestions.mockResolvedValue([
      { id: "menu", kind: "choice", label: "Menú", options: [{ id: "res", label: "Res" }], per: "guest", eventIds: [] },
    ]);
    mocks.listInvitations.mockResolvedValue([
      {
        id: "a",
        displayName: "Familia Ortiz",
        contactPhone: "",
        contactEmail: "",
        submittedAt: "2026-11-01T00:00:00Z",
        answers: {},
        guests: [
          { id: "g1", name: "Ana", position: 0, attending: { "svc-1": true }, answers: { menu: "res" } },
          { id: "g2", name: "Luis", position: 1, attending: {}, answers: {} },
        ],
      },
    ]);
  });

  it("refuses a visitor who is not signed in", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET(request("?event=svc-1"))).status).toBe(401);
  });

  it("refuses an event that is not on the owner's page", async () => {
    mocks.service = null;
    const response = await GET(request("?event=svc-other"));
    expect(response.status).toBe(400);
    expect(mocks.listInvitations).not.toHaveBeenCalled();
  });

  it("downloads the people attending that event with their answers", async () => {
    const response = await GET(request("?event=svc-1&lang=es"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment; filename="ceremonia-y-recepcion-\d{4}-\d{2}-\d{2}\.csv"$/);
    const lines = (await response.text()).replace(/^﻿/, "").trim().split("\r\n");
    expect(lines).toEqual(["Invitación,Invitado,Teléfono,Correo,Menú", "Familia Ortiz,Ana,,,Res"]);
  });
});
