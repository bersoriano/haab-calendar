# Backend and Offline Interaction

**Status:** current as of the first Supabase backend checkpoint.

This document explains the design reasoning behind the backend work and how it relates to the existing offline/localStorage functionality. It is written as an implementation rationale, not a replacement for `docs/backend-implementation.md`.

## Short Answer

The offline code was not removed.

The current backend work was built as a parallel foundation:

- The existing app still runs through `HaabBookingModule`.
- The existing app still uses `components/booking/state/useModuleStore.ts`.
- Standalone mode still reads from and writes to `localStorage`.
- The new Supabase files do not replace the local store yet.
- The new public API route exists as a future read boundary, but `/public/[slug]` has not been rewired to depend on it.

The intent is to migrate gradually, not to switch the app from offline to online in one risky step.

## Why The Backend Was Built This Way

The current product already works as a local-first booking engine. That matters because the booking module has a lot of behavior tied to a single `ModuleStore` shape:

- provider profile
- services
- weekly availability
- bookings
- booking holds
- setup state

The safest backend path is to preserve that shape at the UI boundary. That is why the first public backend route returns a `ModuleStore`-compatible DTO instead of pushing raw database rows into the React component.

The backend was designed around three principles:

1. Keep the existing offline behavior intact.
2. Add durable backend primitives without scattering Supabase calls through the UI.
3. Move one capability at a time from local-only to server-backed.

## Existing Offline Flow

Offline behavior is still centered on:

```txt
components/booking/state/useModuleStore.ts
```

In standalone mode, `useModuleStore` still does the following:

- starts with an empty local store
- hydrates from `localStorage`
- normalizes stored data
- backfills missing manage tokens
- persists store changes back to `localStorage`
- listens for cross-tab `storage` events
- commits booking changes locally
- commits booking hold changes locally
- releases local booking holds

That is the code path the current root route and public route still use.

Current routes still mount the module directly:

```txt
app/page.tsx
app/public/[slug]/page.tsx
app/public/[slug]/manage/[token]/page.tsx
```

The public route still passes `requestedPublicSlug` into the module. It does not yet fetch the Supabase DTO.

## Existing Integrated Mode

The module also already has an integrated mode.

Integrated mode activates when `injectedConfig` includes:

- provider
- services
- availability

In that mode:

- the module does not hydrate from `localStorage`
- provider, service, and availability data come from the parent route/app
- bookings and holds are kept in shadow state inside the module
- changes can bubble out through callbacks

This existing integrated mode is the intended bridge to Supabase.

The backend route was shaped so it can eventually feed this mode:

```ts
<HaabBookingModule injectedConfig={response.store} />
```

That is why the backend returns frontend-friendly names like `fullName`, `businessName`, `publicSlug`, and `bookingType` instead of exposing raw database column names like `full_name`, `business_name`, `slug`, and `booking_type`.

## New Backend Flow

The new backend work adds a public read route:

```txt
GET /api/public/providers/[slug]
```

That route:

1. Receives a public slug.
2. Reads from public-safe Supabase views.
3. Maps provider and services into the existing `ModuleStore` shape.
4. Returns empty `bookings` and `bookingHolds` arrays.
5. Includes metadata for timezone and booking window.

It deliberately does not expose:

- provider email
- raw bookings
- raw holds
- client names
- client emails
- client phone numbers
- manage token hashes
- booking events

This keeps public reads useful without making private operational data public.

## Why The Public Route Is Not Rewired Yet

The public route was not changed to consume the new API in the first checkpoint because that would be a behavior migration.

Changing `/public/[slug]` from localStorage to Supabase affects:

- loading states
- not-found states
- fetch-failed states
- local demo behavior
- how setup data appears on the public page
- how existing localStorage demo data is treated

Those are UI and product behavior changes, not just backend foundation work.

The first checkpoint intentionally stopped before that line. It created the backend contract first, then verified the app still builds and the offline behavior is untouched.

## How The Two Modes Should Coexist

The intended coexistence model is:

| Scenario | Data Source | Notes |
| --- | --- | --- |
| Local demo / offline prototype | `localStorage` through `useModuleStore` standalone mode | Current behavior remains available. |
| Public production booking page | Supabase public DTO passed into `HaabBookingModule` integrated mode | Next planned step. |
| Provider admin production app | Supabase authenticated reads/writes protected by RLS | Later phase. |
| Public booking writes | Server-authoritative endpoints or private RPCs | Later phase; never direct public table inserts. |

