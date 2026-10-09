# Change Business Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a published provider switch business type: blocked while upcoming bookings or holds exist, set up on a browser draft while the live page stays untouched, then swapped atomically on "Replace and publish".

**Architecture:** Pure rules in `lib/business-type-switch.ts`; an atomic `security invoker` Postgres function `switch_provider_business_type` that re-checks the blocking rules under a row lock and replaces services, vertical, availability and the daily limit; a server helper plus `POST /api/provider/business-type` that run the function and then write the draft's kept profile and branding fields through the existing store writer. Client: a Settings card opens `ChangeBusinessTypeDialog` (pick, warning, blocked state); Continue routes to `/dashboard/business-type?to=<vertical>`, where `BusinessTypeSwitch` runs the existing setup wizard in standalone mode on a seeded browser draft and publishes through a new `publishSetupOverride` module prop.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres, Vitest (unit, markup via `renderToStaticMarkup`, DB via `npm run test:db`), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-change-business-type-design.md`

## Global Constraints

- Nothing on the server changes before "Replace and publish" succeeds.
- The switch is refused while any non-cancelled booking is dated today or later in the provider's time zone, or any hold has `expires_at > now()`.
- Kept across the switch: login, plan and billing, overrides, publication status, profile, languages, branding, slug, and the Google Calendar connection.
- Not available while demo editing: the card is hidden, the page is not reachable, and the API answers 403.
- en/es copy for all new dashboard strings, in `components/provider/dashboard-copy.ts`.
- No new dependencies. Conventional Commits. Gate: `npm run ci` plus the new DB test and E2E.

## Review Focus

- A booking or hold created after the dialog's check but before publish → the function refuses inside its transaction (DB test in Task 2).
- A provider who abandons the draft → live page, vertical and old link unchanged (E2E, Task 7).
- Unsaved Settings edits when the switch starts → the main module stays mounted (hidden), so they survive and can be saved later (Task 6: module stays mounted).
- Draft for a different `?to=` → asks before replacing the draft (Task 6 markup test of the prompt state).
- A same-type switch or another owner's provider → refused (DB test, Task 2).

---

### Task 1: Pure switch rules — `lib/business-type-switch.ts`
**Files:** create `lib/business-type-switch.ts`, `lib/__tests__/business-type-switch.test.ts`.
**Produces:**
- `findBlockingBookings(bookings: BookingRecord[], holds: BookingHoldRecord[], todayKey: string, nowMs: number): { bookings: BookingRecord[]; activeHolds: number }`
- `seedBusinessTypeDraft(live: ModuleStore, vertical: Vertical): ModuleStore` (keeps the provider object, applies `applyVerticalToStore`, clears bookings, holds and `maxBookingsPerDay`, `setupComplete: false`)
- `summarizeReplacement(live: ModuleStore): { services: number; openDays: number; hasDailyLimit: boolean }`
- `businessTypeDraftKey(providerSlugOrId: string): string` → `haab-business-type-draft:<id>`

Tests: cancelled bookings ignored; a booking today counts; one yesterday does not; expired holds ignored, active holds counted; the seed keeps every profile and branding field and gets the preset's services and availability; the summary counts.

### Task 2: Atomic switch in the database
**Files:** create `supabase/migrations/20261011120000_add_switch_provider_business_type.sql`, `test/db/switch-business-type.test.ts`.
**Function:** `public.switch_provider_business_type(p_vertical text, p_availability jsonb, p_max_bookings_per_day integer, p_services jsonb) returns uuid`
- `language plpgsql`, `security invoker`, `set search_path = ''`.
- Lock: `select id, vertical, timezone from public.providers where owner_user_id = auth.uid() for update`. No row → `raise exception 'not_found' using errcode = 'P0002'`.
- `p_vertical = vertical` → `raise exception 'same_vertical' using errcode = '22023'`.
- An upcoming booking (`status <> 'cancelled' and date >= (now() at time zone coalesce(nullif(timezone,''),'UTC'))::date`) → `raise exception 'upcoming_bookings' using errcode = 'P0001'`.
- An active hold (`expires_at > now()`) → `raise exception 'active_holds' using errcode = 'P0001'`.
- `delete from public.services where provider_id = v_id`.
- `update public.providers set vertical = p_vertical, availability = p_availability, max_bookings_per_day = p_max_bookings_per_day, updated_at = now() where id = v_id`.
- `insert into public.services (<payload columns>) select v_id, r.<cols> from jsonb_populate_recordset(null::public.services, p_services) r`.
- `jsonb_array_length(p_services) = 0` → `raise exception 'no_services' using errcode = '22023'`.
- `grant execute on function … to authenticated`; `revoke … from anon, public`.

DB tests (real local Supabase, signed-in owner client):
- swaps atomically (old services gone, new ones present, vertical/availability/limit updated, redirect row recorded);
- refuses with an upcoming booking, refuses with an active hold;
- refuses the same vertical;
- another user's call finds no provider;
- a past booking survives with `service_id` null.

