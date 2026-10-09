# Change Business Type — Design

**Date:** 2026-10-09
**Status:** Approved (design), pending spec review → implementation plan
**Branch:** `feat/change-business-type`
**Scope:** Let a provider with a published page switch their business type (vertical), e.g. Professional → Healthcare. Account-level data survives; the workflow-specific setup is replaced. New-account setup already has "Choose another workflow" and is unchanged.

## Goal

A provider who picked the wrong business type, or whose business changed, can move to another type without a new account, without breaking their booking link, without stranding clients who have upcoming appointments, and without their public page ever showing unreviewed template content.

## Background (current state)

- The module ignores vertical changes once a page is published: `applyVertical` and the vertical reset both return early in `integratedMode` (`components/haab-booking-module.tsx`). The pre-redesign dashboard's "Choose another workflow" button only navigated to the marketing page; it never changed a published page's type. The 2026-06-08 vertical-onboarding spec lists switching after first run as out of scope.
- `PUT /api/provider/store` already writes `providers.vertical`, and the trigger `private.record_provider_slug_redirect` records `(old vertical, old slug)` in `provider_slug_redirects` whenever the vertical or slug changes, so the old public path keeps resolving to the new one.
- Bookings have no cancellation email. A booking deleted or cancelled behind a client's back can leave them turning up for an appointment that no longer exists.
- Google Calendar projections cascade from bookings. Deleting bookings in the database leaves the provider's Google Calendar events behind; only the normal cancellation path removes them.
- Services in events and restaurant verticals carry fields other verticals do not use (occurrence dates and windows, per-slot capacity). Converting services between verticals would be lossy.

## Decisions

| # | Decision |
|---|---|
| D1 | **Reset the workflow, keep the account.** Services, weekly availability and the daily booking limit are replaced with the new type's starter setup. Nothing is converted between types. |
| D2 | **Blocked while upcoming bookings exist.** The switch is unavailable while any non-cancelled booking is dated today or later in the provider's time zone, or while an unexpired booking hold exists. The provider handles those bookings first through the existing Bookings section. |
| D3 | **Past bookings are kept** as read-only history (their service-name snapshots keep them readable). Analytics history is kept. |
| D4 | **The live page stays as it is until a single swap.** The new setup is prepared in a browser draft; nothing on the server changes until the final "Replace and publish". Abandoning loses nothing. |
| D5 | **Carry over:** login, plan and billing, feature overrides, publication status, profile (full name, business name, email, phones, addresses, time zone), client and dashboard languages, branding (logo, header image, hero text, gallery, theme), booking link slug, Google Calendar connection. |
| D6 | **Two acknowledgements:** a warning dialog with an "I understand" checkbox before the draft starts, and a final confirmation on "Replace and publish" that repeats what will be replaced. |
| D7 | **Atomic server swap** in one Postgres function, which re-checks the blocking conditions inside the transaction. |

## Design

### 1. Provider experience

**Entry point.** Settings gets a **Business type** card (in both the dashboard shell and module chrome) showing the current type's label and tagline (`translations[lang].home.verticals[vertical]`) and a **Change business type** button.

**Step 1 — Choose.** A dialog shows the business-type cards (`getVerticals(lang)` / `VerticalPicker`), excluding the current type.

**Step 2 — Warning.** Same dialog, second view:

- *Will be replaced:* "Your {n} services, weekly hours and daily booking limit will be replaced by the {new type} starter setup, which you review before it goes live."
- *Stays:* account and plan, profile and contact details, languages, logo, header image and theme, past bookings, Google Calendar connection, and the booking link (with the before/after paths, e.g. `/professionals/acme → /doctors/acme`, noting that the old path redirects).
- *Not carried over:* links to individual services on the old page stop working.
- *Blocked state:* if any blocking booking or hold exists, the dialog says "You have {n} upcoming bookings. Cancel or finish them before changing business type", lists up to five (client, service, date and time) with a **Go to Bookings** link, and disables Continue. The check runs against the dashboard's own store (bookings are already loaded) when the dialog opens.
- *Acknowledgement:* an "I understand my current services and hours will be replaced" checkbox enables **Continue**.

**Step 3 — Set up the new type.** Continue navigates to `/dashboard/business-type?to=<vertical>` (rendered by the existing catch-all dashboard route; not a sidebar item). It shows the existing setup wizard on a browser draft:

- Draft storage key: `haab-business-type-draft:<providerId>`; one draft per provider per browser.
- Seeded from the live store with every D5 field kept, `vertical` cleared, services empty and availability empty; then the new type's preset is applied (starter services, default hours), the same way first-run setup applies a preset.
- A banner explains: "Your live page is unchanged until you publish. Leaving keeps this draft in this browser."
- A **Cancel change** action discards the draft and returns to Settings.
- Returning to `/dashboard/business-type` with an existing draft resumes it. A `?to=` that differs from the draft's type asks before replacing the draft.

