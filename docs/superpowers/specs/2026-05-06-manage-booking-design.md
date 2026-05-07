# Self-Service Booking Management — Design Spec

**Date:** 2026-05-06
**Status:** Approved (pending user review of this written form)
**Source recommendation:** `UX_RECOMMENDATIONS.md` § 1.3

## Problem

Clients who have completed a booking on the public flow have no self-service way to view, reschedule, or cancel that booking after the success screen is dismissed. The reschedule and cancel UI already exists in the module — it is reachable from both the admin dashboard and the in-session success screen — but it is gated behind component state (`bookingFlow.successBookingId`) that does not survive a navigation or page reload. As a result, returning clients must contact the provider directly for any change.

## Goal

Ship a permanent, tokenized URL — `/public/[slug]/manage/[token]` — that re-opens the existing success screen for an existing booking. The page must:

- Load instantly from local cache (offline-first).
- Provide full parity with the in-session success screen: view details, download .ics, reschedule, cancel.
- Be safely shareable as a URL (unguessable token, no auth required, but explicit warning that link-holders can manage the booking).
- Be designed so a future Supabase swap is mechanical, not a rewrite.

## Constraints and Principles

- **Offline-first.** The app must remain fully functional with no network. Reads come from local cache; writes succeed locally first and (in a future iteration) queue for sync. The manage page is no exception — if the booking is in local storage, the page works with no network at all.
- **Local-first storage today.** The app currently persists everything to `localStorage` (key `haab-calendar-dev-clean`). Supabase is the planned backend (`BACKEND_RECOMMENDATIONS.md`) but is not yet built. This feature ships against localStorage.
- **Honest about the local-only limitation.** A token URL opened in a browser other than the one that created the booking will not find the booking in local storage today. The UX surfaces this clearly rather than pretending otherwise. Once Supabase lands, the same view stays — but the lookup tries the network before declaring not-found.
- **Minimal blast radius on the monolith.** `components/haab-booking-module.tsx` is already 5,218 lines. This feature deliberately adds new files for new logic and touches the monolith only at narrowly-scoped insertion points. Splitting the monolith is its own project (`UX_RECOMMENDATIONS.md` § 7.1).
- **Next.js 16.** The project uses Next.js 16, where `params` is async (`Promise<{...}>`). The new route follows the same pattern as the existing `app/public/[slug]/page.tsx`.

## Architecture

### File additions

```
app/public/[slug]/manage/[token]/page.tsx   — new route
lib/booking-tokens.ts                        — pure helpers (generation, lookup, backfill, URL builder)
```

### File modifications

```
components/haab-booking-module.tsx           — one new prop, one new lookup state, one new effect, three small render branches, share-link UI on the success screen, ics signature update
                                               (also: silent-failure fix in confirmReschedule — see § Reschedule Conflict Fix)
```

No other files change. No new dependencies are introduced (`crypto.getRandomValues` is in the browser).

### Data layer abstraction

All booking-by-token access goes through `lib/booking-tokens.ts`. Today the helper reads from the in-memory store (which is hydrated from localStorage). When Supabase lands:

- The helper signature stays the same.
- The route's lookup effect adds a network fallback when the local lookup misses.
- The pending / found / not-found state machine in the module does not change shape.

This means the route, the module changes, the .ics changes, and the share-link UI all carry over to the Supabase version unchanged.

## Data Model

### `BookingRecord` (existing type, ~line 59 of `haab-booking-module.tsx`)

Add one field:

```ts
type BookingRecord = {
  // ...existing fields...
  manageToken: string;  // 22-char base64url, crypto-random, unique per booking
};
```

### Token generation

```ts
// lib/booking-tokens.ts
export function generateManageToken(): string {
  const bytes = new Uint8Array(16);  // 128 bits — unguessable
  crypto.getRandomValues(bytes);
  return base64url(bytes);            // ~22 chars, URL-safe (A-Z a-z 0-9 - _)
}
```

