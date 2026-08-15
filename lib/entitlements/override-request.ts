import { FEATURE_KEYS, type FeatureKey } from "@/lib/entitlements/catalog";

/**
 * How the super-admin UI talks to the override route.
 *
 * Kept apart from the component so the payload — the part that decides paid
 * access — is testable without a DOM. The server validates all of this again:
 * nothing here is a security boundary, only a way to fail fast in the browser.
 */

export type OverrideRequest = {
  url: string;
  method: "PUT" | "DELETE";
  body: Record<string, unknown>;
};

export class OverrideRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverrideRequestError";
  }
}

function assertInputs(providerId: string, featureKey: string, reason: string) {
  if (!providerId) {
    throw new OverrideRequestError("A provider is required.");
  }

  if (!(FEATURE_KEYS as readonly string[]).includes(featureKey)) {
    throw new OverrideRequestError("Unknown feature.");
  }

  if (!reason.trim()) {
    throw new OverrideRequestError("A reason is required.");
  }
}

function overrideUrl(providerId: string, featureKey: string) {
  return `/api/super-admin/providers/${encodeURIComponent(providerId)}/feature-overrides/${encodeURIComponent(featureKey)}`;
}

/**
 * `expiresAt` arrives from a `datetime-local` input, which has no zone. It is
 * read as local time and sent as an instant, so the expiry the admin typed is
 * the expiry that gets stored.
 */
export function buildSetOverrideRequest(input: {
  providerId: string;
  featureKey: FeatureKey | string;
  enabled: boolean;
  expiresAt?: string;
  reason: string;
}): OverrideRequest {
  assertInputs(input.providerId, input.featureKey, input.reason);

  let expiresAt: string | null = null;

  if (input.expiresAt) {
    const parsed = Date.parse(input.expiresAt);

    if (Number.isNaN(parsed)) {
      throw new OverrideRequestError("Expiry must be a valid date and time.");
    }

    expiresAt = new Date(parsed).toISOString();
  }

  return {
    url: overrideUrl(input.providerId, input.featureKey),
    method: "PUT",
    body: {
      enabled: input.enabled,
      expiresAt,
      reason: input.reason.trim(),
    },
  };
}

export function buildClearOverrideRequest(input: {
  providerId: string;
  featureKey: FeatureKey | string;
  reason: string;
}): OverrideRequest {
  assertInputs(input.providerId, input.featureKey, input.reason);

  return {
    url: overrideUrl(input.providerId, input.featureKey),
    method: "DELETE",
    body: { reason: input.reason.trim() },
  };
}
