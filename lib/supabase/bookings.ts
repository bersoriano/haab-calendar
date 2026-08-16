import "server-only";

import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getAvailableSlots,
  isDateAvailable,
} from "@/lib/availability";
import {
  addDays,
  addMinutes,
  compareDateKeys,
  getDateKey,
  getDateTimeKeysInTimeZone,
  parseDateKey,
} from "@/lib/date";
import { BOOKING_HOLD_DURATION_MS } from "@/lib/constants";
import { formatCapacityLabel } from "@/lib/format";
import { getEffectiveCost } from "@/lib/locations";
import { isUnsetTimeZone, normalizeTimeZone } from "@/lib/timezone";
import { normalizePublicTheme } from "@/lib/public-theme";
import { getPublicVerticalSegment } from "@/lib/public-url";
import type {
  BookingHoldRecord,
  BookingRecord,
  BookingStatus,
  BookingType,
  LocationKey,
  ModuleStore,
  ProviderInfo,
  Service,
  VerticalId,
  WeekdayKey,
  WeeklyAvailability,
} from "@/lib/types";

const PROVIDER_SELECT =
  "id, owner_user_id, full_name, business_name, email, slug, vertical, language, dashboard_language, public_theme, timezone, booking_window_days, availability, setup_complete, phone_number_1, phone_number_2, address_1, address_2, logo_image_url, header_image_url, hero_text, gallery_image_urls";
const SERVICE_SELECT =
  "id, provider_id, name, slug, booking_type, duration_minutes, description, medical_specialty, capacity, cost, notes, sort_order, occurrence_mode, occurrence_date, weekdays, start_time, end_time, max_spots, capacity_scope, max_party_size, location_prices, linked_address_1, linked_address_2, linked_phone_1, linked_phone_2, custom_address, custom_phone";
const BOOKING_SELECT =
  "id, provider_id, service_id, service_name, booking_type, duration_minutes_snapshot, cost_snapshot, capacity_snapshot, client_name, client_email, client_phone, date, start_time, end_time, status, notes, location_snapshot, allows_shared_capacity, details, details_schema_key, details_schema_version, service_snapshot, created_at, updated_at";
const BOOKING_HOLD_SELECT =
  "id, provider_id, service_id, booking_type, date, start_time, end_time, expires_at, created_at, allows_shared_capacity";

type ProviderRow = {
  id: string;
  owner_user_id: string;
  full_name: string;
  business_name: string;
  email: string;
  slug: string;
  vertical: VerticalId;
  language: "en" | "es" | null;
  dashboard_language: "en" | "es" | null;
  public_theme: string | null;
  timezone: string;
  booking_window_days: number;
  availability: WeeklyAvailability;
  setup_complete: boolean;
  phone_number_1: string | null;
  phone_number_2: string | null;
  address_1: string | null;
  address_2: string | null;
  logo_image_url: string | null;
  header_image_url: string | null;
  hero_text: string | null;
  gallery_image_urls: string[] | null;
};

type ServiceRow = {
  id: string;
  provider_id: string;
  name: string;
  slug: string | null;
  booking_type: BookingType;
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
  capacity_scope: "date" | "slot" | null;
  max_party_size: number | null;
  location_prices: Partial<Record<LocationKey, string>> | null;
  linked_address_1: boolean | null;
  linked_address_2: boolean | null;
  linked_phone_1: boolean | null;
  linked_phone_2: boolean | null;
  custom_address: string | null;
  custom_phone: string | null;
};

