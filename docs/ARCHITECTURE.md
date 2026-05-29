# Core Architecture

**Status:** current as of 2026-05-29. Documents how the codebase is organized after the monolith decomposition (Phases 0/1/3/4).

**Scope:** code/module organization and the reuse seams. For *behavior* (data model, booking lifecycle, availability rules, hold mechanism, concurrency, invariants) see `SYSTEM_REFERENCE.md`. For the decomposition roadmap and what's deferred see `docs/superpowers/plans/2026-05-29-monolith-decomposition-plan.md`.

---

## 1. Why it's organized this way

This repo is the **parent/base** for future child projects. Children customize but must keep receiving upstream updates from this repo. The enabling rule: **core stays untouched by children; customization happens only through defined seams** (config injection, theming, and — later — component slots and feature flags). Decomposition exists to make that possible: reusable pieces must be importable independently, not welded into one component.

The engine started as a single ~5,218-line client component. It has been split into layers so that:
- pure logic is testable and importable piece-by-piece,
- presentation is reusable and themable,
- persistence is isolated behind one swappable seam,
- a child can depend on the parts it needs without dragging in the rest.

---

## 2. Layered layout

```
lib/                              # pure, framework-agnostic — NO React
  types.ts                        # all domain types (ModuleStore, Service, BookingRecord, …)
  constants.ts                    # WEEKDAY_KEYS/LABELS, DURATION_OPTIONS, Intl formatters,
                                  #   BOOKING_HOLD_DURATION_MS, DEFAULT_STORAGE_KEY
  utils.ts                        # cn, createId, currentTimestamp, pad, slugify
  date.ts                         # date math, week/month windows, dateKey helpers
  format.ts                       # time/date/duration labels, status & type tones
  store.ts                        # createEmptyStore, normalize*, pruneBookingHolds, sortBookings
  availability.ts                 # getAvailableSlots, isDateAvailable, overlapExists, *ForDate
  holds.ts                        # getBookingHoldSelectionKey
  ics.ts                          # buildIcsContent, escapeIcsText
  booking-tokens.ts               # manage-token gen, lookup, URL builder, backfill
  __tests__/                      # Vitest characterization tests (118) for the above

config/
  templates.ts                    # QUICK_START_TEMPLATES — per-child seed data

components/
  ui/                             # presentational primitives (props-only, themable via CSS vars)
    buttonClasses.ts, ActionButton, ActionLink, ToneBadge, SectionTitle,
    SummaryField, SummaryStatusTitle, PublicProgressIndicator,
    BookingHoldCountdownBar, EmptyState, index.ts (barrel)
  booking/
    state/
      useModuleStore.ts           # persistence seam: hydrate/persist/multi-tab sync,
                                  #   activeStore derivation, commit actions, integratedMode
  haab-booking-module.tsx         # orchestrator + remaining feature render/state (~4,232 lines)

app/                              # Next.js routes (thin — just mount the module with props)
  page.tsx                        # adaptive surface (admin + public)
  public/[slug]/page.tsx          # public-only booking flow
  public/[slug]/manage/[token]/page.tsx  # manage existing booking via token
```

**Dependency direction:** `lib` → `lib` only (never imports React or `components`). `config` → `lib/types`. `components/ui` → `lib`. `components/booking` → `lib`. The monolith → everything below it. Routes → the monolith. This acyclic shape is what makes pieces independently importable.

---

## 3. The seams (how children customize without forking)

| Seam | Mechanism | Use |
|------|-----------|-----|
| **Data injection** | `injectedConfig` prop (+ `integratedMode`) | A host/child feeds its own provider/services/availability/bookings instead of the local store. |
| **Persistence** | `useModuleStore` hook + `storageKey` + `onStoreChange`/`onBookingsChange` | Swap localStorage for Supabase/another backend at one point; callbacks bubble changes to a host. |
| **Theming** | CSS variables (`--primary`, `--ink`, `--accent`, `--surface-soft`, `--line`, …) | Rebrand without touching component logic. |
| **Composition** | `surfaceMode` (`adaptive` / `public-only`) + `initialSurface` | Mount only the public booking surface, or the full admin+public app. |
| **Routing** | `requestedPublicSlug`, `manageBookingToken` props | Host owns routes and passes context in. |
| **Seed data** | `config/templates.ts` | Replace/extend the quick-start service templates per child. |

Planned seams (Phase 5/6, not yet built): component **slot/override** props on the public components, and **feature flags**. See the decomposition plan.

---

## 4. Persistence seam detail (`useModuleStore`)

`useModuleStore({ injectedConfig, storageKey, onStoreChange, onBookingsChange })` owns all data state and returns `{ integratedMode, hydrated, store, actions }`. `actions` exposes `commitBookings`, `commitBookingHolds`, `releaseBookingHold`, `updateStandaloneStore`, `setStandaloneStore`, `readStandaloneStoreSnapshot`, `persistStandaloneStore`. The component's handlers call these; they never touch storage directly.

This is the **single intended swap point for the Supabase migration** (`BACKEND_RECOMMENDATIONS.md`): replace the hook's internals (localStorage read/write/sync) with a network-backed, offline-first sync layer while keeping the same `{ store, actions }` contract. The offline-first invariant holds — the local store stays the read path; see `SYSTEM_REFERENCE.md` §8–§10.

Two persistence modes both flow through the hook:
- **standalone** (default; all three live routes) — store in `localStorage[storageKey]`, multi-tab sync via the `storage` event.
- **integrated** (`injectedConfig` present) — store comes from config + `shadowBookings`/`shadowBookingHolds`; changes emit via callbacks; no localStorage writes. Currently dormant (no route triggers it) but preserved for embedding/child reuse — **keep it intact**.

---

## 5. Testing

`npm run test` (Vitest). 118 characterization tests under `lib/__tests__/` lock the behavior of the pure logic (`date`, `store`, `availability`, `ics`, `format`). They assert *current* behavior, not idealized correctness — treat a failure as "you changed behavior," then decide if that was intended.

**Coverage gap:** React state/render flows (booking wizard, admin surfaces, modals) are **not** unit-tested. Verify those with a build + a live functional smoke on `/public/<slug>` (book → confirm → reschedule → cancel → hold expiry) and the admin route. `npm run build` + `npm run lint` are the other gates.

---

## 6. Current state & what's next

**Done (merged):** Phases 0/1/3/4 — `lib`/`config`/`components/ui` extraction, the `useModuleStore` hook, and the test net. Monolith 5,218 → 4,232 lines, behavior-preserving.

**Deferred (Phase 5/6):** carving the remaining feature code out of `components/haab-booking-module.tsx` — the public booking flow (`renderPublicFlow` ~1,000 lines), admin surfaces, setup wizard, and modals — into feature components + headless hooks, then reducing the module to a thin orchestrator with a documented public API barrel. Rationale for deferral: high effort/risk, low marginal value toward the reuse goal (already met by the foundation), and best done incrementally during future feature work. Do each sub-step with its own reviewed step-plan + functional smoke.

---

## 7. Related docs

- `SYSTEM_REFERENCE.md` — engine behavior, data model, rules, invariants (the ground truth for *what it does*).
- `docs/superpowers/plans/2026-05-29-monolith-decomposition-plan.md` — full phased roadmap.
- `BACKEND_RECOMMENDATIONS.md` — Supabase migration target (slots into the `useModuleStore` seam).
- `TESTING_RECOMMENDATIONS.md` — testing strategy background.
- `liquid-glass-style-guide.md` / `UX_RECOMMENDATIONS.md` — visual/UX guidance.
