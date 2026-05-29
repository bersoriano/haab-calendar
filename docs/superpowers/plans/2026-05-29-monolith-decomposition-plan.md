# Monolith Decomposition Plan — `components/haab-booking-module.tsx`

> **Altitude:** This is a phased refactoring roadmap, not line-level code steps. No code is written here. When a phase is executed, it gets its own detailed task plan (via the writing-plans skill). Each phase is **behavior-preserving** — same UX, same public props — until the explicitly-marked phases that change the public surface.

## Goal

Turn the 5582-line single-component file into layered, independently-importable modules behind a documented public API, so that downstream "child" projects can reuse pieces and customize through defined seams instead of forking. **Distribution model (package vs monorepo vs template) is deliberately deferred to the final phase** — internal decomposition is valuable and required regardless of which transport is chosen later.

## Non-negotiable principles

1. **Behavior-preserving.** No UX, styling, or prop-contract changes ride along with a move. Refactor and feature-change never share a commit.
2. **Safety net before surgery.** No test framework exists today. Pure logic gets characterization tests *first*; everything else is gated by `build` + `lint` + a manual visual smoke of all three surfaces.
3. **Lowest-risk first.** Zero-React pure logic and presentational atoms move before any stateful code.
4. **Stable public API until the end.** The `HaabBookingModule` props contract stays identical for its three importers (`app/page.tsx`, `app/public/[slug]/page.tsx`, `app/public/[slug]/manage/[token]/page.tsx`) until Phase 6 deliberately formalizes the barrel.
5. **One concern per checkpoint.** Each phase (and each feature inside Phase 5) ends in its own commit with green build + lint + smoke.
6. **Reversible.** Every phase is a pure move + re-import; revert = one `git revert`.

## Current importers (the contract to protect)

| Route | Props passed | Surface |
|---|---|---|
| `app/page.tsx` | standalone defaults | adaptive admin + setup |
| `app/public/[slug]/page.tsx` | `requestedPublicSlug`, `surfaceMode="public-only"` | public booking |
| `app/public/[slug]/manage/[token]/page.tsx` | `manageBookingToken`, slug | public manage |

These three must keep working unchanged through Phases 0–5.

## Target module layout

```
lib/                          # pure, framework-agnostic — NO React
  types.ts                    # all domain types (Layer 1)
  constants.ts                # WEEKDAY_KEYS/LABELS, DURATION_OPTIONS, formatters, hold ms, storage key
  date.ts                     # toMinutes, addMinutes, getDateKey, windows, clamp, compare
  format.ts                   # date/time/countdown labels, duration, capacity, tone helpers
  store.ts                    # createEmptyStore, normalize*, prune
  availability.ts             # getAvailableSlots, isDateAvailable, overlapExists, *ForDate
  holds.ts                    # getBookingHoldSelectionKey, hold math
  ics.ts                      # buildIcsContent, escapeIcsText
  tokens.ts                   # (existing booking-tokens.ts)
config/
  templates.ts                # QUICK_START_TEMPLATES (per-child customizable data)
components/
  ui/                         # presentational primitives (Layer 4), props-only
    ActionButton, ActionLink, ToneBadge, SectionTitle, SummaryField,
    SummaryStatusTitle, PublicProgressIndicator, BookingHoldCountdownBar, EmptyState
  booking/
    state/                    # persistence + store access (the sync/Supabase seam)
    hooks/                    # headless state machines: useBookingFlow, useBookingHolds,
                              #   useSetupWizard, useServiceEditor
    public/                   # PublicBookingFlow, PublicCalendar, SlotList, BookingSummary,
                              #   CancellationModal, RescheduleModal
    admin/                    # Dashboard, BookingsList, AdminCalendar, Services, Settings, SetupWizard
    HaabBookingModule.tsx     # thin orchestrator (composition shell)
    index.ts                  # barrel = the documented public API children depend on
```

---

## Phase 0 — Safety net + baseline

**Goal:** make refactoring safe without a test culture.

**Moves:**
- Add a lightweight test runner (e.g. Vitest — fits Next/TS, fast). No app behavior touched.
- Write **characterization tests** for the pure logic that will move in Phase 1: `getAvailableSlots`, `isDateAvailable`, `overlapExists`, `normalizeStore/Services/Bookings/Availability`, `pruneBookingHolds`, `buildIcsContent`, the date math, the formatters. Tests assert *current* output — they lock behavior, not correctness.
- Record a baseline: `npm run build` output + a written visual smoke checklist for the 3 surfaces (setup wizard, adaptive admin tabs, public flow incl. holds/NL/confirm/manage).

**Risk:** very low (adds files only).
**Verification:** new tests pass; build/lint unchanged.
**Checkpoint:** commit `test: characterization net for booking domain logic`.

## Phase 1 — Extract pure domain logic (Layer 3) → `lib/*`

**Goal:** liberate the ~590 lines of reusable, zero-React logic — the single biggest reduction.

**Moves:** move date math → `lib/date.ts`; formatters + tone/duration/capacity → `lib/format.ts`; store factories/normalizers/prune → `lib/store.ts`; availability engine → `lib/availability.ts`; hold key/math → `lib/holds.ts`; ICS → `lib/ics.ts`. Re-import all into the monolith. Point Phase 0 tests at the new modules.

**Risk:** low — mechanical move + import; tests guard it.
**Verification:** characterization tests green against `lib/*`; build + lint + visual smoke.
**Checkpoint:** commit per module or one `refactor: extract booking domain logic to lib`.

## Phase 2 — Extract types (Layer 1) + config data (Layer 2)