type BookingRow = {
  id: string;
  provider_id: string;
  service_id: string | null;
  service_name: string;
  booking_type: BookingType;
  duration_minutes_snapshot: number | null;
  cost_snapshot: string | null;
  capacity_snapshot: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  status: BookingStatus;
  notes: string | null;
  location_snapshot: string | null;
  allows_shared_capacity: boolean | null;
  details: Record<string, unknown> | null;
  details_schema_key: string | null;
  details_schema_version: number | null;
  service_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type BookingHoldRow = {
  id: string;
  provider_id: string;
  service_id: string;
  booking_type: BookingType;
  date: string;
  start_time: string | null;
  end_time: string | null;
  expires_at: string;
  extension_count?: number;
  created_at: string;
  allows_shared_capacity?: boolean | null;
};

export type ConfirmPublicBookingInput = {
  vertical: VerticalId;
  providerSlug: string;
  serviceId: string;
  dateKey: string;
  time?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  /** Restaurants: guests in the party. Validated against the table's cap. */
  partySize?: number;
  notes?: string;
  location?: string;
  locationKey?: LocationKey;
  details?: Record<string, unknown>;
  detailsSchemaKey?: string;
  detailsSchemaVersion?: number;
  idempotencyKey?: string;
  holdId?: string;
};

export type CreatePublicBookingHoldInput = {
  vertical: VerticalId;
  providerSlug: string;
  serviceId: string;
  dateKey: string;
  time?: string;
};

export type ReleasePublicBookingHoldInput = {
  vertical: VerticalId;
  providerSlug: string;
  holdId: string;
};

export type PublicBookingHoldLookupInput = ReleasePublicBookingHoldInput;

export type ManageBookingInput = {
  vertical: VerticalId;
  providerSlug: string;
  token: string;
};

export type RescheduleBookingInput = {
  bookingId: string;
  dateKey: string;
  time?: string;
  actorType: "provider" | "customer";
  manageToken?: string;
};

export class PublicBookingWriteError extends Error {
  constructor(
    readonly userMessage: string,
    readonly status: number,
    readonly cause?: unknown,
  ) {
    super(userMessage);
    this.name = "PublicBookingWriteError";
  }
}

function toTimeKey(value?: string | null) {
  return value ? value.slice(0, 5) : undefined;
}

function randomToken(bytes = 16) {
  return randomBytes(bytes).toString("base64url");
}

function hashManageToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createConfirmationNumber() {
  return `HAAB-${Date.now().toString(36).toUpperCase()}-${randomToken(4).toUpperCase()}`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeDetails(value: unknown): Record<string, unknown> {
  if (!isPlainRecord(value)) return {};
  const serialized = JSON.stringify(value);
  if (serialized.length > 20_000) {
    throw new PublicBookingWriteError("Booking details are too large.", 413);
  }
  return value;
}

function toProviderInfo(row: ProviderRow, includeEmail: boolean): ProviderInfo {
  return {
    fullName: row.full_name,
    businessName: row.business_name,
    email: includeEmail ? row.email : "",
    phoneNumber1: row.phone_number_1 ?? "",
    phoneNumber2: row.phone_number_2 ?? "",
    address1: row.address_1 ?? "",
    address2: row.address_2 ?? "",
    publicSlug: row.slug,
    logoImageUrl: row.logo_image_url?.trim() || undefined,
    headerImageUrl: row.header_image_url?.trim() || undefined,
    heroText: row.hero_text?.trim() || undefined,
    galleryImageUrls: Array.isArray(row.gallery_image_urls)
      ? row.gallery_image_urls.filter((url) => typeof url === "string" && url.trim())
      : undefined,
    language: row.language === "es" ? "es" : "en",
    publicTheme: normalizePublicTheme(row.public_theme),
    dashboardLanguage:
      row.dashboard_language === "es" || row.dashboard_language === "en"
        ? row.dashboard_language
        : undefined,
    // "UTC" is the column default, so it reads back as "never chosen" — the
    // dashboard then offers the detected zone instead of looking configured.
    timezone: isUnsetTimeZone(row.timezone) ? "" : normalizeTimeZone(row.timezone),
  };
}

function toService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? undefined,
    bookingType: row.booking_type,
    durationMinutes:
      row.booking_type === "appointment" ? row.duration_minutes ?? undefined : undefined,
    description: row.description,
    medicalSpecialty:
      row.booking_type === "appointment" ? row.medical_specialty ?? undefined : undefined,
    capacity: row.capacity ?? undefined,
    occurrenceMode: row.occurrence_mode ?? undefined,
    occurrenceDate: row.occurrence_date ?? undefined,
    weekdays: row.occurrence_mode === "weekly" ? row.weekdays ?? [] : undefined,
    startTime: toTimeKey(row.start_time),
    endTime: toTimeKey(row.end_time),
    maxSpots: row.max_spots ?? undefined,
    capacityScope: row.capacity_scope ?? undefined,
    maxPartySize: row.max_party_size ?? undefined,
    cost: row.cost ?? undefined,
    locationPrices: row.location_prices ?? undefined,
    notes: row.notes ?? undefined,
    linkedAddress1: row.linked_address_1 ?? false,
    linkedAddress2: row.linked_address_2 ?? false,
    linkedPhone1: row.linked_phone_1 ?? false,
    linkedPhone2: row.linked_phone_2 ?? false,
    customAddress: row.custom_address ?? undefined,
    customPhone: row.custom_phone ?? undefined,
  };
}

/** Restaurants: a party consumes one table whatever its size, so the guest
 * count never enters the capacity arithmetic and rides in `details`. */
