# Supabase Schema Catalog

This catalog lists the database schemas, app interfaces, and DTO shapes that
currently touch Supabase. It is intended to be the working reference when adding
fields to providers, services, bookings, public pages, or future vertical-specific
booking details.

Source of truth:

- Database objects: `supabase/migrations/*.sql`
- App domain interfaces: `lib/types.ts`
- Public read DTOs: `lib/public-booking-resolver.ts` and
  `app/api/public/providers/[slug]/route.ts`
- Public booking write DTOs: `app/api/public/[verticalSegment]/[providerSlug]/bookings/route.ts`
  `app/api/public/[verticalSegment]/[providerSlug]/holds/route.ts`,
  `app/api/public/[verticalSegment]/[providerSlug]/manage/[token]/route.ts`,
  `app/api/provider/bookings/[bookingId]/route.ts`,
  and `lib/supabase/bookings.ts`
- Provider dashboard write DTOs: `app/api/provider/store/route.ts` and
  `lib/supabase/provider-store.ts`
- Local fallback state: `components/booking/state/useModuleStore.ts`

The catalog reflects the repo migration files and app code. If a remote Supabase
project is behind the repo migrations, apply the migrations before treating the
remote database as equivalent to this catalog.

## Persistence Model

The app has two persistence modes:

| Mode | Storage | Shape used by the UI | Notes |
| --- | --- | --- | --- |
| Standalone/local | `window.localStorage` | `ModuleStore` | Keeps the original local-only behavior working for demos and non-integrated usage. |
| Integrated/Supabase | Supabase tables and views | `ModuleStore` DTO mapped from rows | Server code reads/writes Supabase, then maps rows back into the same app shape. |

The main rule is that Supabase does not replace `ModuleStore`; it backs it. The
UI still consumes `ModuleStore` so local storage and Supabase-backed pages can
share most behavior.

## Primitive App Types

These TypeScript unions appear throughout the Supabase-facing interfaces.

| Type | Values | Supabase storage |
| --- | --- | --- |
| `BookingType` | `"appointment"`, `"full-day"` | `services.booking_type`, `bookings.booking_type`, `booking_holds.booking_type` |
| `BookingStatus` | `"confirmed"`, `"cancelled"`, `"rescheduled"` | `bookings.status` |
| `VerticalId` | `"healthcare"`, `"spaces"`, `"professional"`, `"events"` | `providers.vertical`, `provider_slug_redirects.vertical` |
| `Lang` | `"en"`, `"es"` | `providers.language` |
| `WeekdayKey` | `sunday` through `saturday` | Keys inside `providers.availability` JSONB |
| `LocationKey` | `"address1"`, `"address2"`, `"custom"` | Keys in `services.location_prices`; selected booking text is stored in `bookings.location_snapshot` |
| `OccurrenceMode` | `"single"`, `"periodic"`, `"weekly"` | `services.occurrence_mode` |

Example:

```ts
const bookingType: BookingType = "appointment";
const vertical: VerticalId = "healthcare";
const selectedLocationKey: LocationKey = "address1";
```

## Database Tables

### `auth.users`

Supabase Auth owns this table. The app references it through
`providers.owner_user_id`.

| Column used by app | Purpose |
| --- | --- |
| `id uuid` | Provider ownership root. |

Usage example:

```sql
select id
from auth.users
where id = auth.uid();
```

The app does not store authorization decisions in user-editable metadata.
Provider ownership is resolved by joining `providers.owner_user_id` to
`auth.uid()`.

### `public.providers`

Stores one provider profile, its public URL scope, and its weekly availability.

| Column | Type | App interface field | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | internal provider id | Primary key. |
| `owner_user_id` | `uuid` | authenticated user | References `auth.users(id)` with cascade delete. |
| `full_name` | `text` | `ProviderInfo.fullName` | Required. |
| `business_name` | `text` | `ProviderInfo.businessName` | Required and used for generated slugs. |
| `email` | `text` | `ProviderInfo.email` | Provider private/admin email. Not exposed by public views. |
| `slug` | `text` | `ProviderInfo.publicSlug` | Public provider slug, unique per vertical. |
| `timezone` | `text` | public meta | Used for booking windows and display. |
| `booking_window_days` | `integer` | public meta | Must be between 1 and 365. |
| `availability` | `jsonb` | `WeeklyAvailability` | Weekly availability object. |
| `setup_complete` | `boolean` | `ModuleStore.setupComplete` | Controls public visibility. |
| `vertical` | `text` | `ModuleStore.vertical` | One of the `VerticalId` values. |
| `custom_slug` | `text` | URL settings | Premium-only vanity slug input. |
| `plan_tier` | `text` | `ProviderPlanTier` | `"free"` or `"premium"`. |
| `language` | `text` | `ProviderInfo.language` | `"en"` or `"es"`. |
| `phone_number_1` | `text` | `ProviderInfo.phoneNumber1` | Public/provider contact phone. |
| `phone_number_2` | `text` | `ProviderInfo.phoneNumber2` | Optional second public/provider contact phone. |
| `address_1` | `text` | `ProviderInfo.address1` | Public/provider location address. |
| `address_2` | `text` | `ProviderInfo.address2` | Optional second public/provider location address. |
| `header_image_url` | `text` | `ProviderInfo.headerImageUrl` | Optional public page header image URL. |
| `hero_text` | `text` | `ProviderInfo.heroText` | Optional public page hero copy. |
| `gallery_image_urls` | `jsonb` | `ProviderInfo.galleryImageUrls` | Array of public gallery image URLs. |
| `created_at` | `timestamptz` | audit | Insert timestamp. |
| `updated_at` | `timestamptz` | audit | Maintained by trigger. |

All current `ProviderInfo` fields are represented in Supabase. Public views
still intentionally exclude provider `email`.

Usage example:

```ts
const { data: provider } = await supabase
  .from("providers")
  .select(
    "id, owner_user_id, full_name, business_name, email, slug, vertical, language, timezone, booking_window_days, availability, setup_complete",
  )
  .eq("owner_user_id", user.id)
  .maybeSingle();
```

Example row:

