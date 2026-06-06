# Backend Implementation Plan

**Status:** drafted 2026-06-06.

**Purpose:** turn `BACKEND_RECOMMENDATIONS.md`, `SYSTEM_REFERENCE.md`, `EPICS_AND_STORIES.md`, and `STRATEGIC_PRODUCT_ROADMAP.md` into an implementation sequence for the Supabase backend. This is an execution plan, not a schema source of truth. If this plan and the recommendation docs disagree, update the recommendation docs first.

## Goal

Move Haab Calendar from browser-local persistence to a Supabase-backed booking system where:

- Supabase Postgres is the durable source of truth.
- Public booking writes are server-authoritative and transactional.
- Provider-owned admin data is protected by Supabase Auth and Row Level Security.
- The current local store remains the responsive read model during the migration.
- Confirmed bookings are only shown after the server confirms them.

## Non-goals

- Do not add payments in this backend pass. Existing cost fields remain informational snapshots.
- Do not build SMS or email notifications until bookings, manage links, and audit events are stable.
- Do not expose raw bookings, client contact details, or hold rows to unauthenticated public clients.
- Do not rewrite the whole booking UI while migrating persistence. The backend should slot through the existing `useModuleStore` seam.

## Ground Rules

1. **Read current framework docs before route work.** This repo uses a Next.js version with breaking changes. Before editing Route Handlers, Server Components, Server Actions, proxy/middleware, or caching behavior, read the relevant guide in `node_modules/next/dist/docs/`.
2. **Use Supabase docs before Supabase work.** Check current Supabase docs for SSR clients, Auth, RLS, and migrations before changing code.
3. **One durable capability per checkpoint.** Schema, public reads, holds, booking confirmation, manage links, admin writes, and Realtime should land as separate reviewed increments.
4. **Server is the authority for conflicts.** Client-side availability is a preview. Holds and confirmations must re-check availability inside a server transaction.
5. **RLS is mandatory.** Every exposed table gets RLS before application code depends on it.
6. **No raw manage tokens at rest.** The client receives the raw token once; the database stores only a hash.

## Current Code Seams

Use these entry points instead of scattering backend calls through the UI:

- `components/booking/state/useModuleStore.ts` - persistence seam for store hydration, local read model, write commits, and sync.
- `lib/availability.ts`, `lib/store.ts`, `lib/date.ts`, `lib/booking-tokens.ts` - current behavior that server code should preserve or mirror.
- `app/public/[slug]/page.tsx` - public booking route.
- `app/public/[slug]/manage/[token]/page.tsx` - public manage-link route.
- `app/page.tsx` - adaptive admin/developer route.
- `lib/supabase/*` and `proxy.ts` - existing Supabase SSR/Auth utilities from the initial auth work.

## Phase 0 - Project Link, Docs, and Baseline

**Goal:** make sure backend work starts from known project state.

Tasks:

- Confirm the Supabase project, local Supabase CLI setup, and `.env.local` values.
- Confirm only publishable Supabase keys are exposed through `NEXT_PUBLIC_*`.
- Decide whether development uses a local Supabase stack, a remote development project, or both.
- Read the relevant Next.js docs under `node_modules/next/dist/docs/` for any route/auth/caching area being touched.
- Read current Supabase docs for SSR, Auth, RLS, migrations, and server-side writes.
- Capture a baseline with `npm run lint`, `npm run test`, `npm run build`, and a quick public booking smoke if the app runs locally.

Acceptance:

- Environment and project IDs are known.
- Required docs have been checked.
- Baseline failures, if any, are recorded before backend changes begin.

## Phase 1 - Database Schema and Security Foundation

**Goal:** create the hardened relational model described in `BACKEND_RECOMMENDATIONS.md`.

Tasks:

- Create migrations with the Supabase CLI, not hand-named migration files.
- Add tables: `providers`, `services`, `bookings`, `booking_holds`, and `booking_events`.
- Add constraints and indexes for provider ownership, slugs, service ownership, booking status/date queries, hold expiry queries, and manage token hashes.
- Add snapshot fields on bookings: `service_name`, `cost_snapshot`, and `capacity_snapshot`.
- Add provider fields needed early: `timezone` and `booking_window_days`.
- Enable RLS on every table.
- Add admin policies scoped through `providers.owner_user_id = auth.uid()`.
- Add public-safe read policies only where the browser may read directly.
- Avoid public insert/update/delete policies for booking-critical writes.
- Add seed SQL for a test provider, services, and weekly availability.
- Generate or update TypeScript database types after the schema exists.

