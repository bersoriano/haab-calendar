# Haab Calendar — System Reference

**Purpose:** A detailed reference for the booking engine's data model, availability rules, and standalone behavior. For the current end-to-end public flow and Supabase server lifecycle, use `docs/booking-process.md` as the canonical reference.

**Source of truth:** the booking engine, now split across `components/haab-booking-module.tsx` (orchestrator + feature render/state), `lib/*` (pure domain logic + types + constants), `config/*` (seed data), `components/ui/*` (presentational primitives), and `components/booking/state/useModuleStore.ts` (persistence). See `docs/ARCHITECTURE.md` for the module layout. When this document and the code disagree, the code wins — please open a PR to fix this document.

**Status note (2026-08-04):** the original local engine has since gained canonical Supabase-backed public routes, server-authoritative holds and writes, customer manage links, event capacity, and resilient hold recovery. Sections explicitly labeled planned or future are historical design context; `docs/booking-process.md` records shipped public behavior.

**Scope of this document:** the booking engine itself. Visual styling, individual screen layouts, and per-surface UI choices are out of scope and live in `UX_RECOMMENDATIONS.md` / `liquid-glass-style-guide.md`.

---

## 1. The Mental Model in One Paragraph

Haab Calendar powers **two distinct products** — a public booking experience for customers and an admin experience for providers — through a shared engine. Standalone mode persists a complete demo workflow in browser localStorage. Canonical public routes run in integrated mode: Supabase is authoritative for holds, confirmation, rescheduling, cancellation, publication, and cross-device conflicts, while the client keeps only the state needed to render the active flow.

**Two cross-cutting splits structure this document.** Read both before designing the API:

- **Public product vs. Admin product** (§ 4) — what each audience can do, what data each can see, what auth each needs.
- **Standalone vs. integrated** — local demo persistence and production server authority are deliberately separate.

---

## 1.5. Implementation Status (Verified 2026-08-04)

This table distinguishes the current product from historical design material elsewhere in this document.

| Feature                                                          | Status today                                                                                          |
|------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| Standalone localStorage persistence (read/write/multi-tab sync)  | ✅ Shipped — `components/booking/state/useModuleStore.ts`, key `haab-calendar-dev-clean`               |
| Integrated mode (`injectedConfig` + callbacks)                   | ✅ Shipped — used by canonical hierarchical public routes and preserved for embedding/child reuse       |
| Adaptive surface (`/`) and public-only surfaces                  | ✅ Shipped — canonical `/{vertical}/{providerSlug}` plus standalone demo `/public/[slug]`               |
| 4-step booking flow with server-authoritative 10-min hold        | ✅ Shipped — one optional 5-minute grace extension, reconnect checks, immediate logical expiry, and scheduled cleanup |
| Reschedule and cancel from admin and from in-session success screen | ✅ Shipped                                                                                          |
| `BookingRecord.manageToken` field                                | ✅ Shipped — `lib/types.ts`                                                                            |
| `lib/booking-tokens.ts` (token gen, lookup, URL builder, backfill) | ✅ Shipped — `lib/booking-tokens.ts`                                                                 |
| Canonical manage-token route                                     | ✅ Shipped — `app/[verticalSegment]/[providerSlug]/manage/[token]/page.tsx`                            |
| `manageBookingToken` prop on the module + lookup state machine   | ✅ Shipped                                                                                             |
| Mobile-first public booking flow                                 | ✅ Shipped (2026-05-29)                                                                                |
| Core decomposition (`lib/`, `config/`, `components/ui/`, `useModuleStore`) | ✅ Shipped (2026-05-29) — see `docs/ARCHITECTURE.md`. Feature components/orchestrator (Phase 5/6) deferred. |
| Test framework                                                   | ✅ Vitest — domain and component coverage under `lib/__tests__/` and `components/**/__tests__/` (`npm test`) |
| Inline error on reschedule slot conflict                         | ✅ Shipped — folded into the manage-booking work                                                       |
| Supabase backend and online booking concurrency                  | ✅ Shipped for canonical public routes — Route Handlers and database constraints own booking-critical writes |
| Provider auth                                                    | ✅ Shipped — provider dashboard data is scoped to the authenticated owner                              |
| Email / SMS notifications, payments                              | ❌ Out of scope                                                                                        |

Sections explicitly marked historical describe earlier architecture proposals. Current public behavior is defined in `docs/booking-process.md`.

---

## 2. Core Data Model

### Top-level store

The whole world lives in a `ModuleStore`:

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

### Entities