```json
{
  "id": "8cc4d86c-172a-44e1-81a2-9cc815f65a6f",
  "owner_user_id": "188e89c7-cb3f-47d3-9cf6-8f97603bf832",
  "full_name": "Dr. Elena Rivera",
  "business_name": "Rivera Urology",
  "email": "provider@example.com",
  "slug": "rivera-urology",
  "vertical": "healthcare",
  "language": "en",
  "phone_number_1": "+15551234567",
  "phone_number_2": "",
  "address_1": "123 Market Street",
  "address_2": "",
  "header_image_url": "https://example.com/header.jpg",
  "hero_text": "Specialist care without the waiting-room shuffle.",
  "gallery_image_urls": [],
  "timezone": "America/New_York",
  "booking_window_days": 60,
  "availability": {
    "monday": {
      "enabled": true,
      "startTime": "09:00",
      "endTime": "17:00",
      "blockedWindows": []
    }
  },
  "setup_complete": true
}
```

### `public.services`

Stores bookable services for a provider.

| Column | Type | App interface field | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `Service.id` | Primary key. |
| `provider_id` | `uuid` | parent provider | References `providers(id)`. |
| `name` | `text` | `Service.name` | Required. |
| `slug` | `text` | `Service.slug` | Generated from name; unique per provider. |
| `booking_type` | `text` | `Service.bookingType` | `"appointment"` or `"full-day"`. |
| `duration_minutes` | `integer` | `Service.durationMinutes` | Required for appointments, null for full-day. |
| `description` | `text` | `Service.description` | Public service description. |
| `medical_specialty` | `text` | `Service.medicalSpecialty` | Optional healthcare appointment metadata. |
| `capacity` | `text` | `Service.capacity` | Label, not enforced inventory. |
| `cost` | `text` | `Service.cost` | Label, not payment logic. |
| `notes` | `text` | `Service.notes` | Public/internal notes label. |
| `sort_order` | `integer` | service ordering | Used for stable public ordering. |
| `occurrence_mode` | `text` | `Service.occurrenceMode` | `"single"`, `"periodic"`, or `"weekly"`. |
| `occurrence_date` | `date` | `Service.occurrenceDate` | Single occurrence date. |
| `weekdays` | `text[]` | `Service.weekdays` | Weekly recurring event days. |
| `start_time` | `time` | `Service.startTime` | Fixed event/weekly start time. |
| `end_time` | `time` | `Service.endTime` | Fixed event/weekly end time. |
| `max_spots` | `integer` | `Service.maxSpots` | Optional capacity cap for events/classes. |
| `location_prices` | `jsonb` | `Service.locationPrices` | Object keyed by `LocationKey`. |
| `linked_address_1` | `boolean` | `Service.linkedAddress1` | Whether the service uses provider `address1`. |
| `linked_address_2` | `boolean` | `Service.linkedAddress2` | Whether the service uses provider `address2`. |
| `linked_phone_1` | `boolean` | `Service.linkedPhone1` | Whether the service uses provider `phoneNumber1`. |
| `linked_phone_2` | `boolean` | `Service.linkedPhone2` | Whether the service uses provider `phoneNumber2`. |
| `custom_address` | `text` | `Service.customAddress` | Service-specific location address. |
| `custom_phone` | `text` | `Service.customPhone` | Service-specific contact phone. |
| `created_at` | `timestamptz` | audit | Insert timestamp. |
| `updated_at` | `timestamptz` | audit | Maintained by trigger. |

All current `Service` fields are represented in Supabase. Event scheduling,
per-location pricing, and linked contact/location fields are now part of the
public service read path.

Usage example:

```ts
const { data: services } = await supabase
  .from("services")
  .select(
    "id, provider_id, name, slug, booking_type, duration_minutes, description, medical_specialty, capacity, cost, notes, sort_order",
  )
  .eq("provider_id", provider.id)
  .order("sort_order", { ascending: true })
  .order("name", { ascending: true });
```

Example row:

```json
{
  "id": "94aef590-99c7-4a68-8f47-a572968ccf4f",
  "provider_id": "8cc4d86c-172a-44e1-81a2-9cc815f65a6f",
  "name": "New patient consultation",
  "slug": "new-patient-consultation",
  "booking_type": "appointment",
  "duration_minutes": 30,
  "description": "Initial consultation.",
  "medical_specialty": "Urology",
  "capacity": null,
  "cost": "$120",
  "notes": null,
  "sort_order": 0,
  "occurrence_mode": "periodic",
  "occurrence_date": null,
  "weekdays": [],
  "start_time": null,
  "end_time": null,
  "max_spots": null,
  "location_prices": {
    "address1": "$120"
  },
  "linked_address_1": true,
  "linked_address_2": false,
  "linked_phone_1": true,
  "linked_phone_2": false,
  "custom_address": null,
  "custom_phone": null
}
```

### `public.bookings`

Stores confirmed, rescheduled, and cancelled bookings. This is the most important
durable object for the provider dashboard.

| Column | Type | App interface field | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `BookingRecord.id` | Primary key. |
| `provider_id` | `uuid` | provider scope | References `providers(id)`. |
| `service_id` | `uuid` | `BookingRecord.serviceId` | Nullable if service is deleted. |
| `service_name` | `text` | `BookingRecord.serviceName` | Snapshot for historical display. |
| `booking_type` | `text` | `BookingRecord.bookingType` | `"appointment"` or `"full-day"`. |
| `duration_minutes_snapshot` | `integer` | derived | Snapshot of service duration. |
| `cost_snapshot` | `text` | `BookingRecord.cost` | Snapshot of effective cost label. |
| `capacity_snapshot` | `text` | `BookingRecord.capacitySnapshot` | Snapshot of capacity label. |
| `client_name` | `text` | `BookingRecord.clientName` | Private booking contact. |
| `client_email` | `text` | `BookingRecord.clientEmail` | Private booking contact. |
| `client_phone` | `text` | `BookingRecord.clientPhone` | Private booking contact. |
| `date` | `date` | `BookingRecord.dateKey` | `YYYY-MM-DD`. |
| `start_time` | `time` | `BookingRecord.startTime` | Appointment only. |
| `end_time` | `time` | `BookingRecord.endTime` | Appointment only. |
| `status` | `text` | `BookingRecord.status` | `"confirmed"`, `"rescheduled"`, or `"cancelled"`. |
| `notes` | `text` | `BookingRecord.notes` | Customer note. |
| `location_snapshot` | `text` | `BookingRecord.location` | Chosen location text at booking time. |
| `manage_token_hash` | `text` | hashed manage token | Only the hash is stored. Raw token is returned once to the customer. |
| `confirmation_number` | `text` | future display | Unique human-readable confirmation number. |
| `idempotency_key` | `text` | request idempotency | Unique per provider to prevent repeated inserts. |
| `details` | `jsonb` | vertical-specific details | Versioned object for future appointment/venue custom fields. |
| `details_schema_key` | `text` | details schema family | Defaults to `"base"`. |
| `details_schema_version` | `integer` | details schema version | Must be positive. |
| `service_snapshot` | `jsonb` | service snapshot | Copy of key service fields at booking time. |
| `created_at` | `timestamptz` | `BookingRecord.createdAt` | Insert timestamp. |
| `updated_at` | `timestamptz` | `BookingRecord.updatedAt` | Maintained by trigger. |

