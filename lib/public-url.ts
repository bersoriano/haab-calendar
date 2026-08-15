import type { Service, VerticalId } from "@/lib/types";

export const PROVIDER_SLUG_MAX_LENGTH = 48;
export const SERVICE_SLUG_MAX_LENGTH = 64;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PublicVerticalSegment =
  | "doctors"
  | "professionals"
  | "spaces"
  | "venues"
  | "events"
  | "restaurants";
// Owned by the entitlement catalog now. Imported for use here and re-exported
// so slug code and its tests keep importing it from this module unchanged.
import { getPlanFeatures, type ProviderPlanTier } from "@/lib/entitlements/catalog";
import {
  hasResolvedEntitlement,
  type ProviderEntitlements,
} from "@/lib/entitlements/resolve";

export type { ProviderPlanTier };

export type SlugValidationResult =
  | { ok: true; slug: string }
  | { ok: false; slug: string; message: string };

export type SlugAvailabilityResult =
  | { available: true; slug: string }
  | { available: false; slug: string; message: string };

const VERTICAL_TO_PUBLIC_SEGMENT: Record<VerticalId, PublicVerticalSegment> = {
  healthcare: "doctors",
  professional: "professionals",
  spaces: "spaces",
  events: "events",
  restaurant: "restaurants",
};

const PUBLIC_SEGMENT_TO_VERTICAL: Record<PublicVerticalSegment, VerticalId> = {
  doctors: "healthcare",
  professionals: "professional",
  spaces: "spaces",
  venues: "spaces",
  events: "events",
  restaurants: "restaurant",
};

const RESERVED_PROVIDER_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "login",
  "public",
  "settings",
]);

const RESERVED_SERVICE_SLUGS = new Set(["manage"]);

function collapseSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function trimSlug(value: string, maxLength: number) {
  return value.slice(0, maxLength).replace(/-+$/g, "");
}

export function generateSlug(
  value: string,
  options: {
    fallback?: string;
    maxLength?: number;
    maxWords?: number;
  } = {},
) {
  const fallback = options.fallback ?? "haab-calendar";
  const maxLength = options.maxLength ?? PROVIDER_SLUG_MAX_LENGTH;
  const maxWords = options.maxWords ?? 6;
  const collapsed = collapseSlug(value);
  const concise =
    maxWords > 0 ? collapsed.split("-").filter(Boolean).slice(0, maxWords).join("-") : collapsed;
  const slug = trimSlug(concise, maxLength);

  return slug || trimSlug(collapseSlug(fallback), maxLength) || "haab-calendar";
}

export function appendSlugCollisionSuffix(baseSlug: string, suffix: number, maxLength: number) {
  const suffixText = `-${suffix}`;
  return `${trimSlug(baseSlug, maxLength - suffixText.length)}${suffixText}`;
}

export async function generateUniqueSlug(options: {
  value: string;
  exists: (slug: string) => boolean | Promise<boolean>;
  fallback?: string;
  maxLength?: number;
  maxWords?: number;
  maxAttempts?: number;
}) {
  const maxLength = options.maxLength ?? PROVIDER_SLUG_MAX_LENGTH;
  const maxAttempts = options.maxAttempts ?? 100;
  const baseSlug = generateSlug(options.value, {
    fallback: options.fallback,
    maxLength,
    maxWords: options.maxWords,
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const candidate =
      attempt === 1 ? baseSlug : appendSlugCollisionSuffix(baseSlug, attempt, maxLength);

    if (!(await options.exists(candidate))) {
      return candidate;
    }
  }

  throw new Error(`Could not generate a unique slug after ${maxAttempts} attempts.`);
}

export function normalizeUrlSlugSegment(value: string) {
  return decodeURIComponent(value).trim().toLowerCase();
}

export function validateSlug(
  value: string,
  options: {
    fieldLabel?: string;
    maxLength?: number;
    reserved?: ReadonlySet<string>;
  } = {},
): SlugValidationResult {
  const fieldLabel = options.fieldLabel ?? "Slug";
  const maxLength = options.maxLength ?? PROVIDER_SLUG_MAX_LENGTH;
  const slug = value.trim();

  if (!slug) {
    return { ok: false, slug, message: `${fieldLabel} is required.` };
  }

  if (slug.length > maxLength) {
    return {
      ok: false,
      slug,
      message: `${fieldLabel} must be ${maxLength} characters or fewer.`,
    };
  }

  if (!SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      slug,
      message: `${fieldLabel} can only use lowercase letters, numbers, and single hyphens.`,
    };
  }

  if (options.reserved?.has(slug)) {
    return {
      ok: false,
      slug,
      message: `${fieldLabel} is reserved. Choose a different URL slug.`,
    };
  }

  return { ok: true, slug };
}