This keeps offline functionality useful while the production backend is added incrementally.

## Why Backend Reads Return A `ModuleStore`

Returning `ModuleStore` is intentional.

The booking UI already knows how to render and validate from this shape:

```ts
type ModuleStore = {
  provider: ProviderInfo;
  services: Service[];
  availability: WeeklyAvailability;
  bookings: BookingRecord[];
  bookingHolds: BookingHoldRecord[];
  setupComplete: boolean;
};
```

If the API returned raw database rows, every UI caller would need to know how to translate backend fields. That would spread backend coupling across the app.

Instead, the translation happens once in:

```txt
app/api/public/providers/[slug]/route.ts
```

That route maps:

| Database | Frontend |
| --- | --- |
| `full_name` | `fullName` |
| `business_name` | `businessName` |
| `slug` | `publicSlug` |
| `booking_type` | `bookingType` |
| `duration_minutes` | `durationMinutes` |

This preserves the existing component contract.

## Why Public Reads Exclude Bookings And Holds

The offline app stores bookings and holds in the same local `ModuleStore`, but the backend cannot expose those same arrays publicly.

In localStorage mode, all data belongs to the current browser session. There is no privacy boundary because the data is already local.

In backend mode, bookings and holds are shared server data. Raw rows can include private client details or reveal availability patterns. That is why the first public DTO returns:

```ts
bookings: []
bookingHolds: []
```

Future public availability should come from computed availability endpoints, not raw booking or hold rows.

## What Happens To Holds Later

Today, offline holds are local:

- a hold is created in the browser
- it has a local expiry timer
- it blocks the local booking flow
- it can be released locally

That works offline, but it cannot prevent two different devices from booking the same slot.

The planned backend hold flow is:

1. The client asks the server to hold a slot.
2. The server re-checks availability.
3. The server takes a transaction-safe slot lock or equivalent protection.
4. The server creates a `booking_holds` row with `expires_at`.
5. The UI countdown uses the server expiry.
6. If the hold fails, the UI refreshes availability.

That will replace public production hold authority, but the local hold code can remain for local demo/offline mode.

## What Happens To Booking Confirmation Later

Today, offline confirmation writes a booking into the local store.

The planned backend confirmation flow is:

1. The client submits details with a valid `hold_id`.
2. The server verifies the hold is unexpired and matches the slot.
3. The server checks there is no confirmed booking conflict.
4. The server creates a booking row with snapshot fields.
5. The server stores only a hashed manage token.
6. The server records a booking event.
7. The server returns the confirmed booking DTO.

The public UI should only show a confirmed booking after this server transaction succeeds.

For local demo mode, local confirmation can still exist as a separate mode.

## What Should Not Happen

The migration should avoid these mistakes:

- Do not delete `useModuleStore`.
- Do not remove localStorage standalone mode.
- Do not make public booking pages directly select raw `bookings` or `booking_holds`.
- Do not expose `manage_token_hash` to the browser.
- Do not make the UI depend on raw Supabase table column names.
- Do not optimistically show a server-backed booking as confirmed before the server commits it.
- Do not mix local demo state and production backend state without a clear configuration switch.

## Current Verification

After adding the backend foundation, these checks passed:

```bash
npm run lint
npm run test
npx tsc --noEmit
npm run build
git diff --check
```

The existing Vitest suite still passed 118 tests, which is a useful signal that the pure offline booking logic was not disturbed.

## Current Blockers

The database migration has not been applied locally in this environment because:

- Docker is not installed.
- No local Supabase database is running at `127.0.0.1:54322`.
- Supabase database types require either a running local database or a linked remote project.

The schema is written and ready, but it still needs to be applied and tested against a real Supabase database.

## Recommended Next Step

The next step should be small and reversible:

1. Keep localStorage standalone mode as-is.
2. Add a backend-enabled public page path that fetches `/api/public/providers/[slug]`.
3. Pass the returned `store` into `HaabBookingModule` with `injectedConfig`.
4. Add clear loading, not-found, and fetch-failed states.
5. Keep local demo/offline mode behind a deliberate switch.

That step will prove the backend read model can power the public booking UI without removing the offline functionality.