Important constraints and indexes:

- Appointment rows must have `start_time` and `end_time`; full-day rows must not.
- Active appointment bookings cannot overlap for the same provider/date.
- Exact active slot uniqueness also protects repeated full-day or appointment slots.
- `(provider_id, idempotency_key)` is unique.
- `manage_token_hash` and `confirmation_number` are unique.

Usage example:

```ts
const { data: booking } = await supabase
  .from("bookings")
  .insert({
    provider_id: provider.id,
    service_id: service.id,
    service_name: service.name,
    booking_type: service.bookingType,
    duration_minutes_snapshot: service.durationMinutes ?? null,
    cost_snapshot: "$120",
    capacity_snapshot: "1 person",
    client_name: "Maya Lopez",
    client_email: "maya@example.com",
    client_phone: "+15551234567",
    date: "2026-08-14",
    start_time: "10:00",
    end_time: "10:30",
    status: "confirmed",
    notes: "First visit.",
    location_snapshot: "123 Market Street",
    manage_token_hash: "sha256-hex-token",
    confirmation_number: "HAAB-ABC123",
    idempotency_key: "request-uuid-or-token",
    details_schema_key: "healthcare-intake",
    details_schema_version: 1,
    details: {
      reasonForVisit: "Annual checkup",
      preferredDoctorId: "elena-rivera"
    },
    service_snapshot: {
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
      locationPrices: service.locationPrices
    }
  })
  .select()
  .single();
```

Example booking details for a doctor:

```json
{
  "details_schema_key": "healthcare-intake",
  "details_schema_version": 2,
  "details": {
    "reasonForVisit": "Annual checkup",
    "insuranceProvider": "Example Health",
    "preferredDoctorId": "elena-rivera"
  }
}
```

Example booking details for a venue:

```json
{
  "details_schema_key": "venue-event",
  "details_schema_version": 1,
  "details": {
    "guestCount": 80,
    "roomSetup": "banquet",
    "cateringRequested": true
  }
}
```

Do not store medical PHI or other regulated sensitive data in `details` unless
the product requirements, compliance posture, retention policy, and Supabase
contracting explicitly support it.

### `public.booking_holds`

Stores temporary slot reservations for public booking flows. Integrated public
pages create a hold before collecting customer details, release it when the
customer backs out or changes selection, and pass the hold id into booking
confirmation.

| Column | Type | App interface field | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | `BookingHoldRecord.id` | Primary key. |
| `provider_id` | `uuid` | provider scope | References `providers(id)`. |
| `service_id` | `uuid` | `BookingHoldRecord.serviceId` | References `services(id)`. |
| `booking_type` | `text` | `BookingHoldRecord.bookingType` | `"appointment"` or `"full-day"`. |
| `date` | `date` | `BookingHoldRecord.dateKey` | Held date. |
| `start_time` | `time` | `BookingHoldRecord.startTime` | Appointment only. |
| `end_time` | `time` | `BookingHoldRecord.endTime` | Appointment only. |
| `expires_at` | `timestamptz` | `BookingHoldRecord.expiresAt` | DB uses timestamp; app record uses epoch ms. |
| `created_at` | `timestamptz` | `BookingHoldRecord.createdAt` | Insert timestamp. |

Important constraints and indexes:

- Appointment holds cannot overlap for the same provider, date, and time range.
- Full-day holds are unique for the same provider and date.
- Expired holds are pruned before availability checks.

Usage example:

```ts
const { hold } = await createPublicBookingHold(supabase, {
  vertical: "healthcare",
  providerSlug: "rivera-urology",
  serviceId: "94aef590-99c7-4a68-8f47-a572968ccf4f",
  dateKey: "2026-08-14",
  time: "10:00"
});
```

### `public.booking_events`

Stores booking history and support/audit events.

| Column | Type | App usage | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | event id | Primary key. |
| `booking_id` | `uuid` | booking link | References `bookings(id)`. |
| `provider_id` | `uuid` | provider scope | Used for provider-scoped queries. |
| `actor_type` | `text` | actor | `"provider"`, `"customer"`, or `"system"`. |
| `event_type` | `text` | event | `"created"`, `"rescheduled"`, `"cancelled"`, `"hold_expired"`, or `"note_added"`. |
| `metadata` | `jsonb` | structured context | Object only. |
| `created_at` | `timestamptz` | audit | Insert timestamp. |

Usage example after a public booking insert:

```ts
await supabase.from("booking_events").insert({
  booking_id: booking.id,
  provider_id: provider.id,
  actor_type: "customer",
  event_type: "created",
  metadata: {
    source: "public_booking",
    vertical: "healthcare",
    serviceId: service.id,
    detailsSchemaKey: "healthcare-intake",
    detailsSchemaVersion: 1
  }
});
```

### `public.provider_slug_redirects`

Stores previous provider slugs for canonical redirect behavior.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `provider_id` | `uuid` | Current provider. |
| `vertical` | `text` | Old vertical scope. |
| `slug` | `text` | Old provider slug. |
| `created_at` | `timestamptz` | Redirect creation timestamp. |

Usage example:

```ts
const { data: redirect } = await supabase
  .from("public_provider_slug_redirects")
  .select("provider_id, vertical, slug, current_vertical, current_slug")
  .eq("vertical", "healthcare")
  .eq("slug", "old-rivera-urology")
  .maybeSingle();
```

