import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  buildProviderPath,
  buildServicePath,
  getPublicVerticalSegment,
  normalizeUrlSlugSegment,
  parsePublicVerticalSegment,
  validateProviderSlug,
  validateServiceSlug,
} from "@/lib/public-url";
import type { ModuleStore, Service, VerticalId, WeeklyAvailability } from "@/lib/types";

export const PUBLIC_PROVIDER_SELECT =
  "id, full_name, business_name, slug, vertical, timezone, booking_window_days, availability";
export const PUBLIC_SERVICE_SELECT =
  "id, provider_id, name, slug, booking_type, duration_minutes, description, medical_specialty, capacity, cost, notes, sort_order";

type PublicProviderRow = {
  id: string;
  full_name: string;
  business_name: string;
  slug: string;
  vertical: VerticalId;
  timezone: string;
  booking_window_days: number;
  availability: WeeklyAvailability;
};

type PublicServiceRow = {
  id: string;
  provider_id: string;
  name: string;
  slug: string;
  booking_type: "appointment" | "full-day";
  duration_minutes: number | null;
  description: string;
  medical_specialty: string | null;
  capacity: string | null;
  cost: string | null;
  notes: string | null;
  sort_order: number;
};

type ProviderRedirectRow = {
  provider_id: string;
  vertical: VerticalId;
  slug: string;
  current_vertical: VerticalId;
  current_slug: string;
};

type ServiceRedirectRow = {
  provider_id: string;
  service_id: string;
  slug: string;
  current_slug: string;
};

export type PublicBookingResolved = {
  status: "resolved";
  store: ModuleStore;
  meta: {
    timezone: string;
    bookingWindowDays: number;
    canonicalPath: string;
    selectedServiceSlug?: string;
  };
};

export type PublicBookingRedirect = {
  status: "redirect";
  location: string;
};

export type PublicBookingResolution = PublicBookingResolved | PublicBookingRedirect;

export class PublicUrlLookupError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PublicUrlLookupError";
  }
}

export function isPublicUrlBackendUnavailable(error: unknown) {
  return (
    error instanceof PublicUrlLookupError ||
    (error instanceof Error &&
      error.message.includes("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"))
  );
}

function toPublicService(row: PublicServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    bookingType: row.booking_type,
    durationMinutes:
      row.booking_type === "appointment" ? row.duration_minutes ?? undefined : undefined,
    description: row.description,
    medicalSpecialty:
      row.booking_type === "appointment" ? row.medical_specialty ?? undefined : undefined,
    capacity: row.capacity ?? "",
    cost: row.cost ?? "",
    notes: row.notes ?? "",
    linkedAddress1: false,
    linkedAddress2: false,
    linkedPhone1: false,
    linkedPhone2: false,
    customAddress: undefined,
    customPhone: undefined,
  };
}

function toModuleStore(provider: PublicProviderRow, services: PublicServiceRow[]): ModuleStore {
  return {
    provider: {
      fullName: provider.full_name,
      businessName: provider.business_name,
      email: "",
      phoneNumber1: "",
      phoneNumber2: "",
      address1: "",
      address2: "",
      publicSlug: provider.slug,
    },
    services: services.map(toPublicService),
    availability: provider.availability,
    bookings: [],
    bookingHolds: [],
    setupComplete: true,
    vertical: provider.vertical,
  };
}

async function getProviderByScopedSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vertical: VerticalId,
  slug: string,
) {
  const { data, error } = await supabase
    .from("public_providers")
    .select(PUBLIC_PROVIDER_SELECT)
    .eq("vertical", vertical)
    .eq("slug", slug)
    .maybeSingle<PublicProviderRow>();

  if (error) {
    throw new PublicUrlLookupError("Could not resolve provider URL.", error);
  }

  return data;
}

async function getProviderById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  providerId: string,
) {
  const { data, error } = await supabase
    .from("public_providers")
    .select(PUBLIC_PROVIDER_SELECT)
    .eq("id", providerId)
    .maybeSingle<PublicProviderRow>();

  if (error) {
    throw new PublicUrlLookupError("Could not load redirected provider.", error);
  }

  return data;
}