**Step 4 — Replace and publish.** The wizard's publish button reads **Replace and publish**. A confirmation repeats "This replaces your {n} services, weekly hours and daily limit on your live page." On success:

- the draft is deleted,
- the provider lands on `/dashboard` with a success banner, "Your page is now a {new type} page. Your old link redirects here.",
- the dashboard reloads from the server (new vertical copy, nav labels, URL).

On refusal (a booking or hold arrived, or validation failed) the error appears in the wizard, the draft is kept, and nothing on the server changed.

### 2. Server

**Function** `public.switch_provider_business_type(p_vertical text, p_availability jsonb, p_max_bookings_per_day integer, p_services jsonb)` returns `uuid` (the provider id):

- `security invoker`, so every read and write goes through the caller's existing row-level security, plus an explicit owner lookup: `select id from providers where owner_user_id = auth.uid() for update` (row lock). No row → `not_found`.
- Refuses with distinct error codes, so the API can explain:
  - `same_vertical` when `p_vertical` equals the current vertical,
  - `upcoming_bookings` when any booking for the provider has `status <> 'cancelled'` and `date >= (now() at time zone providers.timezone)::date`,
  - `active_holds` when any booking hold has `expires_at > now()`.
- Then, in the same transaction:
  - `delete from services where provider_id = …` (existing foreign keys set the past bookings' `service_id` to null; their snapshots keep them readable),
  - `update providers set vertical, availability, max_bookings_per_day`; the existing trigger records the old-path redirect, and `bookings_b_enforce_shared_capacity` keeps each past booking's `allows_shared_capacity` when its `service_id` is set to null,
  - insert `p_services` using the same column mapping `upsertServices` uses.
- The vertical check constraint and the service constraints validate the new data; any violation rolls the whole swap back.

**Route** `POST /api/provider/business-type`:

- Body: `{ store: ModuleStore }` (the published draft).
- Authenticates with the user's Supabase client and normalizes with the same functions `PUT /api/provider/store` uses (`requireVertical`, `normalizeAvailability`, `normalizeServices`, `normalizeDailyBookingLimit`).
- Writes the D5 profile and branding fields from the draft through the existing provider update path **only after** the switch succeeds, so a refused switch changes nothing. These fields are not replaced by the swap; the provider may have edited them in the wizard.
- Calls the function and returns the reloaded dashboard store, `{ store }`, like the store PUT.
- Errors map to `userMessage`s: 409 for `upcoming_bookings` and `active_holds`, 400 for `same_vertical` and validation, 404 for `not_found`.

**Ordering note.** The profile and branding update runs after the swap commits. If that second write fails, the switch has still happened; the route returns the reloaded store plus a `userMessage` asking the provider to re-save their profile changes in Settings. The profile fields were already kept from the live store, so nothing is lost.

### 3. Client wiring

- `HaabBookingModule` gains `publishSetupOverride?: (store: ModuleStore) => Promise<ModuleStore>`. When present, the setup wizard's publish calls it instead of `PUT /api/provider/store`; errors surface through the existing `setupError` path.
- A new client component, `BusinessTypeSwitch` (dashboard section content for `business-type`), owns the draft seeding, the banner, Cancel change, and the override that posts to `/api/provider/business-type`. It renders the module in standalone mode with the draft storage key, `persistSetup`, and `initialVerticalId = to`.
- `lib/business-type-switch.ts` (pure):
  - `findBlockingBookings(bookings, holds, todayKey)`
  - `seedBusinessTypeDraft(liveStore, vertical)` (applies D5)
  - `summarizeReplacement(liveStore)` (counts for the dialogs)
- `AdminTab` gains `"business-type"`. `lib/dashboard-routes.ts` maps it to `/dashboard/business-type` with `group: "hidden"`, so it is routable but not in the sidebar. The page title is "Change business type".

### 4. Copy

All new copy is en/es in `components/provider/dashboard-copy.ts`: card, picker dialog, warning, blocked state, banner, confirmation and success. Vertical names come from the existing landing translations.

### 5. Testing

- **Unit:**
  - `findBlockingBookings`: cancelled ignored, today counts, provider time zone boundary, expired holds ignored
  - `seedBusinessTypeDraft`: each D5 field kept, services, availability and limit cleared
  - `summarizeReplacement`
  - route mapping for `business-type`
  - API route: success, each refusal code, normalization, profile update after the swap
- **Markup:** Business type card, the dialog's warning and blocked states, the banner and Cancel change.
- **Database** (`npm run test:db`): the function swaps atomically, refuses with upcoming bookings or holds, refuses the same vertical, refuses another owner's provider, keeps past bookings with null `service_id`, and records the redirect row.
- **E2E:**
  - blocked by an upcoming booking
  - abandoning the draft leaves the live page and old link unchanged
  - a full switch: new vertical path serves the page, the old path redirects, and services are the new starter set

## Non-goals

- Converting services between types.
- Emailing clients (no cancellation email exists; blocking avoids the need).
- Keeping service-level deep links from the old type.
- Switching from super admin on a provider's behalf.
- Multiple pages per account.