### `public.service_slug_redirects`

Stores previous service slugs for canonical redirect behavior.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `provider_id` | `uuid` | Provider scope. |
| `service_id` | `uuid` | Current service. |
| `slug` | `text` | Old service slug. |
| `created_at` | `timestamptz` | Redirect creation timestamp. |

Usage example:

```ts
const { data: redirect } = await supabase
  .from("public_service_slug_redirects")
  .select("provider_id, service_id, slug, current_slug")
  .eq("provider_id", provider.id)
  .eq("slug", "old-consultation")
  .maybeSingle();
```

## Public-Safe Views

Public pages read from views instead of raw private table payloads.

### `public.public_providers`

Exposes published provider data where `setup_complete = true`.

| Column | Maps to |
| --- | --- |
| `id` | provider id |
| `full_name` | `ProviderInfo.fullName` |
| `business_name` | `ProviderInfo.businessName` |
| `slug` | `ProviderInfo.publicSlug` |
| `vertical` | `ModuleStore.vertical` |
| `language` | `ProviderInfo.language` |
| `timezone` | `meta.timezone` |
| `booking_window_days` | `meta.bookingWindowDays` |
| `availability` | `WeeklyAvailability` |
| `phone_number_1` | `ProviderInfo.phoneNumber1` |
| `phone_number_2` | `ProviderInfo.phoneNumber2` |
| `address_1` | `ProviderInfo.address1` |
| `address_2` | `ProviderInfo.address2` |
| `header_image_url` | `ProviderInfo.headerImageUrl` |
| `hero_text` | `ProviderInfo.heroText` |
| `gallery_image_urls` | `ProviderInfo.galleryImageUrls` |

Usage example:

```ts
const PUBLIC_PROVIDER_SELECT =
  "id, full_name, business_name, slug, vertical, language, timezone, booking_window_days, availability, phone_number_1, phone_number_2, address_1, address_2, header_image_url, hero_text, gallery_image_urls";

const { data: provider } = await supabase
  .from("public_providers")
  .select(PUBLIC_PROVIDER_SELECT)
  .eq("vertical", "healthcare")
  .eq("slug", "rivera-urology")
  .maybeSingle();
```

### `public.public_services`

Exposes public service data for published providers.

| Column | Maps to |
| --- | --- |
| `id` | `Service.id` |
| `provider_id` | provider id |
| `name` | `Service.name` |
| `slug` | `Service.slug` |
| `booking_type` | `Service.bookingType` |
| `duration_minutes` | `Service.durationMinutes` |
| `description` | `Service.description` |
| `medical_specialty` | `Service.medicalSpecialty` |
| `capacity` | `Service.capacity` |
| `cost` | `Service.cost` |
| `notes` | `Service.notes` |
| `sort_order` | public ordering |
| `occurrence_mode` | `Service.occurrenceMode` |
| `occurrence_date` | `Service.occurrenceDate` |
| `weekdays` | `Service.weekdays` |
| `start_time` | `Service.startTime` |
| `end_time` | `Service.endTime` |
| `max_spots` | `Service.maxSpots` |
| `location_prices` | `Service.locationPrices` |
| `linked_address_1` | `Service.linkedAddress1` |
| `linked_address_2` | `Service.linkedAddress2` |
| `linked_phone_1` | `Service.linkedPhone1` |
| `linked_phone_2` | `Service.linkedPhone2` |
| `custom_address` | `Service.customAddress` |
| `custom_phone` | `Service.customPhone` |

Usage example:

```ts
const PUBLIC_SERVICE_SELECT =
  "id, provider_id, name, slug, booking_type, duration_minutes, description, medical_specialty, capacity, cost, notes, sort_order, occurrence_mode, occurrence_date, weekdays, start_time, end_time, max_spots, location_prices, linked_address_1, linked_address_2, linked_phone_1, linked_phone_2, custom_address, custom_phone";

const { data: services } = await supabase
  .from("public_services")
  .select(PUBLIC_SERVICE_SELECT)
  .eq("provider_id", provider.id)
  .order("sort_order", { ascending: true })
  .order("name", { ascending: true });
```

### `public.public_provider_slug_redirects`

Exposes provider redirect lookups for published providers.

| Column | Purpose |
| --- | --- |
| `provider_id` | Target provider id. |
| `vertical` | Old vertical scope. |
| `slug` | Old provider slug. |
| `current_vertical` | Current provider vertical. |
| `current_slug` | Current provider slug. |

### `public.public_service_slug_redirects`

Exposes service redirect lookups for published provider services.

| Column | Purpose |
| --- | --- |
| `provider_id` | Provider scope. |
| `service_id` | Target service id. |
| `slug` | Old service slug. |
| `current_slug` | Current service slug. |

## App Interfaces

### `ProviderInfo`

Source: `lib/types.ts`

```ts
export type ProviderInfo = {
  fullName: string;
  businessName: string;
  email: string;
  phoneNumber1: string;
  phoneNumber2: string;
  address1: string;
  address2: string;
  publicSlug: string;
  headerImageUrl?: string;
  heroText?: string;
  galleryImageUrls?: string[];
  language: Lang;
};
```

Supabase usage:

- Persisted today: `fullName`, `businessName`, `email`, `publicSlug`,
  `phoneNumber1`, `phoneNumber2`, `address1`, `address2`, `headerImageUrl`,
  `heroText`, `galleryImageUrls`, and `language`.
- Public DTO intentionally blanks only `email`.
- `publicSlug` maps to `providers.slug`.

Mapping example:

```ts
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
    headerImageUrl: row.header_image_url?.trim() || undefined,
    heroText: row.hero_text?.trim() || undefined,
    galleryImageUrls: Array.isArray(row.gallery_image_urls)
      ? row.gallery_image_urls.filter((url) => typeof url === "string" && url.trim())
      : undefined,
    language: row.language === "es" ? "es" : "en"
  };
}
```

### `Service`

Source: `lib/types.ts`

