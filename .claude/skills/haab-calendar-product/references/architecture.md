# Architecture (product-level)

Enough to discuss technical product decisions. For implementation, read the repo docs this file points to: `docs/ARCHITECTURE.md`, `docs/booking-engine.md`, `docs/backend-implementation.md`, `docs/supabase-schema-catalog.md` and `SYSTEM_REFERENCE.md` (older, deep history).

## Contents
- Stack
- Shape of the app
- Data and authority
- Security invariants
- Background work
- Design principles to preserve
- Where things live

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, Tailwind v4, TypeScript |
| Data | Supabase: Postgres with RLS, Auth (email and password), Realtime, private Storage, pg_cron |
| Hosting | Vercel; production origin `https://haabcalendar.com` |
| Email | Resend, through a transactional outbox |
| Images | Vercel Blob (public page images); `sharp` decodes receipts |
| Scheduled workers | GitHub Actions every 5 minutes, calling authenticated cron routes (`CRON_SECRET`) |
| Billing | Stripe, wired for future paid plans only; no client payments |
| Marketing analytics | PostHog (cookieless) and GA4, on the landing page only |
| Observability | Structured logs and OpenTelemetry (optional) |

Repo note: this Next.js version has breaking changes from older versions. Read `node_modules/next/dist/docs/` before writing Next.js code.

## Shape of the app

- **One entry component:** `HaabBookingModule` (`components/haab-booking-module.tsx`) renders admin and public surfaces.
- **Layers:**
  - pure logic in `lib/` (no React; Vitest-tested)
  - primitives in `components/ui/`
  - persistence in `components/booking/state/useModuleStore.ts`
  - presets in `config/`
- **Two modes:**
  - *Standalone*: localStorage plus multi-tab sync. Used for demos, the guest builder and offline use. It cannot coordinate separate devices.
  - *Integrated*: data is injected. Public holds and bookings go through server route handlers, and Supabase is authoritative.
- **Parent template:** future child projects customize only through seams: `injectedConfig`, CSS-variable theming, `surfaceMode`, seed data, the entitlement catalog and word sets. Never bake child- or industry-specific behavior into core.
- **Offline-first intent:** the UI must keep working when the connection drops. Reads come from local state and writes retry. Integrated bookings are the exception: the server must accept a confirmation, and local storage is never treated as proof of one.

## Data and authority

| Question | Authority |
| --- | --- |
| Is a slot free? | Postgres: GiST exclusion for exclusive rows, capacity triggers plus an advisory lock per `(service, date)` for shared rows |
| Hold expiry | `booking_holds.expires_at`, server time |
| Event inventory | `max_spots` counting confirmed and rescheduled bookings plus unexpired holds |
| Feature access | `resolveEntitlements()`: override → billing → plan → off; fails closed |
| Booking history | `booking_events` (owner-visible audit); `integration_outbox_events` (private operational state) |

The availability functions in `lib/availability.ts` are pure and run on both client and server, so an offline page reaches the same answer as the server for the data it holds.

## Security invariants

- Public visitors never write directly to `bookings` or `booking_holds`. Route handlers validate input and use a server-only admin client.
- Anonymous clients never receive booking lists, client contact data, booking events or token hashes.
- Manage and invitation tokens are random and stored only as SHA-256 hashes.
- Price, capacity and location snapshots are computed on the server, never trusted from the browser.
- Owners act under RLS ownership checks. Entitlement and billing tables have RLS with **no** policies, so they are reachable only through the service role.
- Super-admin is a single hardcoded address. Unauthorised callers get 404, not 403.
- Removing access (disconnect, revoke) is never gated.

## Background work

| Route | Does |
| --- | --- |
| `/api/cron/integration-outbox` | Delivers outbox events: emails, Google projection |
| `/api/cron/google-workers` | Webhook dispatch, inbound apply, conflict repair, reconcile, revocation |
| `/api/cron/booking-reminders` | Email reminders |
| `/api/cron/booking-retention` | Daily purge (1 month, or 1 year if opted in) |
| pg_cron `cleanup-expired-booking-holds` | Every minute; storage cleanup only |

If the worker schedule stops, the app still works. Only outbound email, Google delivery and the inbound queues stall.

## Design principles to preserve

1. The server decides availability. The UI only narrows the race window.
2. Fail closed on entitlements, Google busy checks and anything unknown.
3. Booking writes never call third parties in-request. Use the outbox.
4. Times are provider-local wall time plus timezone.
5. Client PII stays in Haab.
6. Migrations are forward-only. Push hosted migrations before deploying code that needs them. A dashboard outage on 2026-10-10 came from an unpushed migration.
7. Navigation changes need phone and desktop cases in `e2e/nav-widths.spec.ts`.

## Where things live

| Concern | Path |
| --- | --- |
| Domain types | `lib/types.ts` |
| Slots, spots | `lib/availability.ts` |
| Flow steps | `lib/booking-flow-machine.ts` |
| Server booking rules | `lib/supabase/bookings.ts` |
| Public resolver | `lib/public-booking-resolver.ts` |
| Public APIs | `app/api/public/[verticalSegment]/[providerSlug]/{holds,bookings,manage}` |
| Presets | `config/verticals.ts` |
| Word sets | `lib/vertical-copy.ts` |
| Entitlements | `lib/entitlements/{catalog,resolve,server}.ts` |
| Google | `lib/google/*` |
| RSVPs | `lib/invitations.ts`, `lib/rsvp-*.ts`, `lib/seating.ts`, `lib/door.ts` |
| Deposits | `lib/bank-deposit*.ts`, `lib/deposit-*.ts` |
| Landing copy | `components/landing/translations.ts` |
| Demo allowlist | `lib/demo-pages.ts` |