function readPartySize(details: BookingRow["details"]) {
  const value = isPlainRecord(details) ? details.partySize : undefined;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

/** The client's post-booking note lives in `details`, so it needs no column. */
function readClientNote(details: BookingRow["details"]) {
  const value = isPlainRecord(details) ? details.clientNote : undefined;
  return typeof value === "string" ? value : "";
}

function toBookingRecord(row: BookingRow, manageToken = ""): BookingRecord {
  return {
    id: row.id,
    serviceId: row.service_id ?? "",
    serviceName: row.service_name,
    bookingType: row.booking_type,
    dateKey: row.date,
    startTime: toTimeKey(row.start_time),
    endTime: toTimeKey(row.end_time),
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    notes: row.notes ?? "",
    clientNote: readClientNote(row.details),
    capacitySnapshot: row.capacity_snapshot ?? undefined,
    sharedCapacity: row.allows_shared_capacity ?? false,
    partySize: readPartySize(row.details),
    cost: row.cost_snapshot ?? "",
    location: row.location_snapshot ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    manageToken,
  };
}

function toBookingHoldRecord(row: BookingHoldRow): BookingHoldRecord {
  return {
    id: row.id,
    serviceId: row.service_id,
    bookingType: row.booking_type,
    dateKey: row.date,
    startTime: toTimeKey(row.start_time),
    endTime: toTimeKey(row.end_time),
    createdAt: row.created_at,
    expiresAt: new Date(row.expires_at).getTime(),
    extensionCount: row.extension_count ?? 0,
    sharedCapacity: row.allows_shared_capacity ?? false,
  };
}

function getBookingEndTime(service: Service, time?: string) {
  if (service.bookingType !== "appointment" || !service.durationMinutes || !time) {
    return undefined;
  }
  return addMinutes(time, service.durationMinutes);
}

/**
 * A party takes one table whatever its size, so this never affects capacity —
 * it only keeps a booking inside what the table can seat.
 */
function validatePartySize(service: Service, partySize?: number) {
  if (partySize === undefined) {
    return;
  }

  if (!Number.isInteger(partySize) || partySize < 1) {
    throw new PublicBookingWriteError("Enter how many guests are coming.", 400);
  }

  if (typeof service.maxPartySize === "number" && partySize > service.maxPartySize) {
    throw new PublicBookingWriteError(
      `This table seats up to ${service.maxPartySize} guests. Call us for a larger party.`,
      400,
    );
  }
}

function validateDateWindow(provider: ProviderRow, dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new PublicBookingWriteError("Choose a valid booking date.", 400);
  }

  const providerToday = getDateTimeKeysInTimeZone(
    new Date(),
    provider.timezone,
  ).dateKey;

  if (compareDateKeys(dateKey, providerToday) < 0) {
    throw new PublicBookingWriteError("Choose a future booking date.", 400);
  }

  const maxDateKey = getDateKey(
    addDays(parseDateKey(providerToday), provider.booking_window_days),
  );
  if (compareDateKeys(dateKey, maxDateKey) > 0) {
    throw new PublicBookingWriteError(
      provider.vertical === "events"
        ? "That date is outside this organizer's registration window."
        : "That date is outside this provider's booking window.",
      400,
    );
  }
}

function assertSlotAvailable(options: {
  service: Service;
  provider: ProviderRow;
  dateKey: string;
  time?: string;
  bookings: BookingRecord[];
  bookingHolds?: BookingHoldRecord[];
  ignoredBookingId?: string;
  ignoredHoldId?: string;
}) {
  const {
    service,
    provider,
    dateKey,
    time,
    bookings,
    bookingHolds = [],
    ignoredBookingId,
    ignoredHoldId,
  } = options;

  if (service.bookingType === "appointment") {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      throw new PublicBookingWriteError("Choose a valid appointment time.", 400);
    }

    if (
      !getAvailableSlots(
        dateKey,
        service,
        provider.availability,
        bookings,
        ignoredBookingId,
        bookingHolds,
        ignoredHoldId,
        { timeZone: provider.timezone },
      ).includes(time)
    ) {
      throw new PublicBookingWriteError(
        "That time is no longer available. Choose another slot.",
        409,
      );
    }
    return;
  }

  if (
    !isDateAvailable(
      dateKey,
      service,
      provider.availability,
      bookings,
      ignoredBookingId,
      bookingHolds,
      ignoredHoldId,
      { timeZone: provider.timezone },
    )
  ) {
    throw new PublicBookingWriteError(
      "That date is no longer available. Choose another day.",
      409,
    );
  }
}

function isUniqueViolation(error: unknown) {
  return isPlainRecord(error) && error.code === "23505";
}

function isExclusionViolation(error: unknown) {
  return isPlainRecord(error) && error.code === "23P01";
}