```ts
export type Service = {
  id: string;
  name: string;
  slug?: string;
  bookingType: BookingType;
  durationMinutes?: number;
  description: string;
  medicalSpecialty?: string;
  capacity?: string;
  occurrenceMode?: OccurrenceMode;
  occurrenceDate?: string;
  weekdays?: WeekdayKey[];
  startTime?: string;
  endTime?: string;
  maxSpots?: number;
  cost?: string;
  locationPrices?: Partial<Record<LocationKey, string>>;
  notes?: string;
  linkedAddress1?: boolean;
  linkedAddress2?: boolean;
  linkedPhone1?: boolean;
  linkedPhone2?: boolean;
  customAddress?: string;
  customPhone?: string;
};
```

Supabase usage:

- Persisted today: `id`, `name`, `slug`, `bookingType`, `durationMinutes`,
  `description`, `medicalSpecialty`, `capacity`, `occurrenceMode`,
  `occurrenceDate`, `weekdays`, `startTime`, `endTime`, `maxSpots`, `cost`,
  `locationPrices`, `notes`, linked provider contact/location flags, and custom
  contact/location fields.
- Public service rows map back into this interface before rendering booking
  pages.
- Event and location-specific service fields are included in Supabase-backed
  public pages.

Mapping example:

```ts
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
    customPhone: row.custom_phone ?? undefined
  };
}
```

### `WeeklyAvailability`, `DayAvailability`, and `AvailabilityBlock`

Source: `lib/types.ts`

```ts
export type AvailabilityBlock = {
  startTime: string;
  endTime: string;
};

export type DayAvailability = {
  enabled: boolean;
  startTime: string;
  endTime: string;
  blockedWindows?: AvailabilityBlock[];
};

export type WeeklyAvailability = Record<WeekdayKey, DayAvailability>;
```

Supabase usage:

- Stored as one `providers.availability jsonb` object.
- Public pages use it to generate bookable dates and slots.
- Server booking confirmation validates the selected date/time against it.

Example:

```json
{
  "monday": {
    "enabled": true,
    "startTime": "09:00",
    "endTime": "17:00",
    "blockedWindows": [
      { "startTime": "12:00", "endTime": "13:00" }
    ]
  },
  "tuesday": {
    "enabled": true,
    "startTime": "09:00",
    "endTime": "17:00",
    "blockedWindows": []
  }
}
```

### `BookingRecord`

Source: `lib/types.ts`

```ts
export type BookingRecord = {
  id: string;
  serviceId: string;
  serviceName: string;
  bookingType: BookingType;
  dateKey: string;
  startTime?: string;
  endTime?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
  capacitySnapshot?: string;
  cost: string;
  location?: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  manageToken: string;
};
```

Supabase usage:

- Maps to `public.bookings`.
- `manageToken` is not stored directly. Supabase stores
  `bookings.manage_token_hash`.
- Public booking confirmation returns a `BookingRecord` with the raw token once
  so the customer can manage the booking.
- Provider dashboard loading maps booking rows back into `BookingRecord` with an
  empty `manageToken`.

Mapping example:

```ts
function toBookingRecord(row: BookingRow, manageToken = ""): BookingRecord {
  return {
    id: row.id,
    serviceId: row.service_id ?? "",
    serviceName: row.service_name,
    bookingType: row.booking_type,
    dateKey: row.date,
    startTime: row.start_time?.slice(0, 5),
    endTime: row.end_time?.slice(0, 5),
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    notes: row.notes ?? "",
    capacitySnapshot: row.capacity_snapshot ?? undefined,
    cost: row.cost_snapshot ?? "",
    location: row.location_snapshot ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    manageToken
  };
}
```

### `BookingHoldRecord`

Source: `lib/types.ts`

```ts
export type BookingHoldRecord = {
  id: string;
  serviceId: string;
  bookingType: BookingType;
  dateKey: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  expiresAt: number;
};
```

Supabase usage:

- Maps to `public.booking_holds`.
- App uses `expiresAt` as epoch milliseconds.
- Database uses `expires_at timestamptz`.
- Integrated public pages keep `ModuleStore.bookingHolds` in memory while the
  server row protects the selected slot across visitors.

### `ModuleStore`

Source: `lib/types.ts`

```ts
export type ModuleStore = {
  provider: ProviderInfo;
  services: Service[];
  availability: WeeklyAvailability;
  bookings: BookingRecord[];
  bookingHolds: BookingHoldRecord[];
  setupComplete: boolean;
  vertical?: VerticalId;
};
```

Supabase usage:

- Public read routes map Supabase `public_providers` and `public_services` rows
  into `ModuleStore`.
- Provider dashboard loading maps private `providers`, `services`, and
  `bookings` rows into `ModuleStore`.
- Local storage persists this same shape when `integratedMode` is false.

Usage example:

```ts
return {
  provider: toProviderInfo(provider, true),
  services: services.map(toService),
  availability: provider.availability,
  bookings: bookings.map((booking) => toBookingRecord(booking)),
  bookingHolds: [],
  setupComplete: provider.setup_complete,
  vertical: provider.vertical
} satisfies ModuleStore;
```

### `InjectedConfig`

Source: `lib/types.ts`

```ts
export type InjectedConfig = {
  provider: ProviderInfo;
  services: Service[];
  availability: WeeklyAvailability;
  bookings?: BookingRecord[];
  vertical?: VerticalId;
};
```

Supabase usage:

- Server-rendered pages pass Supabase-loaded data into `HaabBookingModule` as
  `injectedConfig`.
- `useModuleStore` treats presence of provider, services, and availability as
  integrated mode.

### `ServiceDraft`

Source: `lib/types.ts`

```ts
export type ServiceDraft = {
  name: string;
  bookingType: BookingType;
  durationMinutes: number;
  description: string;
  medicalSpecialty?: string;
  capacity: string;
  occurrenceMode: OccurrenceMode;
  occurrenceDate: string;
  weekdays: WeekdayKey[];
  startTime: string;
  endTime: string;
  maxSpots: string;
  cost: string;
  locationPrices?: { address1: string; address2: string; custom: string };
  notes: string;
  linkedAddress1: boolean;
  linkedAddress2: boolean;
  linkedPhone1: boolean;
  linkedPhone2: boolean;
  customAddress: string;
  customPhone: string;
};
```

Supabase usage:

- Editor-only shape.
- Converted into `Service` by `materializeVerticalServices`.
- Only fields represented in `public.services` survive current Supabase-backed
  service reads.