### Task 3: Server helper and API route
**Files:** modify `lib/supabase/provider-store.ts` (export `toServicePayload`, `requireVertical`); create `lib/supabase/business-type-switch.ts`, `app/api/provider/business-type/route.ts`, `app/api/provider/business-type/route.test.ts`.
**Produces:** `switchProviderBusinessType({ supabase, ownerUserId, ownerEmail, store }): Promise<{ store: ModuleStore; profileWarning?: string }>` — normalizes, builds service payloads (`toServicePayload(providerId placeholder, service, index)` minus `provider_id`), calls the RPC, maps errors to `BusinessTypeSwitchError(userMessage, status)` (409 `upcoming_bookings`/`active_holds`, 400 `same_vertical`/`no_services`/validation, 404 `not_found`), then `persistProviderStore({ store: { ...store, setupComplete: true } })` for the kept fields; if that second write fails, returns the reloaded store plus `profileWarning`.
**Route:** `POST`: 401 when signed out, 403 while demo editing (`resolveDemoEditTarget()` non-null), 400 on a bad body, otherwise `{ store, userMessage? }`.
Route tests mock the helper: 401, 403 demo, 400 bad JSON, error mapping, success shape.

### Task 4: Routing, copy, module and settings wiring
**Files:** `lib/types.ts` (`AdminTab` + `"business-type"`), `lib/dashboard-routes.ts` (`DashboardNavGroup` + `"hidden"`, section `{ id: "business-type", segment: "business-type", group: "hidden" }`), `components/provider/dashboard-copy.ts` (title, description, card, dialog, banner, confirm and success copy, en/es), `components/haab-booking-module.tsx` (props `publishSetupOverride?: (store) => Promise<ModuleStore | null>`, `publishLabel?: string`, `onChangeBusinessType?: () => void`; `renderManagementSections` returns `null` for `"business-type"`; `publishSetup` uses the override when present: `null` → cancelled silently), `components/provider/ProviderSettingsSurface.tsx` (Business type card when `businessType` prop given: `{ label, tagline, onChange }`).
Tests: route mapping includes `/dashboard/business-type`, which is excluded from the sidebar groups; settings surface renders the card and button only when given; source guard that `publishSetup` consults `publishSetupOverride`.

### Task 5: `ChangeBusinessTypeDialog`
**Files:** create `components/provider/ChangeBusinessTypeDialog.tsx`, test.
Props: `{ lang; currentVertical; summary; blocking: { bookings; activeHolds }; publicPath; slug; onCancel; onContinue(vertical) }`.
Views:
- pick: the vertical cards minus the current type;
- warning: replaced, stays and not-carried-over lists, with old → new paths;
- blocked: up to five bookings, a Go to Bookings link, Continue disabled;
- an "I understand" checkbox enables Continue.

`role="dialog"`, `aria-modal`, Esc closes. Markup tests cover each view.

### Task 6: `BusinessTypeSwitch` and DashboardApp wiring
**Files:** create `components/provider/BusinessTypeSwitch.tsx` (+ test); modify `components/provider/DashboardApp.tsx`, `app/dashboard/[[...section]]/page.tsx` (`?switched=<vertical>` → success banner).
- DashboardApp: passes `onChangeBusinessType` (not while demo editing) and opens the dialog using `snapshot` (bookings and holds); Continue → `navigate("business-type", { to })`.
- The main module stays mounted and is hidden on `business-type`; `BusinessTypeSwitch` renders there.
- BusinessTypeSwitch:
  - Seeds or resumes the draft in localStorage (key from Task 1) and asks before replacing a draft with a different type.
  - Renders the banner and **Cancel change** (clears the draft, goes to Settings).
  - Renders `HaabBookingModule` in standalone mode with the draft storage key, `persistSetup`, `publishLabel`, and `publishSetupOverride` (opens a confirm view; on confirm POSTs `/api/provider/business-type`; on 2xx clears the draft and runs `window.location.assign("/dashboard?switched=<vertical>")`; on error throws the `userMessage`).

Tests: markup for the banner and the Cancel action; resume vs replace-prompt state via a pure helper `resolveDraftAction(existingDraft, to)`.

### Task 7: E2E and verification
**Files:** `e2e/fixtures/providers.ts` (role `businessTypeSwitch`), `e2e/global.setup.ts` (seeds it), create `e2e/business-type.spec.ts`.
- Blocked: give the provider a future booking; the dialog shows the blocked state.
- Abandon: start the draft, go back; the live page is unchanged and the old link still serves the old type.
- Full switch: switch to `spaces`; `/spaces/<slug>` serves, `/doctors/<slug>` redirects, Services shows the starter set, and the success banner shows.

Then `npm run ci`, `npm run test:db`, E2E suite, and a visual check at 390px and 1280px.