function isCapacityViolation(error: unknown) {
  return (
    isPlainRecord(error) &&
    error.code === "23514" &&
    typeof error.message === "string" &&
    (error.message.includes("HAAB_CAPACITY_FULL") ||
      error.message.includes("Event capacity is full"))
  );
}

async function getPublishedProvider(
  supabase: SupabaseClient,
  vertical: VerticalId,
  providerSlug: string,
) {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_SELECT)
    .eq("vertical", vertical)
    .eq("slug", providerSlug)
    .eq("setup_complete", true)
    .maybeSingle<ProviderRow>();

  if (error) {
    throw new PublicBookingWriteError("Could not load this booking page.", 500, error);
  }

  if (!data) {
    throw new PublicBookingWriteError("This booking link was not found.", 404);
  }

  const { data: publication, error: publicationError } = await supabase
    .from("user_publication_settings")
    .select("publishing_enabled")
    .eq("user_id", data.owner_user_id)
    .maybeSingle<{ publishing_enabled: boolean }>();

  if (publicationError) {
    throw new PublicBookingWriteError(
      "Could not load this booking page.",
      500,
      publicationError,
    );
  }

  if (publication?.publishing_enabled === false) {
    throw new PublicBookingWriteError("This booking link was not found.", 404);
  }

  return data;
}

async function getProviderById(supabase: SupabaseClient, providerId: string) {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_SELECT)
    .eq("id", providerId)
    .maybeSingle<ProviderRow>();

  if (error) {
    throw new PublicBookingWriteError("Could not load this booking page.", 500, error);
  }

  if (!data) {
    throw new PublicBookingWriteError("This booking page was not found.", 404);
  }

  return data;
}

async function getServiceForBooking(
  supabase: SupabaseClient,
  providerId: string,
  serviceId: string,
) {
  const { data, error } = await supabase
    .from("services")
    .select(SERVICE_SELECT)
    .eq("provider_id", providerId)
    .eq("id", serviceId)
    .maybeSingle<ServiceRow>();

  if (error) {
    throw new PublicBookingWriteError("Could not load that service.", 500, error);
  }

  if (!data) {
    throw new PublicBookingWriteError("That service is not available.", 404);
  }

  return data;
}

async function deleteExpiredHolds(supabase: SupabaseClient, providerId: string) {
  const { error } = await supabase
    .from("booking_holds")
    .delete()
    .eq("provider_id", providerId)
    .lte("expires_at", new Date().toISOString());

  if (error) {
    throw new PublicBookingWriteError("Could not refresh booking holds.", 500, error);
  }
}

async function getActiveBookingsForDate(
  supabase: SupabaseClient,
  providerId: string,
  dateKey: string,
) {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("provider_id", providerId)
    .eq("date", dateKey)
    .in("status", ["confirmed", "rescheduled"])
    .returns<BookingRow[]>();

  if (error) {
    throw new PublicBookingWriteError("Could not check current availability.", 500, error);
  }

  return (data ?? []).map((booking) => toBookingRecord(booking));
}

async function getActiveBookingHoldsForDate(
  supabase: SupabaseClient,
  providerId: string,
  dateKey: string,
) {
  await deleteExpiredHolds(supabase, providerId);

  const { data, error } = await supabase
    .from("booking_holds")
    .select(BOOKING_HOLD_SELECT)
    .eq("provider_id", providerId)
    .eq("date", dateKey)
    .gt("expires_at", new Date().toISOString())
    .returns<BookingHoldRow[]>();

  if (error) {
    throw new PublicBookingWriteError("Could not check current booking holds.", 500, error);
  }

  return (data ?? []).map(toBookingHoldRecord);
}

async function getBookingById(supabase: SupabaseClient, bookingId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", bookingId)
    .maybeSingle<BookingRow>();

  if (error) {
    throw new PublicBookingWriteError("Could not load that booking.", 500, error);
  }

  if (!data) {
    throw new PublicBookingWriteError("That booking was not found.", 404);
  }

  return data;
}

async function getBookingByManageToken(
  supabase: SupabaseClient,
  providerId: string,
  token: string,
) {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("provider_id", providerId)
    .eq("manage_token_hash", hashManageToken(token))
    .maybeSingle<BookingRow>();

  if (error) {
    throw new PublicBookingWriteError("Could not load that booking.", 500, error);
  }

  if (!data) {
    throw new PublicBookingWriteError("That booking link was not found.", 404);
  }

  return data;
}