`base64url` is a small inline helper that base64-encodes the bytes and then replaces `+` → `-`, `/` → `_`, and strips `=` padding. No dependency.

### Where the token is set

- **New bookings:** the booking-record construction at `haab-booking-module.tsx` line 2406 (inside the booking-confirmation function, where `nextBooking: BookingRecord = { id: createId("booking"), ... }` is built) gains one additional line: `manageToken: generateManageToken(),`. This is the only construction site for new `BookingRecord`s.
- **Existing bookings in localStorage:** handled by the backfill below.

### Backfill (one-time per browser, idempotent)

In the existing localStorage hydration path (~lines 1339–1358 of `haab-booking-module.tsx`), after parsing the store from localStorage:

```ts
const { changed, store: backfilled } = backfillManageTokens(parsedStore);
if (changed) {
  window.localStorage.setItem(storageKey, JSON.stringify(backfilled));
}
setStandaloneStore(backfilled);
```

`backfillManageTokens(store)` iterates `store.bookings`, assigns `manageToken = generateManageToken()` to any booking missing one, and returns `{ changed, store }`. Returns `{ changed: false, store }` if all bookings already have tokens.

The presence-check (`!booking.manageToken`) is sufficient idempotency — no schema version field needed for a single new field. (Adding a versioned migration mechanism is bigger scope than this feature warrants and would belong with the Supabase migration work.)

## Route

### `app/public/[slug]/manage/[token]/page.tsx`

Mirrors `app/public/[slug]/page.tsx` with one addition:

```tsx
import { HaabBookingModule } from "@/components/haab-booking-module";

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-[#eef2f5]">
      {/* same background chrome as /public/[slug] */}
      <div aria-hidden="true" className="absolute inset-0 bg-[url('/bkg2.jpg')] bg-cover bg-center bg-no-repeat" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(160deg,rgba(248,249,250,0.28),rgba(248,249,250,0.54)_34%,rgba(243,244,245,0.74)_100%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(248,249,250,0))]" />
      <div className="relative mx-auto flex w-full max-w-[1680px] flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <HaabBookingModule
          requestedPublicSlug={slug}
          surfaceMode="public-only"
          manageBookingToken={token}
        />
      </div>
    </main>
  );
}
```

The chrome is intentionally identical to the public page so the manage view feels like a continuation of the same experience.

## Module Integration

### New prop on `HaabBookingModuleProps`

```ts
type HaabBookingModuleProps = {
  // ...existing props...
  manageBookingToken?: string;
};
```

### New state

```ts
type ManageLookupState = "idle" | "pending" | "found" | "not-found";
const [manageLookupState, setManageLookupState] = useState<ManageLookupState>(
  manageBookingToken ? "pending" : "idle",
);
```

### New effect (runs after hydration when `manageBookingToken` is set)

```ts
useEffect(() => {
  if (!manageBookingToken || !hydrated) return;

  const booking = findBookingByToken(activeStore, manageBookingToken);
  if (booking) {
    setBookingFlow((current) => ({
      ...current,
      step: 4,
      successBookingId: booking.id,
      serviceId: booking.serviceId,
    }));
    setManageLookupState("found");
  } else {
    setManageLookupState("not-found");
  }
}, [manageBookingToken, hydrated, activeStore]);
```

### Render branching (in the public-only render path, ~line 5072)

When `manageBookingToken` is **not** set, `manageLookupState` stays `"idle"` and the module renders the normal public booking flow with no behavioural change. The branching below only applies when `manageBookingToken` is set:

| `manageLookupState` | Render                                                                                  |
|---------------------|-----------------------------------------------------------------------------------------|
| `"pending"`         | Minimal loading skeleton: a single section with "Loading your booking…"                 |
| `"not-found"`       | Token-not-found view (see § UI Additions, 4b)                                           |
| `"found"`           | Fall through to the existing success-screen render path (no code duplication)           |

The success path requires no code changes to render a token-loaded booking — the effect above sets the state the success screen already reads.

### "Book another" behavior on the manage page

