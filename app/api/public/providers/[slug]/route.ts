import { createClient } from "@/lib/supabase/server";
import type { ModuleStore, Service, WeeklyAvailability } from "@/lib/types";

export const dynamic = "force-dynamic";

type PublicProviderRow = {
  id: string;
  full_name: string;
  business_name: string;
  slug: string;
  timezone: string;
  booking_window_days: number;
  availability: WeeklyAvailability;
};

type PublicServiceRow = {
  id: string;
  provider_id: string;
  name: string;
  booking_type: "appointment" | "full-day";
  duration_minutes: number | null;
  description: string;
  capacity: string | null;
  cost: string | null;
  notes: string | null;
  sort_order: number;
};

function toPublicService(row: PublicServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    bookingType: row.booking_type,
    durationMinutes:
      row.booking_type === "appointment" ? row.duration_minutes ?? undefined : undefined,
    description: row.description,
    capacity: row.capacity ?? "",
    cost: row.cost ?? "",
    notes: row.notes ?? "",
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const normalizedSlug = decodeURIComponent(slug).trim().toLowerCase();

  if (!normalizedSlug) {
    return Response.json(
      { userMessage: "This booking link is invalid." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: provider, error: providerError } = await supabase
    .from("public_providers")
    .select("id, full_name, business_name, slug, timezone, booking_window_days, availability")
    .eq("slug", normalizedSlug)
    .maybeSingle<PublicProviderRow>();

  if (providerError) {
    console.error("public_provider_lookup_failed", {
      debugId: crypto.randomUUID(),
      slug: normalizedSlug,
      error: providerError.message,
    });

    return Response.json(
      { userMessage: "We could not load this booking page. Please try again." },
      { status: 500 },
    );
  }

  if (!provider) {
    return Response.json(
      { userMessage: "This booking link was not found." },
      { status: 404 },
    );
  }

  const { data: services, error: servicesError } = await supabase
    .from("public_services")
    .select(
      "id, provider_id, name, booking_type, duration_minutes, description, capacity, cost, notes, sort_order",
    )
    .eq("provider_id", provider.id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<PublicServiceRow[]>();

  if (servicesError) {
    console.error("public_services_lookup_failed", {
      debugId: crypto.randomUUID(),
      providerId: provider.id,
      error: servicesError.message,
    });

    return Response.json(
      { userMessage: "We could not load the available services. Please try again." },
      { status: 500 },
    );
  }

  const store: ModuleStore = {
    provider: {
      fullName: provider.full_name,
      businessName: provider.business_name,
      email: "",
      publicSlug: provider.slug,
    },
    services: (services ?? []).map(toPublicService),
    availability: provider.availability,
    bookings: [],
    bookingHolds: [],
    setupComplete: true,
  };

  return Response.json({
    store,
    meta: {
      timezone: provider.timezone,
      bookingWindowDays: provider.booking_window_days,
    },
  });
}