async function insertBookingEvent(
  supabase: SupabaseClient,
  options: {
    bookingId: string;
    providerId: string;
    actorType: "provider" | "customer" | "system";
    eventType: "created" | "rescheduled" | "cancelled" | "hold_expired" | "note_added";
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("booking_events").insert({
    booking_id: options.bookingId,
    provider_id: options.providerId,
    actor_type: options.actorType,
    event_type: options.eventType,
    metadata: options.metadata ?? {},
  });

  if (error) {
    console.error("booking_event_create_failed", {
      bookingId: options.bookingId,
      eventType: options.eventType,
      error: error.message,
    });
  }
}

function assertMatchingHold(options: {
  hold?: BookingHoldRecord;
  service: Service;
  dateKey: string;
  time?: string;
}) {
  const expectedStart =
    options.service.bookingType === "appointment" ? options.time : undefined;
  const expectedEnd = getBookingEndTime(options.service, options.time);

  if (!options.hold) {
    throw new PublicBookingWriteError(
      "That temporary hold expired. Choose the slot again.",
      409,
    );
  }

  if (
    options.hold.serviceId !== options.service.id ||
    options.hold.dateKey !== options.dateKey ||
    options.hold.bookingType !== options.service.bookingType ||
    options.hold.startTime !== expectedStart ||
    options.hold.endTime !== expectedEnd
  ) {
    throw new PublicBookingWriteError(
      "That temporary hold does not match this booking.",
      409,
    );
  }
}

export async function createPublicBookingHold(
  supabase: SupabaseClient,
  input: CreatePublicBookingHoldInput,
) {
  const provider = await getPublishedProvider(supabase, input.vertical, input.providerSlug);
  const serviceRow = await getServiceForBooking(supabase, provider.id, input.serviceId);
  const service = toService(serviceRow);

  validateDateWindow(provider, input.dateKey);

  const [activeBookings, activeHolds] = await Promise.all([
    getActiveBookingsForDate(supabase, provider.id, input.dateKey),
    getActiveBookingHoldsForDate(supabase, provider.id, input.dateKey),
  ]);

  assertSlotAvailable({
    service,
    provider,
    dateKey: input.dateKey,
    time: input.time,
    bookings: activeBookings,
    bookingHolds: activeHolds,
  });

  const startTime = service.bookingType === "appointment" ? input.time : undefined;
  const endTime = getBookingEndTime(service, input.time);
  // Same constant the client counts down from, so the visible timer and the
  // server's expiry can never drift apart.
  const expiresAt = new Date(Date.now() + BOOKING_HOLD_DURATION_MS).toISOString();

  const { data, error } = await supabase
    .from("booking_holds")
    .insert({
      provider_id: provider.id,
      service_id: service.id,
      booking_type: service.bookingType,
      date: input.dateKey,
      start_time: startTime ?? null,
      end_time: endTime ?? null,
      expires_at: expiresAt,
    })
    .select(BOOKING_HOLD_SELECT)
    .single<BookingHoldRow>();

  if (error) {
    if (isUniqueViolation(error) || isExclusionViolation(error) || isCapacityViolation(error)) {
      throw new PublicBookingWriteError(
        isCapacityViolation(error)
          ? "That selection just reached capacity. Choose another time."
          : "That time is currently being held. Choose another slot.",
        409,
        error,
      );
    }

    throw new PublicBookingWriteError("Could not hold that slot.", 500, error);
  }

  return { hold: toBookingHoldRecord(data), serverNow: Date.now() };
}

export async function getPublicBookingHoldStatus(
  supabase: SupabaseClient,
  input: PublicBookingHoldLookupInput,
) {
  const provider = await getPublishedProvider(supabase, input.vertical, input.providerSlug);
  await deleteExpiredHolds(supabase, provider.id);

  const { data, error } = await supabase
    .from("booking_holds")
    .select(BOOKING_HOLD_SELECT)
    .eq("provider_id", provider.id)
    .eq("id", input.holdId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<BookingHoldRow>();

  if (error) {
    throw new PublicBookingWriteError("Could not refresh that hold.", 500, error);
  }

  return {
    active: Boolean(data),
    hold: data ? toBookingHoldRecord(data) : undefined,
    serverNow: Date.now(),
  };
}

export async function extendPublicBookingHold(
  supabase: SupabaseClient,
  input: PublicBookingHoldLookupInput,
) {
  const provider = await getPublishedProvider(supabase, input.vertical, input.providerSlug);
  const { data: rawData, error } = await supabase.rpc("extend_public_booking_hold", {
      p_provider_id: provider.id,
      p_hold_id: input.holdId,
    });

  if (error) {
    throw new PublicBookingWriteError("Could not extend that hold.", 500, error);
  }

  const data = rawData as BookingHoldRow[] | null;
  const hold = data?.[0];
  if (!hold) {
    throw new PublicBookingWriteError(
      "That temporary hold expired or was already extended. Choose the slot again.",
      409,
    );
  }

  return { hold: toBookingHoldRecord(hold), serverNow: Date.now() };
}

export async function releasePublicBookingHold(
  supabase: SupabaseClient,
  input: ReleasePublicBookingHoldInput,
) {
  const provider = await getPublishedProvider(supabase, input.vertical, input.providerSlug);
  const { error } = await supabase
    .from("booking_holds")
    .delete()
    .eq("provider_id", provider.id)
    .eq("id", input.holdId);

  if (error) {
    throw new PublicBookingWriteError("Could not release that hold.", 500, error);
  }

  return { released: true };
}

export async function confirmPublicBooking(
  supabase: SupabaseClient,
  input: ConfirmPublicBookingInput,
) {
  const provider = await getPublishedProvider(supabase, input.vertical, input.providerSlug);
  const serviceRow = await getServiceForBooking(supabase, provider.id, input.serviceId);
  const service = toService(serviceRow);
  validatePartySize(service, input.partySize);

  const details =
    input.partySize === undefined
      ? safeDetails(input.details)
      : { ...safeDetails(input.details), partySize: input.partySize };

  const detailsSchemaKey =
    input.detailsSchemaKey?.trim() ||
    (input.partySize === undefined ? "base" : "restaurant");
  const detailsSchemaVersion =
    Number.isInteger(input.detailsSchemaVersion) && input.detailsSchemaVersion
      ? input.detailsSchemaVersion
      : 1;

  validateDateWindow(provider, input.dateKey);

  const [activeBookings, activeHolds] = await Promise.all([
    getActiveBookingsForDate(supabase, provider.id, input.dateKey),
    getActiveBookingHoldsForDate(supabase, provider.id, input.dateKey),
  ]);
  const matchingHold = input.holdId
    ? activeHolds.find((hold) => hold.id === input.holdId)
    : undefined;

  if (input.holdId) {
    assertMatchingHold({
      hold: matchingHold,
      service,
      dateKey: input.dateKey,
      time: input.time,
    });
  }

  assertSlotAvailable({
    service,
    provider,
    dateKey: input.dateKey,
    time: input.time,
    bookings: activeBookings,
    bookingHolds: activeHolds,
    ignoredHoldId: input.holdId,
  });

  const manageToken = randomToken();
  const startTime = service.bookingType === "appointment" ? input.time : undefined;
  const endTime = getBookingEndTime(service, input.time);
  const costSnapshot = getEffectiveCost(service, input.locationKey);
  const capacitySnapshot = formatCapacityLabel(service);
  const serviceSnapshot = {
    id: service.id,
    name: service.name,
    slug: service.slug,
    bookingType: service.bookingType,
    durationMinutes: service.durationMinutes,
    cost: service.cost,
    capacity: service.capacity,
    medicalSpecialty: service.medicalSpecialty,
    occurrenceMode: service.occurrenceMode,
    occurrenceDate: service.occurrenceDate,
    weekdays: service.weekdays,
    startTime: service.startTime,
    endTime: service.endTime,
    maxSpots: service.maxSpots,
    locationPrices: service.locationPrices,
  };

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      provider_id: provider.id,
      service_id: service.id,
      service_name: service.name,
      booking_type: service.bookingType,
      duration_minutes_snapshot: service.durationMinutes ?? null,
      cost_snapshot: costSnapshot,
      capacity_snapshot: capacitySnapshot,
      client_name: input.clientName.trim(),
      client_email: input.clientEmail.trim(),
      client_phone: input.clientPhone.trim(),
      date: input.dateKey,
      start_time: startTime ?? null,
      end_time: endTime ?? null,
      status: "confirmed",
      notes: input.notes?.trim() ?? "",
      location_snapshot: input.location?.trim() || null,
      manage_token_hash: hashManageToken(manageToken),
      confirmation_number: createConfirmationNumber(),
      idempotency_key: input.idempotencyKey || randomToken(),
      details,
      details_schema_key: detailsSchemaKey,
      details_schema_version: detailsSchemaVersion,
      service_snapshot: serviceSnapshot,
      hold_id_snapshot: input.holdId ?? null,
    })
    .select(BOOKING_SELECT)
    .single<BookingRow>();

  if (error) {
    if (isUniqueViolation(error) || isCapacityViolation(error)) {
      throw new PublicBookingWriteError(
        isCapacityViolation(error)
          ? "That selection just reached capacity. Choose another time."
          : "That time was just booked. Choose another slot.",
        409,
        error,
      );
    }
    throw new PublicBookingWriteError("Could not confirm this booking.", 500, error);
  }

  if (input.holdId) {
    const holdReleaseResult = await supabase
      .from("booking_holds")
      .delete()
      .eq("provider_id", provider.id)
      .eq("id", input.holdId);

    if (holdReleaseResult.error) {
      console.error("booking_hold_release_failed", {
        bookingId: data.id,
        holdId: input.holdId,
        error: holdReleaseResult.error.message,
      });
    }
  }

  await insertBookingEvent(supabase, {
    bookingId: data.id,
    providerId: provider.id,
    actorType: "customer",
    eventType: "created",
    metadata: {
      source: "public_booking",
      vertical: provider.vertical,
      serviceId: service.id,
      detailsSchemaKey,
      detailsSchemaVersion,
      holdId: input.holdId,
    },
  });

  return {
    booking: toBookingRecord(data, manageToken),
    canonicalPath: `/${getPublicVerticalSegment(provider.vertical)}/${provider.slug}`,
  };
}