The success screen's "Book another" button (`startFreshBooking`) resets state in place. On the manage page that would leave the user on `/public/[slug]/manage/[token]` while pretending to be on the booking flow — confusing.

When `manageBookingToken` is set, the "Book another" button is rendered as a `next/link` to `/public/[slug]` instead of calling `startFreshBooking`. The destination handles starting fresh naturally because there's no `manageBookingToken` in scope.

## UI Additions

### 4a. "Manage my booking" link on the success screen

Rendered at the bottom of the existing success-screen action area (~line 4681 of the module), after the action buttons row:

```
Manage this booking anytime:
[ https://yourapp.com/public/<slug>/manage/<token> ]  [Copy link]

Save this link or use the calendar attachment — anyone with the link
can manage this booking.
```

- Renders only when `successfulBooking` exists and `successfulBooking.manageToken` is present.
- The URL is rendered in a read-only `<input>` (focusable, selectable) using the existing monospace font (`var(--font-plex-mono)`), so keyboard users can copy without the button.
- The "Copy link" button uses the same try/catch pattern as the existing `copyPublicLink` (~line 2569). A sibling function `copyManageLink` is added to keep the two concerns separate (different state flag, different label).
- **Accessibility:**
  - `aria-label="Booking management URL"` on the input.
  - `aria-live="polite"` on the "Copied" indicator.
  - The caveat ("anyone with the link can manage this booking") is part of the same labelled region so screen readers reach it after the URL.

### 4b. Token-not-found view

Rendered when `manageBookingToken` is set and `manageLookupState === "not-found"`. Same chrome as the success view so the page feels consistent:

```
We can't find this booking on this device.

Bookings are stored locally in the browser they were created in.
If you booked from a different browser or device, please open this
link there. If you've cleared your browser data, the booking is no
longer accessible from this device.

[ Book a new appointment ]   [ Contact provider ]
```

- "Book a new appointment" is a `next/link` to `/public/[slug]`.
- "Contact provider" is a `mailto:` link to `provider.email`. Rendered only when `provider.email` is loadable from the local store; omitted otherwise (a genuinely unknown provider produces a smaller view rather than a broken `mailto:`).
- The heading carries `role="alert"` so screen readers announce it on arrival.
- **Future-ready:** when Supabase lands, the lookup effect will try the network before setting `manageLookupState = "not-found"`. The view itself does not change.

### 4c. iCal updates (`buildIcsContent`, line 801)

Two changes to both the full-day and timed branches of `buildIcsContent`:

1. **Add a `URL:` property** to the VEVENT, pointing to the manage URL. Standard iCal field; most calendar clients render it as a "URL" link in the event details.
2. **Append a "Manage this booking: <url>" line** to the existing `DESCRIPTION` text (after Notes), so clients that don't surface the `URL:` field still expose it in the human-readable description.

The function signature gains one parameter:

```ts
function buildIcsContent(
  booking: BookingRecord,
  provider: ProviderInfo,
  manageUrl: string,
): string
```

Both call sites (~line 1644 and ~line 1850) already have `provider` and `booking` in scope. The `manageUrl` is computed via `buildManageUrl(provider.publicSlug, booking.manageToken)` from `lib/booking-tokens.ts`, which uses `window.location.origin`.

**Edge case:** `window.location.origin` is unavailable during SSR. Both .ics call sites are already inside browser-only contexts (a `useEffect` and a click handler), so this is fine — but worth noting we should not move .ics generation to a server boundary later without addressing this.

## Reschedule Conflict Fix

This is the only behavioural change to existing flows. It is folded into this work because the manage page makes the "slot taken between modal-open and Confirm-click" race a guaranteed real-world scenario rather than the rare two-tabs-on-the-same-machine edge case it is today.

### Current behaviour (`confirmReschedule`, ~line 2467)

```ts
if (!nextSlots.includes(rescheduleState.time)) {
  return;  // silent — modal stays open, user sees nothing
}
```

### New behaviour

