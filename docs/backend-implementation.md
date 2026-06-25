# Backend Implementation

**Status:** first backend checkpoint implemented. This document explains the Supabase backend slice that currently exists in the repo.

This is not the full production booking backend yet. The current work establishes the database foundation, security boundary, seed path, and first public read API. Public booking writes, server-side holds, booking confirmation, manage-link writes, admin persistence, and realtime availability are still future phases from `docs/superpowers/plans/2026-06-06-backend-implementation-plan.md`.

## What Exists Now

The backend work currently consists of these files:

| File | Purpose |
| --- | --- |
| `supabase/config.toml` | Local Supabase project configuration created by `npx supabase init`. |
| `supabase/migrations/20260607113603_schema_security_foundation.sql` | First database migration: schema, constraints, indexes, RLS, grants, private helpers, and public-safe views. |
| `supabase/migrations/20260611150930_url_management_hierarchy.sql` | URL hierarchy migration: vertical-aware provider slugs, service slugs, premium custom slugs, and redirect history tables/views. |
| `supabase/seed.sql` | Development seed for a demo provider and services once a matching Supabase Auth user exists. |
| `app/api/public/providers/[slug]/route.ts` | Public DTO Route Handler for loading a provider booking page by slug without exposing private data. |
| `BACKEND_RECOMMENDATIONS.md` | Updated source-of-truth backend design notes, including DTO boundaries and text service cost/capacity fields. |

## Chosen Backend Shape

The first slice follows this approach:

- Supabase Postgres is the durable data store.
- RLS protects provider-owned admin data.
- Public reads go through a deliberate DTO boundary, not raw table payloads.
- Public booking-critical writes will be built later through server-authoritative endpoints or private RPCs.
- The existing React booking module still expects a `ModuleStore` shape, so public backend data is mapped back into that shape at the API boundary.

For this checkpoint, public reads use a Next.js Route Handler:

```txt
GET /api/public/providers/[slug]
```

The route reads from public-safe database views and returns:

```ts
{
  store: ModuleStore;
  meta: {
    timezone: string;
    bookingWindowDays: number;
  };
}
```

The canonical hierarchical public routes now use the public resolver and pass the DTO into `HaabBookingModule` through `injectedConfig`. `/public/[slug]` remains only as a standalone local demo path because there are no production URLs to preserve yet.

## Database Schema

The migration creates five public tables.

### `providers`

Stores one provider profile and its weekly availability.

Important fields:

- `owner_user_id` references `auth.users(id)` and is the root of admin ownership.
- `full_name`, `business_name`, and `email` store provider profile data.
- `vertical` scopes the provider into the public URL taxonomy.
- `slug` is unique per vertical and used by public booking URLs.
- `custom_slug` is a premium-only vanity slug input; the database normalizes it into `slug`.
- `plan_tier` currently marks whether custom slugs are allowed.
- `timezone` and `booking_window_days` support production-safe availability.
- `availability` is JSONB because the app uses a fixed weekly schedule structure.
- `setup_complete` controls whether a provider is visible through public-safe reads.

Slug behavior:

- If a provider has no explicit slug, the database generates one from `business_name`, then `full_name`, then `haab-calendar`.
- Collisions get numeric suffixes such as `haab-demo-studio-2`.
- Previous slugs are stored in `provider_slug_redirects` so old profile URLs can redirect permanently.
- This preserves the current frontend fallback behavior where an empty `publicSlug` still produces a working public URL.

### `services`

Stores services offered by a provider.

Important fields:

- `provider_id` links each service to a provider.
- `slug` is generated from `name` and unique per provider.
- `booking_type` is either `appointment` or `full-day`.
- `duration_minutes` is required for appointments and must be null for full-day services.
- `capacity` and `cost` are text fields, not numeric fields. The current app treats these as labels like `Max 4 players` and `Premium advisory session`, not enforced inventory or payment values.
- `sort_order` supports future admin service ordering.
- Previous service slugs are stored in `service_slug_redirects` so old service URLs can redirect permanently.

### `bookings`

Stores confirmed, rescheduled, and cancelled bookings.

Important fields:

- `provider_id` scopes the booking to a provider.
- `service_id` can become null if a service is deleted.
- Snapshot fields preserve historical display:
  - `service_name`
  - `booking_type`
  - `duration_minutes_snapshot`
  - `cost_snapshot`
  - `capacity_snapshot`
- Client details are private:
  - `client_name`
  - `client_email`
  - `client_phone`
- `manage_token_hash` stores only the hashed manage token.
- `confirmation_number` is unique.
- `idempotency_key` prevents duplicate bookings from repeated confirmation requests.

There is also a unique `(provider_id, idempotency_key)` index so the same confirmation request cannot create duplicate booking rows.

### `booking_holds`

Stores temporary slot reservations.

Important fields:

- `provider_id`, `service_id`, `date`, `start_time`, and `end_time` identify the held slot.
- `booking_type` preserves the current full-day versus appointment behavior.
- `expires_at` is server-authoritative.

This table is created now, but public hold creation is not implemented yet. The next backend phase should add transaction-safe hold creation and cleanup.

### `booking_events`

Stores booking history for support and audit trails.

Important fields:

- `booking_id` links to the booking.
- `provider_id` makes provider-scoped queries cheap.
- `actor_type` records `provider`, `customer`, or `system`.
- `event_type` records actions like `created`, `rescheduled`, or `cancelled`.
- `metadata` stores structured context.

## Private Helpers

The migration creates a private schema:

```sql
create schema if not exists private;
```

It contains helper functions:

- `private.slugify(value text)` normalizes slugs.
- `private.set_updated_at()` maintains `updated_at` timestamps.
- `private.ensure_provider_slug()` generates and de-duplicates provider slugs.
- `private.provider_owner(provider_id uuid)` checks whether the current authenticated user owns a provider.

The private schema is not exposed as a public API surface. The owner helper is granted only to `authenticated` and `service_role`, and privileged helpers use explicit `search_path` settings.

## Row Level Security

RLS is enabled on every public table:

- `providers`
- `services`
- `bookings`
- `booking_holds`
- `booking_events`

Admin ownership is based on:

```sql
providers.owner_user_id = auth.uid()
```

The main rule is:

- Providers can read and write only their own admin data.
- Anonymous public clients cannot read raw bookings, holds, booking events, manage token hashes, or client contact details.
- Public clients can only read public-safe provider and service data for providers where `setup_complete = true`.

The migration also revokes broad table privileges and grants only the specific table or column access needed by each role.

## Public-Safe Views

The migration creates two public-safe views:

### `public.public_providers`

Exposes only:

- `id`
- `full_name`
- `business_name`
- `slug`
- `timezone`
- `booking_window_days`
- `availability`

It does not expose provider email.

### `public.public_services`

Exposes only service fields that are safe for public booking:

- `id`
- `provider_id`
- `name`
- `booking_type`
- `duration_minutes`
- `description`
- `capacity`
- `cost`
- `notes`
- `sort_order`

Both views use `security_invoker = true` so they respect the underlying RLS policies.

## Public Provider API

The public route lives at:

```txt
app/api/public/providers/[slug]/route.ts
```

Request:

```txt
GET /api/public/providers/haab-demo-studio
```

Response shape:

```ts
{
  store: {
    provider: {
      fullName: string;
      businessName: string;
      email: "";
      publicSlug: string;
    };
    services: Service[];
    availability: WeeklyAvailability;
    bookings: [];
    bookingHolds: [];
    setupComplete: true;
  };
  meta: {
    timezone: string;
    bookingWindowDays: number;
  };
}
```

The route deliberately returns empty `bookings` and `bookingHolds` arrays. Raw bookings and holds are private and should not be sent to unauthenticated public clients. Future availability endpoints can return computed availability without exposing raw private rows.

Error responses include friendly `userMessage` fields. Internal lookup failures are logged with a generated `debugId`.

## Development Seed

The seed file creates:

- Provider: `Haab Demo Studio`
- Slug: `haab-demo-studio`
- Timezone: `Asia/Kuala_Lumpur`
- Booking window: `60` days
- Three demo services:
  - `New Patient Consultation`
  - `Court Rental`
  - `Banquet Hall Exclusive`

The seed depends on an auth user:

```txt
dev-provider@example.com
```

If that user does not exist in `auth.users`, the seed is a no-op. This avoids inserting provider rows with fake owner IDs.

## How To Run This Locally

The Supabase CLI is available through `npx`, so commands can be run without a global install:

```bash
npx supabase --version
```

To apply the migration locally, Docker or another local Supabase database must be available:

```bash
npx supabase start
npx supabase migration up
```

To reset and seed:

```bash
npx supabase db reset
```

Current local limitation:

- Docker is not installed in this environment.
- `npx supabase db lint --local` failed because no local database was listening at `127.0.0.1:54322`.
- Database types have not been generated yet because a local or linked remote database is needed.

## Verified Gates

The code and docs added in this checkpoint passed:

```bash
npm run lint
npm run test
npx tsc --noEmit
npm run build
git diff --check
```

`npm run test` passed 136 Vitest tests.

## What This Does Not Do Yet

This checkpoint does not yet implement:

- Server-authoritative public booking writes.
- Server-side hold creation.
- Hold release.
- Expired hold cleanup.
- Booking confirmation transactions.
- Manage-token hashing at booking creation.
- Manage-link backend reads, cancellation, or reschedule.
- Admin provider setup persistence.
- Admin service create/edit/delete persistence.
- Realtime or polling availability refresh.
- Generated Supabase TypeScript database types.

Those are the next phases in `docs/superpowers/plans/2026-06-06-backend-implementation-plan.md`.

## Next Practical Step

The next small backend step should be server-authoritative booking writes:

1. Create server-side hold endpoints for canonical public routes.
2. Confirm bookings through a transaction that validates the hold and slot.
3. Store hashed manage tokens and return the raw token once.
4. Keep the existing localStorage mode available for standalone demo mode.

After that, move cancellation and reschedule to server-authoritative manage-token endpoints.

## Provider language (i18n)

The public booking page renders in the provider's preferred language (`en` by
default, `es` supported), read from `public_providers.language`. The Settings →
Language selector updates `provider.language` in the client store (and
`lib/store.ts: normalizeProvider` already round-trips the value). The
`public-booking-resolver.ts` reads the `language` column from
`public_providers` and forwards it to `ModuleStore.provider.language` so the
booking module picks it up automatically.

Because provider config persistence to `public.providers` is not yet
implemented (see "Admin provider setup persistence" in the list above), the
Settings selector has no write path to the database. When that persistence
layer is built, the upsert/update payload **must** include the `language`
column so the provider's choice reaches the public page:

```ts
// Example: add this to the provider upsert payload
language: store.provider.language,  // "en" | "es"
```

Until persistence lands, set the column directly for testing:

```sql
update public.providers set language = 'es' where slug = '<provider-slug>';
```