export function validateProviderSlug(value: string) {
  return validateSlug(value, {
    fieldLabel: "Public URL slug",
    maxLength: PROVIDER_SLUG_MAX_LENGTH,
    reserved: RESERVED_PROVIDER_SLUGS,
  });
}

export function validateServiceSlug(value: string) {
  return validateSlug(value, {
    fieldLabel: "Service URL slug",
    maxLength: SERVICE_SLUG_MAX_LENGTH,
    reserved: RESERVED_SERVICE_SLUGS,
  });
}

/**
 * Accepts a resolved entitlement snapshot, or a bare plan tier when the caller
 * has no snapshot to hand. A snapshot is the better answer: it accounts for
 * manual overrides, which a plan tier alone cannot see.
 */
export function canUseCustomProviderSlug(
  access: ProviderPlanTier | ProviderEntitlements,
) {
  if (typeof access === "string") {
    return getPlanFeatures(access).includes("custom_slug");
  }

  return hasResolvedEntitlement(access, "custom_slug");
}

export function validateCustomProviderSlug(
  value: string,
  access: ProviderPlanTier | ProviderEntitlements,
) {
  if (!canUseCustomProviderSlug(access)) {
    return {
      ok: false,
      slug: value.trim(),
      message: "Custom profile URL slugs are available on the premium plan.",
    } satisfies SlugValidationResult;
  }

  return validateProviderSlug(value);
}

export function parsePublicVerticalSegment(value: string): VerticalId | undefined {
  const segment = value.trim().toLowerCase();

  // A plain object literal inherits Object.prototype, so a bare index lookup
  // returns a truthy function for "constructor", "toString" and friends. That
  // used to be harmless, but this parser now backs isPublicBookingRoute, which
  // decides whether the proxy may promote a page's `?lang` into the shared
  // cookie — a policy boundary must only ever answer yes to a declared segment.
  if (!Object.prototype.hasOwnProperty.call(PUBLIC_SEGMENT_TO_VERTICAL, segment)) {
    return undefined;
  }

  return PUBLIC_SEGMENT_TO_VERTICAL[segment as PublicVerticalSegment];
}

export function getPublicVerticalSegment(vertical: VerticalId): PublicVerticalSegment {
  return VERTICAL_TO_PUBLIC_SEGMENT[vertical];
}

export function buildProviderPath(vertical: VerticalId, providerSlug: string) {
  return `/${getPublicVerticalSegment(vertical)}/${encodeURIComponent(providerSlug)}`;
}

export function buildServicePath(
  vertical: VerticalId,
  providerSlug: string,
  serviceSlug: string,
) {
  return `${buildProviderPath(vertical, providerSlug)}/${encodeURIComponent(serviceSlug)}`;
}

export function buildManagePath(vertical: VerticalId, providerSlug: string, token: string) {
  return `${buildProviderPath(vertical, providerSlug)}/manage/${encodeURIComponent(token)}`;
}

export function getServiceSlug(service: Pick<Service, "name" | "slug">) {
  return (
    service.slug ||
    generateSlug(service.name, {
      fallback: "service",
      maxLength: SERVICE_SLUG_MAX_LENGTH,
    })
  );
}