```ts
type ProviderInfo = {
  fullName: string;
  businessName: string;
  email: string;
  publicSlug: string;     // provider slug used in /{vertical}/{providerSlug}
};

type Service = {
  id: string;             // local id: "service_xxx"
  name: string;
  bookingType: "appointment" | "full-day";
  durationMinutes?: number;  // required for "appointment", ignored for "full-day"
  description: string;
  capacity?: string;      // human-readable label
  maxSpots?: number;      // enforced shared capacity for event services
  cost?: string;          // human-readable string, NOT enforced
  notes?: string;
};

type WeeklyAvailability = Record<WeekdayKey, {
  enabled: boolean;
  startTime: string;      // "HH:MM" 24h
  endTime: string;        // "HH:MM" 24h
}>;
// WeekdayKey = "sunday" | "monday" | ... | "saturday"

type BookingRecord = {
  id: string;             // local id: "booking_xxx"
  serviceId: string;      // FK → Service.id
  serviceName: string;    // snapshot at booking time
  bookingType: BookingType;
  dateKey: string;        // "YYYY-MM-DD" in local browser time
  startTime?: string;     // "HH:MM", undefined for "full-day"
  endTime?: string;       // "HH:MM", undefined for "full-day"
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
  capacitySnapshot?: string;  // snapshot of Service.capacity at booking time
  cost: string;               // snapshot of Service.cost at booking time
  status: "confirmed" | "rescheduled" | "cancelled";
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
  manageToken: string;    // raw token exists only in the customer's active response/session
};

type BookingHoldRecord = {
  id: string;             // local id: "hold_xxx"
  serviceId: string;
  bookingType: BookingType;
  dateKey: string;
  startTime?: string;     // undefined for "full-day"
  endTime?: string;       // undefined for "full-day"
  createdAt: string;      // ISO 8601
  expiresAt: number;      // epoch ms — DO NOT use ISO here; the prune logic compares numbers
  extensionCount?: number; // 0 or 1; integrated holds allow one grace extension
};
```

### Relationships

- `Service.id` is referenced by `BookingRecord.serviceId` and `BookingHoldRecord.serviceId`. Service deletion is **not** cascade-aware today — bookings retain `serviceName` / `cost` / `capacity` snapshots so they remain readable, but the reschedule modal will fail silently if the underlying service is gone (see § 13 Edge Cases).
- `Provider` is singular per deployment — there is no multi-tenant model in the current data shape. The `publicSlug` exists for URL routing, not multi-provider isolation.

### Snapshots vs. live references

**By design**, `BookingRecord` snapshots `serviceName`, `capacitySnapshot`, and `cost` at creation time so renaming a service or changing its price does not retroactively rewrite history. When designing the API, preserve this: do **not** join services into bookings as the source of truth for display fields. Use the snapshot fields. The live `serviceId` link is only for "is this booking referring to a still-existing service" checks (used by reschedule).

---

## 3. Operating Modes

The module runs in one of two persistence modes and one of two surface modes. They are independent.

### 3a. Persistence mode

| Mode           | Triggered by                                              | Storage                          | Write path                                    |
|----------------|-----------------------------------------------------------|----------------------------------|------------------------------------------------|
| **Standalone** | Default — no `injectedConfig` passed                      | `localStorage[storageKey]`       | Module owns `setStandaloneStore` + persists    |
| **Integrated** | `injectedConfig` provided with provider+services+availability | None — parent app owns it     | Module emits `onBookingsChange` / `onStoreChange` callbacks; no localStorage writes |

Default `storageKey` is `"haab-calendar-dev-clean"`.

In integrated mode, the parent application is the source of truth for provider/services/availability and is expected to update its store in response to the callbacks. Bookings the module creates locally during a session are kept in `shadowBookings` / `shadowBookingHolds` and bubbled up via callbacks; they are **not** written anywhere by the module itself.

### 3b. Surface mode

| Surface mode    | What renders                                                                   | Used by                            |
|-----------------|--------------------------------------------------------------------------------|------------------------------------|
| **`adaptive`**  | Toggles between admin (dashboard/bookings/calendar/services/settings) and public booking flow within the same module instance | The root `/` page (developer view) |
| **`public-only`** | Only the public booking flow + success/manage screen                         | `/{vertical}/{providerSlug}`, service URLs, manage URLs, and standalone demo `/public/[slug]` |

The surface mode never changes after mount.

**Note on internal naming:** the code's `Surface` type is `"management" | "public"`. This document uses **"admin"** as a friendlier synonym for `"management"` because that's what users would call it. When grepping the code, search for `surface === "management"`.

---

## 4. Two Products: Public and Admin

The same React component renders two products with different audiences, different capabilities, and (eventually) different auth requirements. Treat them as separate products that happen to share an engine. Conflating them in the API is the most common way this design will go wrong.

### 4a. Capability matrix

| Aspect                       | Public product                                             | Admin product                                                 |
|------------------------------|------------------------------------------------------------|---------------------------------------------------------------|
| Audience                     | Clients booking with the provider                          | The provider running the business                             |
| Surface mode (§ 3b)          | `public-only`, or the `public` half of `adaptive`          | The `management` half of `adaptive`                           |
| Routes (today)               | `/{vertical}/{providerSlug}`, `/{vertical}/{providerSlug}/{serviceSlug}`, `/{vertical}/{providerSlug}/manage/{token}` | `/` (adaptive — admin tabs) |
| Tabs / screens               | Booking flow (steps 1–4) + success/manage screen           | Setup wizard, Dashboard, Bookings, Calendar, Services, Settings |
| Auth (today)                 | None for browsing; private manage token for editing own booking | Provider login required                                   |
| Data the user should see     | Provider info, services, availability, own booking         | All bookings, all holds, all services, full availability      |
| Data the user must NOT see   | Other clients' contact info, internal notes, full booking list | n/a (admin sees everything for this provider)              |

### 4b. Action capability matrix

What each product can do today (✓ exposed, ✗ not allowed, – engine supports but UI does not currently expose):