Acceptance:

- Migrations apply cleanly to an empty database.
- RLS is enabled on every exposed table.
- A provider can only read/write their own admin data.
- Public clients cannot read raw bookings, client details, holds, manage token hashes, or booking events.

Verification:

- Run migration locally or against the development project.
- Run Supabase security/performance advisors when a project is linked.
- Run targeted SQL checks for ownership and public access behavior.

## Phase 2 - Auth and Provider Ownership

**Goal:** connect email/password provider auth to provider-owned backend data.

Tasks:

- Confirm the existing Supabase email/password login flow works end to end.
- Add a provider onboarding path that creates or links a `providers` row to `auth.users.id`.
- Ensure setup completion writes provider profile, services, availability, timezone, and booking window to Supabase.
- Decide whether one auth user can own multiple providers now, or whether the first release enforces one provider per user in app code.
- Add clear unauthenticated and unauthorized states for admin surfaces.
- Avoid using user-editable metadata for authorization decisions.

Acceptance:

- A logged-in provider can create and reload their provider profile.
- A logged-out user cannot access provider admin data.
- A logged-in user cannot access another provider's admin data.

## Phase 3 - Public Read Model

**Goal:** hydrate the public booking page from Supabase without exposing private data.

Tasks:

- Load provider profile and services by public slug.
- Return only public-safe provider fields, services, weekly availability, timezone, and booking window.
- Compute available slots from public-safe data plus server-side conflict checks.
- Preserve the current `ModuleStore` shape at the UI boundary so the booking module does not need a large rewrite.
- Add loading, not-found, and fetch-failed states on `/public/[slug]`.
- Keep `localStorage` as a fallback only for development/demo if explicitly enabled.

Acceptance:

- `/public/[slug]` renders from Supabase data.
- Public payloads do not include raw bookings, client details, holds, booking events, or manage token hashes.
- Existing service selection and slot display behavior still match the local implementation.

## Phase 4 - Server-Authoritative Holds

**Goal:** replace client-only holds with database-backed, expiring reservations.

Tasks:

- Add a public hold endpoint, server action, or RPC for creating holds.
- Re-run availability validation on the server using provider, service, date, time, existing confirmed bookings, and active holds.
- Use a transaction-scoped slot lock or another non-volatile active-hold strategy. Do not rely on a partial unique index using `now()`.
- Store holds with `expires_at = now() + 10 minutes`.
- Add a release endpoint for explicit client release.
- Add scheduled cleanup for expired holds via Supabase Cron, Edge Function, or another documented job.
- Update the UI countdown to use server `expires_at`.
- Refresh available slots when hold creation fails.

Acceptance:

- Two clients cannot successfully hold the same slot at the same time.
- Expired holds stop blocking availability.
- Hold creation errors produce recoverable UI states such as "This slot was just taken."

## Phase 5 - Booking Confirmation Transaction

**Goal:** confirm bookings only through a server transaction.

Tasks:

- Add a public booking confirmation endpoint, server action, or RPC.
- Require `hold_id`, client details, selected service, selected slot, and an idempotency key.
- Verify the hold exists, is unexpired, belongs to the same provider/service/slot, and has no confirmed booking conflict.
- Create the booking with snapshot fields and status `confirmed`.
- Generate a raw manage token, store only `manage_token_hash`, and return the raw token once.
- Delete or release the hold in the same transaction.
- Record a `booking_events` row.
- Return a stable confirmation number derived from the booking UUID.
- Keep the UI in a pending state until the server transaction succeeds.

Acceptance:

- A customer never sees a confirmed booking unless the server has committed it.
- Duplicate submits with the same idempotency key do not create duplicate bookings.
- Slot conflict and validation failures are clear and recoverable.
- Booking history is recorded in `booking_events`.

## Phase 6 - Manage-Link Reads, Cancellation, and Reschedule

**Goal:** make `/public/[slug]/manage/[token]` work against hashed server tokens.

Tasks:

- Hash the presented manage token server-side and compare it with `bookings.manage_token_hash`.
- Return only the booking matched by the token plus public-safe provider/service context.
- Add cancellation through a server-authoritative update that records a booking event.
- Add reschedule through a hold-and-confirm flow, not a direct client-side row update.
- Preserve historical booking snapshots even if the service has changed.
- Show not-found or expired/invalid token states without leaking whether a booking exists for a given email or provider.