async function updateBookingStatus(
  supabase: SupabaseClient,
  options: {
    booking: BookingRow;
    status: BookingStatus;
    actorType: "provider" | "customer";
    manageToken?: string;
  },
) {
  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: options.status,
    })
    .eq("id", options.booking.id)
    .select(BOOKING_SELECT)
    .single<BookingRow>();

  if (error) {
    throw new PublicBookingWriteError("Could not update that booking.", 500, error);
  }

  await insertBookingEvent(supabase, {
    bookingId: data.id,
    providerId: data.provider_id,
    actorType: options.actorType,
    eventType: options.status === "cancelled" ? "cancelled" : "rescheduled",
  });

  return toBookingRecord(data, options.manageToken);
}

export async function getManagedBooking(supabase: SupabaseClient, input: ManageBookingInput) {
  const provider = await getPublishedProvider(supabase, input.vertical, input.providerSlug);
  const booking = await getBookingByManageToken(supabase, provider.id, input.token);

  return { booking: toBookingRecord(booking, input.token) };
}

export async function cancelManagedBooking(supabase: SupabaseClient, input: ManageBookingInput) {
  const provider = await getPublishedProvider(supabase, input.vertical, input.providerSlug);
  const booking = await getBookingByManageToken(supabase, provider.id, input.token);

  return {
    booking: await updateBookingStatus(supabase, {
      booking,
      status: "cancelled",
      actorType: "customer",
      manageToken: input.token,
    }),
  };
}

