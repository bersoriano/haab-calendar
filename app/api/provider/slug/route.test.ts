import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  ownerRow: vi.fn(),
  updateRow: vi.fn(),
  updateTarget: vi.fn(),
  requireEntitlement: vi.fn(),
  prepareProviderSlugChange: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.ownerRow }) }),
    }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (payload: unknown) => ({
        eq: (column: string, id: string) => {
          mocks.updateTarget(column, id);
          return { select: () => ({ single: () => mocks.updateRow(payload) }) };
        },
      }),
    }),
  }),
}));
vi.mock("@/lib/entitlements/server", () => ({
  requireEntitlement: mocks.requireEntitlement,
  EntitlementRequiredError: class EntitlementRequiredError extends Error {},
}));
vi.mock("@/lib/slug-management", () => ({
  prepareProviderSlugChange: mocks.prepareProviderSlugChange,
}));

import { PUT } from "@/app/api/provider/slug/route";
import { EntitlementRequiredError } from "@/lib/entitlements/server";

function request(slug: unknown) {
  return new Request("https://haab.example/api/provider/slug", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug }),
  }) as NextRequest;
}

describe("PUT /api/provider/slug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    mocks.ownerRow.mockResolvedValue({
      data: { id: "provider-1", vertical: "healthcare", slug: "old-name" },
      error: null,
    });
    mocks.requireEntitlement.mockResolvedValue({ providerId: "provider-1" });
    mocks.prepareProviderSlugChange.mockResolvedValue({ ok: true, slug: "new-name" });
    mocks.updateRow.mockResolvedValue({ data: { slug: "new-name" }, error: null });
  });

  it("rejects unauthenticated requests before provider lookup", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await PUT(request("new-name"));

    expect(response.status).toBe(401);
    expect(mocks.ownerRow).not.toHaveBeenCalled();
  });

  it("rejects an account without an owned provider", async () => {
    mocks.ownerRow.mockResolvedValue({ data: null, error: null });

    const response = await PUT(request("new-name"));

    expect(response.status).toBe(404);
    expect(mocks.updateRow).not.toHaveBeenCalled();
  });

  it("rejects a provider without custom slug access before writing", async () => {
    mocks.requireEntitlement.mockRejectedValue(
      new EntitlementRequiredError("provider-1", "custom_slug"),
    );

    const response = await PUT(request("new-name"));

    expect(response.status).toBe(403);
    expect(mocks.updateRow).not.toHaveBeenCalled();
  });

  it("rejects unavailable slugs without writing", async () => {
    mocks.prepareProviderSlugChange.mockResolvedValue({
      ok: false,
      slug: "new-name",
      message: "That provider URL is already taken for this vertical.",
    });

    const response = await PUT(request("new-name"));

    expect(response.status).toBe(409);
    expect(mocks.updateRow).not.toHaveBeenCalled();
  });

  it("updates only owner provider and returns canonical path", async () => {
    const response = await PUT(request("new-name"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      slug: "new-name",
      publicUrl: "/doctors/new-name",
    });
    expect(mocks.updateRow).toHaveBeenCalledWith({ custom_slug: "new-name" });
    expect(mocks.updateTarget).toHaveBeenCalledWith("id", "provider-1");
  });

  it("reports a slug collision discovered during database update", async () => {
    mocks.updateRow.mockResolvedValue({ data: null, error: { code: "23505" } });

    const response = await PUT(request("new-name"));

    expect(response.status).toBe(409);
  });
});