**Moves:** all domain types → `lib/types.ts`; `WEEKDAY_KEYS/LABELS`, `DURATION_OPTIONS`, formatters, `BOOKING_HOLD_DURATION_MS`, `DEFAULT_STORAGE_KEY` → `lib/constants.ts`; `QUICK_START_TEMPLATES` → `config/templates.ts` (flagged as a per-child customization point). Update imports across `lib/`, monolith, and `lib/booking-tokens.ts`.

**Risk:** trivial (types + data, no logic).
**Verification:** build + lint.
**Checkpoint:** commit `refactor: centralize types and config data`.

## Phase 3 — Extract UI primitives (Layer 4) → `components/ui/*`

**Moves:** `buttonClasses`, `ActionButton`, `ActionLink`, `ToneBadge`, `SectionTitle`, `SummaryField`, `SummaryStatusTitle`, `PublicProgressIndicator`, `BookingHoldCountdownBar`, `EmptyState` → individual files under `components/ui/`. Props-only; CSS-var theming preserved.

**Risk:** low — pure presentational, no state.
**Verification:** visual smoke (these render everywhere) + build + lint.
**Checkpoint:** commit `refactor: extract shared UI primitives`.

## Phase 4 — Extract persistence / state seam → `components/booking/state`

**Goal:** isolate the storage + sync layer — the exact point where Supabase later swaps in.

**Moves:** `emitStoreChange`, `updateStandaloneStore`, `readStandaloneStoreSnapshot`, `persistStandaloneStore`, `commitBookings`, `commitBookingHolds`, `releaseBookingHold`, plus the hydrate/persist/storage-sync effects → a `useModuleStore` hook exposing `{ store, actions }`. Monolith consumes the hook instead of inline state.

**Risk:** medium — touches core state flow; covered by visual smoke + the (now-extracted) logic tests.
**Verification:** full smoke of create/cancel/reschedule/hold across surfaces; build + lint.
**Checkpoint:** commit `refactor: isolate store persistence behind useModuleStore`.

## Phase 5 — Carve features into components + headless hooks (one per checkpoint)

Each sub-step: move a `render*` function into a real component that takes props/hook output; the monolith calls the component. Behavior identical.

- **5a — Public booking** (highest value for children): `renderPublicCalendar` → `PublicCalendar`; `renderPublicFlow` (~1000 lines) sub-split into `PublicBookingFlow` + `SlotList` + `BookingSummary`; booking-flow state + NL parsing + confirm → `useBookingFlow`; hold ticker/lifecycle → `useBookingHolds`.
- **5b — Modals:** `renderCancellationModal` → `CancellationModal`; `renderRescheduleModal` → `RescheduleModal`.
- **5c — Setup wizard:** `renderSetupWizard` + provider/availability handlers → `SetupWizard` + `useSetupWizard`.
- **5d — Service editor:** service CRUD handlers + `renderServices` → `Services` + `useServiceEditor`.
- **5e — Admin surfaces:** `renderDashboard`, `renderBookingsList`, `renderAdminCalendar`, `renderSettings` → individual components; search/filter local state co-located.

**Risk:** medium-high — do strictly one sub-step per commit; smoke the touched surface each time. 5a is the largest; budget extra care for the `renderPublicFlow` sub-split.
**Verification:** per sub-step visual smoke of that surface + build + lint.
**Checkpoint:** one commit per sub-step (`refactor: extract public booking flow`, etc.).

## Phase 6 — Thin orchestrator + public API barrel

**Goal:** turn `HaabBookingModule` into a composition shell and publish a real contract.

**Moves:** `HaabBookingModule.tsx` wires `useModuleStore` + feature hooks and branches by `surfaceMode`/`setupComplete` — no business logic left inline. `components/booking/index.ts` exports the documented public surface: `HaabBookingModule` (unchanged props) plus the deliberately-public sub-components (`PublicBookingFlow`, `PublicCalendar`, …) and `lib` re-exports. Update the 3 app importers to the barrel.

**Risk:** medium — final wiring; props contract must still match the 3 importers.
**Verification:** full smoke of all 3 routes; build + lint; confirm props unchanged.
**Checkpoint:** commit `refactor: thin orchestrator + public API barrel`.

## Phase 7 — Decision gate: distribution + customization contract (DEFERRED — own brainstorm/plan)

Not started until Phases 0–6 land. Decide and formalize:

1. **Transport** — versioned package vs monorepo vs template+upstream. Inputs needed: child divergence (config-only vs deep), ownership (one team vs many), deploy independence.
2. **Customization contract** — formal config schema (validated `InjectedConfig`), documented theme-token palette (the CSS vars), slot/override props on the public components, feature flags. This is what makes children customizable without editing core.
3. **Release discipline** — semver, changelog, upgrade/codemod playbook, one "reference child" kept current.

This phase gets its own design pass; it is out of scope for the decomposition itself.

---

## Sequencing rationale

Pure logic and atoms (Phases 1–3) carry near-zero risk and remove ~1000 lines, shrinking the surface before any risky state work. Persistence (4) is isolated next because every feature depends on it. Features (5) come after their dependencies exist, one at a time. Orchestration + API (6) is last so the contract is defined against finished parts. Distribution (7) is deferred because it's a separate decision that the decomposition makes *possible* but doesn't *require*.

## What stays stable throughout

- The three route importers and the `HaabBookingModule` props — until Phase 6, and even then the props stay identical (only the import path may change).
- All UX/visual behavior — guaranteed by the visual smoke checklist + the recently-hardened mobile flow.
- CSS-var theming approach — preserved, later formalized as the theme contract in Phase 7.

## Coordination note

The repo is under active development (mobile rework + manage-booking just landed). Sequence this refactor when no large feature is mid-flight, or land it phase-by-phase between feature work to keep merge conflicts small.
