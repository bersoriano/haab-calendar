# Refactor TODOs

Backlog for the `haab-booking-module` decomposition. Written so a future session/LLM can pick up cold.

**Where we are (2026-06-12):** Phases 0/1/3/4 done and merged to `main`. Pure logic + types + constants in `lib/`, seed data in `config/`, presentational primitives in `components/ui/`, persistence in `components/booking/state/useModuleStore.ts`, 136 Vitest characterization tests in `lib/__tests__/`. Monolith `components/haab-booking-module.tsx` is down to roughly 4,200 lines but still holds the orchestrator + all feature render/state.

**Read first:**
- `docs/ARCHITECTURE.md` — current module layout + the customization seams.
- `docs/superpowers/plans/2026-05-29-monolith-decomposition-plan.md` — full phased roadmap.
- `SYSTEM_REFERENCE.md` — engine behavior (the ground truth; refactors must not change it).

**Global rules for everything below:**
- **Behavior-preserving.** No UX/prop-contract change rides with a move. Refactor and feature-change never share a commit.
- **Dependency direction stays acyclic:** `lib` → `lib` only; `components/ui` → `lib`; `components/booking` → `lib`; monolith → all; routes → monolith. Never `lib` → `components`.
- **Gates per step:** `npm run build` + `npm run lint` + `npm run test` (136 passing) + a **functional smoke** on the touched surface (build-green does NOT cover React flows).
- **Keep `HaabBookingModule` props stable** for the route importers unless the change explicitly includes a route contract update.
- **Preserve `integratedMode`** exactly — it is now used by canonical hierarchical public routes and remains the embedding/child seam.
- One concern per commit; each step reversible by one `git revert`.

**Functional smoke checklist** (run on a canonical public route such as `/doctors/<slug>`; use `/public/<slug>` only for the standalone local demo):
book → pick date → pick slot → continue → fill details → confirm → success/QR → reschedule → cancel; plus hold countdown + expiry; plus admin route (`/`) setup wizard + service create/edit/delete + settings.

---

## Track A — Finish decomposition (maintainability)

### Phase 5 — Carve features into components + headless hooks

Each render function currently lives inside `HaabBookingModule` and closes over ~36 `useState` + the `useModuleStore` actions. The pattern for each sub-step: extract the render function into a component under `components/booking/<feature>/`, move its owned state into a headless hook under `components/booking/hooks/`, pass the rest as props; the monolith renders the component. **Do one sub-step per commit**, smoke the touched surface each time.

