import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOwnerProvider: vi.fn(),
  listProviderClients: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/supabase/provider-clients", () => ({
  getOwnerProvider: mocks.getOwnerProvider,
  listProviderClients: mocks.listProviderClients,
}));

import { GET } from "@/app/api/provider/clients/export/route";

function request(query = "") {
  return new NextRequest(`http://localhost/api/provider/clients/export${query}`);
}

describe("GET /api/provider/clients/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    mocks.getOwnerProvider.mockResolvedValue({ id: "provider-1", timezone: "UTC" });
    mocks.listProviderClients.mockResolvedValue([
      {
        id: "1",
        name: "Ana",
        email: "ana@example.com",
        phone: "",
        firstBookedAt: "2026-01-15T18:00:00.000Z",
        lastBookedAt: "2026-03-02T18:00:00.000Z",
        bookingCount: 1,
      },
    ]);
  });

  it("downloads the signed-in owner's clients and forbids caching", async () => {
    const response = await GET(request("?lang=es"));

    expect(response.status).toBe(200);
    expect(mocks.getOwnerProvider).toHaveBeenCalledWith(expect.anything(), "owner-1");
    expect(mocks.listProviderClients).toHaveBeenCalledWith(expect.anything(), "provider-1");
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment; filename="clientes-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toContain("Ana,ana@example.com,,2026-01-15,2026-03-02,1");
  });

  it("requires a session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect((await GET(request())).status).toBe(401);
    expect(mocks.listProviderClients).not.toHaveBeenCalled();
  });

  it("answers 404 for an account with no page", async () => {
    mocks.getOwnerProvider.mockResolvedValue(null);

    expect((await GET(request())).status).toBe(404);
  });

  it("does not leak a database error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.listProviderClients.mockRejectedValue(new Error("relation secret_table"));
    const response = await GET(request());

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret_table");
  });
});
