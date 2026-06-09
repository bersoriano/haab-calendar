# Vertical Onboarding (Phase 1) — Design

**Date:** 2026-06-08
**Status:** Approved (design), pending implementation plan
**Scope:** First-run provider onboarding. Add an industry/vertical picker that seeds an optimized configuration. **Phase 1 only** — terminology swapping is explicitly deferred to a separate spec (Phase 2).

## Goal

When a provider logs in for the first time, present a welcome screen offering four industry verticals — **Healthcare**, **Spaces**, **Professional services**, and **Events**. Selecting one loads a predefined configuration (services + weekly availability + form hint text) optimized for that industry, so the provider starts from a working setup instead of building services by hand.

## Decisions (from brainstorming)

- **Phase 1 = vertical picker + seeded services + seeded availability + form hint text.** Terminology swapping ("client"→"patient"→"guest") is **Phase 2**, its own spec.
- The vertical preset **seeds services and availability**; the manual Services step is **removed** from the wizard.
- The picker is a **distinct full-screen welcome**, shown before the wizard.
- **First-run only. Exactly 4 verticals.** No "start from scratch" option, no later re-pick from Settings.
- Seeded services appear as a **read-only review on the Done step**.
- Seed content uses the **default content defined below** (editable later in the Services tab / `config/verticals.ts`).

## Architecture

### Data model

New file `config/verticals.ts` — pure data, the customization seam (consistent with the parent/template-repo direction; child projects swap this file):

```ts
export type VerticalId = "healthcare" | "spaces" | "professional" | "events";

export interface VerticalHints {
  serviceName: string;
  description: string;
  capacity: string;
  cost: string;
}

export interface Vertical {
  id: VerticalId;
  label: string;        // "Healthcare"
  tagline: string;      // "For doctors and medical specialists"
  description: string;  // one supporting sentence
  services: ServiceDraft[];          // seeded services (2 each)
  availability: WeeklyAvailability;  // vertical-appropriate weekly hours
  hints: VerticalHints;              // ServiceEditor placeholder text
}

export const VERTICALS: Vertical[]; // exactly 4
```

`lib/types.ts`: `ModuleStore` gains an optional `vertical?: VerticalId`. Persisted in localStorage; round-tripped by `normalizeStore`. (Also the anchor for Phase 2 terminology.)

`lib/store.ts`:
- `createEmptyStore()` returns `vertical: undefined`.
- `normalizeStore` / a new `normalizeVertical` validates the stored id against known ids (unknown → `undefined`).
- New helper `materializeVerticalServices(drafts: ServiceDraft[]): Service[]` — assigns `createId()`, and drops `durationMinutes` for `full-day` (mirrors existing `upsertService` / `normalizeServices` rules).
- New helper `applyVerticalToStore(store, vertical): ModuleStore` — returns a copy with `vertical`, seeded `services`, and seeded `availability`; leaves `provider`, `bookings`, `bookingHolds`, `setupComplete` untouched.

### Flow

Gate (unchanged): the onboarding surface renders only when `!integratedMode && !setupComplete` (`isSetupOpen`).

1. **Welcome screen** — rendered while `isSetupOpen && !store.vertical`. A distinct full-width layout (not the wizard chrome): short heading + four large selectable cards (label, tagline, description). No skip, no blank option.
2. On card click → `applyVertical(id)`: updates the standalone store via `applyVerticalToStore`, persists, and (because `store.vertical` is now set) the wizard renders next.
3. **Wizard** — now **3 steps**: `Provider` → `Availability` → `Done`. The manual Services step is removed.
4. **Done** — read-only summary of the seeded services (name, type, duration, capacity/cost) + the existing publish actions (`completeSetup("management" | "public")`).

### Wizard changes

- `SetupStep` type: `1 | 2 | 3` mapping to Provider / Availability / Done (was 1–4 incl. Services).
- Step progress indicator: three cards `["Provider", "Availability", "Done"]`.
- `validateSetup`: step 1 validates provider (name/business/email) as today; step 2 validates availability (≥1 enabled day, valid windows) as today; the old service-count gate is removed (presets guarantee ≥1 service).
- `goToNextSetupStep` / Back/Continue bounds updated for 3 steps.

### ServiceEditor hints

