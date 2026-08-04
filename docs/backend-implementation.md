# Backend Implementation

**Status:** current as of 2026-08-04. The Supabase backend supports provider administration, canonical public pages, server-authoritative booking writes, customer manage links, publication controls, capacity events, and resilient temporary holds.

For the customer lifecycle, start with `docs/booking-process.md`. This document summarizes the backend boundary and deployment contract.

## Architecture

- Supabase Postgres is the durable source of provider, service, booking, hold, event, and publication data.
- Supabase Auth identifies providers and the single super administrator.
- RLS restricts authenticated admin access by provider ownership.
- Public-safe views and a server resolver hydrate public pages.
- Next.js Route Handlers own unauthenticated booking-critical writes.
- The service-role key is server-only and must never use a `NEXT_PUBLIC_` variable.
- Standalone/demo mode remains available through localStorage and does not claim cross-device protection.

## Main schema

### `providers`

Stores the provider profile, vertical, normalized public slug, preferred language, timezone, booking window, weekly availability, branding, contact details, setup state, and publication ownership.

Public routing requires a valid vertical/slug pair and a provider allowed to publish. Historical slugs are preserved in redirect tables.

### `services`

Stores the booking type, duration, occurrence rules, capacity configuration, display labels, pricing/location details, and service-specific public slug.

`capacity` is display text. `max_spots` is enforced inventory for configured event occurrences.

### `bookings`

Stores private customer details and immutable display snapshots, including service, duration, price, capacity, location, structured details, and the consumed hold ID. Important operational fields include:

- `status` (`confirmed`, `rescheduled`, or `cancelled`);
- `manage_token_hash` rather than the raw customer token;
- `confirmation_number`;
- `idempotency_key`;
- timestamps and provider/service ownership.

Active booking constraints protect non-capacity appointment overlaps and exclusive day reservations. Event capacity is enforced by database triggers.

### `booking_holds`

Stores the slot/date protected during customer data entry:

- provider and service IDs;
- booking type, date, start, and end;
- server-authoritative `expires_at`;
- `extension_count`, constrained to zero or one;
- shared-capacity mode for events.

Non-capacity holds use exclusion/unique constraints. Event holds participate in the same database capacity calculation as active bookings.

### `booking_events`

Stores support/audit history for booking creation, rescheduling, cancellation, and other system/customer/provider actions.

## Public read path

Canonical routes call `lib/public-booking-resolver.ts`. It reads public-safe provider/service fields plus an operational schedule projection containing no customer details.

The resolver returns a frontend-compatible `ModuleStore`:

```ts
type ModuleStore = {
  provider: ProviderInfo;
  services: Service[];
  availability: WeeklyAvailability;
  bookings: BookingRecord[];
  bookingHolds: BookingHoldRecord[];
  setupComplete: boolean;
  vertical?: VerticalId;
};
```

Public schedule booking records have blank customer/contact fields. Public hold records contain only conflict-relevant slot data and expiry. Raw private tables are not exposed to the anonymous browser.

## Public write routes

| Route | Methods | Responsibility |
| --- | --- | --- |
| `/api/public/{vertical}/{provider}/holds` | `POST`, `GET`, `PATCH`, `DELETE` | Create, refresh, extend once, or release a hold. |
| `/api/public/{vertical}/{provider}/bookings` | `POST` | Validate the hold and create a confirmed booking. |
| `/api/public/{vertical}/{provider}/manage/{token}` | `GET`, `PATCH` | Load, reschedule, or cancel one booking using its private token. |
| `/api/public/providers/{slug}` | `GET` | Compatibility public provider DTO. |

All public writes validate normalized vertical/slug parameters and body fields before calling `lib/supabase/bookings.ts` through the server-only admin client.

## Hold resilience

The initial hold lasts ten minutes. The API returns server time with the hold so the browser countdown does not treat its own clock as authority.

The final-two-minute warning can invoke `public.extend_public_booking_hold(provider_id, hold_id)`. The function is `SECURITY INVOKER`, executable only by `service_role`, and atomically adds five minutes while incrementing `extension_count`. Repeated or expired extensions return no row and become HTTP `409`.

Expired rows are handled in two layers:

1. Every availability/confirmation path ignores or deletes `expires_at <= now()` rows, making the slot immediately usable.
2. Supabase Cron runs `cleanup-expired-booking-holds` every minute for physical cleanup.

The cron job is installed with `cron.schedule`; code must not directly update `cron.job`.

## Confirmation and manage-token boundary

Confirmation re-resolves the provider/service, checks the date window, requires a matching unexpired hold, rechecks conflicts/capacity, builds trusted snapshots, hashes a newly generated manage token, inserts the booking, releases the hold, and records a booking event.

Only the raw manage token returned in that successful response can reconstruct the customer manage URL. The database stores the SHA-256 hash. Manage lookup hashes the presented token and scopes the match to the public provider.

Rescheduling repeats availability and capacity checks while ignoring the booking's current row. Cancellation makes the booking inactive. Both append booking events.

## Provider administration

Authenticated provider reads/writes use ownership derived from the Supabase user rather than client-supplied provider IDs. Provider-store persistence handles provider profile, services, availability, language, vertical, branding, and setup completion.

The dedicated super-admin route can update publication state, but it cannot appoint additional super administrators. Publication policy and notifications are documented separately in the schema catalog and super-admin tests.

## Security invariants

- RLS is enabled on public-schema tables.
- Provider policies combine the authenticated role with an ownership predicate.
- Public clients do not receive the service-role key or direct table write access.
- Public writes do not trust provider ownership, expiry, snapshots, status, or manage-token hashes supplied by the browser.
- Views that must respect RLS use `security_invoker = true`.
- Database functions use explicit `search_path` settings and narrowly granted execution.
- The hold-extension function uses `SECURITY INVOKER`; it does not bypass RLS by definition.

## Migration history

Migration files in `supabase/migrations/` are part of the deployable application and must be committed. Important booking milestones include:

| Migration | Purpose |
| --- | --- |
| `20260607113603_schema_security_foundation.sql` | Core tables, constraints, indexes, RLS, and safe views. |
| `20260712092527_add_booking_details_payload.sql` | Structured details and schema metadata. |
| `20260712162405_add_booking_hold_conflicts.sql` | Database hold conflict constraints. |
| `20260712173119_add_provider_service_profile_fields.sql` | Public provider/service presentation fields. |
| `20260803071013_enable_event_capacity_bookings.sql` | Shared event capacity for bookings and holds. |
| `20260803071618_support_legacy_capacity_hold_confirmation.sql` | Compatibility for existing capacity bookings. |
| `20260804123315_make_booking_holds_resilient.sql` | One-time extension plus scheduled expired-hold cleanup. |

## Deployment

Check migration alignment before deploying application code:

```bash
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

The dry run should list only migrations intentionally pending. After application:

```bash
npx supabase migration list --linked
npx supabase db lint --linked
```

Application gates:

```bash
npx tsc --noEmit
npm test
npm run build
git diff --check
```

Local Supabase execution additionally requires Docker or Podman. Lack of a local container runtime does not justify skipping linked migration history and schema lint checks.

## Related documentation

- `docs/booking-process.md` — canonical customer booking lifecycle.
- `docs/backend-offline-interaction.md` — boundary between standalone and integrated behavior.
- `docs/supabase-schema-catalog.md` — table/type mapping catalog.
- `docs/ARCHITECTURE.md` — code organization.
- `docs/booking-i18n-status.md` — English/Spanish public-flow coverage.
