import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getProviderDashboardStore } from "@/lib/supabase/bookings";
import { getServiceSlug } from "@/lib/public-url";
import { normalizeAvailability, normalizeProvider, normalizeServices } from "@/lib/store";
import type { BookingType, LocationKey, ModuleStore, Service, VerticalId } from "@/lib/types";

const PROVIDER_ID_SELECT = "id";
const SERVICE_SELECT = "id, slug";

type ProviderIdRow = {
  id: string;
};

type ServiceIdentityRow = {
  id: string;
  slug: string | null;
};

export class ProviderStoreWriteError extends Error {
  constructor(
    readonly userMessage: string,
    readonly status: number,
    readonly cause?: unknown,
  ) {
    super(userMessage);
    this.name = "ProviderStoreWriteError";
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function requireText(value: string, message: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ProviderStoreWriteError(message, 400);
  }
  return trimmed;
}

function requireVertical(value?: VerticalId): VerticalId {
  if (!value) {
    throw new ProviderStoreWriteError("Choose a booking vertical before publishing.", 400);
  }
  return value;
}

function normalizeBookingType(value: BookingType): BookingType {
  return value === "full-day" ? "full-day" : "appointment";
}

function trimOptional(value?: string) {
  return value?.trim() || null;
}

function toLocationPricesPayload(source?: Partial<Record<LocationKey, string>>) {
  const prices: Partial<Record<LocationKey, string>> = {};

  for (const key of ["address1", "address2", "custom"] as const) {
    const value = source?.[key]?.trim();
    if (value) {
      prices[key] = value;
    }
  }

  return prices;
}

function toServicePayload(providerId: string, service: Service, sortOrder: number) {
  const bookingType = normalizeBookingType(service.bookingType);

  return {
    provider_id: providerId,
    name: requireText(service.name, "Every service needs a name."),
    slug: getServiceSlug(service),
    booking_type: bookingType,
    duration_minutes:
      bookingType === "appointment" ? service.durationMinutes ?? 30 : null,
    description: requireText(service.description, "Every service needs a description."),
    medical_specialty:
      bookingType === "appointment" ? service.medicalSpecialty?.trim() || null : null,
    capacity: service.capacity?.trim() || null,
    cost: service.cost?.trim() || null,
    notes: service.notes?.trim() || null,
    sort_order: sortOrder,
    occurrence_mode: service.occurrenceMode ?? "periodic",
    occurrence_date:
      service.occurrenceMode === "single" ? service.occurrenceDate || null : null,
    weekdays: service.occurrenceMode === "weekly" ? service.weekdays ?? [] : [],
    start_time:
      service.occurrenceMode === "single" || service.occurrenceMode === "weekly"
        ? service.startTime || null
        : null,
    end_time:
      service.occurrenceMode === "single" || service.occurrenceMode === "weekly"
        ? service.endTime || null
        : null,
    max_spots:
      typeof service.maxSpots === "number" && Number.isFinite(service.maxSpots)
        ? Math.floor(service.maxSpots)
        : null,
    location_prices: toLocationPricesPayload(service.locationPrices),
    linked_address_1: Boolean(service.linkedAddress1),
    linked_address_2: Boolean(service.linkedAddress2),
    linked_phone_1: Boolean(service.linkedPhone1),
    linked_phone_2: Boolean(service.linkedPhone2),
    custom_address: trimOptional(service.customAddress),
    custom_phone: trimOptional(service.customPhone),
  };
}

async function getExistingProviderId(supabase: SupabaseClient, ownerUserId: string) {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_ID_SELECT)
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: true })
    .limit(1)
    .returns<ProviderIdRow[]>();

  if (error) {
    throw new ProviderStoreWriteError("Could not load your booking profile.", 500, error);
  }

  return data?.[0]?.id;
}