async function getProviderRedirect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vertical: VerticalId,
  slug: string,
) {
  const { data, error } = await supabase
    .from("public_provider_slug_redirects")
    .select("provider_id, vertical, slug, current_vertical, current_slug")
    .eq("vertical", vertical)
    .eq("slug", slug)
    .maybeSingle<ProviderRedirectRow>();

  if (error) {
    throw new PublicUrlLookupError("Could not resolve provider redirect.", error);
  }

  return data;
}

async function getServicesForProvider(
  supabase: Awaited<ReturnType<typeof createClient>>,
  providerId: string,
) {
  const { data, error } = await supabase
    .from("public_services")
    .select(PUBLIC_SERVICE_SELECT)
    .eq("provider_id", providerId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<PublicServiceRow[]>();

  if (error) {
    throw new PublicUrlLookupError("Could not load provider services.", error);
  }

  return data ?? [];
}

async function getServiceRedirect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  providerId: string,
  slug: string,
) {
  const { data, error } = await supabase
    .from("public_service_slug_redirects")
    .select("provider_id, service_id, slug, current_slug")
    .eq("provider_id", providerId)
    .eq("slug", slug)
    .maybeSingle<ServiceRedirectRow>();

  if (error) {
    throw new PublicUrlLookupError("Could not resolve service redirect.", error);
  }

  return data;
}

function buildResolvedResult(options: {
  provider: PublicProviderRow;
  services: PublicServiceRow[];
  selectedService?: PublicServiceRow;
}) {
  const canonicalPath = options.selectedService
    ? buildServicePath(options.provider.vertical, options.provider.slug, options.selectedService.slug)
    : buildProviderPath(options.provider.vertical, options.provider.slug);

  return {
    status: "resolved",
    store: toModuleStore(options.provider, options.services),
    meta: {
      timezone: options.provider.timezone,
      bookingWindowDays: options.provider.booking_window_days,
      canonicalPath,
      selectedServiceSlug: options.selectedService?.slug,
    },
  } satisfies PublicBookingResolved;
}

export async function resolvePublicBookingUrl(options: {
  verticalSegment: string;
  providerSlug: string;
  serviceSlug?: string;
}): Promise<PublicBookingResolution | null> {
  const verticalSegment = options.verticalSegment.trim().toLowerCase();
  const vertical = parsePublicVerticalSegment(verticalSegment);

  if (!vertical) {
    return null;
  }

  const normalizedProviderSlug = normalizeUrlSlugSegment(options.providerSlug);
  const normalizedServiceSlug = options.serviceSlug
    ? normalizeUrlSlugSegment(options.serviceSlug)
    : undefined;

  if (!validateProviderSlug(normalizedProviderSlug).ok) {
    return null;
  }

  if (normalizedServiceSlug && !validateServiceSlug(normalizedServiceSlug).ok) {
    return null;
  }

  const supabase = await createClient();
  let provider = await getProviderByScopedSlug(supabase, vertical, normalizedProviderSlug);
  let needsCanonicalRedirect =
    options.providerSlug !== normalizedProviderSlug ||
    verticalSegment !== getPublicVerticalSegment(vertical);

  if (!provider) {
    const redirect = await getProviderRedirect(supabase, vertical, normalizedProviderSlug);

    if (!redirect) {
      return null;
    }

    provider = await getProviderById(supabase, redirect.provider_id);
    needsCanonicalRedirect = true;
  }

  if (!provider) {
    return null;
  }

  const services = await getServicesForProvider(supabase, provider.id);
  let selectedService: PublicServiceRow | undefined;

  if (normalizedServiceSlug) {
    selectedService = services.find((service) => service.slug === normalizedServiceSlug);

    if (!selectedService) {
      const redirect = await getServiceRedirect(supabase, provider.id, normalizedServiceSlug);
      selectedService = services.find((service) => service.id === redirect?.service_id);

      if (!selectedService) {
        return null;
      }

      needsCanonicalRedirect = true;
    }

    if (options.serviceSlug !== selectedService.slug) {
      needsCanonicalRedirect = true;
    }
  }

  const resolved = buildResolvedResult({ provider, services, selectedService });

  if (needsCanonicalRedirect) {
    return {
      status: "redirect",
      location: resolved.meta.canonicalPath,
    };
  }

  return resolved;
}
