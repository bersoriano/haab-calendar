# Mobile UI Rework — Public Booking Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the client-facing public booking flow mobile-first and polished on phones (≥320px) without changing any functionality; desktop (`lg+`) appearance stays effectively unchanged.

**Architecture:** Approach A — targeted responsive pass. Keep the existing DOM and all event handlers in `components/haab-booking-module.tsx`; apply mobile-first Tailwind breakpoints and gate the desktop-only fixed-height behavior behind a passive `isDesktopColumns` matchMedia flag. All edits are presentational. Spec: `docs/superpowers/specs/2026-05-29-mobile-ui-public-booking-design.md`.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4. No test framework in repo — verification is `npm run lint`, `npm run build`, and visual inspection at multiple viewport widths.

---

## Verification Note (read once)

There are no unit tests in this repo and these changes are visual. For every task the "verify" steps are:

1. `npm run lint` → expect no new errors.
2. Visual check: dev server (`npm run dev`) already runs on http://localhost:3000. Open `/public/<slug>` for a setup-complete provider, use Chrome DevTools device mode at the widths listed in each task, and confirm the described result plus **no layout change at `lg` (1024px) and `xl` (1280px)**.
3. No browser console errors, no React hydration warnings.

A full `npm run build` is run once at the end (Task 8).

If you need a setup-complete store: in the browser at `/` complete the provider setup wizard once (this seeds `localStorage` under `haab-calendar-dev-clean`), then navigate to the public slug. Do not change seeding code.

---

## File Structure

Single file is touched: `components/haab-booking-module.tsx`.

- State + effects block (~line 1298, ~1599) — add `isDesktopColumns`.
- `renderPublicCalendar` (~3857–4019) — calendar reflow + nav.
- `renderPublicFlow` (~4021–4943) — height gating, slot grid, sticky bottom action bar, panel order, spacing.

No new files. No changes to `app/`, `lib/`, or styles outside this component.

---

## Task 1: Add `isDesktopColumns` viewport flag

Passive flag used to gate desktop-only fixed-height styling. Mirrors the existing `isMobileBrowser` pattern (init `false`, sync on mount via matchMedia).

**Files:**
- Modify: `components/haab-booking-module.tsx` (state ~1298, effect ~1599–1610)

- [ ] **Step 1: Add state next to `isMobileBrowser`**

Find (line ~1298):

```tsx
  const [isMobileBrowser, setIsMobileBrowser] = useState(false);
```

Replace with:

```tsx
  const [isMobileBrowser, setIsMobileBrowser] = useState(false);
  const [isDesktopColumns, setIsDesktopColumns] = useState(false);
```

- [ ] **Step 2: Add the matchMedia effect next to the existing `isMobileBrowser` effect**

Find (line ~1599):

```tsx
  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const syncMobileBrowser = () => setIsMobileBrowser(mediaQuery.matches);
    const frameId = window.requestAnimationFrame(syncMobileBrowser);

    mediaQuery.addEventListener("change", syncMobileBrowser);

    return () => {
      window.cancelAnimationFrame(frameId);
      mediaQuery.removeEventListener("change", syncMobileBrowser);
    };
  }, []);
```

Insert immediately after it:

```tsx
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktopColumns = () => setIsDesktopColumns(mediaQuery.matches);
    const frameId = window.requestAnimationFrame(syncDesktopColumns);

    mediaQuery.addEventListener("change", syncDesktopColumns);

    return () => {
      window.cancelAnimationFrame(frameId);
      mediaQuery.removeEventListener("change", syncDesktopColumns);
    };
  }, []);
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors. (`isDesktopColumns` is unused until Task 2 — if the lint config flags unused vars as an error, proceed directly to Task 2 in the same commit; otherwise commit now.)

- [ ] **Step 4: Commit**

```bash
git add components/haab-booking-module.tsx
git commit -m "feat(mobile): add isDesktopColumns viewport flag for public flow"
```

---

## Task 2: Gate fixed panel heights to desktop

The three inline `publicPrimaryPanelHeight` `style` blocks exist only to equalize desktop sticky columns. Below `lg` they clip the slot list and create tall empty panels. Gate each with `isDesktopColumns`.

**Files:**
- Modify: `components/haab-booking-module.tsx` (~4292, ~4485, ~4551)

- [ ] **Step 1: Gate the primary panel minHeight (~line 4292)**

Find:

```tsx
              style={
                (isPublicDetailsStep || isPublicSuccessStep) && publicPrimaryPanelHeight
                  ? { minHeight: `${publicPrimaryPanelHeight}px` }
                  : undefined
              }