### `BookingFlow`

Source: `lib/types.ts`

```ts
export type BookingFlow = {
  step: BookingStep;
  serviceId: string;
  dateKey: string;
  time: string;
  locationKey?: LocationKey;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
  successBookingId?: string;
};
```

Supabase usage:

- Client-side booking state.
- On public integrated pages, confirmation is converted into `PublicBookingBody`
  and posted to the booking API.

## Supabase Row and DTO Types

### Public read rows

Source: `lib/public-booking-resolver.ts`

```ts
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
```

Usage example:

```ts
const resolution = await resolvePublicBookingUrl({
  verticalSegment: "doctors",
  providerSlug: "rivera-urology",
  serviceSlug: "new-patient-consultation"
});
```

The result is either:

```ts
type PublicBookingResolution = PublicBookingResolved | PublicBookingRedirect;
```

where a resolved result includes:

```ts
{
  status: "resolved";
  store: ModuleStore;
  meta: {
    timezone: string;
    bookingWindowDays: number;
    canonicalPath: string;
    selectedServiceSlug?: string;
  };
}
```

### Private Supabase booking rows

Source: `lib/supabase/bookings.ts`

```ts
type ProviderRow = {
  id: string;
  owner_user_id: string;
  full_name: string;
  business_name: string;
  email: string;
  slug: string;
  vertical: VerticalId;
  language: "en" | "es" | null;
  timezone: string;
  booking_window_days: number;
  availability: WeeklyAvailability;
  setup_complete: boolean;
  phone_number_1: string | null;
  phone_number_2: string | null;
  address_1: string | null;
  address_2: string | null;
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
  details: Record<string, unknown> | null;
  details_schema_key: string | null;
  details_schema_version: number | null;
  service_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};
```

Usage example:

```ts
const dashboardStore = await getProviderDashboardStore(supabase, user.id);
```

### Public booking request body

Source:
`app/api/public/[verticalSegment]/[providerSlug]/bookings/route.ts`

```ts
type PublicBookingBody = {
  serviceId?: unknown;
  dateKey?: unknown;
  time?: unknown;
  clientName?: unknown;
  clientEmail?: unknown;
  clientPhone?: unknown;
  notes?: unknown;
  location?: unknown;
  locationKey?: unknown;
  details?: unknown;
  detailsSchemaKey?: unknown;
  detailsSchemaVersion?: unknown;
  idempotencyKey?: unknown;
  holdId?: unknown;
};
```

The route validates and converts that body into:

```ts
export type ConfirmPublicBookingInput = {
  vertical: VerticalId;
  providerSlug: string;
  serviceId: string;
  dateKey: string;
  time?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
  location?: string;
  locationKey?: LocationKey;
  details?: Record<string, unknown>;
  detailsSchemaKey?: string;
  detailsSchemaVersion?: number;
  idempotencyKey?: string;
  holdId?: string;
};
```

Request example:

```http
POST /api/public/doctors/rivera-urology/bookings
Content-Type: application/json
```

```json
{
  "serviceId": "94aef590-99c7-4a68-8f47-a572968ccf4f",
  "dateKey": "2026-08-14",
  "time": "10:00",
  "clientName": "Maya Lopez",
  "clientEmail": "maya@example.com",
  "clientPhone": "+15551234567",
  "notes": "First visit.",
  "location": "123 Market Street",
  "locationKey": "address1",
  "detailsSchemaKey": "healthcare-intake",
  "detailsSchemaVersion": 1,
  "details": {
    "reasonForVisit": "Annual checkup"
  },
  "idempotencyKey": "8a6c9e42-6828-4021-b845-44b970c95d40",
  "holdId": "ecdf3462-8d5b-476f-97d5-0a3e33b55876"
}
```

Response example:

```json
{
  "booking": {
    "id": "269f7a87-c8ec-4db0-b682-1bcb31cd2f72",
    "serviceId": "94aef590-99c7-4a68-8f47-a572968ccf4f",
    "serviceName": "New patient consultation",
    "bookingType": "appointment",
    "dateKey": "2026-08-14",
    "startTime": "10:00",
    "endTime": "10:30",
    "clientName": "Maya Lopez",
    "clientEmail": "maya@example.com",
    "clientPhone": "+15551234567",
    "notes": "First visit.",
    "capacitySnapshot": "1 person",
    "cost": "$120",
    "location": "123 Market Street",
    "status": "confirmed",
    "createdAt": "2026-07-12T10:00:00.000Z",
    "updatedAt": "2026-07-12T10:00:00.000Z",
    "manageToken": "raw-token-returned-once"
  },
  "canonicalPath": "/doctors/rivera-urology"
}
```

### Public booking hold request body

Source:
`app/api/public/[verticalSegment]/[providerSlug]/holds/route.ts`

```ts
type HoldBody = {
  serviceId?: unknown;
  dateKey?: unknown;
  time?: unknown;
  holdId?: unknown;
};
```

Create-hold request example:

```http
POST /api/public/doctors/rivera-urology/holds
Content-Type: application/json
```

```json
{
  "serviceId": "94aef590-99c7-4a68-8f47-a572968ccf4f",
  "dateKey": "2026-08-14",
  "time": "10:00"
}
```

Create-hold response example:

```json
{
  "hold": {
    "id": "ecdf3462-8d5b-476f-97d5-0a3e33b55876",
    "serviceId": "94aef590-99c7-4a68-8f47-a572968ccf4f",
    "bookingType": "appointment",
    "dateKey": "2026-08-14",
    "startTime": "10:00",
    "endTime": "10:30",
    "createdAt": "2026-07-12T10:00:00.000Z",
    "expiresAt": 1783841400000
  }
}
```

Release-hold request example:

```http
DELETE /api/public/doctors/rivera-urology/holds
Content-Type: application/json
```

```json
{
  "holdId": "ecdf3462-8d5b-476f-97d5-0a3e33b55876"
}
```

### Public manage-link request body

Source:
`app/api/public/[verticalSegment]/[providerSlug]/manage/[token]/route.ts`

```ts
type ManageBody = {
  action?: unknown;
  dateKey?: unknown;
  time?: unknown;
};
```

Lookup example:

```http
GET /api/public/doctors/rivera-urology/manage/raw-token-returned-once
```

Response shape:

```json
{
  "booking": {
    "id": "269f7a87-c8ec-4db0-b682-1bcb31cd2f72",
    "serviceId": "94aef590-99c7-4a68-8f47-a572968ccf4f",
    "serviceName": "New patient consultation",
    "bookingType": "appointment",
    "dateKey": "2026-08-14",
    "startTime": "10:00",
    "endTime": "10:30",
    "clientName": "Maya Lopez",
    "clientEmail": "maya@example.com",
    "clientPhone": "+15551234567",
    "notes": "First visit.",
    "status": "confirmed",
    "createdAt": "2026-07-12T10:00:00.000Z",
    "updatedAt": "2026-07-12T10:00:00.000Z",
    "manageToken": "raw-token-returned-once"
  }
}
```

Cancel example:

```http
PATCH /api/public/doctors/rivera-urology/manage/raw-token-returned-once
Content-Type: application/json
```

```json
{
  "action": "cancel"
}
```

Reschedule example:

```http
PATCH /api/public/doctors/rivera-urology/manage/raw-token-returned-once
Content-Type: application/json
```

```json
{
  "action": "reschedule",
  "dateKey": "2026-08-17",
  "time": "14:00"
}
```

Both update actions persist to `public.bookings`, insert a row in
`public.booking_events`, and return the updated `BookingRecord`.

### Provider booking mutation body

Source: `app/api/provider/bookings/[bookingId]/route.ts`

```ts
type ProviderBookingBody = {
  action?: unknown;
  dateKey?: unknown;
  time?: unknown;
};
```

Provider dashboard cancel example:

```http
PATCH /api/provider/bookings/269f7a87-c8ec-4db0-b682-1bcb31cd2f72
Content-Type: application/json
```

```json
{
  "action": "cancel"
}
```

Provider dashboard reschedule example:

```json
{
  "action": "reschedule",
  "dateKey": "2026-08-17",
  "time": "14:00"
}
```

The route uses the authenticated Supabase client. RLS restricts reads and
updates to bookings owned by the signed-in provider.

### Provider store request body

Source: `app/api/provider/store/route.ts`

```ts
type ProviderStoreBody = {
  store?: unknown;
};
```

Usage example:

```http
PUT /api/provider/store
Content-Type: application/json
```

```json
{
  "store": {
    "provider": {
      "fullName": "Dr. Elena Rivera",
      "businessName": "Rivera Urology",
      "email": "provider@example.com",
      "phoneNumber1": "+15551234567",
      "phoneNumber2": "",
      "address1": "123 Market Street",
      "address2": "",
      "publicSlug": "rivera-urology",
      "headerImageUrl": "https://example.com/header.jpg",
      "heroText": "Specialist care without the waiting-room shuffle.",
      "galleryImageUrls": [],
      "language": "en"
    },
    "services": [
      {
        "id": "94aef590-99c7-4a68-8f47-a572968ccf4f",
        "name": "New patient consultation",
        "bookingType": "appointment",
        "durationMinutes": 30,
        "description": "Initial consultation.",
        "medicalSpecialty": "Urology",
        "capacity": "1 patient",
        "occurrenceMode": "periodic",
        "weekdays": [],
        "startTime": "",
        "endTime": "",
        "cost": "$120",
        "locationPrices": {
          "address1": "$120"
        },
        "linkedAddress1": true,
        "linkedAddress2": false,
        "linkedPhone1": true,
        "linkedPhone2": false,
        "customAddress": "",
        "customPhone": ""
      }
    ],
    "availability": {
      "monday": {
        "enabled": true,
        "startTime": "09:00",
        "endTime": "17:00",
        "blockedWindows": []
      }
    },
    "bookings": [],
    "bookingHolds": [],
    "setupComplete": true,
    "vertical": "healthcare"
  }
}
```

`persistProviderStore` upserts the provider row and service rows, deletes stale
services, reloads the dashboard `ModuleStore`, and returns the normalized store
used by the UI.

## End-to-End Usage Paths

### Public provider page read

1. Route receives a public URL such as
   `/doctors/rivera-urology/new-patient-consultation`.
2. `resolvePublicBookingUrl` parses `doctors` into `healthcare`.
3. Supabase reads `public.public_providers`.
4. Supabase reads `public.public_services`.
5. Redirect views are checked if the slug is old.
6. Rows are mapped into `ModuleStore`.
7. `HaabBookingModule` renders from `injectedConfig`.

### Public booking write

1. Customer selects a date/time in `HaabBookingModule`.
2. Integrated public pages POST to
   `/api/public/[verticalSegment]/[providerSlug]/holds`.
3. The server validates availability and inserts `public.booking_holds`.
4. Customer confirms a booking with details.
5. Integrated public pages POST `PublicBookingBody` to
   `/api/public/[verticalSegment]/[providerSlug]/bookings`.
6. The route validates strings, location key, details object, schema version,
   and optional `holdId`.
7. `confirmPublicBooking` loads the published provider and service.
8. Server validates date window, matching hold, and slot availability.
9. Server inserts `public.bookings`.
10. Server deletes the consumed hold from `public.booking_holds`.
11. Server inserts `public.booking_events`.
12. The returned `BookingRecord` is committed into the active `ModuleStore`.

### Public booking hold release

1. Customer backs out, changes selection, starts a fresh booking, or the hold
   expires in the UI.
2. Integrated public pages DELETE
   `/api/public/[verticalSegment]/[providerSlug]/holds`.
3. The server deletes the matching `public.booking_holds` row.
4. The UI removes the hold from `ModuleStore.bookingHolds`.

### Manage-link lookup, cancellation, and reschedule

1. Customer opens a manage URL containing the raw token.
2. Integrated public pages GET
   `/api/public/[verticalSegment]/[providerSlug]/manage/[token]`.
3. Server hashes the raw token, loads `public.bookings`, and returns a
   `BookingRecord` with the raw token restored for the current session.
4. Cancellation PATCH sets `bookings.status = 'cancelled'`.
5. Reschedule PATCH updates `bookings.date`, `start_time`, `end_time`, and
   `status = 'rescheduled'`.
6. Both mutations insert `public.booking_events` and return the updated
   `BookingRecord`.

