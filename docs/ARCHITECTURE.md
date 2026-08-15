# Core Architecture

**Status:** current as of 2026-08-04. Documents the main code organization and reuse seams.

**Scope:** code/module organization and reuse seams. For the current public lifecycle, server boundaries, hold behavior, and failure states, see `docs/booking-process.md`. `SYSTEM_REFERENCE.md` contains deeper engine and local-mode details.

---

## 1. Why it's organized this way

This repo is the **parent/base** for future child projects. Children customize but must keep receiving upstream updates from this repo. The enabling rule: **core stays untouched by children; customization happens only through defined seams** (config injection, theming, and — later — component slots and feature flags). Decomposition exists to make that possible: reusable pieces must be importable independently, not welded into one component.

The engine started as a single large client component. It has been split into layers so that:
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
  holds.ts                        # hold selection, countdown, warning, and expiry helpers
  booking-flow-machine.ts         # public-flow step reducer (service → date/time → details →
                                  #   confirmed) + reachable-step guards
  ics.ts                          # buildIcsContent, escapeIcsText
  booking-tokens.ts               # manage-token gen, lookup, URL builder, backfill
  __tests__/                      # Vitest characterization tests for the above

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
  haab-booking-module.tsx         # orchestrator + remaining feature render/state

app/                              # Next.js routes (thin — just mount the module with props)
  page.tsx                        # adaptive surface (admin + public)
  public/[slug]/page.tsx          # public-only booking flow
  public/[slug]/manage/[token]/page.tsx  # manage existing booking via token
  api/public/[verticalSegment]/[providerSlug]/
    holds/route.ts                # create, refresh, extend, and release public holds
    bookings/route.ts             # server-authoritative confirmation
    manage/[token]/route.ts       # public self-service lookup/reschedule/cancel
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
| **Entitlements** | `lib/entitlements/catalog.ts` + `resolveEntitlements` | Add or re-map paid features per child by editing the catalog; gates read the resolved snapshot rather than a plan string. |

Planned seams (Phase 5/6, not yet built): component **slot/override** props on the public components, and **feature flags**. See the decomposition plan.

---

## 4. Persistence seam detail (`useModuleStore`)

`useModuleStore({ injectedConfig, storageKey, onStoreChange, onBookingsChange })` owns all data state and returns `{ integratedMode, hydrated, store, actions }`. `actions` exposes `commitBookings`, `commitBookingHolds`, `releaseBookingHold`, `updateStandaloneStore`, `setStandaloneStore`, `readStandaloneStoreSnapshot`, `persistStandaloneStore`. The component's handlers call these; they never touch storage directly.

The hook remains the persistence boundary for standalone/demo state and the integrated module's in-memory shadow state. Canonical public routes now use Supabase-backed Route Handlers for booking-critical writes; they do not replace the standalone localStorage path.

Two persistence modes both flow through the hook:
- **standalone** — store in `localStorage[storageKey]`, with multi-tab sync through the `storage` event.
- **integrated** (`injectedConfig` present) — initial public data comes from the route resolver, while public holds/bookings/manage mutations are accepted by server Route Handlers and mirrored into `shadowBookings`/`shadowBookingHolds` after success. Canonical hierarchical public routes use this mode.

---

## 4b. Entitlements

What a provider may use is resolved, not stored as a flag on the session.

```
lib/entitlements/
  catalog.ts            # FEATURE_KEYS, plan tiers, plan → feature map, labels
  resolve.ts            # resolveEntitlements() — pure, clock injected
  server.ts             # server-only reads and the two audited mutations
  override-request.ts   # request payloads for the super-admin UI
```

- **Plan first, override second.** `resolveEntitlements({ providerId, planTier, overrides, now })`
  starts from the plan's features and lets an *active* override win in either
  direction. An override with a null expiry is permanent; a past expiry is not a
  decision, so the plan answers again. An unparseable expiry fails closed, and a
  persisted key no longer in the catalog is ignored.
- **Pure and testable.** The resolver takes its clock as an argument, so the
  expiry boundary is asserted rather than left to when the suite runs.
- **Never cached into a token.** Overrides change out of band; entitlements are
  resolved per request. Putting them in a JWT or `user_metadata` would keep
  granting access after a revoke, and would place the decision in state the user
  partly controls.
- **Mutations are super-admin only and audited.** `setProviderFeatureOverride` /
  `clearProviderFeatureOverride` call `requireSuperAdmin()` first and record its
  verified user as the actor. Each calls an RPC that writes the state change and
  its audit row in one statement. Providers hold no grant on either table.
- **Gates consume the snapshot.** `canUseCustomProviderSlug` accepts a resolved
  snapshot (preferred) or a bare plan tier for callers that have no snapshot.

Adding a feature: add the key to `FEATURE_KEYS`, map it in `PLAN_FEATURES`, give
it a label, and read it through `hasEntitlement` / `requireEntitlement` at the
gate. No migration is needed — override rows are keyed by text.

---

## 5. Testing

`npm run test` runs Vitest coverage across pure booking logic and selected render-level components. Tests assert current behavior; treat failures as a behavior change that must be understood, not merely updated.

The full orchestrated browser lifecycle is not covered by unit tests. Verify it with a production build and a live mobile smoke test on a canonical route: hold → offline/reconnect → warning/extend → confirm → ICS/QR → reschedule → cancel → expiry/release. See `docs/booking-process.md` §12.

---

## 6. Current state & what's next

**Done (merged):** Phases 0/1/3/4 — `lib`/`config`/`components/ui` extraction, the `useModuleStore` hook, and the test net. Canonical public routes also connect the shared module to Supabase-backed reads and booking-critical Route Handlers.

**Deferred (Phase 5/6):** carving the remaining feature code out of `components/haab-booking-module.tsx` — the public booking flow, admin surfaces, setup wizard, and modals — into feature components + headless hooks, then reducing the module to a thin orchestrator with a documented public API barrel. Do each sub-step with its own reviewed step-plan and functional smoke test.

The public flow's *step transitions* are already out: `lib/booking-flow-machine.ts`
is a pure reducer the monolith dispatches into, so the extraction of the public
flow components has one less piece of tangled state to carry.

---

## 7. Related docs

- `SYSTEM_REFERENCE.md` — engine behavior, data model, rules, invariants (the ground truth for *what it does*).
- `docs/booking-process.md` — current end-to-end public booking lifecycle and server boundaries.
- `docs/superpowers/plans/2026-05-29-monolith-decomposition-plan.md` — full phased roadmap.
- `docs/superpowers/plans/2026-06-06-backend-implementation-plan.md` — phased Supabase backend implementation plan.
- `BACKEND_RECOMMENDATIONS.md` — Supabase migration target (slots into the `useModuleStore` seam).
- `TESTING_RECOMMENDATIONS.md` — testing strategy background.
- `liquid-glass-style-guide.md` / `UX_RECOMMENDATIONS.md` — visual/UX guidance.