export const MANAGED_CLIENT_NOTE_MAX_LENGTH = 500;

/**
 * A note the client leaves from their private link. It is merged into the
 * booking's `details` payload, so it never collides with the booking notes the
 * client typed while booking.
 */
export async function updateManagedBookingNote(
  supabase: SupabaseClient,
  input: ManageBookingInput & { note: string },
) {
  const note = input.note.slice(0, MANAGED_CLIENT_NOTE_MAX_LENGTH).trim();
  const provider = await getPublishedProvider(supabase, input.vertical, input.providerSlug);
  const booking = await getBookingByManageToken(supabase, provider.id, input.token);

  if (booking.status === "cancelled") {
    throw new PublicBookingWriteError(
      "This booking was cancelled, so it cannot be updated.",
      409,
    );
  }

  const details = safeDetails(booking.details);
  const { data, error } = await supabase
    .from("bookings")
    .update({ details: { ...details, clientNote: note } })
    .eq("id", booking.id)
    .select(BOOKING_SELECT)
    .single<BookingRow>();

  if (error) {
    throw new PublicBookingWriteError("Could not save that note.", 500, error);
  }

  await insertBookingEvent(supabase, {
    bookingId: data.id,
    providerId: data.provider_id,
    actorType: "customer",
    eventType: "note_added",
    metadata: { source: "manage_link", cleared: note.length === 0 },
  });

  return { booking: toBookingRecord(data, input.token) };
}

export async function cancelProviderBooking(supabase: SupabaseClient, bookingId: string) {
  const booking = await getBookingById(supabase, bookingId);

  return {
    booking: await updateBookingStatus(supabase, {
      booking,
      status: "cancelled",
      actorType: "provider",
    }),
  };
}