```

Replace with:

```tsx
              style={
                isDesktopColumns &&
                (isPublicDetailsStep || isPublicSuccessStep) &&
                publicPrimaryPanelHeight
                  ? { minHeight: `${publicPrimaryPanelHeight}px` }
                  : undefined
              }
```

- [ ] **Step 2: Gate the about/summary panel minHeight (~line 4485)**

Find:

```tsx
                style={
                  publicPrimaryPanelHeight
                    ? { minHeight: `${publicPrimaryPanelHeight}px` }
                    : undefined
                }
```

Replace with:

```tsx
                style={
                  isDesktopColumns && publicPrimaryPanelHeight
                    ? { minHeight: `${publicPrimaryPanelHeight}px` }
                    : undefined
                }
```

- [ ] **Step 3: Gate the summary panel max/min height (~line 4551)**

Find:

```tsx
              style={
                isPublicSelectionStep &&
                selectedService.bookingType === "appointment" &&
                bookingFlow.dateKey &&
                publicPrimaryPanelHeight
                  ? { maxHeight: `${publicPrimaryPanelHeight}px` }
                  : (isPublicDetailsStep || isPublicSuccessStep) && publicPrimaryPanelHeight
                    ? { minHeight: `${publicPrimaryPanelHeight}px` }
                    : undefined
              }
```

Replace with:

```tsx
              style={
                isDesktopColumns &&
                isPublicSelectionStep &&
                selectedService.bookingType === "appointment" &&
                bookingFlow.dateKey &&
                publicPrimaryPanelHeight
                  ? { maxHeight: `${publicPrimaryPanelHeight}px` }
                  : isDesktopColumns &&
                      (isPublicDetailsStep || isPublicSuccessStep) &&
                      publicPrimaryPanelHeight
                    ? { minHeight: `${publicPrimaryPanelHeight}px` }
                    : undefined
              }
```

- [ ] **Step 4: Verify**

Run: `npm run lint` → no new errors.
Visual at 360px: on step 2 with a date selected, the time-slot list grows with content (no small inner scrollbox); on step 3 the panels have no large empty bottom gap. At 1280px: panels still equal-height as before.

- [ ] **Step 5: Commit**

```bash
git add components/haab-booking-module.tsx
git commit -m "fix(mobile): apply equal-height column sizing only at lg+"
```

---

## Task 3: Calendar reflow (cells + nav)

**Files:**
- Modify: `components/haab-booking-module.tsx` `renderPublicCalendar` (~3877–4011)

- [ ] **Step 1: Make the nav row mobile-friendly (~line 3879)**

Find:

```tsx
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-3",
            publicGlassBarClass,
          )}
        >
          <div className="flex items-center gap-2">
            <ActionButton
              tone="ghost"
              className={calendarNavPillClass}
              disabled={!canGoToPreviousPublicMonth}
              onClick={() => setPublicMonthAnchor((current) => shiftMonth(current, -1))}
            >
              Previous
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={calendarNavPillClass}
              onClick={() => setPublicMonthAnchor(new Date())}
            >
              Today
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={calendarNavPillClass}
              onClick={() => setPublicMonthAnchor((current) => shiftMonth(current, 1))}
            >
              Next
            </ActionButton>
          </div>
          <p className="text-base font-semibold text-[var(--ink)]">
            {formatMonthLabel(publicMonthAnchor)}
          </p>
        </div>
```

Replace with:

```tsx
        <div
          className={cn(
            "flex flex-col gap-3 rounded-[24px] px-4 py-3 sm:flex-row-reverse sm:items-center sm:justify-between",
            publicGlassBarClass,
          )}
        >
          <p className="text-center text-base font-semibold text-[var(--ink)] sm:text-right">
            {formatMonthLabel(publicMonthAnchor)}
          </p>
          <div className="flex items-center gap-2">
            <ActionButton
              tone="ghost"
              className={cn(calendarNavPillClass, "flex-1 sm:flex-none")}
              disabled={!canGoToPreviousPublicMonth}
              onClick={() => setPublicMonthAnchor((current) => shiftMonth(current, -1))}
            >
              Previous
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={cn(calendarNavPillClass, "flex-1 sm:flex-none")}
              onClick={() => setPublicMonthAnchor(new Date())}
            >
              Today
            </ActionButton>
            <ActionButton
              tone="ghost"
              className={cn(calendarNavPillClass, "flex-1 sm:flex-none")}
              onClick={() => setPublicMonthAnchor((current) => shiftMonth(current, 1))}
            >
              Next
            </ActionButton>
          </div>
        </div>