`ServiceEditor` gains an optional `hints?: VerticalHints` prop supplying input placeholders (serviceName, description, capacity, cost). The Services tab passes hints derived from `store.vertical` (`VERTICALS.find(v => v.id === store.vertical)?.hints`), falling back to the current generic placeholders when absent. No behavior change when `hints` is omitted.

### Components

- `components/provider/VerticalPicker.tsx` — presentational; props `{ verticals: Vertical[]; onSelect: (id: VerticalId) => void }`. Renders the 3 cards.
- `applyVertical(id)` handler in the monolith — calls `applyVerticalToStore` through the store actions and persists.
- `renderWelcome()` in the monolith (or a thin wrapper rendering `VerticalPicker`).
- Updates to `renderSetupWizard()` (3 steps) and the Done step (services review).

## Seed content (defaults)

**Healthcare** — tagline "For doctors and medical specialists". Availability Mon–Fri 09:00–17:00 (weekends off).
- New patient consultation — appointment, 30 min, capacity "1 patient", cost "$120".
- Follow-up visit — appointment, 15 min, capacity "1 patient", cost "$60".
- Hints: serviceName "Annual check-up", description "What this visit covers.", capacity "1 patient", cost "$120 / visit".

**Spaces** — tagline "For courts, venues, and shared offices". Availability Mon–Sun 08:00–22:00 (open weekends, longer hours).
- Court / space rental — appointment, 60 min, capacity "Up to 4 people", cost "$40 / hour".
- Full-day venue — full-day, capacity "Up to 100 guests", cost "Full-day package".
- Hints: serviceName "Court rental", description "What the booking includes.", capacity "Up to 4 people", cost "$40 / hour".

**Professional services** — tagline "For advisors, accountants, and consultants". Availability Mon–Fri 09:00–18:00.
- Strategy session — appointment, 60 min, capacity "1 client", cost "$200".
- Quick consult — appointment, 30 min, capacity "1 client", cost "$90".
- Hints: serviceName "Strategy session", description "What this session covers.", capacity "1 client", cost "$200 / session".

**Events** — tagline "For workshops, classes, and gatherings". Availability Wed–Sun 10:00–20:00 (events skew later and toward weekends).
- General admission — appointment, 120 min, capacity "Up to 50 attendees", cost "$25 / ticket".
- Full-day pass — full-day, capacity "Up to 200 attendees", cost "Full-day pass".
- Hints: serviceName "Workshop session", description "What attendees can expect.", capacity "Up to 50 attendees", cost "$25 / ticket".

## Back-compat & edges

- Existing stores with `setupComplete=true` (e.g. seeded "Demo Clinic") never enter onboarding — unaffected; `vertical` stays `undefined` and the Services tab uses generic hints.
- Integrated/host mode (`integratedMode`) never shows onboarding.
- "Reset standalone setup" clears the store (`setupComplete=false`, `vertical=undefined`) → the welcome screen reappears. This is the only re-entry, consistent with first-run-only.
- The existing `QUICK_START_TEMPLATES` (used as quick-add buttons in `ServiceEditor`) stays as-is for ad-hoc additions; verticals are a separate, richer concept.

## Out of scope (Phase 2+)

- Terminology swapping across provider + public UI (own spec).
- Re-picking or switching vertical after first run.
- A "start from scratch" / blank onboarding path.
- Backend/Supabase persistence of the vertical beyond the existing localStorage store.

## Testing

- Unit/characterization (Vitest): `materializeVerticalServices` (ids assigned; full-day drops `durationMinutes`; appointment keeps it); `applyVerticalToStore` (seeds services+availability+vertical, preserves provider/bookings/setupComplete); `normalizeStore` vertical round-trip + unknown-id rejection.
- Keep the existing 118 tests green.
- Functional smoke (live): fresh first-run → welcome → pick each vertical → seeded services + availability present → Provider → Availability → Done shows service review → publish → Services tab shows seeded services with vertical hints.

## Success criteria

- First login with no vertical shows the 4-card welcome; selecting one seeds services + availability and enters a 3-step wizard.
- The manual Services step no longer exists in the wizard; Done shows seeded services read-only.
- Services-tab form placeholders reflect the chosen vertical.
- `npm test` green, `tsc --noEmit` + `eslint` clean.
- Existing `setupComplete` providers and integrated mode are visually unchanged.
