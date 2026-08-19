# Backend Implementation

**Status:** current as of 2026-08-12. The Supabase backend supports provider administration, canonical public pages, server-authoritative booking writes, customer manage links, publication controls, permanent super-admin account deletion, capacity events, and resilient temporary holds.

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

Super-admin routes can update publication state or permanently delete an Auth
account. They cannot appoint additional super administrators, and server code
always rejects deletion of `bsorianodev@gmail.com`, the sole super admin.

Permanent deletion requires the target email in the request body and rechecks it
against the Auth user loaded by ID. Demo-owner accounts are deletable; their
public examples return 404 until reseeded. `auth.admin.deleteUser(userId, false)`
triggers existing cascade foreign keys for providers, services, bookings and
client details, holds, redirects, and publication settings.

Before Auth deletion, current provider logo, header, and gallery URLs belonging
to Vercel Blob are recorded in `account_deletion_cleanup_jobs`. Successful Blob
deletion removes the job. A post-delete Blob failure returns HTTP `202` and keeps
an opaque service-only job for `/api/super-admin/account-deletion-cleanups/{jobId}/retry`.
No email, business name, booking details, client details, Blob URLs, or raw Blob
errors are exposed by cleanup summaries.

Every retry rechecks `target_user_id` through Auth before deleting files. If the
Auth account still exists because deletion failed and cleanup-job rollback also
failed, retry removes only the stale job and leaves the live account's assets
untouched.

Only current image URLs referenced by provider rows can be removed safely.
Historical unreferenced files from past image replacements cannot be attributed
because existing upload paths contain no owner ID.

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
| `20260812140400_add_account_deletion_cleanup_jobs.sql` | Service-only durable retry state for post-account-deletion Vercel Blob cleanup. |
| `20260816144447_add_stripe_billing_projection.sql` | Stripe webhook inbox, provider billing projection, and their claim/apply RPCs. |
| `20260816131850_add_integration_outbox.sql` | Transactional outbox: `bookings.integration_version`, `integration_outbox_events`, enqueue triggers, and the worker claim/completion RPCs. |

## Billing and entitlement source of truth

`POST /api/webhooks/stripe` verifies the Stripe signature against the raw body,
rejects a `livemode` that disagrees with the configured key, records the event
in `public.stripe_webhook_events`, then claims and processes it. The claim is a
single atomic statement, so a redelivery — which Stripe makes no promise not to
send twice at once — cannot be processed concurrently.

`public.provider_billing_subscriptions` holds one row per provider and is the
baseline the entitlement resolver reads. Precedence, highest first:

1. an active manual override (`provider_feature_overrides`)
2. the billing projection
3. the legacy `providers.plan_tier`, for accounts that predate billing

Required environment: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PREMIUM_PRODUCT_IDS` (comma-separated product ids that grant premium; an
empty list grants nothing). All are read lazily, so `next build` succeeds
without them and the webhook endpoint fails closed until they are set.

## Outbound integration delivery

Booking changes reach outside systems through a transactional outbox, not
through calls made during the request.

- **Enqueue is a trigger, not application code.** Booking mutations in
  `lib/supabase/bookings.ts` are discrete PostgREST calls with no application
  transaction around them, so an outbox insert written in TypeScript could be
  lost between a committed booking and a crashed process. Triggers on
  `public.bookings` run inside the booking's own transaction: commit writes
  both, rollback writes neither.
- **`bookings.integration_version`** increments once when an
  integration-relevant field changes. Relevant: `provider_id`, `service_id`,
  `service_name`, `booking_type`, `duration_minutes_snapshot`, `client_name`,
  `client_email`, `client_phone`, `date`, `start_time`, `end_time`, `status`,
  `notes`, `location_snapshot`, `details`, `details_schema_key`,
  `details_schema_version`, `service_snapshot`. Excluded: `updated_at`,
  `manage_token_hash`, `confirmation_number`, `idempotency_key`,
  `hold_id_snapshot`, and the version column itself.
- **Event types:** `booking.created` on insert; on update, `booking.cancelled`
  when the status becomes cancelled, `booking.rescheduled` when the date or
  either time changes, `booking.updated` otherwise. No event at all when the
  version did not rise.
- **Payload carries identifiers only** — booking ID, provider ID, aggregate
  version, change type. No client name, email, phone, notes, details, or manage
  token. A handler reloads the booking through an authorized read.
- **The worker** (`lib/integrations/outbox/worker.ts`) claims a bounded batch
  through `claim_integration_outbox_events` (`FOR UPDATE SKIP LOCKED`, one
  lease per row, `attempt_count` incremented on claim), processes events one at
  a time, and records each outcome through a lease-matched RPC. External work
  happens outside every database transaction.
- **Delivery is at-least-once.** An expired lease returns a row to the pool even
  if the original worker is still alive; its completion is then rejected because
  the lease token no longer matches. Handlers must be idempotent.
- **Retry policy:** 8 attempts, 30s initial delay, exponential with jitter, 6h
  ceiling, then `dead_letter`. Permanent failures dead-letter at once. Stored
  error codes and messages are bounded and sanitised — never tokens, external
  response bodies, or stack traces.
- **Scheduling.** `GET /api/cron/integration-outbox` runs one batch. It requires
  `Authorization: Bearer $CRON_SECRET` and returns 401 when the secret is unset,
  so an unconfigured deployment exposes nothing. A scheduler must be pointed at
  it; this repository has no deployment target configured, so no `vercel.json`
  cron entry is committed. On Vercel it would be:

  ```json
  { "crons": [{ "path": "/api/cron/integration-outbox", "schedule": "* * * * *" }] }
  ```

  Do not rely on `after()`, `waitUntil()`, or fire-and-forget promises for
  durability: a serverless request may end at the response. Recoverability lives
  in the outbox and its leases.
- **Retention.** Keep `succeeded`/`skipped` rows 30–90 days; keep `dead_letter`
  rows until reviewed. No cleanup job exists yet, and none is added here.
- **Deletion.** Outbox rows cascade from bookings and providers, so deleting an
  account discards its pending events. Credential revocation and external
  cleanup are now handled by the Google work: disconnect attempts revocation
  inline and falls back to `google_revocation_jobs`, which outlives the
  connection row so a grant is never stranded. Deleting a provider still does
  not delete events from a calendar Haab wrote to.
- **Local and demo mode** never touch this path: the triggers live on Supabase
  tables, and localStorage bookings never reach them.

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