```

- [ ] **Step 2: Tighten the weekday header + grid gaps (~line 3928)**

Find:

```tsx
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          {WEEKDAY_KEYS.map((day) => (
            <p key={day}>{weekdayShortFormatter.format(parseDateKey(`2024-03-${pad(WEEKDAY_KEYS.indexOf(day) + 3)}`))}</p>
          ))}
        </div>
        <div className="grid gap-2">
          {weeks.map((week) => (
            <div key={week[0].toISOString()} className="grid grid-cols-7 gap-2">
```

Replace with:

```tsx
        <div className="grid grid-cols-7 gap-1.5 text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:gap-2 sm:text-xs sm:tracking-[0.18em]">
          {WEEKDAY_KEYS.map((day) => (
            <p key={day}>{weekdayShortFormatter.format(parseDateKey(`2024-03-${pad(WEEKDAY_KEYS.indexOf(day) + 3)}`))}</p>
          ))}
        </div>
        <div className="grid gap-1.5 sm:gap-2">
          {weeks.map((week) => (
            <div key={week[0].toISOString()} className="grid grid-cols-7 gap-1.5 sm:gap-2">
```

- [ ] **Step 3: Reflow the day cell to a square, centered tap target (~line 3967)**

Find:

```tsx
                    className={cn(
                      "min-h-[88px] rounded-[24px] p-3 text-left transition md:min-h-[104px]",
                      inMonth
```

Replace with:

```tsx
                    className={cn(
                      "flex aspect-square min-h-0 flex-col items-center justify-center gap-1 rounded-2xl p-1.5 text-center transition sm:aspect-auto sm:min-h-[88px] sm:items-stretch sm:rounded-[24px] sm:p-3 sm:text-left md:min-h-[104px]",
                      inMonth
```

- [ ] **Step 4: Make the cell content responsive (centered on mobile, current layout at `sm+`) (~line 3986)**

Find:

```tsx
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        {date.getDate()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {chosen ? (
                          <span className={cn("shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[var(--accent)]", compactBadgeTextClass)}>
                            Selected
                          </span>
                        ) : null}
                        {!chosen && isToday ? (
                          <span
                            className={cn(
                              "shrink-0 rounded-full bg-[var(--surface-soft)] px-1.5 py-0.5 text-[var(--muted)]",
                              compactBadgeTextClass,
                            )}
                          >
                            Today
                          </span>
                        ) : null}
                        {!chosen && !isToday && available ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                        ) : null}
                      </div>
                    </div>
```

Replace with:

```tsx
                    <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                      <span className="text-base font-semibold text-[var(--ink)] sm:text-sm">
                        {date.getDate()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {chosen ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-[var(--accent)] sm:hidden" />
                            <span className={cn("hidden shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[var(--accent)] sm:inline", compactBadgeTextClass)}>
                              Selected
                            </span>
                          </>
                        ) : null}
                        {!chosen && isToday ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)] sm:hidden" />
                            <span
                              className={cn(
                                "hidden shrink-0 rounded-full bg-[var(--surface-soft)] px-1.5 py-0.5 text-[var(--muted)] sm:inline",
                                compactBadgeTextClass,
                              )}
                            >
                              Today
                            </span>
                          </>
                        ) : null}
                        {!chosen && !isToday && available ? (
                          <span className="h-2 w-2 rounded-full bg-[var(--accent)] sm:h-2.5 sm:w-2.5" />
                        ) : null}
                      </div>
                    </div>
```

- [ ] **Step 5: Verify**

Run: `npm run lint` → no new errors.
Visual at 320px / 360px / 390px: day cells are square, the date number is centered, indicators are dots, no horizontal overflow, every cell is comfortably tappable; nav buttons span the row with the month label above. At 1024px / 1280px: calendar looks identical to before (number top-left, "Selected"/"Today" pills, `min-h` 88/104px).

- [ ] **Step 6: Commit**

```bash
git add components/haab-booking-module.tsx
git commit -m "feat(mobile): reflow public calendar into square tap targets"
```

---

## Task 4: Responsive slot grid

**Files:**
- Modify: `components/haab-booking-module.tsx` (~4594–4595)

- [ ] **Step 1: Switch the slot container to a 2-col mobile grid, single column at `sm+`**

Find:

```tsx
                        <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                          <div className="space-y-2">
```

Replace with:

```tsx
                        <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:space-y-2 sm:gap-0">
```

Note: the closing `</div>` tags for this block are unchanged; only the inner wrapper's className changes. The slot `<button>` markup and its handlers stay exactly as-is (≥56px height preserved by existing `px-5 py-4`).

- [ ] **Step 2: Verify**

Run: `npm run lint` → no new errors.
Visual at 360px: on step 2 with a date selected and multiple slots, slots render two-per-row, each tappable, time + "Ends …" visible. At 1024px+: slots render as the original single-column list inside the scroll region.

- [ ] **Step 3: Commit**

```bash
git add components/haab-booking-module.tsx
git commit -m "feat(mobile): show appointment slots in a 2-column grid on phones"
```

---

## Task 5: Sticky bottom action bar (steps 2 & 3)

On mobile, surface the primary action(s) in a `sticky bottom-0` bar so users don't scroll back up. Desktop keeps the existing top-header placement. No handler changes — the bottom-bar buttons reuse the same logic by calling the same code paths.

To avoid duplicating the step-2 advance logic (a sizeable inline handler), extract it into a local function inside `renderPublicFlow`, then call it from both the existing top button and the new bottom bar.

**Files:**
- Modify: `components/haab-booking-module.tsx` `renderPublicFlow` (~4073, ~4129–4169, ~4173–4216, end of step-2/3 panel)

- [ ] **Step 1: Extract the step-2 advance handler**

Find, at the top of the `return` in `renderPublicFlow` (~line 4073):

```tsx
    return (
      <div
        className={cn(
          "transition-opacity duration-300 ease-out",
          isPublicFlowFadingOut ? "opacity-0" : "opacity-100",
        )}
      >
```

Replace with:

```tsx
    const advanceToDetailsStep = () => {
      const fadeAndAdvance = () => {
        setIsPublicFlowFadingOut(true);
        window.setTimeout(() => {
          beginClientDetailsStep();
          window.requestAnimationFrame(() => {
            setIsPublicFlowFadingOut(false);
          });
        }, 220);
      };
      if (typeof window === "undefined" || window.scrollY <= 0) {
        if (typeof window === "undefined") {
          beginClientDetailsStep();
          return;
        }
        fadeAndAdvance();
        return;
      }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.removeEventListener("scrollend", finish);
        clearTimeout(timeoutId);
        fadeAndAdvance();
      };
      const timeoutId = window.setTimeout(finish, 700);
      if ("onscrollend" in window) {
        window.addEventListener("scrollend", finish, { once: true });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const goBackToSelectionStep = () => {
      releaseBookingHold(bookingHold?.released ? undefined : bookingHold?.id);
      setBookingHold(null);
      setBookingHoldNow(currentTimestamp());
      setBookingError(null);
      setWasBookingUpdatedWithNaturalLanguage(false);
      setIsNLBookingOpen(false);
      setNaturalLanguageBookingInput("");
      setNaturalLanguageBookingError(null);
      setBookingFlow((current) => ({ ...current, step: 2 }));
    };

    return (
      <div
        className={cn(
          "transition-opacity duration-300 ease-out",
          isPublicFlowFadingOut ? "opacity-0" : "opacity-100",
        )}
      >
```

- [ ] **Step 2: Point the existing step-2 top button at the extracted handler and hide it on mobile**

Find (~line 4129):

```tsx
                      <div className="flex w-full flex-wrap items-center justify-end gap-3 lg:w-auto">
                        <ActionButton
                          tone="primary"
                          className={cn("min-w-[150px] px-6", publicPrimaryActionClass)}
                          disabled={!step2CanContinue}
                          onClick={() => {
                            const fadeAndAdvance = () => {
                              setIsPublicFlowFadingOut(true);
                              window.setTimeout(() => {
                                beginClientDetailsStep();
                                window.requestAnimationFrame(() => {
                                  setIsPublicFlowFadingOut(false);
                                });
                              }, 220);
                            };
                            if (typeof window === "undefined" || window.scrollY <= 0) {
                              if (typeof window === "undefined") {
                                beginClientDetailsStep();
                                return;
                              }
                              fadeAndAdvance();
                              return;
                            }
                            let done = false;
                            const finish = () => {
                              if (done) return;
                              done = true;
                              window.removeEventListener("scrollend", finish);
                              clearTimeout(timeoutId);
                              fadeAndAdvance();
                            };
                            const timeoutId = window.setTimeout(finish, 700);
                            if ("onscrollend" in window) {
                              window.addEventListener("scrollend", finish, { once: true });
                            }
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          {step2ButtonLabel}
                        </ActionButton>
                      </div>
```

Replace with:

```tsx
                      <div className="hidden w-full flex-wrap items-center justify-end gap-3 lg:flex lg:w-auto">
                        <ActionButton
                          tone="primary"
                          className={cn("min-w-[150px] px-6", publicPrimaryActionClass)}
                          disabled={!step2CanContinue}
                          onClick={advanceToDetailsStep}
                        >
                          {step2ButtonLabel}
                        </ActionButton>
                      </div>
```

- [ ] **Step 3: Point the step-3 top buttons at the extracted back handler and hide the row on mobile**

Find (~line 4176):

```tsx
                  <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-6 sm:pt-5">
                    <div className="flex w-full flex-wrap items-center justify-end gap-3">
                      <ActionButton
                        tone="ghost"
                        className={cn(
                          "min-w-[150px] px-6",
                          isDedicatedPublicPage &&
                            cn(publicPillButtonClass, publicGhostButtonClass),
                        )}
                        onClick={() => {
                          releaseBookingHold(
                            bookingHold?.released ? undefined : bookingHold?.id,
                          );
                          setBookingHold(null);
                          setBookingHoldNow(currentTimestamp());
                          setBookingError(null);
                          setWasBookingUpdatedWithNaturalLanguage(false);
                          setIsNLBookingOpen(false);
                          setNaturalLanguageBookingInput("");
                          setNaturalLanguageBookingError(null);
                          setBookingFlow((current) => ({ ...current, step: 2 }));
                        }}
                      >
                        Back
                      </ActionButton>
                      <ActionButton
                        tone="primary"
                        className={cn("min-w-[150px] px-6", publicPrimaryActionClass)}
                        onClick={confirmBooking}
                      >
                        {isBookingHoldExpired ? "Try booking" : "Confirm"}
                      </ActionButton>
                    </div>
```

Replace with:

```tsx
                  <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-6 sm:pt-5">
                    <div className="hidden w-full flex-wrap items-center justify-end gap-3 lg:flex">
                      <ActionButton
                        tone="ghost"
                        className={cn(
                          "min-w-[150px] px-6",
                          isDedicatedPublicPage &&
                            cn(publicPillButtonClass, publicGhostButtonClass),
                        )}
                        onClick={goBackToSelectionStep}
                      >
                        Back
                      </ActionButton>
                      <ActionButton
                        tone="primary"
                        className={cn("min-w-[150px] px-6", publicPrimaryActionClass)}
                        onClick={confirmBooking}
                      >
                        {isBookingHoldExpired ? "Try booking" : "Confirm"}
                      </ActionButton>
                    </div>
```

- [ ] **Step 4: Add the mobile sticky bottom bar before the close of `renderPublicFlow`'s root `<div>`**

Find the end of the function (~line 4939):

```tsx
          </div>
        ) : null}

      </div>
    );
  }

  function renderCancellationModal() {
```

Replace with:

```tsx
          </div>
        ) : null}

        {(isPublicSelectionStep || isPublicDetailsStep) && selectedService ? (
          <div className="sticky bottom-0 z-30 mt-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
            <div
              className={cn(
                "flex gap-3 rounded-[24px] px-4 py-3",
                publicElevatedPanelClass,
                "!p-3",
              )}
            >
              {isPublicSelectionStep ? (
                <ActionButton
                  tone="primary"
                  className={cn("min-h-12 flex-1", publicPrimaryActionClass)}
                  disabled={!step2CanContinue}
                  onClick={advanceToDetailsStep}
                >
                  {step2ButtonLabel}
                </ActionButton>
              ) : (
                <>
                  <ActionButton
                    tone="ghost"
                    className={cn(
                      "min-h-12",
                      isDedicatedPublicPage &&
                        cn(publicPillButtonClass, publicGhostButtonClass),
                    )}
                    onClick={goBackToSelectionStep}
                  >
                    Back
                  </ActionButton>
                  <ActionButton
                    tone="primary"
                    className={cn("min-h-12 flex-1", publicPrimaryActionClass)}
                    onClick={confirmBooking}
                  >
                    {isBookingHoldExpired ? "Try booking" : "Confirm"}
                  </ActionButton>
                </>
              )}
            </div>
          </div>
        ) : null}

      </div>
    );
  }

  function renderCancellationModal() {
```

- [ ] **Step 5: Verify**

Run: `npm run lint` → no new errors.
Visual at 360px:
- Step 2: a sticky bar with the full-width primary button sits at the bottom; it stays visible while scrolling the calendar; disabled until a date/time is chosen; tapping it advances to step 3 exactly as the old top button did.
- Step 3: bottom bar shows `Back` + `Confirm`; `Confirm` submits without scrolling up; `Back` returns to step 2 and releases the hold as before.
At 1024px+: no bottom bar; the original top-header buttons are visible and behave as before.

- [ ] **Step 6: Commit**

```bash
git add components/haab-booking-module.tsx
git commit -m "feat(mobile): add sticky bottom action bar for booking steps 2 and 3"
```

---

## Task 6: Details-step panel order on mobile

On `<lg`, place the booking summary directly under the form and push "About the Appointment" last. Desktop column order is untouched.

**Files:**
- Modify: `components/haab-booking-module.tsx` (~4285, ~4479, ~4540)

- [ ] **Step 1: Pin the primary (form) panel first on mobile**

Find (~line 4285):

```tsx
            <div
              ref={publicPrimaryPanelRef}
              className={cn(
                publicPrimaryPanelClass,
                isPublicSelectionStep && "transition-opacity duration-200",
                isPublicSelectionStep && shouldDimManualBookingPanels && "opacity-50",
              )}
```

Replace with:

```tsx
            <div
              ref={publicPrimaryPanelRef}
              className={cn(
                "order-1 lg:order-none",
                publicPrimaryPanelClass,
                isPublicSelectionStep && "transition-opacity duration-200",
                isPublicSelectionStep && shouldDimManualBookingPanels && "opacity-50",
              )}
```

- [ ] **Step 2: Push the About panel last on mobile**

Find (~line 4479):

```tsx
              <div
                ref={publicAboutPanelRef}
                className={cn(
                  "self-start lg:sticky lg:top-8 flex min-h-full flex-col",
                  publicSoftPanelClass,
                )}
```

Replace with:

```tsx
              <div
                ref={publicAboutPanelRef}
                className={cn(
                  "order-3 lg:order-none self-start lg:sticky lg:top-8 flex min-h-full flex-col",
                  publicSoftPanelClass,
                )}
```

- [ ] **Step 3: Pull the summary panel to second on mobile**

Find (~line 4538):

```tsx
            <div
              ref={publicSummaryPanelRef}
              className={cn(
                "self-start lg:sticky lg:top-8",
                publicElevatedPanelClass,
```

Replace with:

```tsx
            <div
              ref={publicSummaryPanelRef}
              className={cn(
                "order-2 lg:order-none self-start lg:sticky lg:top-8",
                publicElevatedPanelClass,
```

- [ ] **Step 4: Verify**

Run: `npm run lint` → no new errors.
Visual at 360px on step 3: vertical order is My Details → Booking summary → About the Appointment. At 1024px+: the three columns appear in their original left-to-right order (My Details, About, Summary).

- [ ] **Step 5: Commit**

```bash
git add components/haab-booking-module.tsx
git commit -m "feat(mobile): reorder details-step panels so summary sits under the form"
```

---

## Task 7: Spacing reclaim on small screens

**Files:**
- Modify: `components/haab-booking-module.tsx` (~4275–4283, sticky header wrapper ~4086)

- [ ] **Step 1: Tighten the step-2/3/4 grid container padding**

Find (~line 4275):

```tsx
          <div
            className={cn(
              "grid gap-5 p-5 sm:p-8",
              isDedicatedPublicPage && "xl:px-10 xl:py-10",
              isPublicSelectionStep
                ? "lg:grid-cols-1"
                : "lg:grid-cols-3",
            )}
          >
```

Replace with:

```tsx
          <div
            className={cn(
              "grid gap-4 p-4 sm:gap-5 sm:p-8",
              isDedicatedPublicPage && "xl:px-10 xl:py-10",
              isPublicSelectionStep
                ? "lg:grid-cols-1"
                : "lg:grid-cols-3",
            )}
          >
```

- [ ] **Step 2: Reduce the sticky-header wrapper outer radius/padding on mobile**

Find (~line 4084):

```tsx
            <div
              className={cn(
                "relative px-5 pt-5 sm:px-8 sm:pt-8 transition-[padding-bottom] duration-500 ease-out before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[48px] sm:before:rounded-[56px] xl:before:rounded-[60px] before:bg-[linear-gradient(135deg,rgba(255,255,255,0.22),rgba(255,255,255,0.08))] before:opacity-0 before:[backdrop-filter:blur(24px)_saturate(160%)] before:[-webkit-backdrop-filter:blur(24px)_saturate(160%)] before:ring-1 before:ring-inset before:ring-white/40 before:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(15,23,42,0.08),0_14px_34px_rgba(15,23,42,0.12)] before:transition-opacity before:duration-500 before:ease-out",
                isPublicSelectionStep && "sticky top-0 z-30",
                isDedicatedPublicPage && "xl:px-10 xl:pt-10",
                isStickyHeaderActive &&
                  "pb-6 before:opacity-100 sm:pb-8 xl:pb-10",
              )}
            >
```

Replace with:

```tsx
            <div
              className={cn(
                "relative px-4 pt-4 sm:px-8 sm:pt-8 transition-[padding-bottom] duration-500 ease-out before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[32px] sm:before:rounded-[56px] xl:before:rounded-[60px] before:bg-[linear-gradient(135deg,rgba(255,255,255,0.22),rgba(255,255,255,0.08))] before:opacity-0 before:[backdrop-filter:blur(24px)_saturate(160%)] before:[-webkit-backdrop-filter:blur(24px)_saturate(160%)] before:ring-1 before:ring-inset before:ring-white/40 before:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(15,23,42,0.08),0_14px_34px_rgba(15,23,42,0.12)] before:transition-opacity before:duration-500 before:ease-out",
                isPublicSelectionStep && "sticky top-0 z-30",
                isDedicatedPublicPage && "xl:px-10 xl:pt-10",
                isStickyHeaderActive &&
                  "pb-6 before:opacity-100 sm:pb-8 xl:pb-10",
              )}
            >
```

- [ ] **Step 3: Verify**

Run: `npm run lint` → no new errors.
Visual at 320px / 360px: panels have more usable interior width; no content touches the screen edges awkwardly; header glass radius looks intentional. At 1024px+: spacing/radius unchanged (all `sm:`/`xl:` values preserved).

- [ ] **Step 4: Commit**

```bash
git add components/haab-booking-module.tsx
git commit -m "feat(mobile): reclaim horizontal space with tighter small-screen padding"
```

---

## Task 8: Full-flow verification + build

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 2: Cross-breakpoint walkthrough**

In Chrome DevTools device mode, walk the full flow (service → date/time → details → confirmed) at **320, 360, 390, 768, 1024, 1280px**. Confirm for each:
- Calendar cells square & tappable on mobile; original look at `lg+`.
- Slot list not inner-clipped; 2-col on mobile, single-column list at `lg+`.
- Primary action reachable via sticky bottom bar on mobile (steps 2–3); top buttons only at `lg+`; exactly one visible action set per breakpoint.
- Details step order: form → summary → About on mobile; original columns at `lg+`.
- Full-day service path (no time slots) still advances correctly.
- Success step (step 4): QR/summary render; action buttons (Add to calendar / Reschedule / Cancel / Book another) work; no empty tall gap on mobile.
- No console errors, no hydration warnings.

- [ ] **Step 3: Confirm desktop parity**

At 1280px, compare against `main` (e.g. `git stash` or a second tab on the unchanged branch) to confirm no visible desktop regression.

- [ ] **Step 4: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore(mobile): final verification pass for public booking flow"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** D1→Task 3; D2→Task 2 (+Task 1 prereq); D3→Task 5; D4→Task 4; D5→Task 6; D6→Task 7. All six design items covered; verification matches spec's Verification section.
- **No functionality change:** handlers are reused verbatim; Task 5 extracts existing inline logic into named functions called from both desktop and mobile controls (behavior identical). Only new state is the passive `isDesktopColumns` flag (styling gate).
- **Type/name consistency:** `advanceToDetailsStep` / `goBackToSelectionStep` / `isDesktopColumns` used consistently across Tasks 1 and 5.
- **No placeholders:** every code step shows concrete before/after.
