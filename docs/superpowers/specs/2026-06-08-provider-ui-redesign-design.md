# Provider UI/UX Redesign — Design

**Date:** 2026-06-08
**Status:** Approved (design), pending implementation plan
**Scope:** Everything provider-side — outer shell (`app/page.tsx`), management workspace, and the first-run setup wizard. The client-facing public booking flow is out of scope except where it is *linked to* from the provider UI.

## Goal

Make the provider experience simpler and better organized. Today the provider surfaces are cluttered with repeated information, two stacked headers, internal/developer concepts leaking into the UI, verbose helper copy, and duplicated Services/Availability editors that exist in both the wizard and the workspace.

## Problems (current state)

1. **Public booking URL shown three times** — module header card, Dashboard card, Settings card.
2. **Two stacked headers** — `app/page.tsx` renders an account bar (email + Sign out); the module renders a second header with 3 badges, the business name, a descriptive paragraph, a surface toggle, and a URL card.
3. **Dev/internal concepts leak into the provider UI** — "Reusable module", "Standalone mode" badges; "Integrated mode keeps this list visible while preventing internal edits"; "Keep the module reusable by describing what is booked…"; the "Provider workspace / Public booking flow" surface toggle.
4. **Duplication** — the Services editor (list + form + quick templates) and the Weekly availability editor exist as separate markup in *both* the setup wizard and the workspace tabs, with divergent copy. They drift.
5. **Verbose helper paragraphs** under nearly every section title.
6. **Dashboard and Bookings overlap** — both surface upcoming bookings.

## Decisions

- **Architecture:** Workspace is canonical. The wizard is a thin first-run wrapper that reuses the same editor components as the workspace.
- **Dev concepts:** Hidden from the provider UI. Code paths remain (e.g. integrated mode, the public surface route); they are simply not surfaced as provider chrome.
- **Tabs:** Keep the five tabs (Dashboard, Bookings, Calendar, Services, Settings) but give each a single clear job.
- **Visual language:** No new design language. Follow `liquid-glass-style-guide.md`; reduce density only (fewer nested cards, consistent spacing, trimmed copy).

## Design

### 1. Single header

`app/page.tsx` stops rendering its own account bar. It performs the auth check and passes `userEmail` and the `logout` server action into `HaabBookingModule` as props. The module renders **one** header:

- **Left:** business name (falls back to full name, then "Booking workspace"); below it the muted public slug (e.g. `/public/demo`) with an inline ghost **Copy link** button.
- **Right:** account email (muted, small) + **Sign out** (a `<form action={logout}>`).
- **Below:** the tab navigation, full width.

**Removed from the header:** the 3 badges, the descriptive paragraph, the surface toggle, and the standalone URL card. The public URL appears in exactly one prominent place (the header).

`HaabBookingModule` gains two optional props: `userEmail?: string` and `onSignOut?: () => void | Promise<void>` (a server action). When absent (e.g. embedded/integrated host usage), the header simply omits the account row — no behavior change for hosts.

### 2. Hide dev/internal concepts

Remove from provider-facing rendering:
- "Reusable module" / "Standalone mode" / "Configured by parent app" badges.
- The "Provider workspace / Public booking flow" surface toggle.
- Integrated-mode helper sentences and "keep the module reusable…" copy.

Provider previews the public page via a **View public page** link that opens `/public/[slug]` (the real client experience) in a new tab — replacing the in-app preview toggle. The `surface`/`surfaceMode` state and the public render path remain in code for host/integrated usage and the dedicated `/public/[slug]` route; they are no longer exposed as provider chrome.

### 3. Shared editor components

Extract three presentational editor components, each with a clear interface, consumed by **both** the wizard and the workspace. Single source of copy and behavior.

| Component | Responsibility | Used by |
|---|---|---|
| `components/provider/ProviderInfoForm.tsx` | Full name, business name, confirmation email fields | Wizard step 1, Settings |
| `components/provider/ServiceEditor.tsx` | Services list + add/edit form + quick-start template buttons | Wizard step 2, Services tab |
| `components/provider/AvailabilityEditor.tsx` | Weekly day rows (enable + start/end times) | Wizard step 3, Settings |

Each is a controlled component: it receives current values and change/action callbacks from the monolith's existing state/handlers (`updateProvider`, `serviceDraft`/`upsertService`/`removeService`/`beginEditingService`/`appendQuickTemplate`, `availability`/`updateAvailabilityDay`). No new state ownership — the components render UI and call back. This keeps the offline-first store as the single source of truth and avoids touching `useModuleStore`.

These extractions also reduce the 4324-line `haab-booking-module.tsx`, consistent with the in-progress monolith decomposition.

### 4. Setup wizard (first-run only)

The wizard renders only when `!integratedMode && !setupComplete` (unchanged trigger). It keeps the 4-step progress indicator (Provider / Services / Availability / Done) but:
- Each step body is trimmed to one short line.
- Steps 1–3 render the shared editor components instead of bespoke markup.
- Step 4 (Done) keeps the single public-URL display + launch actions, decluttered.

### 5. Tab roles (dedupe)

- **Dashboard** — at-a-glance only: the stat strip + the next upcoming bookings + **View public page** / **Copy link** actions. The separate "Share public booking page" card is removed (redundant with Copy link).
- **Bookings** — the full list with search/filter and cancel/reschedule (existing behavior, restyled).
- **Calendar** — monthly calendar (restyled only).
- **Services** — `ServiceEditor`.
- **Settings** — `ProviderInfoForm` + `AvailabilityEditor` + Reset standalone setup. The Settings URL card is removed; since the slug derives from the business name, the resulting public link is shown as a single muted read-only line (no second Copy button).

### 6. Copy and density

- Trim every `SectionTitle` body to one short, provider-friendly line (or remove where the title is self-explanatory).
- Replace developer-flavored strings with plain provider language.
- Reduce nested-card depth; apply consistent spacing per the style guide.

## Out of scope

- Client-facing public booking flow visuals (only the *link* to it is added).
- Backend/Supabase sync changes.
- `useModuleStore` / persistence changes.
- Any change to integrated/host (`surfaceMode="public-only"` or injected-config) behavior beyond the header omitting the account row when props are absent.

## Risks & mitigations

- **Regression in the large monolith.** Mitigation: extract editors as pure controlled components wired to the *existing* handlers; verify each screen live (before/after) and keep the 118-test suite green.
- **Removing the surface toggle hides public preview.** Mitigation: the **View public page** link to `/public/[slug]` provides the real preview.
- **Host/integrated usage.** Mitigation: new header props are optional; integrated render path and `surface` state remain.

## Success criteria

- Public URL appears once (prominent) in the workspace, not three times.
- One header, no badges/toggle/marketing paragraph in the provider UI.
- Services and Availability are each defined by a single shared component used by both wizard and workspace.
- Wizard and workspace copy are identical for shared editors.
- `npm test` (118 tests) green; `tsc --noEmit` and `eslint` clean.
- Each provider screen visually verified before/after in the running app.
