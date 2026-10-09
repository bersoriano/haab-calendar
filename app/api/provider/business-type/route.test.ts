import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  demoTarget: vi.fn(),
  switchType: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/supabase/demo-edit", () => ({ resolveDemoEditTarget: mocks.demoTarget }));
vi.mock("@/lib/supabase/business-type-switch", () => ({
  switchProviderBusinessType: mocks.switchType,
}));

const { POST } = await import("@/app/api/provider/business-type/route");
const { ProviderStoreWriteError } = await import("@/lib/supabase/provider-store");

function request(body: string) {
  return new NextRequest("https://haabcalendar.com/api/provider/business-type", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/provider/business-type", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "owner-1", email: "owner@example.com" } },
      error: null,
    });
    mocks.demoTarget.mockResolvedValue(null);
    mocks.switchType.mockResolvedValue({ store: { vertical: "healthcare" } });
  });

  it("asks a signed-out caller to sign in", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(request(JSON.stringify({ store: {} })));
    expect(response.status).toBe(401);
  });

  it("is not available while a demo page is being edited", async () => {
    mocks.demoTarget.mockResolvedValue({ page: { label: "Doctors" } });

    const response = await POST(request(JSON.stringify({ store: {} })));
    expect(response.status).toBe(403);
    expect(mocks.switchType).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    const response = await POST(request("{nope"));
    expect(response.status).toBe(400);
  });

  it("switches the caller's own page and returns the reloaded store", async () => {
    const response = await POST(request(JSON.stringify({ store: { vertical: "healthcare" } })));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ store: { vertical: "healthcare" } });
    expect(mocks.switchType.mock.calls[0][0]).toMatchObject({
      ownerUserId: "owner-1",
      ownerEmail: "owner@example.com",
    });
  });

  it("passes a profile warning through as the user message", async () => {
    mocks.switchType.mockResolvedValue({ store: { vertical: "healthcare" }, profileWarning: "Check Settings." });

    const body = await (await POST(request(JSON.stringify({ store: {} })))).json();
    expect(body.userMessage).toBe("Check Settings.");
  });

  it("explains a refusal with its status", async () => {
    mocks.switchType.mockRejectedValue(new ProviderStoreWriteError("You have upcoming bookings.", 409));

    const response = await POST(request(JSON.stringify({ store: {} })));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ userMessage: "You have upcoming bookings." });
  });
});
