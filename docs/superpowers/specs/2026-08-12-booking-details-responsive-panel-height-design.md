# Responsive Booking Details Panel Heights

**Date:** 2026-08-12
**Scope:** Public booking flow, visible step 2 (“Your details”) in `components/haab-booking-module.tsx`.

## Goal

Let each details panel use its intrinsic content height while panels stack below 1024px. Equalize all three panels to the tallest panel only when `lg:grid-cols-3` places them in one row at 1024px and wider.

## Root Cause

The existing `isDesktopColumns` gate correctly removes inline synchronized heights below 1024px. Two panels still carry unconditional Tailwind `min-h-full` classes, leaving a second height constraint on stacked layouts. That percentage minimum can resolve against a definite host/layout height and make a shorter panel match a taller panel. The `ResizeObserver` also continues measuring and storing synchronized height while columns are stacked, even though mobile does not consume that state.

Browser reproduction confirmed:

- At 1280px, all three panels occupy one row and receive the same measured inline minimum height.
- At 390px, inline minimum heights disappear, but About and Summary still compute `min-height: 100%` from unconditional `min-h-full` classes.

## Chosen Design

Use one responsive owner for equal-height behavior:

1. Remove unconditional `min-h-full` from details-only About and Summary panel classes. Their flex-column layout remains.
2. Run details-panel height observation only while `isDesktopColumns` is true.
3. Add `isDesktopColumns` to effect dependencies so entering 1024px starts fresh measurement and leaving 1024px disconnects observation.
4. Keep existing inline `minHeight` application gated by `isDesktopColumns`.
5. Preserve selection-step and success-step behavior outside this details-panel fix unless required by existing shared effect structure.

Result:

- `<1024px`: three stacked panels size independently from content; no synchronized minimum height.
- `>=1024px`: three panels share tallest measured height and remain aligned in one row.

## Rejected Approaches

- Replace JavaScript equalization with CSS Grid stretching: cleaner long-term, but broader behavior change across shared selection/details/success layout.
- Only prefix `min-h-full` with `lg:`: fixes visible class leak, but leaves mobile observation and stale synchronized state running.

## Testing

- Run a focused executable browser assertion before production edits and confirm it fails because stacked panels compute `min-height: 100%`.
- Re-run that assertion after the fix, then run the full Vitest suite, lint, and build.
- Browser-check details step at 390px, 768px, 1024px, and 1280px.
- Assert below 1024px: panels stack, inline `minHeight` is absent, computed panel minimum height is not synchronized, and heights follow content.
- Assert at 1024px and 1280px: panels share row/top position and equal rendered height.
- Check browser console for runtime, hydration, and `ResizeObserver` errors.

## Non-Goals

- Visual redesign.
- Booking state, hold, submission, or navigation changes.
- Refactoring shared booking-flow component.
- Changing 1024px breakpoint.
