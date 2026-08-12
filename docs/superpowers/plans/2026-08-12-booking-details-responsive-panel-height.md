# Responsive Booking Details Panel Heights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep each stacked booking-details panel at intrinsic content height below 1024px, while equalizing all three panels when `lg:grid-cols-3` places them in one row.

**Architecture:** Keep existing `ResizeObserver` synchronizer and `isDesktopColumns` media-query state. Make desktop status own all synchronized-height measurement, and remove two unconditional `min-h-full` utilities that currently constrain stacked panels.

**Tech Stack:** Next.js 16.2.7, React 19.2.4, Tailwind CSS 4, Vitest 4, Playwright CLI browser verification.

## Global Constraints

- Execute directly on `main`; no worktree or branch.
- Breakpoint remains exactly 1024px, matching `lg:grid-cols-3`.
- No booking state, hold, submission, navigation, or visual-design changes.
- Read relevant bundled Next.js documentation before code changes; `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` documents current CSS/Tailwind integration.
- Preserve unrelated user changes and untracked browser artifacts.

---

## File Structure

- Modify `components/haab-booking-module.tsx`: responsive ownership of panel-height observation and details-panel utility classes.
- No new production modules or dependencies.
- Regression proof uses live browser assertions because rendered CSS height behavior depends on viewport layout, `matchMedia`, and `ResizeObserver`.

### Task 1: Gate panel-height synchronization and remove mobile minimum heights

**Files:**
- Modify: `components/haab-booking-module.tsx:975-1044`
- Modify: `components/haab-booking-module.tsx:4808-4819`
- Modify: `components/haab-booking-module.tsx:4922-4949`

**Interfaces:**
- Consumes: `isDesktopColumns: boolean`, derived from `(min-width: 1024px)`.
- Produces: desktop-only `publicPrimaryPanelHeight` measurement; intrinsic stacked-panel height below 1024px.

- [ ] **Step 1: Capture failing browser assertion below 1024px**

Open standalone public booking page with a setup-complete local store, advance to details step, resize to 390px, then execute:

```js
const panels = Array.from(document.querySelectorAll("h3"))
  .filter((heading) =>
    ["Your details", "About the Appointment", "Appointment summary"].includes(
      heading.textContent ?? "",
    ),
  )
  .map((heading) => heading.parentElement?.parentElement?.parentElement)
  .filter((panel) => panel instanceof HTMLElement);

if (panels.length !== 3) throw new Error(`Expected 3 details panels, got ${panels.length}`);
if (panels.some((panel) => getComputedStyle(panel).minHeight === "100%")) {
  throw new Error("Stacked details panels still use min-height: 100%");
}
if (panels.some((panel) => panel.style.minHeight !== "")) {
  throw new Error("Stacked details panels still use synchronized inline min-height");
}
```

Expected before fix: FAIL with `Stacked details panels still use min-height: 100%`.

- [ ] **Step 2: Make observer desktop-only**

In height synchronization effect, add desktop guard after step guard:

```tsx
    if (!isDesktopColumns) {
      return;
    }
```

Change dependency list from:

```tsx
  }, [resolvedBookingFlow.step]);
```

to:

```tsx
  }, [isDesktopColumns, resolvedBookingFlow.step]);
```

This disconnects observer when leaving desktop and starts fresh measurement when entering desktop.

- [ ] **Step 3: Remove unconditional percentage minimum heights**

Change About panel class from:

```tsx
"order-3 lg:order-none self-start flex min-h-full flex-col"
```

to:

```tsx
"order-3 lg:order-none self-start flex flex-col"
```

Change Summary details class from:

```tsx
isPublicDetailsStep && "flex min-h-full flex-col"
```

to:

```tsx
isPublicDetailsStep && "flex flex-col"
```

Keep existing inline `minHeight` conditions unchanged; they already require `isDesktopColumns`.

- [ ] **Step 4: Run focused mobile proof**

Reload details step at 390px and run Step 1 assertion.

Expected: PASS; all three computed minimum heights differ from `100%`, and all inline minimum heights are empty.

- [ ] **Step 5: Verify desktop equalization at breakpoint and wide desktop**

At 1024px and 1280px, wait one animation frame plus one observer turn, then assert:

```js
const panels = Array.from(document.querySelectorAll("h3"))
  .filter((heading) =>
    ["Your details", "About the Appointment", "Appointment summary"].includes(
      heading.textContent ?? "",
    ),
  )
  .map((heading) => heading.parentElement?.parentElement?.parentElement)
  .filter((panel) => panel instanceof HTMLElement);
const heights = panels.map((panel) => Math.round(panel.getBoundingClientRect().height));
const tops = panels.map((panel) => Math.round(panel.getBoundingClientRect().top));

if (panels.length !== 3) throw new Error(`Expected 3 details panels, got ${panels.length}`);
if (new Set(heights).size !== 1) throw new Error(`Panel heights differ: ${heights.join(", ")}`);
if (new Set(tops).size !== 1) throw new Error(`Panels do not share one row: ${tops.join(", ")}`);
if (panels.some((panel) => panel.style.minHeight === "")) {
  throw new Error("Desktop synchronized inline min-height missing");
}
```

Expected at both widths: PASS.

- [ ] **Step 6: Run repository gates**

```bash
npm test
npm run lint
npm run build
```

Expected: all tests pass; lint has no errors; production build completes.

- [ ] **Step 7: Check diff and commit**

```bash
git diff --check
git diff -- components/haab-booking-module.tsx
git add components/haab-booking-module.tsx docs/superpowers/plans/2026-08-12-booking-details-responsive-panel-height.md
git commit -m "fix: scope booking panel heights to desktop"
```

Expected: only scoped height behavior and this plan enter commit; `.playwright-cli/` remains untracked.