async function rescheduleBookingRow(
  supabase: SupabaseClient,
  input: RescheduleBookingInput,
) {
  const booking = await getBookingById(supabase, input.bookingId);

  if (booking.status === "cancelled") {
    throw new PublicBookingWriteError("Cancelled bookings cannot be rescheduled.", 409);
  }

  if (!booking.service_id) {
    throw new PublicBookingWriteError("That service is no longer available.", 409);
  }

  const provider = await getProviderById(supabase, booking.provider_id);
  const serviceRow = await getServiceForBooking(supabase, provider.id, booking.service_id);
  const service = toService(serviceRow);

  validateDateWindow(provider, input.dateKey);

  const [activeBookings, activeHolds] = await Promise.all([
    getActiveBookingsForDate(supabase, provider.id, input.dateKey),
    getActiveBookingHoldsForDate(supabase, provider.id, input.dateKey),
  ]);

  assertSlotAvailable({
    service,
    provider,
    dateKey: input.dateKey,
    time: input.time,
    bookings: activeBookings,
    bookingHolds: activeHolds,
    ignoredBookingId: booking.id,
  });

  const startTime = service.bookingType === "appointment" ? input.time : undefined;
  const endTime = getBookingEndTime(service, input.time);

  const { data, error } = await supabase
    .from("bookings")
    .update({
      date: input.dateKey,
      start_time: startTime ?? null,
      end_time: endTime ?? null,
      status: "rescheduled",
    })
    .eq("id", booking.id)
    .select(BOOKING_SELECT)
    .single<BookingRow>();

  if (error) {
    if (isUniqueViolation(error) || isExclusionViolation(error)) {
      throw new PublicBookingWriteError(
        "That time was just booked. Choose another slot.",
        409,
        error,
      );
    }

    throw new PublicBookingWriteError("Could not reschedule that booking.", 500, error);
  }

  await insertBookingEvent(supabase, {
    bookingId: data.id,
    providerId: data.provider_id,
    actorType: input.actorType,
    eventType: "rescheduled",
    metadata: {
      dateKey: input.dateKey,
      time: input.time,
    },
  });

  return toBookingRecord(data, input.manageToken);
}

export async function rescheduleProviderBooking(
  supabase: SupabaseClient,
  input: Omit<RescheduleBookingInput, "actorType">,
) {
  return {
    booking: await rescheduleBookingRow(supabase, {
      ...input,
      actorType: "provider",
    }),
  };
}

export async function rescheduleManagedBooking(
  supabase: SupabaseClient,
  input: ManageBookingInput & { dateKey: string; time?: string },
) {
  const provider = await getPublishedProvider(supabase, input.vertical, input.providerSlug);
  const booking = await getBookingByManageToken(supabase, provider.id, input.token);

  return {
    booking: await rescheduleBookingRow(supabase, {
      bookingId: booking.id,
      dateKey: input.dateKey,
      time: input.time,
      actorType: "customer",
      manageToken: input.token,
    }),
  };
}

/** A provider's dashboard data, plus the ID entitlements are resolved against. */
export type ProviderDashboardContext = {
  providerId: string;
  store: ModuleStore;
};

/**
 * One owner-scoped read of the whole dashboard.
 *
 * The provider ID is returned alongside the store rather than folded into it:
 * ModuleStore is the editable booking-page configuration that round-trips
 * through the store API, and an identifier the client could echo back is not
 * something that belongs in it. Callers that need entitlements resolve them
 * server-side from this ID.
 */
export async function getProviderDashboardContext(
  supabase: SupabaseClient,
  ownerUserId: string,
): Promise<ProviderDashboardContext | null> {
  const { data: provider, error: providerError } = await supabase
    .from("providers")
    .select(PROVIDER_SELECT)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle<ProviderRow>();

  if (providerError) {
    throw providerError;
  }

  if (!provider) {
    return null;
  }

  const [{ data: services, error: servicesError }, { data: bookings, error: bookingsError }] =
    await Promise.all([
      supabase
        .from("services")
        .select(SERVICE_SELECT)
        .eq("provider_id", provider.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
        .returns<ServiceRow[]>(),
      supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("provider_id", provider.id)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: true })
        .returns<BookingRow[]>(),
    ]);

  if (servicesError) throw servicesError;
  if (bookingsError) throw bookingsError;

  return {
    providerId: provider.id,
    store: {
      provider: toProviderInfo(provider, true),
      services: (services ?? []).map(toService),
      availability: provider.availability,
      bookings: (bookings ?? []).map((booking) => toBookingRecord(booking)),
      bookingHolds: [],
      setupComplete: provider.setup_complete,
      vertical: provider.vertical,
    },
  };
}

/** Store-only view for callers with no use for the provider ID. */
export async function getProviderDashboardStore(
  supabase: SupabaseClient,
  ownerUserId: string,
): Promise<ModuleStore | null> {
  const context = await getProviderDashboardContext(supabase, ownerUserId);
  return context?.store ?? null;
}