### Provider dashboard read

1. Authenticated user lands on the app home/dashboard.
2. Server uses the logged-in user id.
3. `getProviderDashboardStore` reads private `providers`, `services`, and
   `bookings` rows.
4. Rows are mapped into `ModuleStore`.
5. Provider sees durable bookings in the same UI model that local storage uses.

### Provider dashboard setup and live editing

1. Authenticated provider edits setup, services, provider details, or
   availability in `HaabBookingModule`.
2. Integrated dashboard pages PUT `ModuleStore` to `/api/provider/store`.
3. `persistProviderStore` upserts `public.providers` and `public.services`.
4. Stale service rows are deleted.
5. The route reloads `ModuleStore` from Supabase and returns it to the UI.
6. `useModuleStore` stores the returned provider/services/availability in its
   integrated shadow store without disabling local-storage mode.

### Provider dashboard booking cancellation and reschedule

1. Authenticated provider clicks cancel or reschedule in the dashboard.
2. Integrated dashboard pages PATCH `/api/provider/bookings/[bookingId]`.
3. The route uses the authenticated Supabase client, so RLS limits access to the
   provider's own bookings.
4. Cancellation updates `bookings.status`.
5. Reschedule updates `bookings.date`, `start_time`, `end_time`, and `status`.
6. Both mutations insert `public.booking_events` and return the updated
   `BookingRecord`.

### Standalone local storage

1. If no valid `injectedConfig` exists, `useModuleStore` runs in standalone mode.
2. It hydrates `ModuleStore` from `window.localStorage`.
3. Changes are persisted back to the same local storage key.
4. Cross-tab `storage` events keep standalone tabs in sync.

This path should remain functional even as Supabase persistence grows.

## Security and Exposure Rules

RLS is enabled on all public tables:

- `providers`
- `services`
- `bookings`
- `booking_holds`
- `booking_events`
- `provider_slug_redirects`
- `service_slug_redirects`

Public anonymous reads:

- Only published provider and service data should be visible.
- Public clients must not see raw `bookings`, `booking_holds`,
  `booking_events`, `manage_token_hash`, or private client contact details.
- Public pages should prefer the `public_*` views.

Authenticated provider reads/writes:

- Provider ownership is based on `providers.owner_user_id = auth.uid()`.
- Provider owners can manage their own providers, services, bookings, holds, and
  events according to RLS policies.

Server-only writes:

- Public booking confirmation uses a server route and admin Supabase client.
- Public booking hold creation/release and manage-link updates also use server
  routes; the service-role key is never sent to the browser.
- Provider setup and dashboard booking updates use authenticated server routes
  and RLS.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only and must not be exposed in a
  `NEXT_PUBLIC_*` variable.

## Schema Evolution Rules

Use these rules when adding future fields.

| Field type | Preferred storage | Reason |
| --- | --- | --- |
| Fields used for filtering, sorting, reporting, RLS, uniqueness, or joins | Real typed columns | Queryable and enforceable. |
| Vertical-specific booking intake fields | `bookings.details` with `details_schema_key` and `details_schema_version` | Allows doctor, venue, spaces, and professional bookings to evolve independently. |
| Display labels that must stay historically accurate | Snapshot columns or `service_snapshot` | Bookings should not change when the service changes later. |
| Public-safe provider/service fields | Table column plus public view plus DTO mapper | Avoids leaking private fields. |
| UI-only draft state | TypeScript-only or local storage | Avoids premature schema churn. |

When a field becomes Supabase-backed, update all relevant layers together:

1. Migration column/check/index/grant/view.
2. Row type and select string.
3. Domain mapper into `ProviderInfo`, `Service`, `BookingRecord`, or
   `ModuleStore`.
4. Public route DTO if it is customer-facing.
5. Provider dashboard read/write path if it is provider-facing.
6. Local storage normalization if the field still needs standalone mode.
7. Tests or manual verification for both Supabase and local mode.

## Persistence Coverage

All current `ProviderInfo` and `Service` fields in `lib/types.ts` are now
represented in Supabase and flow through provider writes, dashboard reads, public
views, and public booking DTOs. Future fields should still follow the schema
evolution rules above.

Completed Supabase-backed flows as of this catalog:

- Public booking writes persist `public.bookings` and `public.booking_events`.
- Public booking holds create and release `public.booking_holds`.
- Manage links lookup, cancel, and reschedule bookings by hashed token.
- Provider dashboard setup/live editing persists provider, service, availability,
  contact/location, branding, event scheduling, and location pricing/linking
  fields.
- Provider dashboard cancel/reschedule persists booking status/date/time changes.

## Quick Reference

| Concept | Database object | App type or function |
| --- | --- | --- |
| Provider profile | `public.providers` | `ProviderInfo`, `ProviderRow`, `PublicProviderRow` |
| Public provider read | `public.public_providers` | `resolvePublicBookingUrl`, `toModuleStore` |
| Service | `public.services` | `Service`, `ServiceRow`, `PublicServiceRow` |
| Public service read | `public.public_services` | `toPublicService` |
| Booking | `public.bookings` | `BookingRecord`, `BookingRow`, `ConfirmPublicBookingInput` |
| Booking write API | `public.bookings`, `public.booking_events` | `PublicBookingBody`, `confirmPublicBooking` |
| Booking hold | `public.booking_holds` | `BookingHoldRecord`, `createPublicBookingHold`, `releasePublicBookingHold` |
| Manage link | `public.bookings.manage_token_hash` | `getManagedBooking`, `cancelManagedBooking`, `rescheduleManagedBooking` |
| Provider booking mutation | `public.bookings`, `public.booking_events` | `cancelProviderBooking`, `rescheduleProviderBooking` |
| Booking audit | `public.booking_events` | booking event insert in create/cancel/reschedule flows |
| Provider dashboard write | `public.providers`, `public.services` | `persistProviderStore`, `ProviderStoreBody` |
| Provider redirects | `public.provider_slug_redirects`, `public.public_provider_slug_redirects` | `ProviderRedirectRow` |
| Service redirects | `public.service_slug_redirects`, `public.public_service_slug_redirects` | `ServiceRedirectRow` |
| Local fallback | localStorage | `ModuleStore`, `useModuleStore` |