| Action                                            | Public | Admin |
|---------------------------------------------------|:------:|:-----:|
| View provider info, services, availability         |   ✓   |   ✓   |
| View calendar of available slots                   |   ✓   |   ✓   |
| Create a hold                                      |   ✓   |   –   |
| Create a booking from a hold                       |   ✓   |   –   |
| See own booking on success screen                  |   ✓   | ✓ (sees all) |
| View own booking after page reload / navigation    |   ✓ via private manage URL | ✓ (sees all) |
| View other clients' bookings                       |   ✗   |   ✓   |
| Reschedule a booking                               |   ✓ via success screen or manage URL | ✓ (any) |
| Cancel a booking                                   |   ✓ via success screen or manage URL | ✓ (any) |
| Edit a booking's client info                       |   ✗   |   –   |
| Run the setup wizard                               |   ✗   |   ✓   |
| Create / edit / delete services                    |   ✗   |   ✓   |
| Reorder services                                   |   ✗   |   –   |
| Modify weekly availability                         |   ✗   |   ✓   |
| Change provider info, public slug                  |   ✗   |   ✓   |
| Get a publishable booking URL                      |   ✗   |   ✓ (Settings tab) |
| Search / filter bookings                           |   ✗   |   ✓   |

The raw manage token is returned to the customer after confirmation and embedded in the private manage URL. The database stores only its hash. Reloading or reopening that URL performs a server lookup and restores the customer's self-service controls without requiring an account.

### 4c. Why this matters for the API

A single set of endpoints that does not respect the split will leak admin data to public callers. The classic failure mode: the public booking page needs to know which slots are taken, so the API helpfully returns `GET /bookings` — and now the entire client list is on the wire. The right shape is two products with two endpoint surfaces sharing one database.

Current endpoint responsibilities, shown in product-neutral form:

**Public product (no auth required for reads; manage token required for writes against an existing booking)**

Public write endpoints are server-authoritative. They may be implemented as Next Route Handlers, Server Actions, or Postgres RPCs, but the browser must not directly insert public bookings or holds into exposed tables. The endpoint/RPC owns validation, token hashing, snapshot creation, and transaction boundaries.

| Engine call                       | Endpoint                                                                       |
|-----------------------------------|--------------------------------------------------------------------------------|
| Hydrate public page               | `GET /public/providers/:slug` → `{ provider, services, availability }` only    |
| Compute slots                     | `GET /public/providers/:slug/availability?service=…&date=…` → slot list (no bookings/holds returned) |
| Create a hold                     | `POST /public/providers/:slug/holds` → `{ id, expires_at }`                    |
| Release a hold                    | `DELETE /public/holds/:id`                                                     |
| Confirm booking from hold         | `POST /public/providers/:slug/bookings` (body includes `hold_id`, idempotent on local `id`) → stores `manage_token_hash`, returns booking + raw `manage_token` once |
| Load own booking by manage token  | `GET /public/bookings/by-token/:token`                                         |
| Reschedule own booking            | `PATCH /public/bookings/by-token/:token` with new date/time                    |
| Cancel own booking                | `PATCH /public/bookings/by-token/:token` with `{ status: "cancelled" }`        |

**Admin product (provider auth required for everything)**

| Engine call                              | Endpoint                                                                    |
|------------------------------------------|-----------------------------------------------------------------------------|
| Hydrate admin shell                      | `GET /admin/me` → provider profile + services + availability                |
| List bookings                            | `GET /admin/bookings?from=…&to=…&status=…&service=…`                        |
| Reschedule any booking                   | `PATCH /admin/bookings/:id`                                                 |
| Cancel any booking                       | `PATCH /admin/bookings/:id` with `{ status: "cancelled" }`                  |
| Create / edit / delete services          | `POST` / `PATCH` / `DELETE /admin/services[/:id]`                           |
| Update availability                      | `PUT /admin/availability`                                                   |
| Update provider info                     | `PATCH /admin/me`                                                           |
| Realtime: live booking notifications     | Authenticated channel scoped to provider                                    |

### 4d. Data each product is allowed to return

This is the rule the API must encode and the engine has historically enforced via "the provider runs the only browser":

- **Public read of `provider`:** `fullName`, `businessName`, `publicSlug`. Not `email` (or, if exposed, only as a contact link the provider opted into).
- **Public read of `services`:** all fields except internal-only ones if any are added later.
- **Public read of `availability`:** the weekly schedule.
- **Public read of `bookings`:** the API should never return another user's booking to the public surface. Slot computation happens server-side from the bookings + holds the server holds, and only the resulting slot list is returned. The exception is the user's own booking, fetched by hashing the presented manage token and matching `manage_token_hash`.
- **Public read of `bookingHolds`:** never. Holds are an internal concurrency primitive; the public product receives at most "this slot is unavailable."
- **Admin reads:** everything for that provider.

### 4e. Sharing across surfaces today

Today, both products read and write the same `ModuleStore` directly because there is no auth and no network boundary. The `surfaceMode` and `surface` flags route render output but do not gate data access. This works because access control is the URL itself. **Once the API exists, the boundary becomes load-bearing**: the engine should still operate on a `ModuleStore`, but the data feeding it on the public route must be the public-safe subset.

### 4f. Realtime needs differ

