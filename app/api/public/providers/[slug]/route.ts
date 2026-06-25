import { createClient } from "@/lib/supabase/server";
import {
  isPublicUrlBackendUnavailable,
  PUBLIC_PROVIDER_SELECT,
  PUBLIC_SERVICE_SELECT,
} from "@/lib/public-booking-resolver";
import { buildProviderPath, normalizeUrlSlugSegment, validateProviderSlug } from "@/lib/public-url";
import type { ModuleStore, Service, VerticalId, WeeklyAvailability } from "@/lib/types";

export const dynamic = "force-dynamic";

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

function toPublicStore(provider: PublicProviderRow, services: PublicServiceRow[]): ModuleStore {
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
      language: "en",
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
            "This booking link is shared by multiple verticals. Use the full provider URL.",
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
