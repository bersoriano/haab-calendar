import { createClient } from "@/lib/supabase/server";
import {
  isPublicUrlBackendUnavailable,
  PUBLIC_PROVIDER_SELECT,
  PUBLIC_SERVICE_SELECT,
} from "@/lib/public-booking-resolver";
import { buildProviderPath, normalizeUrlSlugSegment, validateProviderSlug } from "@/lib/public-url";
import type {
  LocationKey,
  ModuleStore,
  Service,
  VerticalId,
  WeekdayKey,
  WeeklyAvailability,
} from "@/lib/types";

export const dynamic = "force-dynamic";

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

function toPublicStore(provider: PublicProviderRow, services: PublicServiceRow[]): ModuleStore {
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const normalizedSlug = normalizeUrlSlugSegment(slug);

  if (!validateProviderSlug(normalizedSlug).ok) {
    return Response.json(
      { userMessage: "This booking link is invalid." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: providers, error: providerError } = await supabase
      .from("public_providers")
      .select(PUBLIC_PROVIDER_SELECT)
      .eq("slug", normalizedSlug)
      .limit(2)
      .returns<PublicProviderRow[]>();

    if (providerError) {
      throw providerError;
    }

    if ((providers ?? []).length > 1) {
      return Response.json(
        {
          userMessage:
            "This booking link is shared by multiple verticals. Use the full public URL.",
        },
        { status: 409 },
      );
    }

    const provider = providers?.[0];

    if (!provider) {
      return Response.json(
        { userMessage: "This booking link was not found." },
        { status: 404 },
      );
    }

    const { data: services, error: servicesError } = await supabase
      .from("public_services")
      .select(PUBLIC_SERVICE_SELECT)
      .eq("provider_id", provider.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .returns<PublicServiceRow[]>();

    if (servicesError) {
      throw servicesError;
    }

    return Response.json({
      store: toPublicStore(provider, services ?? []),
      meta: {
        timezone: provider.timezone,
        bookingWindowDays: provider.booking_window_days,
        canonicalPath: buildProviderPath(provider.vertical, provider.slug),
      },
    });
  } catch (error) {
    if (isPublicUrlBackendUnavailable(error)) {
      return Response.json(
        { userMessage: "The booking backend is not configured." },
        { status: 503 },
      );
    }

    console.error("public_provider_lookup_failed", {
      debugId: crypto.randomUUID(),
      slug: normalizedSlug,
      error: error instanceof Error ? error.message : String(error),
    });

    return Response.json(
      { userMessage: "We could not load this booking page. Please try again." },
      { status: 500 },
    );
  }
}
