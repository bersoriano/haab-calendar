# Haab Calendar - Testing Recommendations

## Current State

The repo has **no test infrastructure** as of 2026-05-06:

- No `test` script in `package.json`
- No testing dependency installed (Vitest, Jest, Playwright, Cypress, Testing Library — none)
- No `__tests__/`, `*.test.*`, or `*.spec.*` files anywhere in the project
- No CI pipeline configured to run tests

All verification today is manual: run `npm run dev`, click through the flows, and visually confirm behavior. This works for a small project with a single contributor but does not scale.

## Why This Matters

The booking module is a **5,218-line single component** (`components/haab-booking-module.tsx`) that handles:

- Provider setup wizard (4 steps)
- Public booking flow (4 steps with hold timer)
- Provider dashboard, calendar, services, settings
- Reschedule, cancel, and the upcoming manage-booking flow
- localStorage persistence and (planned) Supabase sync
- Two surface modes (`adaptive` and `public-only`)
- Two operating modes (standalone localStorage vs. integrated with injected props)

Manual regression testing across this surface area is already costly. As Supabase sync, offline-first reconciliation, and email confirmations land, the cost grows non-linearly. A regression in any one corner — a hold timer that doesn't release, a reschedule that double-books — directly damages user trust because bookings are high-stakes transactions.

## Recommended Stack

**Pick one of the two paths below.** They are not exclusive but the unit-test path should land first; the e2e path is only worthwhile once there are flows stable enough to assert against.

### Path 1 — Unit and integration tests (start here)

**Vitest** — natural fit for a Next.js 16 + Vite-era TypeScript project, fast watch mode, Jest-compatible API, native ESM, no Babel config required.

**React Testing Library** — for component-level tests of the smaller helpers and (eventually) extracted sub-components.

**What to test first, in priority order:**

1. **Pure helpers in `haab-booking-module.tsx`** — these are the easiest wins and have the highest blast radius if they break. Examples:
   - `getAvailableSlots`, `isDateAvailable`, `pruneBookingHolds`, `createRollingWeekWindow`, `clampDateKey`, `compareDateKeys`, `addMinutes`, `parseDateKey`, `getDateKey`
   - `buildIcsContent` (full-day and timed branches, escape behavior, manage URL inclusion)
2. **`lib/booking-tokens.ts` (new)** — `generateManageToken` (uniqueness, length, charset), `findBookingByToken`, `backfillManageTokens` (idempotency).
3. **Reducers / state transitions** — once the monolith is split per recommendation 7.1, the booking-flow reducer, hold lifecycle, and reschedule conflict handling are all unit-testable in isolation.

**What not to bother unit-testing:**
- One-off render snippets with no logic.
- Anything that's purely a thin wrapper over `localStorage` or `crypto` — test the helpers that use them, not the primitives.

### Path 2 — End-to-end smoke tests

**Playwright** — better than Cypress for Next.js apps in 2026: native multi-browser, faster, better trace viewer, supports parallel sharding out of the box.

**What to cover (small set, high signal):**

1. **Happy path booking** — open public page, pick service → date → time → fill details → confirm → success screen renders with correct details.
2. **Manage flow** — make a booking, copy the manage URL, open it in a fresh context, verify the manage page renders the booking, reschedule, verify the change persists across reload.
3. **Conflict on reschedule** — two contexts, both open the reschedule modal for the same booking pointing at the same slot, both confirm; one should succeed, one should show the inline error.
4. **Hold expiration** — start a booking, wait past the 10-minute hold, verify the slot is released.
5. **Token-not-found** — open `/public/<slug>/manage/<bogus-token>` and verify the not-found view renders.

**What not to bother e2e-testing:**
- Visual styling (use a separate visual-regression tool like Percy if needed, or skip until UX stabilizes).
- Provider admin flows in isolation — these are easier to cover with integration tests once the module is split.

## Specific Manual Test Plan for the Manage-Booking Feature

Until automated coverage exists, this is the verification checklist for the manage-booking feature when it ships. Run all of these against `next dev` before any merge that touches the feature:

- [ ] Make a fresh booking → confirm `manageToken` field appears on the success screen as a copyable URL.
- [ ] Click "Copy link" → verify clipboard contents and that the "Copied" indicator appears.
- [ ] Open the manage URL in a new tab of the same browser → manage page loads showing the booking details.
- [ ] Open the manage URL in a different browser (or fresh incognito) → token-not-found view renders with the "Book a new appointment" and "Contact provider" actions.
- [ ] From the manage page: click Reschedule → pick a new slot → confirm → page updates to show the new date/time, status flips to "rescheduled", reload preserves the change.
- [ ] From the manage page: click Cancel → confirm → page updates to show cancelled state, action buttons are disabled, reload preserves.
- [ ] Open two tabs of the same manage URL → reschedule from tab A to a specific slot → in tab B (still on the original modal), pick the same slot and confirm → tab B shows the inline conflict error.
- [ ] Open the .ics file from the success screen in a calendar app → verify the manage URL appears as a clickable URL field and as text in the description.
- [ ] In a browser with an existing booking that has no `manageToken` (simulate by editing localStorage), reload → backfill runs, token is now present, success screen and manage URL work normally.
- [ ] Click "Book another" from the manage page → navigates to `/public/<slug>` (not the manage URL) and starts a fresh booking flow.
- [ ] Cancelled booking: open its manage URL → page renders cancelled state, Reschedule and Cancel buttons are disabled.
- [ ] Reschedule a booking that has been rescheduled before → status remains "rescheduled", new date/time replace the previous values.

## Sequencing

1. **Now (manage-booking feature):** Use the manual checklist above. Document any failures here as bugs.
2. **Next:** Add Vitest + a `test` script to `package.json`. Write tests for the highest-value pure helpers (`getAvailableSlots`, `buildIcsContent`, `findBookingByToken`, `generateManageToken`, `backfillManageTokens`). This is small scope and unblocks future TDD.
3. **After Supabase migration:** Add Playwright with the 5 e2e flows above. The Supabase migration introduces async data flows where regressions are harder to catch by eye.
4. **After module split (recommendation 7.1):** Expand component-level tests on the extracted sub-modules.

## Out of Scope for This Document

- Visual regression tooling (Percy, Chromatic, Loki).
- Performance testing (Lighthouse CI, web-vitals assertions).
- Load testing (only relevant once Supabase is in production at meaningful scale).
- Accessibility testing automation (axe-core integration) — flagged because the accessibility recommendations in `UX_RECOMMENDATIONS.md` section 3 will benefit from automated guardrails once tests exist.
