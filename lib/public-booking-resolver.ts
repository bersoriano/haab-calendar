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
import type {
  LocationKey,
  ModuleStore,
  Service,
  VerticalId,
  WeekdayKey,
  WeeklyAvailability,
} from "@/lib/types";

export const PUBLIC_PROVIDER_SELECT =
  "id, full_name, business_name, slug, vertical, language, timezone, booking_window_days, availability, phone_number_1, phone_number_2, address_1, address_2, header_image_url, hero_text, gallery_image_urls, logo_image_url";
export const PUBLIC_SERVICE_SELECT =
  "id, provider_id, name, slug, booking_type, duration_minutes, description, medical_specialty, capacity, cost, notes, sort_order, occurrence_mode, occurrence_date, weekdays, start_time, end_time, max_spots, location_prices, linked_address_1, linked_address_2, linked_phone_1, linked_phone_2, custom_address, custom_phone";

type PublicProviderRow = {
  id: string;
  full_name: string;
  business_name: string;
  slug: string;
  vertical: VerticalId;
  language: "en" | "es" | null;
  timezone: string;
  booking_window_days: number;
  availability: WeeklyAvailability;
  phone_number_1: string | null;
  phone_number_2: string | null;
  address_1: string | null;
  address_2: string | null;
  logo_image_url: string | null;
  header_image_url: string | null;
  hero_text: string | null;
  gallery_image_urls: string[] | null;
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
  occurrence_mode: "single" | "periodic" | "weekly" | null;
  occurrence_date: string | null;
  weekdays: WeekdayKey[] | null;
  start_time: string | null;
  end_time: string | null;
  max_spots: number | null;
  location_prices: Partial<Record<LocationKey, string>> | null;
  linked_address_1: boolean | null;
  linked_address_2: boolean | null;
  linked_phone_1: boolean | null;
  linked_phone_2: boolean | null;
  custom_address: string | null;
  custom_phone: string | null;
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
    occurrenceMode: row.occurrence_mode ?? undefined,
    occurrenceDate: row.occurrence_date ?? undefined,
    weekdays: row.occurrence_mode === "weekly" ? row.weekdays ?? [] : undefined,
    startTime: row.start_time?.slice(0, 5),
    endTime: row.end_time?.slice(0, 5),
    maxSpots: row.max_spots ?? undefined,
    cost: row.cost ?? "",
    locationPrices: row.location_prices ?? undefined,
    notes: row.notes ?? "",
    linkedAddress1: row.linked_address_1 ?? false,
    linkedAddress2: row.linked_address_2 ?? false,
    linkedPhone1: row.linked_phone_1 ?? false,
    linkedPhone2: row.linked_phone_2 ?? false,
    customAddress: row.custom_address ?? undefined,
    customPhone: row.custom_phone ?? undefined,
  };
}

function toModuleStore(provider: PublicProviderRow, services: PublicServiceRow[]): ModuleStore {
  return {
    provider: {
      fullName: provider.full_name,
      businessName: provider.business_name,
      email: "",
      phoneNumber1: provider.phone_number_1 ?? "",
      phoneNumber2: provider.phone_number_2 ?? "",
      address1: provider.address_1 ?? "",
      address2: provider.address_2 ?? "",
      publicSlug: provider.slug,
      logoImageUrl: provider.logo_image_url?.trim() || undefined,
      headerImageUrl: provider.header_image_url?.trim() || undefined,
      heroText: provider.hero_text?.trim() || undefined,
      galleryImageUrls: Array.isArray(provider.gallery_image_urls)
        ? provider.gallery_image_urls.filter((url) => typeof url === "string" && url.trim())
        : undefined,
      language: provider.language === "es" ? "es" : "en",
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
