import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => {
  class MockSuperAdminAccessError extends Error {
    constructor() {
      super("Not found.");
      this.name = "SuperAdminAccessError";
    }
  }

  class MockFeatureOverrideInputError extends Error {
    readonly status: number;

    constructor(
      readonly userMessage: string,
      status = 400,
    ) {
      super(userMessage);
      this.name = "FeatureOverrideInputError";
      this.status = status;
    }
  }

  return {
    SuperAdminAccessError: MockSuperAdminAccessError,
    FeatureOverrideInputError: MockFeatureOverrideInputError,
    setProviderFeatureOverride: vi.fn(),
    clearProviderFeatureOverride: vi.fn(),
  };
});

vi.mock("@/lib/entitlements/server", () => ({
  FeatureOverrideInputError: routeMocks.FeatureOverrideInputError,
  setProviderFeatureOverride: routeMocks.setProviderFeatureOverride,
  clearProviderFeatureOverride: routeMocks.clearProviderFeatureOverride,
}));

vi.mock("@/lib/supabase/publication", () => ({
  SuperAdminAccessError: routeMocks.SuperAdminAccessError,
}));

import {
  DELETE,
  PUT,
} from "@/app/api/super-admin/providers/[providerId]/feature-overrides/[featureKey]/route";

const PROVIDER = "00000000-0000-4000-8000-000000000001";

const SNAPSHOT = {
  providerId: PROVIDER,
  planTier: "free",
  features: {
    custom_slug: { enabled: true, source: "override" },
    google_calendar_sync: { enabled: false, source: "plan" },
  },
};

function request(method: "PUT" | "DELETE", body: string) {
  return new Request(
    `http://localhost/api/super-admin/providers/${PROVIDER}/feature-overrides/custom_slug`,
    { method, headers: { "content-type": "application/json" }, body },
  ) as unknown as NextRequest;
}

const params = {
  params: Promise.resolve({ providerId: PROVIDER, featureKey: "custom_slug" }),
};

describe("PUT /api/super-admin/providers/[providerId]/feature-overrides/[featureKey]", () => {
  beforeEach(() => {
    routeMocks.setProviderFeatureOverride.mockReset();
    routeMocks.clearProviderFeatureOverride.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("answers 404 for a caller who is not a super admin, revealing nothing", async () => {
    routeMocks.setProviderFeatureOverride.mockRejectedValue(
      new routeMocks.SuperAdminAccessError(),
    );

    const response = await PUT(
      request("PUT", JSON.stringify({ enabled: true, reason: "Beta access" })),
      params,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ userMessage: "Not found." });
  });

  it("rejects a body that is not JSON", async () => {
    const response = await PUT(request("PUT", "not json"), params);

    expect(response.status).toBe(400);
    expect(routeMocks.setProviderFeatureOverride).not.toHaveBeenCalled();
  });

  it("rejects a body without a boolean enabled", async () => {
    const response = await PUT(
      request("PUT", JSON.stringify({ enabled: "yes", reason: "Beta access" })),
      params,
    );

    expect(response.status).toBe(400);
    expect(routeMocks.setProviderFeatureOverride).not.toHaveBeenCalled();
  });

  it("grants the feature and returns the refreshed snapshot", async () => {
    routeMocks.setProviderFeatureOverride.mockResolvedValue(SNAPSHOT);

    const response = await PUT(
      request(
        "PUT",
        JSON.stringify({
          enabled: true,
          expiresAt: "2026-09-01T00:00:00.000Z",
          reason: "Beta access",
        }),
      ),
      params,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(SNAPSHOT);
    expect(routeMocks.setProviderFeatureOverride).toHaveBeenCalledWith({
      providerId: PROVIDER,
      featureKey: "custom_slug",
      enabled: true,
      expiresAt: "2026-09-01T00:00:00.000Z",
      reason: "Beta access",
    });
  });

  it("never forwards an actor from the request body", async () => {
    routeMocks.setProviderFeatureOverride.mockResolvedValue(SNAPSHOT);

    await PUT(
      request(
        "PUT",
        JSON.stringify({
          enabled: true,
          reason: "Beta access",
          actorUserId: "00000000-0000-4000-8000-00000000dead",
        }),
      ),
      params,
    );

    const [payload] = routeMocks.setProviderFeatureOverride.mock.calls[0];
    expect(payload).not.toHaveProperty("actorUserId");
  });

  it("passes a rejected input through with its own status", async () => {
    routeMocks.setProviderFeatureOverride.mockRejectedValue(
      new routeMocks.FeatureOverrideInputError("Provider not found.", 404),
    );

    const response = await PUT(
      request("PUT", JSON.stringify({ enabled: true, reason: "Beta access" })),
      params,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      userMessage: "Provider not found.",
    });
  });

  it("sanitises an unexpected failure", async () => {
    routeMocks.setProviderFeatureOverride.mockRejectedValue(
      new Error('relation "provider_feature_overrides" does not exist'),
    );

    const response = await PUT(
      request("PUT", JSON.stringify({ enabled: true, reason: "Beta access" })),
      params,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as { userMessage: string };
    expect(body.userMessage).toBe("Could not update the feature override.");
    expect(body.userMessage).not.toContain("relation");
  });
});

describe("DELETE /api/super-admin/providers/[providerId]/feature-overrides/[featureKey]", () => {
  beforeEach(() => {
    routeMocks.clearProviderFeatureOverride.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("clears the override and returns the refreshed snapshot", async () => {
    routeMocks.clearProviderFeatureOverride.mockResolvedValue(SNAPSHOT);

    const response = await DELETE(
      request("DELETE", JSON.stringify({ reason: "Back to plan defaults" })),
      params,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.clearProviderFeatureOverride).toHaveBeenCalledWith({
      providerId: PROVIDER,
      featureKey: "custom_slug",
      reason: "Back to plan defaults",
    });
  });

  it("answers 404 for a caller who is not a super admin", async () => {
    routeMocks.clearProviderFeatureOverride.mockRejectedValue(
      new routeMocks.SuperAdminAccessError(),
    );

    const response = await DELETE(
      request("DELETE", JSON.stringify({ reason: "Back to plan defaults" })),
      params,
    );

    expect(response.status).toBe(404);
  });

  it("lets the server reject a missing reason", async () => {
    routeMocks.clearProviderFeatureOverride.mockRejectedValue(
      new routeMocks.FeatureOverrideInputError("A reason is required."),
    );

    const response = await DELETE(request("DELETE", JSON.stringify({})), params);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      userMessage: "A reason is required.",
    });
    expect(routeMocks.clearProviderFeatureOverride).toHaveBeenCalledWith({
      providerId: PROVIDER,
      featureKey: "custom_slug",
      reason: "",
    });
  });
});
