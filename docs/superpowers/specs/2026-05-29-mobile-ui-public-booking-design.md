# Mobile UI Rework — Public Booking Flow

**Date:** 2026-05-29
**Scope:** Public booking flow only (`surfaceMode="public-only"`), rendered by `renderPublicFlow` / `renderPublicCalendar` in `components/haab-booking-module.tsx`.
**Type:** Presentational / layout only. **No functionality change** — no new behaviors, no changed handlers, no new state that alters flow logic. Allowed new state: passive viewport/layout detection (matchMedia) used purely to gate styling.

## Goal

Make the client-facing booking flow feel mobile-first and polished on phones (target ≥320px width) without altering how the flow works. Desktop (`lg+`) appearance must remain effectively unchanged.

## Non-Goals (explicitly out)

These are functionality, not UI, and are excluded:

- Swipe gestures for calendar navigation (4.2)
- Form progress autosave / sessionStorage restore (4.4)
- Timezone display (1.5)
- Bottom-sheet overlay interaction model (Approach C)
- Any admin/provider surface (dashboard, calendar, bookings, services, settings)
- Touching booking-hold logic, natural-language parsing, reschedule/cancel logic

## Current Problems (evaluation)

| # | Problem | Cause |
|---|---------|-------|
| 1 | Calendar renders as 7 tall-narrow boxes on phones; weak tap rhythm | `grid-cols-7` + `min-h-[88px]`, `rounded-[24px]`, date number top-left |
| 2 | Slot list clipped into a small inner-scroll box; tall empty panels on details/success | `publicPrimaryPanelHeight` applied via inline `style` with no breakpoint gate |
| 3 | On details step (3), Confirm/Back live in a header that is sticky only on step 2 → user scrolls up to submit | header is `sticky top-0` only when `isPublicSelectionStep` |
| 4 | Details step stacks form → About → summary; summary buried below the About panel | `lg:grid-cols-3` natural stack order on mobile |
| 5 | Slot list is single-column, wastes horizontal space | vertical `space-y-2` list |
| 6 | Large outer radius + `p-5` eat usable width <375px | container/panel padding |

## Approach

**Approach A — Targeted responsive pass.** Keep the existing DOM structure and all event handlers. Apply mobile-first styling via Tailwind breakpoints and gate the desktop-only fixed-height behavior to `lg+`. Chosen over a separate mobile render branch (B — duplicates large JSX in an already 5477-line file) and a bottom-sheet overlay (C — drifts into functionality change).

## Design

### D1 — Calendar reflow (`renderPublicCalendar`)
- Day cells: `aspect-square min-h-0 sm:aspect-auto sm:min-h-[88px]` so phones get square tappable cells while desktop keeps current dimensions.
- Radius `rounded-2xl sm:rounded-[24px]`; grid `gap-1.5 sm:gap-2`.
- Date number centered on mobile; availability dot below the number; on `<sm` the "Selected"/"Today" text pills collapse to a ring/dot to prevent overflow inside a narrow cell. Desktop keeps existing top-left number + pill layout.
- Nav row: on mobile, month label centered on its own line above a full-width row of equal-flex `Previous` / `Today` / `Next` pills. Desktop keeps current inline layout.

### D2 — Gate fixed panel heights to desktop
- Add passive state `isDesktopColumns` driven by `window.matchMedia("(min-width: 1024px)")` (same pattern as the existing `isMobileBrowser` effect).
- Apply the three `publicPrimaryPanelHeight` inline `style` blocks (primary panel minHeight, about/summary minHeight, summary maxHeight) **only when `isDesktopColumns` is true**. Below `lg`, pass `undefined` so panels size to content.
- Net effect on mobile: slot list is no longer clipped; no tall empty panels on details/success. Desktop equal-height sticky columns unchanged.

### D3 — Sticky bottom action bar (mobile, steps 2 & 3)
- On `<lg`, render the step's primary action(s) in a `sticky bottom-0 z-30` bar with backdrop blur and `env(safe-area-inset-bottom)` padding; buttons full-width, min height 48px.
  - Step 2: the `step2ButtonLabel` primary button (same onClick).
  - Step 3: `Back` + `Confirm` (same onClicks).
- Desktop (`lg+`) keeps the current placement in the top header; the bottom bar is `lg:hidden`, the existing top buttons become `hidden lg:flex` on mobile to avoid duplication. Handlers are shared/unchanged.
- Add bottom padding to the scroll container on mobile so the bar never covers content.

### D4 — Slots responsive grid
- Slot container: `grid grid-cols-2 gap-2 sm:grid-cols-1 lg:block` (desktop falls back to the current single-column list inside its scroll region).
- Each slot button keeps ≥56px height; time label + "Ends …" stacked; selected accent bar preserved.

### D5 — Details panel order (mobile)
- Using `order-*` utilities at `<lg` only: summary panel directly under the form; "About the Appointment" panel moves last. Desktop column order (`lg:grid-cols-3`) unchanged.

### D6 — Spacing reclaim
- Panel/container padding `p-4 sm:p-6` (from `p-5/p-6`).
- Outer flow container radius `rounded-[28px] sm:rounded-[48px]`.

## Affected Code

- `components/haab-booking-module.tsx` only:
  - `renderPublicCalendar` (≈3857–4019) — D1, D4 grid context.
  - `renderPublicFlow` (≈4021–4943) — D2 style gates, D3 action bars, D4 slots, D5 order, D6 spacing.
  - New `isDesktopColumns` state + matchMedia effect near existing `isMobileBrowser` effect (≈1599–1610).
- No changes to `app/public/[slug]/page.tsx` or `lib/`.

## Risks / Mitigations

- **Desktop regression:** every change is breakpoint-gated to `<lg` or additive; verify desktop visually unchanged at `lg`/`xl`.
- **Duplicate action buttons:** ensure exactly one visible set per breakpoint (`lg:hidden` / `hidden lg:flex`).
- **matchMedia SSR:** initialize `isDesktopColumns` to a safe default and sync on mount (mirror `isMobileBrowser`), avoiding hydration mismatch.

## Verification

- Run dev server; load `/public/<slug>` with a setup-complete store.
- Inspect at 320px, 360px, 390px, 768px, 1024px, 1280px (Chrome DevTools device mode).
- Confirm: calendar cells square & tappable; slot list not inner-clipped; primary action reachable without scrolling up on step 3; summary above About on mobile; desktop unchanged at `lg+`.
- No console errors; no hydration warnings.