Acceptance:

- A valid manage token can view, cancel, and reschedule its booking.
- Invalid tokens do not reveal private data.
- Cancellation and reschedule write booking events.

## Phase 7 - Admin Reads and Writes

**Goal:** move provider admin data to authenticated Supabase operations.

Tasks:

- Load provider dashboard, bookings, services, availability, and settings through authenticated server/client Supabase utilities protected by RLS.
- Implement service create/edit/delete/reorder.
- Implement provider profile, timezone, booking window, slug, and availability updates.
- Preserve booking snapshot behavior when service records change.
- Add clear user-facing errors and maintainer-facing logs for failed admin writes.
- Consider whether admin booking create/edit should be shipped in this phase or kept out of scope.

Acceptance:

- Admin refreshes show persisted data.
- RLS blocks cross-provider reads and writes.
- Service and settings mutations do not corrupt historical bookings.

## Phase 8 - Store Integration and Sync States

**Goal:** connect Supabase-backed data to the existing `useModuleStore` seam.

Tasks:

- Keep the local store as the read model for responsive UI.
- Add explicit sync states: loading, synced, pending, rejected, stale.
- Route public booking-critical writes through server endpoints, then reconcile the local store from server responses.
- Route admin writes through RLS-protected Supabase operations or server endpoints, then reconcile.
- Preserve `integratedMode`, `onStoreChange`, and `onBookingsChange` behavior for embedders.
- Keep local-only development mode available behind a deliberate configuration switch, if needed.

Acceptance:

- UI behavior remains responsive while server writes are pending.
- Rejected server writes roll back or reconcile cleanly.
- The public confirmation screen depends on server success, not local optimism.

## Phase 9 - Realtime and Polling Fallback

**Goal:** keep slot availability fresh across multiple clients.

Tasks:

- Subscribe to provider-scoped availability changes for bookings and holds.
- Avoid exposing raw private booking payloads to public clients.
- Refresh computed availability when relevant events arrive.
- Clean up subscriptions on unmount.
- Add polling on user interaction as a fallback if Realtime drops.

Acceptance:

- A booking or active hold created in another tab/device updates visible availability.
- Public clients receive only availability-safe information.
- The UI still refreshes availability when Realtime is unavailable.

## Phase 10 - Operations, Notifications, and Hardening

**Goal:** make the backend supportable after core booking flows are stable.

Tasks:

- Add structured logs for failed holds, failed confirmations, auth failures, and unexpected transaction errors.
- Add durable cleanup for expired holds and alerting if cleanup fails.
- Add email notifications after booking creation/cancellation/reschedule once the transaction model is stable.
- Add backup/restore notes for Supabase.
- Review advisor output and remediate security/performance findings.
- Add rate limits or abuse controls for public hold and booking endpoints if traffic patterns require it.

Acceptance:

- Maintainers can debug failed booking attempts without exposing client secrets or private data.
- Expired holds are cleaned reliably.
- Notifications are triggered only after committed booking state changes.

## Testing Strategy

Run these gates at the relevant checkpoints:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npx tsc --noEmit` if it is not already covered by the configured scripts
- Supabase migration apply/reset against an empty database
- RLS checks for anonymous, authenticated owner, and authenticated non-owner roles
- Functional smoke:
  - provider signup/login
  - provider setup
  - public route load by slug
  - hold creation
  - booking confirmation
  - duplicate booking conflict
  - manage-link view/cancel/reschedule
  - admin reload after refresh

## Suggested Checkpoints

1. Schema, RLS, seed data, and generated types.
2. Authenticated provider setup and admin data ownership.
3. Public Supabase read model by slug.
4. Server-side holds and cleanup.
5. Server-side booking confirmation and manage token generation.
6. Manage-link cancellation and reschedule.
7. Admin service/settings/bookings persistence.
8. Store sync states and Realtime refresh.
9. Notifications and operational hardening.

## Open Decisions

- Should booking-critical writes live primarily in Next Route Handlers, Server Actions, or Postgres RPCs? Pick one default before Phase 4 to avoid split patterns.
- Should the first release support one provider per auth user or many providers per auth user?
- What is the default provider timezone for seeded/dev data?
- Should public availability be served as computed slots only, or as provider/service data plus a dedicated availability endpoint?
- Which cleanup mechanism is available in the target Supabase plan: Cron, Edge Function, or scheduled external job?
- Do we keep local demo mode after backend cutover, and if so, how is it clearly separated from production?
