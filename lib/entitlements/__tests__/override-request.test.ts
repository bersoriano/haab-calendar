import { describe, expect, it } from "vitest";

import {
  buildClearOverrideRequest,
  buildSetOverrideRequest,
  OverrideRequestError,
} from "@/lib/entitlements/override-request";

const PROVIDER = "00000000-0000-4000-8000-000000000001";

describe("buildSetOverrideRequest", () => {
  it("addresses the provider and feature, and trims the reason", () => {
    const request = buildSetOverrideRequest({
      providerId: PROVIDER,
      featureKey: "custom_slug",
      enabled: true,
      reason: "  Beta access  ",
    });

    expect(request).toEqual({
      url: `/api/super-admin/providers/${PROVIDER}/feature-overrides/custom_slug`,
      method: "PUT",
      body: { enabled: true, expiresAt: null, reason: "Beta access" },
    });
  });

  it("sends a blank expiry as null, meaning permanent", () => {
    const request = buildSetOverrideRequest({
      providerId: PROVIDER,
      featureKey: "custom_slug",
      enabled: false,
      expiresAt: "",
      reason: "Withheld pending review",
    });

    expect(request.body.expiresAt).toBeNull();
  });

  it("sends a datetime-local value as an instant", () => {
    const request = buildSetOverrideRequest({
      providerId: PROVIDER,
      featureKey: "custom_slug",
      enabled: true,
      expiresAt: "2026-09-01T10:30",
      reason: "Trial",
    });

    expect(request.body.expiresAt).toBe(
      new Date("2026-09-01T10:30").toISOString(),
    );
  });

  it("rejects an unparseable expiry before it reaches the server", () => {
    expect(() =>
      buildSetOverrideRequest({
        providerId: PROVIDER,
        featureKey: "custom_slug",
        enabled: true,
        expiresAt: "next tuesday",
        reason: "Trial",
      }),
    ).toThrow(OverrideRequestError);
  });

  it("rejects a feature outside the catalog", () => {
    expect(() =>
      buildSetOverrideRequest({
        providerId: PROVIDER,
        featureKey: "teleportation",
        enabled: true,
        reason: "Trial",
      }),
    ).toThrow(OverrideRequestError);
  });

  it.each(["", "   "])("rejects a blank reason (%j)", (reason) => {
    expect(() =>
      buildSetOverrideRequest({
        providerId: PROVIDER,
        featureKey: "custom_slug",
        enabled: true,
        reason,
      }),
    ).toThrow(OverrideRequestError);
  });
});

describe("buildClearOverrideRequest", () => {
  it("sends a DELETE carrying only the reason", () => {
    const request = buildClearOverrideRequest({
      providerId: PROVIDER,
      featureKey: "google_calendar_sync",
      reason: "Back to plan defaults",
    });

    expect(request).toEqual({
      url: `/api/super-admin/providers/${PROVIDER}/feature-overrides/google_calendar_sync`,
      method: "DELETE",
      body: { reason: "Back to plan defaults" },
    });
  });

  it("requires a reason", () => {
    expect(() =>
      buildClearOverrideRequest({
        providerId: PROVIDER,
        featureKey: "google_calendar_sync",
        reason: " ",
      }),
    ).toThrow(OverrideRequestError);
  });
});