async function upsertProvider(options: {
  supabase: SupabaseClient;
  ownerUserId: string;
  ownerEmail?: string;
  store: ModuleStore;
}) {
  const provider = normalizeProvider(options.store.provider);
  const vertical = requireVertical(options.store.vertical);
  const profileRole = vertical === "events" ? "organizer" : "provider";
  const profileRoleTitle = profileRole === "organizer" ? "Organizer" : "Provider";
  const existingProviderId = await getExistingProviderId(options.supabase, options.ownerUserId);
  const email = requireText(
    provider.email || options.ownerEmail || "",
    `${profileRoleTitle} email is required.`,
  );
  const payload = {
    owner_user_id: options.ownerUserId,
    full_name: requireText(provider.fullName, `${profileRoleTitle} name is required.`),
    business_name: requireText(provider.businessName, "Business name is required."),
    email,
    slug: provider.publicSlug,
    vertical,
    language: provider.language,
    availability: normalizeAvailability(options.store.availability),
    setup_complete: Boolean(options.store.setupComplete),
    phone_number_1: provider.phoneNumber1.trim(),
    phone_number_2: provider.phoneNumber2.trim(),
    address_1: provider.address1.trim(),
    address_2: provider.address2.trim(),
    logo_image_url: trimOptional(provider.logoImageUrl),
    header_image_url: trimOptional(provider.headerImageUrl),
    hero_text: trimOptional(provider.heroText),
    gallery_image_urls: Array.isArray(provider.galleryImageUrls)
      ? provider.galleryImageUrls
          .filter((url) => typeof url === "string" && url.trim())
          .map((url) => url.trim())
      : [],
  };

  if (existingProviderId) {
    const { data, error } = await options.supabase
      .from("providers")
      .update(payload)
      .eq("id", existingProviderId)
      .select(PROVIDER_ID_SELECT)
      .single<ProviderIdRow>();

    if (error) {
      throw new ProviderStoreWriteError(
        `Could not update your ${profileRole} profile.`,
        500,
        error,
      );
    }

    return data.id;
  }

  const { data, error } = await options.supabase
    .from("providers")
    .insert(payload)
    .select(PROVIDER_ID_SELECT)
    .single<ProviderIdRow>();

  if (error) {
    throw new ProviderStoreWriteError(
      `Could not create your ${profileRole} profile.`,
      500,
      error,
    );
  }

  return data.id;
}

async function getExistingServices(supabase: SupabaseClient, providerId: string) {
  const { data, error } = await supabase
    .from("services")
    .select(SERVICE_SELECT)
    .eq("provider_id", providerId)
    .returns<ServiceIdentityRow[]>();

  if (error) {
    throw new ProviderStoreWriteError("Could not load your services.", 500, error);
  }

  return data ?? [];
}

async function upsertServices(options: {
  supabase: SupabaseClient;
  providerId: string;
  services: Service[];
}) {
  if (options.services.length === 0) {
    throw new ProviderStoreWriteError("Add at least one service before publishing.", 400);
  }

  const existingServices = await getExistingServices(options.supabase, options.providerId);
  const existingById = new Map(existingServices.map((service) => [service.id, service]));
  const existingBySlug = new Map(
    existingServices
      .filter((service) => service.slug)
      .map((service) => [service.slug as string, service]),
  );
  const retainedServiceIds = new Set<string>();

  for (const [index, service] of options.services.entries()) {
    const payload = toServicePayload(options.providerId, service, index);
    const existing =
      isUuid(service.id) && existingById.has(service.id)
        ? existingById.get(service.id)
        : existingBySlug.get(payload.slug);

    if (existing) {
      const { data, error } = await options.supabase
        .from("services")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single<{ id: string }>();

      if (error) {
        throw new ProviderStoreWriteError("Could not update one of your services.", 500, error);
      }

      retainedServiceIds.add(data.id);
      continue;
    }

    const { data, error } = await options.supabase
      .from("services")
      .insert(payload)
      .select("id")
      .single<{ id: string }>();

    if (error) {
      throw new ProviderStoreWriteError("Could not create one of your services.", 500, error);
    }

    retainedServiceIds.add(data.id);
  }

  const serviceIdsToDelete = existingServices
    .map((service) => service.id)
    .filter((id) => !retainedServiceIds.has(id));

  if (serviceIdsToDelete.length > 0) {
    const { error } = await options.supabase
      .from("services")
      .delete()
      .in("id", serviceIdsToDelete);

    if (error) {
      throw new ProviderStoreWriteError("Could not remove stale services.", 500, error);
    }
  }
}

export async function persistProviderStore(options: {
  supabase: SupabaseClient;
  ownerUserId: string;
  ownerEmail?: string;
  store: ModuleStore;
}) {
  const store: ModuleStore = {
    ...options.store,
    provider: normalizeProvider(options.store.provider),
    services: normalizeServices(options.store.services),
    availability: normalizeAvailability(options.store.availability),
    setupComplete: Boolean(options.store.setupComplete),
    vertical: requireVertical(options.store.vertical),
  };
  const providerId = await upsertProvider({
    supabase: options.supabase,
    ownerUserId: options.ownerUserId,
    ownerEmail: options.ownerEmail,
    store,
  });

  await upsertServices({
    supabase: options.supabase,
    providerId,
    services: store.services,
  });

  const dashboardStore = await getProviderDashboardStore(options.supabase, options.ownerUserId);

  if (!dashboardStore) {
    throw new ProviderStoreWriteError("Could not reload your saved booking profile.", 500);
  }

  return dashboardStore;
}
