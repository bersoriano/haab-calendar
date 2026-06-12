import {
  generateSlug,
  validateCustomProviderSlug,
  validateProviderSlug,
  validateServiceSlug,
  type ProviderPlanTier,
  type SlugAvailabilityResult,
} from "@/lib/public-url";
import type { VerticalId } from "@/lib/types";

type SlugQueryClient = {
  from: (table: string) => {
    select: (columns: string) => unknown;
  };
};

type SlugQueryBuilder = {
  eq: (column: string, value: string) => SlugQueryBuilder;
  neq: (column: string, value: string) => SlugQueryBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
};

async function hasBlockingRow(
  client: SlugQueryClient,
  table: string,
  filters: Array<[column: string, value: string]>,
  currentId?: { column: string; value: string },
) {
  let query = client.from(table).select("id") as SlugQueryBuilder;

  for (const [column, value] of filters) {
    query = query.eq(column, value);
  }

  const filtered = currentId ? query.neq(currentId.column, currentId.value) : query;
  const { data, error } = await filtered.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function checkProviderSlugAvailability(
  client: SlugQueryClient,
  options: {
    vertical: VerticalId;
    slug: string;
    currentProviderId?: string;
  },
): Promise<SlugAvailabilityResult> {
  const validation = validateProviderSlug(options.slug);

  if (!validation.ok) {
    return {
      available: false,
      slug: validation.slug,
      message: validation.message,
    };
  }

  const currentProviderFilter = options.currentProviderId
    ? { column: "id", value: options.currentProviderId }
    : undefined;
  const currentSlugTaken = await hasBlockingRow(
    client,
    "providers",
    [
      ["vertical", options.vertical],
      ["slug", validation.slug],
    ],
    currentProviderFilter,
  );

  if (currentSlugTaken) {
    return {
      available: false,
      slug: validation.slug,
      message: "That provider URL is already taken for this vertical.",
    };
  }

  const historicalSlugTaken = await hasBlockingRow(
    client,
    "provider_slug_redirects",
    [
      ["vertical", options.vertical],
      ["slug", validation.slug],
    ],
    options.currentProviderId
      ? { column: "provider_id", value: options.currentProviderId }
      : undefined,
  );

  if (historicalSlugTaken) {
    return {
      available: false,
      slug: validation.slug,
      message: "That provider URL is reserved by a previous redirect.",
    };
  }

  return { available: true, slug: validation.slug };
}

export async function checkServiceSlugAvailability(
  client: SlugQueryClient,
  options: {
    providerId: string;
    slug: string;
    currentServiceId?: string;
  },
): Promise<SlugAvailabilityResult> {
  const validation = validateServiceSlug(options.slug);

  if (!validation.ok) {
    return {
      available: false,
      slug: validation.slug,
      message: validation.message,
    };
  }

  const currentServiceFilter = options.currentServiceId
    ? { column: "id", value: options.currentServiceId }
    : undefined;
  const currentSlugTaken = await hasBlockingRow(
    client,
    "services",
    [
      ["provider_id", options.providerId],
      ["slug", validation.slug],
    ],
    currentServiceFilter,
  );

  if (currentSlugTaken) {
    return {
      available: false,
      slug: validation.slug,
      message: "That service URL is already taken for this provider.",
    };
  }

  const historicalSlugTaken = await hasBlockingRow(
    client,
    "service_slug_redirects",
    [
      ["provider_id", options.providerId],
      ["slug", validation.slug],
    ],
    options.currentServiceId
      ? { column: "service_id", value: options.currentServiceId }
      : undefined,
  );

  if (historicalSlugTaken) {
    return {
      available: false,
      slug: validation.slug,
      message: "That service URL is reserved by a previous redirect.",
    };
  }

  return { available: true, slug: validation.slug };
}

export async function prepareProviderSlugChange(
  client: SlugQueryClient,
  options: {
    vertical: VerticalId;
    requestedSlug: string;
    planTier: ProviderPlanTier;
    currentProviderId?: string;
  },
) {
  const validation = validateCustomProviderSlug(options.requestedSlug, options.planTier);

  if (!validation.ok) {
    return {
      ok: false,
      slug: validation.slug,
      message: validation.message,
    } as const;
  }

  const availability = await checkProviderSlugAvailability(client, {
    vertical: options.vertical,
    slug: validation.slug,
    currentProviderId: options.currentProviderId,
  });

  if (!availability.available) {
    return {
      ok: false,
      slug: availability.slug,
      message: availability.message,
    } as const;
  }

  return { ok: true, slug: availability.slug } as const;
}

export function generateProviderSlugSeed(displayName: string) {
  return generateSlug(displayName, { fallback: "haab-calendar", maxWords: 6 });
}

export function generateServiceSlugSeed(serviceTitle: string) {
  return generateSlug(serviceTitle, { fallback: "service", maxLength: 64, maxWords: 6 });
}