1. **`RescheduleState` gains an optional error field:**
   ```ts
   type RescheduleState = {
     bookingId: string;
     dateKey: string;
     time: string;
     monthAnchor: Date;
     error?: string;
   };
   ```
2. **In `confirmReschedule`,** every silent-validation early-return becomes:
   ```ts
   setRescheduleState((current) =>
     current ? { ...current, error: <message> } : current,
   );
   return;
   ```
   - Appointment slot conflict: `"That slot is no longer available — please pick another time."`
   - Full-day date conflict: `"That date is no longer available — please pick another day."`
3. **In `renderRescheduleModal`,** when `rescheduleState.error` is set, render the message above the slot grid in a `role="alert"` styled box. The styling matches the existing error tone in the module.
4. **The error clears whenever the user picks a new date or time.** The existing `setRescheduleState((current) => ...)` calls inside the modal already update `dateKey` / `time`; each gets `error: undefined` appended.
5. **The slot list refreshes automatically.** `getAvailableSlots` is called on every render against current `bookings` + `activeBookingHolds`; the newly-taken slot will simply not appear when the modal re-renders.

## Test Plan

There is no automated test suite in this repo today (see `TESTING_RECOMMENDATIONS.md`). Verification for this feature is manual against `next dev`:

- [ ] Make a fresh booking → `manageToken` appears on the success screen as a copyable URL.
- [ ] Click "Copy link" → clipboard contents are correct, "Copied" indicator appears.
- [ ] Open the manage URL in a new tab of the same browser → manage page loads with the booking details.
- [ ] Open the manage URL in a different browser (or fresh incognito) → token-not-found view renders with the two recovery actions.
- [ ] Reschedule from the manage page → page updates, reload preserves the change, status flips to "rescheduled".
- [ ] Cancel from the manage page → page updates, action buttons disabled, reload preserves cancelled state.
- [ ] Two-tab race: tab A reschedules to a slot; tab B (same modal still open on that slot) Confirm → tab B shows the inline conflict error and the slot is gone from the grid.
- [ ] Open the .ics in a calendar app → the manage URL is present as a `URL:` field and as text in the description.
- [ ] Existing booking in localStorage with no `manageToken` (simulate by editing localStorage) → reload → backfill runs, token is now present, success screen and manage URL both work.
- [ ] "Book another" from the manage page → navigates to `/public/[slug]` and starts a fresh booking.
- [ ] Cancelled booking's manage URL → page renders cancelled state with disabled actions.
- [ ] Reschedule a previously-rescheduled booking → status remains "rescheduled", new date/time replace the previous values.

## Non-Goals

These are deliberately **not** part of this feature. Each is documented in `UX_RECOMMENDATIONS.md` § 8 (Manage-Booking Feature: Explicit Non-Goals) for traceability.

- Email confirmation containing the manage link (recommendation 1.1).
- Undo on cancellation (recommendation 5.3 / finding 8.2).
- Reschedule window expansion anchored to the booking date (recommendation 1.4 / finding 8.1).
- Booking event/audit log (recommendation 6.3 / finding 8.3).
- Token rotation / "regenerate management link" — a deliberate product decision; the no-auth model is surfaced in the success-screen copy.
- Restructuring of the 5,218-line `haab-booking-module.tsx` (recommendation 7.1).
- Backend / Supabase integration — the data layer is shaped for a clean swap, but the swap itself is separate work (`BACKEND_RECOMMENDATIONS.md`).
- Test framework introduction (`TESTING_RECOMMENDATIONS.md`).

## Open Questions

None — all five clarifying questions have been resolved during brainstorming:

1. Approach: localStorage-now, designed for clean Supabase swap, offline-first (option D).
2. Scope: full parity with the in-session success screen (option A).
3. URL structure: `/public/[slug]/manage/[token]` (option A).
4. Token format: random opaque crypto-secure token stored on `BookingRecord` (option A).
5. Token-not-found UX: honest stub message with recovery actions (option A).