- [ ] **5a — Public booking flow** (highest value for child projects; also largest/riskiest)
  - Extract `renderPublicCalendar` → `components/booking/public/PublicCalendar.tsx`.
  - Sub-split `renderPublicFlow` (~1,000 lines) → `PublicBookingFlow.tsx` composing `SlotList.tsx` + `BookingSummary.tsx` (+ the success/manage screen, the natural-language input panel, the sticky bottom action bar already added in the mobile work).
  - Move booking-flow state + handlers into `components/booking/hooks/useBookingFlow.ts`: `bookingFlow`/`setBookingFlow`, `startFreshBooking`, `launchPublicFlow`, `beginClientDetailsStep`, `confirmBooking`, `updateBookingFlow`, `continueWithNaturalLanguageBooking` (+ the chrono-node `hasExplicitTime` helper, or move that to `lib/nl.ts` — see gap below).
  - Move hold lifecycle into `components/booking/hooks/useBookingHolds.ts`: `bookingHold`/`setBookingHold`, `bookingHoldNow`, the per-second ticker effect, `releaseExpiredBookingHold`, hold-selection-key wiring. It consumes `useModuleStore` actions (`commitBookingHolds`, `releaseBookingHold`).
  - **Context/risk:** `confirmBooking` and `beginClientDetailsStep` do read-modify-write via `actions.readStandaloneStoreSnapshot()` + `actions.commitBookings/commitBookingHolds` — preserve that re-validate-against-latest-snapshot pattern exactly (it's the double-booking guard, `SYSTEM_REFERENCE.md` §5/§8). NL parsing uses `chrono-node`.
  - **New tests unlocked:** once `useBookingFlow`/`useBookingHolds` are isolated, add hook tests (React Testing Library `renderHook`) for the step transitions + hold expiry — this closes part of the render-flow coverage gap.
  - **Verify:** full public smoke (book/confirm/reschedule/cancel/hold-expiry/NL input) + mobile viewport (the recently-hardened mobile flow must stay intact).

- [ ] **5b — Modals**
  - `renderCancellationModal` → `components/booking/public/CancellationModal.tsx`.
  - `renderRescheduleModal` → `components/booking/public/RescheduleModal.tsx` (note `confirmReschedule`'s inline-error handling from the manage-booking work — keep it).
  - Handlers `openReschedule`, `confirmReschedule`, `confirmCancellation` either move with the modals or into a small `useBookingMutations` hook; they call `useModuleStore` actions.
  - **Verify:** reschedule into another slot, reschedule conflict (inline error), cancel.

- [ ] **5c — Setup wizard**
  - `renderSetupWizard` → `components/booking/admin/SetupWizard.tsx`.
  - State/handlers → `components/booking/hooks/useSetupWizard.ts`: `setupStep`, `setupError`, `validateSetup`, `goToNextSetupStep`, `completeSetup`, `updateProvider`, `updateAvailabilityDay`, `resetStandaloneSetup`. Consumes `actions.updateStandaloneStore`/`persistStandaloneStore`.
  - **Verify:** run setup from empty store → provider → services → availability → launch.

- [ ] **5d — Service editor**
  - `renderServices` → `components/booking/admin/Services.tsx`.
  - State/handlers → `components/booking/hooks/useServiceEditor.ts`: `serviceDraft`, `editingServiceId`, `resetServiceEditor`, `beginEditingService`, `appendQuickTemplate` (uses `config/templates.ts`), `upsertService`, `removeService`.
  - **Verify:** create from template + blank, edit, delete; deletion doesn't break existing bookings (snapshot fields).

- [ ] **5e — Admin surfaces**
  - `renderDashboard` → `Dashboard.tsx`; `renderBookingsList` → `BookingsList.tsx` (owns `searchTerm`/`deferredSearch`/`statusFilter`/`typeFilter`); `renderAdminCalendar` → `AdminCalendar.tsx` (owns `calendarMonthAnchor`/`calendarServicePreference`/`calendarQrCode`); `renderSettings` → `Settings.tsx` (owns `copiedLink`/`copyPublicLink`).
  - **Verify:** each admin tab renders, search/filter works, calendar QR generates, settings copy-link works.

### Phase 6 — Thin orchestrator + public API barrel

- [ ] Reduce `HaabBookingModule` to a composition shell: call `useModuleStore` + the feature hooks, branch by `surfaceMode`/`setupComplete`/`isSetupOpen`, render the extracted feature components. No business logic left inline.
- [ ] Create `components/booking/index.ts` barrel exporting the documented public surface: `HaabBookingModule` (props unchanged) + the deliberately-public sub-components (`PublicBookingFlow`, `PublicCalendar`, …) + re-exports from `lib`.
- [ ] Repoint the 3 route importers to the barrel.
- [ ] **Verify:** all 3 routes; confirm props contract unchanged.

---

## Track B — Enable parent → children (the original goal; orthogonal to Phase 5)

This is what actually unblocks child projects. The foundation makes reuse *possible*; nothing yet *distributes* it.

- [ ] **Distribution decision (Phase 7) — the real blocker.** Choose: versioned package vs monorepo vs template+upstream. Inputs: how much children diverge (config-only vs deep), one team vs many, independent deploys. Until decided, "reuse" = copy-paste. Its own brainstorm/spec.
- [ ] **Customization contract:**
  - Runtime-validate `injectedConfig` at the seam (e.g. zod) so bad child config fails loudly, not silently via `normalize*`.
  - Document the CSS-var **theme palette** (`--primary`, `--ink`, `--accent`, `--surface-soft`, `--line`, …) as the official theming API.
  - (After Phase 5/6) add slot/override props on public components + feature flags.
- [ ] **Release discipline:** semver, changelog, upgrade/codemod playbook, and one **reference child** kept current to prove upgrades.

---

## Gaps / cleanups (not in the original plan)

- [ ] **Import-boundary lint rule** — ESLint rule (e.g. `eslint-plugin-boundaries` or `no-restricted-imports`) forbidding `lib/**` from importing `components/**`/React, so the acyclic architecture can't silently regress. Cheap, high leverage.
- [ ] **`lib/index.ts` barrel** — children currently import deep paths (`@/lib/availability`); a barrel gives a cleaner public contract.
- [ ] **`lib/nl.ts`** — move the `chrono-node` natural-language straggler (`hasExplicitTime` + parse usage) out of the monolith into a pure module (pairs with 5a).
- [ ] **Type dedup** — `lib/booking-tokens.ts` defines its own `BookingLike`/`StoreLike`; align with `lib/types` now that types are centralized.
- [ ] **`integratedMode` integration smoke** — canonical public routes now exercise it; add a dedicated smoke/test so child extraction cannot regress it.
- [ ] **Component/integration tests** — RTL/Playwright for the booking wizard + admin flows to close the render-flow coverage gap that unit tests don't cover.

---

## Recommended order

1. If the driver is "spin up child projects soon" → **Track B first** (distribution decision + contract + reference child). Phase 5 not required for reuse.
2. If the driver is maintainability → **Phase 5a** next (biggest file, most value), then 5b–5e, then Phase 6.
3. Either way, land the **import-boundary lint rule** + **`lib/index.ts` barrel** early — they're cheap and protect everything after.