| Product | Realtime priorities                                                                  |
|---------|-------------------------------------------------------------------------------------|
| Public  | Slot availability updates while the user is picking a time (so they don't pick a slot another user just took); their own booking's status if it changes (admin-side cancellation while they have the manage page open). |
| Admin   | New bookings and cancellations as they happen; live calendar updates; provider's setup state across devices (so settings changes propagate to other admin tabs). |

The Supabase Realtime plan (`BACKEND_RECOMMENDATIONS.md`) covers both, but the public subscription should be filtered to **only** the data that's safe to broadcast (slot availability for the active service/date), not the full bookings table.

---

## 5. Booking Lifecycle (Public Flow)

The public booking flow is a 4-step state machine driven by `bookingFlow.step`:

```
Step 1: pick service        → bookingFlow.serviceId set
Step 2: pick date + time    → BookingHold created, 10-min timer starts
Step 3: enter client details → still holding the slot
Step 4: confirmation/manage → BookingRecord created, hold released
```

### Step 2 → Step 3 transition (the hold)

When the user picks a slot/date and advances:

1. **Re-validate against latest store snapshot.** The module reads the latest `localStorage` state via `readStandaloneStoreSnapshot()` and re-runs `getAvailableSlots` / `isDateAvailable` against the latest `bookings` and pruned `bookingHolds`. This catches changes made by other browser tabs.
2. **If still available:** create a `BookingHoldRecord` with `expiresAt = now + 10min`, append to `store.bookingHolds`, and persist.
3. **If no longer available:** set `bookingError` and stop. User must go back and pick a different slot.

The hold reserves the slot for that one user during their data-entry phase. While a hold exists for `(service, date, time)`, no other user (in any tab in this browser today; in any device once Supabase lands) sees that slot as available.

### Step 3 → Step 4 transition (confirmation)

`confirmBooking` re-validates everything **again** against the latest store snapshot:

1. Re-load latest store from localStorage.
2. Re-prune holds by `expiresAt`.
3. Re-check `getAvailableSlots` / `isDateAvailable` ignoring this user's own hold (`ignoredHoldId`).
4. Validate name/email/phone are present.
5. If all checks pass: create `BookingRecord`, remove the hold from `store.bookingHolds`, commit atomically.
6. If validation fails: set `bookingError` and abort. The hold is left in place to be cleaned up by expiry.

### State transitions for `BookingRecord.status`

```
confirmed ──reschedule──→ rescheduled
confirmed ──cancel─────→ cancelled
rescheduled ──reschedule──→ rescheduled  (stays "rescheduled" — once rescheduled, always rescheduled)
rescheduled ──cancel────→ cancelled
cancelled                  TERMINAL — no transitions out
```

`isActiveBooking(b)` is true for `confirmed` and `rescheduled`, false for `cancelled`. Only active bookings block availability.

The current model has **no audit log** — once a booking moves to `rescheduled`, the original `dateKey`/`startTime` are overwritten and lost. Capturing this history is tracked separately (`UX_RECOMMENDATIONS.md` § 6.3 / § 8.3).

---

## 6. Availability and Slot Computation

This is the most rule-dense part of the system. Get this right or the API will produce phantom slots.

### Slot generation for `appointment` services

Given `(dateKey, service, availability, bookings, bookingHolds)`:

1. **Past-date guard:** if `dateKey < todayKey()` → `[]`.
2. **Day-of-week guard:** look up `availability[weekdayOf(dateKey)]`. If `enabled === false` or `endTime <= startTime` → `[]`.
3. **Full-day exclusivity:** if any active booking on `dateKey` has `bookingType === "full-day"`, OR any non-expired hold on `dateKey` is `"full-day"` → `[]`. (Full-day blocks the whole day for everyone.)
4. **Generate cursor steps:** start at `daySchedule.startTime`. Step forward by `service.durationMinutes`. For each step, the candidate slot is `[cursor, cursor + duration]`.
5. **Continue while** `cursor + duration <= daySchedule.endTime`. (No partial slots at the end.)
6. **For each candidate**, exclude if it overlaps:
   - any active appointment booking on `dateKey` (excluding the booking being rescheduled, if any), or
   - any non-expired appointment hold on `dateKey` (excluding the user's own hold, if any).

The available slots are returned as `string[]` of `"HH:MM"` start times.

### Date availability for `full-day` services

Given `(dateKey, service, availability, bookings, bookingHolds)`:

- Past date → unavailable.
- Day disabled in weekly availability → unavailable.
- Any active booking on `dateKey` → unavailable. (Full-day cannot share a day with anything, including appointments.)
- Any non-expired hold on `dateKey` → unavailable.
- Otherwise → available.

### Step granularity

Slots are always aligned to `service.durationMinutes` from `daySchedule.startTime`. There is **no smaller granularity**: a 60-min service offered 9:00–17:00 produces slots at 9:00, 10:00, …, 16:00 (last possible). The slot spacing equals the duration. This means changing a service's duration silently changes the slot grid for all future days.

### Capacity labels and enforced event inventory

`Service.capacity` and `BookingRecord.capacitySnapshot` remain human-readable labels. For services in the events vertical with numeric `maxSpots`, the integrated backend additionally enforces shared occurrence capacity. Database triggers count active bookings and unexpired holds; non-event and legacy services retain exclusive slot/day behavior.

---

## 7. Hold Mechanism

```
BOOKING_HOLD_DURATION_MS = 10 * 60 * 1000   // 10 minutes
```

### Lifecycle

| Event                                 | Effect                                                                             |
|---------------------------------------|------------------------------------------------------------------------------------|
| User advances from step 2 → step 3    | New `BookingHoldRecord` written to store; `expiresAt = now + 10min`                |
| User advances from step 3 → step 4    | On successful `confirmBooking`, hold is removed from store                         |
| User goes back from step 3 to step 2 | Existing hold is **released** (removed from store)                                  |
| User accepts “Still interested?”      | Server atomically adds five minutes; this can happen only once per hold             |
| Browser truly leaves the page         | A `pagehide` keepalive request releases the server hold when possible                |
| Browser reconnects or returns visible | Client re-reads the hold and server time; an expired hold becomes expired immediately |
| Per-second client timer fires          | If `now >= hold.expiresAt`, hold is removed and `bookingHold.released = true`      |
| Any read of holds                     | `pruneBookingHolds` filters out anything with `expiresAt <= now` before use        |
| Database cleanup job runs             | Supabase Cron deletes all expired rows every minute                                 |

`pruneBookingHolds` runs everywhere holds are consumed (slot computation, validation, render). Integrated availability and confirmation queries also require `expires_at > now()`, and hold creation deletes stale rows before checking database conflict constraints. Even if a browser timer is throttled or the visitor is offline, the database timestamp frees the slot for the next visitor without waiting for client cleanup. Supabase Cron is a physical-storage backstop, not the source of availability correctness.

### Hold record vs. hold UI state

There are **two** hold concepts in the code:

- `BookingHoldRecord` — persisted in local mode and mirrored from the Supabase row in integrated mode. The server row and its `expires_at` value are authoritative online.
- `bookingHold: BookingHold` — local React state on the public flow side, holds `{id, selectionKey, startedAt, expiresAt, extensionCount, released}` for the in-flight UI countdown. This is just the user's "I am currently holding this slot" pointer.

The two share the same `id`. The record is the source of truth; the UI state is convenience.

### Multi-tab hold visibility (offline)

In the current localStorage world, holds created in tab A are observable in tab B via the `storage` event. The listener at `~line 1366` re-hydrates the in-memory store on any cross-tab write. Tab B will not let the user select a slot that tab A is holding. This works because they share the same `localStorage`.

### Cross-device hold visibility (online)

Integrated public pages create holds through the server route. Supabase exclusion/unique constraints prevent overlapping non-capacity holds, event capacity triggers count only unexpired holds, and public schedule reads expose only rows with `expires_at > now()`. The countdown uses the returned server time to avoid treating the browser clock as authority.

---

## 8. Persistence Path — Offline (Current Behaviour)

This is the entire write path today.

### Reads

```
component mount
  → useEffect (line 1338): setTimeout(0) → window.localStorage.getItem(storageKey)
                                          → JSON.parse → normalizeStore → setStandaloneStore
                                          → setHydrated(true)
```

The `setTimeout(0)` defers the read past the first paint, which means **the module renders an empty store on first paint** and re-renders with the real store after hydration. Anything that depends on `bookings` or `bookingHolds` must guard for this. The `hydrated` boolean is the gate.

### Writes

```
any state mutation
  → commitBookings(...) or commitBookingHolds(...)
     → setStandaloneStore(next)
     → window.localStorage.setItem(storageKey, JSON.stringify(next))
     → emitStoreChange(next)  (no-op unless onStoreChange callback was supplied)
```

Every commit is **synchronous** and re-validates against the latest snapshot from localStorage (not the stale React state) via `readStandaloneStoreSnapshot()`. This is the single most important pattern to preserve in any rewrite: read the canonical store, validate, write atomically.

### Multi-tab sync

```
tab A writes localStorage
  → tab B fires `storage` event
  → listener at line 1366: parse newValue → normalizeStore → setStandaloneStore
                            → setHydrated(true)
```

The `storage` event in browsers fires only in *other* tabs (not the writer's own tab), and only across same-origin contexts. There is no polling.

### Normalization on every read

`normalizeStore` ensures arrays exist (defaulting to empty), filters invalid hold records, and prunes expired holds. **Always run new data through `normalizeStore`** when introducing it from any source (localStorage, network, injected config). Skipping this is how stale or malformed data sneaks in.

---

## 9. Persistence Path — Online (Historical Design Notes)

This section records the earlier synchronization proposal from `BACKEND_RECOMMENDATIONS.md`; it is not the current public booking implementation. Canonical public routes now use request/response server authority and do not queue offline booking confirmation. See `docs/booking-process.md` and `docs/backend-offline-interaction.md` for shipped behavior.

### Hard requirements driven by the offline-first principle

- **The local store remains the read path.** Even with Supabase live, the UI reads from the in-memory store hydrated from local cache. A network call must never block a render.
- **Local-first does not mean confirmed-first.** Drafts, pending UI, and non-critical admin edits can update locally before sync, but a customer booking is not confirmed until the server transaction succeeds.
- **Writes use explicit pending/synced/rejected states.** A `commitBookings`-style local mutation can render immediately as pending and schedule a sync. If sync fails (offline, network error, server reject), the UI keeps enough local context to retry or recover, but it must not promise a confirmed slot the server rejected.
- **Server is the authority for conflicts.** Slot taken, hold expired, and ownership failures are resolved by the server and reconciled into the local store.

### Recommended sync architecture

```
local mutation
  → write pending state to local store (instant render)
  → enqueue sync operation (insert/update/delete with idempotency key)
  → background worker drains the queue when online
     → on success: mark op as synced
     → on conflict: surface to UI, allow user to resolve (e.g. "slot was taken, pick another")
     → on transient error: retry with backoff
```

The idempotency key is critical: a sync op for "create booking X" must be safe to retry. Use the local `BookingRecord.id` as the idempotency key on insert.

### Schema (from BACKEND_RECOMMENDATIONS, slightly updated for the manage-booking feature)

```sql
providers     (id, owner_user_id FK auth.users, full_name, business_name, email, slug UNIQUE,
               timezone, booking_window_days, availability JSONB, created_at, updated_at)
services      (id, provider_id FK, name, type, duration, description, capacity, cost, notes,
               sort_order, created_at, updated_at)
bookings      (id, provider_id FK, service_id FK, client_name, client_email, client_phone,
               service_name, cost_snapshot, capacity_snapshot, date, start_time, end_time,
               status, notes, manage_token_hash UNIQUE, created_at, updated_at)
booking_holds (id, provider_id FK, service_id FK, date, start_time, end_time, expires_at, created_at)
booking_events(id, booking_id FK, provider_id FK, actor_type, event_type, metadata JSONB, created_at)
```

Indexes: `bookings(provider_id, date, status)`, `booking_holds(provider_id, date, expires_at)`, unique on `bookings.manage_token_hash` and `providers.slug`. RLS for admin data is scoped through `providers.owner_user_id = auth.uid()`.

### API endpoints (sketch — for the API designer)

The minimum viable surface, mapped to the engine's existing read/write needs. All endpoints are scoped to a provider via slug or RLS.

| Engine call                       | API equivalent                                                                 |
|-----------------------------------|--------------------------------------------------------------------------------|
| Hydrate store (`/{vertical}/{providerSlug}`) | Resolve by vertical + provider slug → returns `{ provider, services, availability }` |
| Hydrate bookings (admin only)     | `GET /providers/:slug/bookings?from=…&to=…` → returns `BookingRecord[]`        |
| Find booking by manage token       | `GET /bookings/by-token/:token` → hashes token, returns single `BookingRecord` or 404 |
| Create hold                        | `POST /providers/:slug/holds` → returns hold with server-assigned `expires_at` |
| Release hold                       | `DELETE /holds/:id`                                                            |
| Confirm booking                    | `POST /providers/:slug/bookings` (body includes `hold_id` to atomically convert hold → booking; idempotent on `id`) |
| Reschedule booking                 | `PATCH /bookings/:id` with `{ date, start_time, end_time }` → server re-validates availability and 409s on conflict |
| Cancel booking                     | `PATCH /bookings/:id` with `{ status: "cancelled" }`                           |
| Realtime updates (subscribe)       | Supabase channel on `bookings` and `booking_holds` filtered by `provider_id`    |

Server-side validations to implement (do **not** trust the client):

- On hold create: re-run the same availability rules from § 6 against the database.
- On booking confirm: same, plus require the hold to exist and be unexpired and belong to the same `(service, date, start_time, end_time)`.
- On reschedule: same availability rules ignoring the booking being rescheduled.
- On all public writes: do not trust client-provided provider ownership, status transitions, snapshot fields, `expires_at`, or manage tokens.

---

## 10. Concurrency Model

### Offline (today)

The only concurrency is between browser tabs in the same browser, sharing one `localStorage`.

- **Read:** every commit uses `readStandaloneStoreSnapshot()` to get the *fresh* localStorage state, ignoring any stale React state. This is the synchronous equivalent of optimistic locking — the latest writer wins, and validation runs against the latest data.
- **Write:** localStorage is single-process (per browser). Tab A's write is atomic from the perspective of tab B, which observes it via the `storage` event.
- **No locks.** The `commitBookings` re-validation is the only protection against double-booking. If two tabs independently pass validation in the same JavaScript turn, they will both write — but in practice the JS event loop and localStorage's synchronous semantics make this nearly impossible across tabs (each tab's commit is one synchronous block).

### Online (current integrated behavior)

Concurrency spans multiple devices and is enforced by the database-backed public write path.

- **Holds reserve availability.** Exclusive appointment/full-day constraints and advisory-locked shared event capacity prevent incompatible active holds.
- **Confirmation is server-authoritative.** The server validates the unexpired hold, inserts the booking under database conflict/capacity protection, then consumes the hold.
- **Reschedule is server-authoritative.** The manage endpoint revalidates the requested destination and returns `409` when it is no longer available.
- **Cancellation is idempotent.** Setting `status = cancelled` twice is fine; the second one is a no-op.

### Reconciliation policy

For integrated routes, the server wins for hold validity, expiry, conflicts, capacity, confirmation, and manage-link mutations. The UI may retain unsent form text during a reconnect, but it never treats an offline confirmation as queued or successful.

---

## 11. Surfaces and Routes

| Route                                  | Surface mode    | Persistence mode | Notes                                                                 |
|----------------------------------------|-----------------|------------------|------------------------------------------------------------------------|
| `/`                                    | `adaptive`      | standalone       | Developer overview + full module. Toggles between admin and public.   |
| `/{vertical}/{providerSlug}`            | `public-only`   | integrated/backend DTO with local fallback | Canonical customer-facing provider booking page. |
| `/{vertical}/{providerSlug}/{serviceSlug}` | `public-only` | integrated/backend DTO with local fallback | Canonical service-specific booking page. |
| `/{vertical}/{providerSlug}/manage/[token]` | `public-only` | integrated/backend DTO with local fallback | Canonical manage-token page. |
| `/public/[slug]`                       | `public-only`   | standalone       | Local demo booking flow only. `slug` is matched against `provider.publicSlug`. |
| `/public/[slug]/manage/[token]`        | `public-only`   | standalone       | Local demo manage-token page only. |

If `/public/[slug]` is hit with a slug that doesn't match the local store's `provider.publicSlug` (or before setup is complete), the module shows a "this booking page isn't ready yet" screen. The standalone demo slug is matched, not used as a database key, because that route's persistence layer is per-browser today.

**`publicSlug` resolution and fallback:** the live business slug is `provider.publicSlug || slugify(provider.businessName || provider.fullName || "haab-calendar")`. So an empty `publicSlug` does not break public URL generation — it falls back to a slugified business name. The backend should generate/persist canonical slugs server-side so providers who never explicitly set `publicSlug` still get a stable hierarchical public link.

---

## 12. Product Boundaries

These boundaries apply to the current product:

- **Authentication.** Canonical provider administration requires Supabase Auth. Public visitors need no account; a private manage token authorizes access to one booking.
- **Multi-tenancy.** Supabase rows are provider-scoped and authenticated administration is restricted by ownership. Standalone local mode remains one provider per browser store.
- **Capacity enforcement.** `Service.capacity` is display text. Event services with numeric `maxSpots` enforce capacity across active bookings and unexpired holds.
- **Cost enforcement.** Cost is a string, not a number, and no payments are processed. The cost field is informational text shown on confirmations.
- **Email/SMS notifications.** Nothing is sent. The success screen offers a `.ics` download and a QR code, period.
- **Timezones.** Integrated providers store a timezone and booking-window metadata. The domain store still represents selected dates as local `YYYY-MM-DD` keys and times as `HH:MM`, so timezone conversion belongs at the server/data boundary.
- **Past-date editing.** Slots and dates in the past are not bookable, but a past booking can still be cancelled or "rescheduled" (the modal will not stop you, even though the result is nonsensical).
- **Pagination.** All bookings load in one go. Fine at thousands; will need pagination at tens of thousands.
- **Soft-delete.** Cancellation flips a status flag — the row is still there. There is no hard-delete operation.

---

## 13. Edge Cases

The ones that have actually been thought through. Listed so the API does not regress them.

### Hold races

- **Same-tab race:** impossible in the single-threaded JS event loop.
- **Cross-tab standalone race:** mitigated by `readStandaloneStoreSnapshot()` re-validation on commit, plus the `storage` event broadcasting writes between tabs.
- **Cross-device integrated race:** protected by database exclusion/unique constraints for exclusive slots and advisory-locked capacity triggers for shared events. Confirmation still revalidates the hold and availability on the server.

### Hold expiry mid-flow

- The visible timer updates every second, but server time and `expires_at` decide validity.
- Integrated confirmation requires the matching hold to remain active; an expired hold cannot be bypassed even if the slot is otherwise still free.
- During the final two minutes, the visitor may accept one server-enforced five-minute grace extension. There is no repeated auto-renewal.

### Past dates

- `getAvailableSlots` and `isDateAvailable` both return empty/false for past dates → cannot book.
- A confirmed booking whose date passes does **not** auto-cancel or auto-archive. It just sits in the bookings list as historical data.

### Service deleted after a booking exists

- `BookingRecord` has snapshot fields (`serviceName`, `cost`, `capacitySnapshot`) so the booking remains readable.
- Reschedule modal calls `services.find(c => c.id === booking.serviceId)`. If the service is gone, the modal short-circuits (`if (!booking || !service) return null;` at the top of `renderRescheduleModal`). The reschedule button effectively becomes a no-op. This is a latent bug worth flagging when the API designer touches reschedule.

### localStorage cleared mid-session

- The store reverts to empty (`createEmptyStore`). In-flight bookings are lost. The manage-booking feature explicitly calls this out in its token-not-found view.

### `setTimeout(0)` hydration

- The first render shows an empty store. Anything that depends on `bookings`/`bookingHolds` must guard against this — typically by gating on `hydrated === true` or by accepting that the empty state renders briefly. When introducing SSR-driven data, this gate moves but the principle is the same: render the local cache first, refresh in background.

### Storage event from corrupt data

- The `storage` listener wraps `JSON.parse` in try/catch and **silently keeps the current in-memory store** if parsing fails. Corrupt writes from another tab do not crash this tab. Same pattern should apply to network responses.

### Empty availability

- A weekday with `enabled: false` or `endTime <= startTime` produces zero slots — the public flow shows "no slots" without crashing.
- A provider with **all** weekdays disabled produces an unbookable public page. There is no warning today; the page just shows no available dates ever.

### Hold for full-day vs. appointment on the same day

- A full-day hold blocks all appointment slots on that day. Conversely, any appointment hold blocks new full-day bookings on that day. The guards are symmetric.

### Reschedule into a slot the same booking already occupies

- `getAvailableSlots(..., ignoredBookingId)` excludes the booking being rescheduled, so the modal shows the original slot as available. The user can "reschedule" into the same slot (status flips to `rescheduled`, dates unchanged). The API should allow this without error — it's a valid no-op the UI treats as a state change.

### Provider changes weekly availability while bookings exist

- Existing bookings on now-disabled days remain valid. The engine does not retroactively invalidate them. Slot computation uses the *current* availability for *future* slot rendering only.

### Empty or unset `publicSlug`

- The live provider slug is `publicSlug || slugify(businessName || fullName || "haab-calendar")`. A provider who has never customised the slug still gets a working canonical public link. The backend should preserve this fallback or generate the slug server-side when the field is empty.

### Reschedule conflict after selection

- The manage UI shows an inline error when the selected destination becomes unavailable. Integrated mode also relies on the server `409` response because another device can win the slot after it was rendered.

---

## 14. Conventions and Invariants the API Must Preserve

These are the load-bearing assumptions the rest of the engine depends on.

1. **`BookingRecord.dateKey` is `"YYYY-MM-DD"` in the browser's local timezone.** Not UTC. Comparisons elsewhere parse it with `new Date(year, month-1, day)`. If the API returns ISO timestamps, convert at the boundary.
2. **`startTime`/`endTime` are `"HH:MM"` 24-hour strings.** No seconds, no timezone offset.
3. **`expiresAt` on holds is epoch milliseconds (number), not ISO.** Prune logic compares numbers.
4. **`createdAt`/`updatedAt` on bookings are ISO 8601 strings.** Used for display and ordering only.
5. **Identifiers are opaque strings.** Today they're locally-generated (`createId("booking")`). The Supabase migration will move to UUIDs but the engine must keep treating them as opaque strings.
6. **Snapshots are frozen.** Never derive `serviceName`, `cost`, or `capacitySnapshot` from a current join — always read the snapshot stored on the booking.
7. **`pruneBookingHolds` runs on every read.** Expired holds in the store are valid persisted state; they're filtered at consumption time, not at write time.
8. **Manage tokens are secrets.** Store only `manage_token_hash` server-side. The raw token is returned once to the customer and then only presented back to public manage-link endpoints.
8. **Validation uses the latest store snapshot, not React state.** This is non-negotiable for correctness. Any new write path must re-read the store before committing.
9. **Cancellation is terminal.** Once `status === "cancelled"`, no transitions out.
10. **Full-day excludes everything else on that day.** This is enforced in both directions in `isDateAvailable` and `getAvailableSlots`.

---

## 15. Where to Look in the Code

After the 2026-05-29 decomposition, code is organized by file/module rather than by line range. See `docs/ARCHITECTURE.md` for the full layout. Quick map by concern:

| Concern                               | Location                                                            |
|---------------------------------------|--------------------------------------------------------------------|
| Type definitions                      | `lib/types.ts`                                                     |
| Constants (hold duration, storage key, weekdays, formatters) | `lib/constants.ts`                          |
| Generic utils (`cn`, `slugify`, `createId`, `pad`, `currentTimestamp`) | `lib/utils.ts`                    |
| Date math + windows (`getDateKey`, `getAvailableSlots`' deps, etc.) | `lib/date.ts`                        |
| Label/format helpers (`formatTimeLabel`, `formatDuration`, tones)  | `lib/format.ts`                       |
| Store factories + normalizers + prune + sort | `lib/store.ts`                                              |
| Availability + slot computation (`getAvailableSlots`, `isDateAvailable`, `overlapExists`) | `lib/availability.ts` |
| Hold selection key                    | `lib/holds.ts`                                                    |
| iCal generation (`buildIcsContent`)   | `lib/ics.ts`                                                      |
| Manage-token gen / lookup / URL / backfill | `lib/booking-tokens.ts`                                       |
| Seed templates (`QUICK_START_TEMPLATES`) | `config/templates.ts`                                          |
| Persistence: hydrate/persist/sync, commit functions, active-store derivation | `components/booking/state/useModuleStore.ts` |
| Presentational primitives (buttons, badges, progress, countdown bar, empty state) | `components/ui/*`     |
| Characterization tests for the above logic | `lib/__tests__/*`                                            |
| Orchestrator, surface routing, setup wizard, admin tabs, public flow, modals, hold timer, booking/reschedule/cancel handlers | `components/haab-booking-module.tsx` (still the monolith; Phase 5/6 will carve these into feature components) |

To find a specific handler in the monolith, grep its name (e.g. `confirmBooking`, `confirmReschedule`, `confirmCancellation`, `renderPublicFlow`, `renderRescheduleModal`) — names are stable even though line numbers move.

---

## 16. Glossary

- **Hold** — a 10-minute server-side (today: localStorage-side) reservation of a slot during a user's data-entry phase, distinct from a booking.
- **Slot** — a time-aligned `(date, startTime, endTime)` window for an appointment service.
- **Active booking** — a booking with status `confirmed` or `rescheduled`. Only active bookings block availability.
- **Standalone mode** — the module manages its own localStorage. Default for the dev shell and the public route.
- **Integrated mode** — the module is fed config and emits callbacks. Used when embedding inside a host app.
- **Adaptive surface** — the module shows both admin and public booking; user toggles.
- **Public-only surface** — the module shows only the public booking flow + success/manage screen.
- **`dateKey`** — `"YYYY-MM-DD"` in the browser's local timezone. The canonical date format throughout the engine.
- **Snapshot field** — a value copied from the source entity at the time a booking is created, intentionally frozen so renames/repricing don't rewrite history.
