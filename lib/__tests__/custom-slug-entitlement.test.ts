import { describe, expect, it, vi } from "vitest";

import { resolveEntitlements } from "@/lib/entitlements/resolve";
import { validateCustomProviderSlug, canUseCustomProviderSlug } from "@/lib/public-url";
import { prepareProviderSlugChange } from "@/lib/slug-management";

const PROVIDER = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-08-15T12:00:00.000Z");

function entitlements(
  planTier: string,
  overrides: Parameters<typeof resolveEntitlements>[0]["overrides"] = [],
  providerId = PROVIDER,
) {
  return resolveEntitlements({ providerId, planTier, overrides, now: NOW });
}

const ACTIVE_GRANT = [
  { featureKey: "custom_slug", enabled: true, expiresAt: "2026-09-01T00:00:00.000Z" },
];
const ACTIVE_REVOKE = [
  { featureKey: "custom_slug", enabled: false, expiresAt: null },
];
const EXPIRED_GRANT = [
  { featureKey: "custom_slug", enabled: true, expiresAt: "2026-08-01T00:00:00.000Z" },
];
const EXPIRED_REVOKE = [
  { featureKey: "custom_slug", enabled: false, expiresAt: "2026-08-01T00:00:00.000Z" },
];

describe("custom slug authorization", () => {
  it("denies a free plan with no override", () => {
    expect(canUseCustomProviderSlug(entitlements("free"))).toBe(false);
  });

  it("allows a premium plan with no override", () => {
    expect(canUseCustomProviderSlug(entitlements("premium"))).toBe(true);
  });

  it("allows a free plan carrying an active grant", () => {
    expect(canUseCustomProviderSlug(entitlements("free", ACTIVE_GRANT))).toBe(true);
  });

  it("denies a premium plan carrying an active revoke", () => {
    expect(canUseCustomProviderSlug(entitlements("premium", ACTIVE_REVOKE))).toBe(false);
  });

  it("ignores an expired grant and lets the free plan decide", () => {
    expect(canUseCustomProviderSlug(entitlements("free", EXPIRED_GRANT))).toBe(false);
  });

  it("ignores an expired revoke and lets the premium plan decide", () => {
    expect(canUseCustomProviderSlug(entitlements("premium", EXPIRED_REVOKE))).toBe(true);
  });

  it("fails closed on a plan that is not in the catalog", () => {
    expect(canUseCustomProviderSlug(entitlements("enterprise"))).toBe(false);
  });

  it("does not name a plan when refusing, because an override may be the reason", () => {
    const result = validateCustomProviderSlug("dr-ahmad", entitlements("free"));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected the slug to be refused.");
    expect(result.message).not.toMatch(/premium/i);
  });

  it("still rejects a malformed slug once the entitlement passes", () => {
    expect(validateCustomProviderSlug("Dr_Ahmad", entitlements("premium")).ok).toBe(false);
    expect(validateCustomProviderSlug("dr--ahmad", entitlements("premium")).ok).toBe(false);
    expect(validateCustomProviderSlug("dr-ahmad", entitlements("premium")).ok).toBe(true);
  });
});

type Row = Record<string, string>;

function createSlugClient(rowsByTable: Record<string, Row[]>) {
  const from = vi.fn((table: string) => ({
    select() {
      const filters: Array<[string, string]> = [];
      const exclusions: Array<[string, string]> = [];
      const builder = {
        eq(column: string, value: string) {
          filters.push([column, value]);
          return builder;
        },
        neq(column: string, value: string) {
          exclusions.push([column, value]);
          return builder;
        },
        async maybeSingle() {
          const row = (rowsByTable[table] ?? []).find(
            (candidate) =>
              filters.every(([column, value]) => candidate[column] === value) &&
              exclusions.every(([column, value]) => candidate[column] !== value),
          );

          return { data: row ?? null, error: null };
        },
      };

      return builder;
    },
  }));

  return { client: { from }, from };
}

describe("prepareProviderSlugChange", () => {
  it("refuses before it queries anything when the feature is not entitled", async () => {
    const { client, from } = createSlugClient({
      providers: [],
      provider_slug_redirects: [],
    });

    const result = await prepareProviderSlugChange(client, {
      vertical: "healthcare",
      requestedSlug: "dr-ahmad",
      entitlements: entitlements("free"),
      currentProviderId: PROVIDER,
    });

    expect(result.ok).toBe(false);
    // A refusal must cost nothing: no availability lookup, no redirect lookup.
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects a snapshot resolved for a different provider", async () => {
    const { client, from } = createSlugClient({
      providers: [],
      provider_slug_redirects: [],
    });

    const result = await prepareProviderSlugChange(client, {
      vertical: "healthcare",
      requestedSlug: "dr-ahmad",
      entitlements: entitlements("premium", [], "00000000-0000-4000-8000-0000000000ff"),
      currentProviderId: PROVIDER,
    });

    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("accepts a free provider carrying an active grant", async () => {
    const { client } = createSlugClient({
      providers: [],
      provider_slug_redirects: [],
    });

    const result = await prepareProviderSlugChange(client, {
      vertical: "healthcare",
      requestedSlug: "dr-ahmad",
      entitlements: entitlements("free", ACTIVE_GRANT),
      currentProviderId: PROVIDER,
    });

    expect(result).toEqual({ ok: true, slug: "dr-ahmad" });
  });

  it("refuses a premium provider carrying an active revoke", async () => {
    const { client, from } = createSlugClient({
      providers: [],
      provider_slug_redirects: [],
    });

    const result = await prepareProviderSlugChange(client, {
      vertical: "healthcare",
      requestedSlug: "dr-ahmad",
      entitlements: entitlements("premium", ACTIVE_REVOKE),
      currentProviderId: PROVIDER,
    });

    expect(result.ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("still reports a slug already taken by another provider", async () => {
    const { client } = createSlugClient({
      providers: [
        { id: "provider-9", vertical: "healthcare", slug: "dr-ahmad" },
      ],
      provider_slug_redirects: [],
    });

    const result = await prepareProviderSlugChange(client, {
      vertical: "healthcare",
      requestedSlug: "dr-ahmad",
      entitlements: entitlements("premium"),
      currentProviderId: PROVIDER,
    });

    expect(result.ok).toBe(false);
  });

  it("still reports a slug reserved by redirect history", async () => {
    const { client } = createSlugClient({
      providers: [],
      provider_slug_redirects: [
        { provider_id: "provider-9", vertical: "healthcare", slug: "dr-ahmad" },
      ],
    });

    const result = await prepareProviderSlugChange(client, {
      vertical: "healthcare",
      requestedSlug: "dr-ahmad",
      entitlements: entitlements("premium"),
      currentProviderId: PROVIDER,
    });

    expect(result.ok).toBe(false);
  });
});
