# Dashboard Operate UI (PR 2 of 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Operate sections — Overview, Bookings, Calendar, Analytics — and the dialogs they open (cancel, reschedule, appointment scanner) onto the `app-ui` kit. Add the public-flow screenshot guard before touching the module's shared modals.

**Architecture:**
- Presentational section components are restyled in place.
- Admin UI still inside `haab-booking-module.tsx` is extracted into presentational components: the month calendar, plus the admin path of the cancel and reschedule modals. State and handlers stay in the module.
- Public pages (`isDedicatedPublicPage`) keep the existing modal markup byte-for-byte.
- Booking success toasts go through a tiny `ToastOnChange` bridge rendered inside the toast provider. This works in shell and embedded mode, and fires after the dialog has closed.

**Tech Stack:** Next.js 16, React 19, Tailwind 4.2, Vitest (node, `renderToStaticMarkup`), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-dashboard-tailwind-ui-design.md` — §6 (module seam), §7 Overview / Bookings / Calendar / Analytics, Delivery item 2.

## Global Constraints

- No new dependencies.
- Migrated files use only `app-ui` + `app-*` tokens. They are appended to `MIGRATED` in `components/__tests__/app-ui-tokens.test.ts` and `MIGRATED_TO_APP_UI` in `eslint.config.mjs`.
- No change to public rendering. Every `isDedicatedPublicPage` branch in the module keeps its markup. `components/booking/**` changes only by the spec-mandated move of `AppointmentScanner` (admin-only) to `components/provider/`.
- Copy: new strings in `dashboard-copy.ts`, en + es, covered by the copy test.
- Kit rules from PR 1:
  - controls carry `data-app-control` (handled by the kit);
  - close and dismiss labels are required;
  - external `ButtonLink` needs `newTabLabel`.
- 44px targets below `sm`; focus rings on every interactive element.
- Commits: Conventional Commits with the session attribution lines; branch `feat/dashboard-operate-ui`.

## Review Focus

1. **Public reschedule and cancel modals** (dedicated public page, manage link) must render exactly as before. The `isDedicatedPublicPage` branch must be untouched. Screenshot guard in Task 1; diff check in Task 9.
2. **A toast after cancel or reschedule** must fire after the dialog closes. Otherwise it renders behind the modal backdrop and is never announced. Covered by the `ToastOnChange` placement and an e2e in Task 9.
3. **Cancelled bookings and the Archive view** expose no mutating action. Hidden, not disabled. Task 4 test.
4. **Mobile month grid at 390px** must not scroll horizontally and must keep day numbers readable. Visual QA in Task 9.
5. **Spanish workspace:** every new string (toasts, dialog labels, stat links) comes from `dashboard-copy.ts` es. Copy test in Task 2.

---

## File Structure

| Path | Responsibility |
|---|---|
| `e2e/public-visual.spec.ts` | Opt-in (`E2E_VISUAL=1`) screenshot guard for public booking steps 1–2 at 390/1280 with a fixed browser clock |
| `components/provider/CampaignBadge.tsx` | app-ui badge for a booking's campaign (uses `formatBookingCampaign` read-only) |
| `components/provider/BookingRetentionSettings.tsx` | `BookingRetentionNotice` → app-ui `Alert` (settings card itself migrates in PR 3) |
| `components/provider/DashboardOverview.tsx` | StatGroup, upcoming StackedList, booking-page card, next-steps card |
| `components/provider/BookingsList.tsx` | Card toolbar, SegmentedControl, filters, sticky day headings, hidden actions |
| `components/provider/AdminCalendar.tsx` | Extracted month calendar (presentational) |
| `components/provider/ProviderAnalyticsSurface.tsx` | Cards, Stats, Table, SegmentedControl, chart colors |
| `components/provider/CancelBookingDialog.tsx` | Admin cancel confirmation on `ConfirmDialog` |
| `components/provider/RescheduleBookingDialog.tsx` | Admin reschedule on `Dialog size="lg"` |
| `components/provider/AppointmentScannerDialog.tsx` | Moved from `components/booking/AppointmentScanner.tsx`, frame on `Dialog` |
| `components/provider/ToastOnChange.tsx` | Fires `notify` when a `{ id, message }` notice changes |
| `components/haab-booking-module.tsx` | Wires the extracted components; admin-path branches only |
| `components/provider/dashboard-copy.ts` | New en/es strings |

---

### Task 1: Public screenshot guard

**Files:** Create `e2e/public-visual.spec.ts`; modify `.gitignore`.

- [ ] Write the spec:

```ts
import { expect, test } from "@playwright/test";

import { providerFor } from "./fixtures/providers";

/**
 * Local guard for "the public booking flow does not change" while the
 * dashboard is redesigned. Opt-in (E2E_VISUAL=1): baselines are machine-
 * specific (fonts), so CI never runs it. Capture baselines on main with
 * --update-snapshots, then compare on the branch.
 */
test.skip(!process.env.E2E_VISUAL, "local visual guard; set E2E_VISUAL=1");

const WIDTHS = [390, 1280];

for (const width of WIDTHS) {
  test(`public booking page is unchanged at ${width}px`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-12T10:00:00"));
    await page.setViewportSize({ width, height: 1000 });
    const provider = providerFor("billingPremium");
    await page.goto(provider.publicPath);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(`public-step1-${width}.png`, { fullPage: true, animations: "disabled" });

    await page.getByRole("button", { name: /Choose|Elegir|Book|Reservar/ }).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(`public-step2-${width}.png`, { fullPage: true, animations: "disabled" });
  });
}
```

- [ ] Add `e2e/public-visual.spec.ts-snapshots/` to `.gitignore`.
- [ ] Capture baselines now (the branch has no code changes yet, so it equals `main`): `E2E_VISUAL=1 … npx playwright test e2e/public-visual.spec.ts --no-deps --update-snapshots`. Then run it again without `--update-snapshots` and expect it to PASS, which proves the guard is deterministic.
- [ ] Commit `test(e2e): add opt-in public booking screenshot guard`.

> If `providerFor(...).publicPath` does not exist, derive the path the way `e2e/business-type.spec.ts` does (the dashboard "View page" link) and ledger the ruling.

### Task 2: Copy, campaign badge, retention notice

**Files:** `components/provider/dashboard-copy.ts`, `components/provider/__tests__/dashboard-copy.test.ts`, `components/provider/CampaignBadge.tsx`, `components/provider/BookingRetentionSettings.tsx`, `components/provider/__tests__/campaign-badge.test.tsx`.

**Produces:**
- `DashboardShellCopy` keys:
  - `cancelledToast`: "Cancellation saved" / "Cancelación guardada"
  - `rescheduledToast`: "New time saved" / "Nuevo horario guardado"
  - `viewAll`: "View all" / "Ver todo"
  - `closeDialog`: "Close" / "Cerrar"
- `CampaignBadge({ campaign?: BookingCampaign; lang: Lang })` → `Badge tone="info"` with `title` detail, or null.
- `BookingRetentionNotice` renders `<Alert tone="info" title={text}>` with the date hint, plus a `plain sm` Button "Manage" when `onOpenSettings` is given.

- [ ] RED:
  - Add the 4 keys to the copy test's both-languages loop.
  - `campaign-badge.test.tsx` asserts:
    - the label `via instagram · fall` appears;
    - `bg-app-info-soft` is present;
    - null when there's no campaign.
  - In `bookings-list.test.tsx`, retention assertions keep their text checks.
- [ ] GREEN: implement. `CampaignBadge` reuses `formatBookingCampaign` from `components/booking/BookingCampaignBadge` (import only, no edit).
- [ ] Commit `feat(dashboard): add app-ui campaign badge, retention notice and operate copy`.

### Task 3: Overview

**Files:** `components/provider/DashboardOverview.tsx`, `components/provider/__tests__/dashboard-overview.test.tsx`, `components/__tests__/app-ui-tokens.test.ts` (append file).

Target structure:
- `StatGroup columns={4}` with four `Stat`s.
  - Upcoming links to `pathForSection("bookings")` and Services to `pathForSection("services")`, with `linkLabel={shell.viewAll}`.
  - `onClick` intercepts plain clicks (`shouldInterceptNavClick`) and calls `onGoToSection`.
- Grid `xl:grid-cols-[minmax(0,1fr)_340px]`:
  - **Upcoming card:** `CardHeader` with the title and a `plain sm` "See all" button. Rows are a `StackedList`:
    - leading date block: weekday short and day number in a `size-12 rounded-lg bg-app-subtle` tile;
    - content: name + `Badge`s (`bookingTypeBadgeTone` / `bookingStatusBadgeTone`) + `CampaignBadge`, then a `text-sm text-app-fg-muted` line with time · service · capacity · total;
    - trailing: Reschedule (`secondary sm`, only when `canReschedule`) and Cancel (`danger-plain sm`).
  - Empty state: `EmptyState` with a `CalendarBlank` icon.
- **Booking page card:**
  - `Badge` live/off.
  - Read-only `Input` with the URL and a copy `IconButton` as trailing addon; its label is `copiedLink ? copied : copyLink`.
  - `ButtonLink external newTabLabel` "View public page".
- **Next steps card** (only when steps exist): `StackedList` rows with title, body and a `soft sm` CTA.

- [ ] RED:
  - Append `components/provider/DashboardOverview.tsx` to `MIGRATED`; it fails because the file uses `var(--…)`.
  - Add tests:
    - Upcoming/Services stats link to `/dashboard/bookings` and `/dashboard/services`;
    - the copy control is a button named by `en.publicFlow.copyLink`;
    - no `adminGlass` import (the lint list covers that).
- [ ] GREEN: rewrite the markup to the structure above. Keep every existing test assertion passing; that covers text and behavior.
- [ ] Commit `feat(dashboard): rebuild overview on app-ui`.

### Task 4: Bookings

**Files:** `components/provider/BookingsList.tsx`, `components/provider/__tests__/bookings-list.test.tsx`, token test.

Target:
- One `Card`.
  - Header row: `SegmentedControl` (`ariaLabel={shell.bookingViewLabel}`, options active/archive with counts), the archive hint as muted text, and a Scan button (`primary`, `QrCode` icon) when `onScan`.
  - Then the retention `BookingRetentionNotice`.
  - Filter grid `sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_repeat(3,11rem)]`:
    - search `Input` with a `MagnifyingGlass` leading addon (`type="search"`, `aria-label`);
    - status, type and sort `Select`s with their existing `aria-label`s and `value`s.
  - Result count (`aria-live="polite"`) + Clear filters (`plain sm`).
- Groups:
  - each group is a `section aria-labelledby` containing a `StackedListHeading id` ("Today · Oct 12") and a `StackedList`;
  - rows lay out from `lg` as `lg:grid lg:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)_auto]`: time · client + contact · service + details + badges · actions.
- Cancelled rows get `text-app-fg-muted` and a Cancelled badge. **No action buttons when cancelled or when `view === "archive"`.**
- Empty states use `EmptyState variant="dashed"`.

- [ ] RED:
  - Append the file to `MIGRATED`.
  - Replace the two "disables …" tests with:
    - `it("offers no actions on a cancelled booking")`: `render({ bookings: [cancelled] })` contains no `>Cancel<` / `>Reschedule<` buttons;
    - `it("offers no actions in the archive")`.
  - Change `aria-pressed="true"` in the archive test to `role="radio"` + `aria-checked="true"`, since the segmented control is a radiogroup.
- [ ] GREEN: rewrite; all other existing assertions keep passing.
- [ ] Commit `feat(dashboard): rebuild bookings list on app-ui`.

### Task 5: AdminCalendar extraction

**Files:**
- Create `components/provider/AdminCalendar.tsx` and `components/provider/__tests__/admin-calendar.test.tsx`.
- Modify `components/haab-booking-module.tsx` (`renderAdminCalendar` → `<AdminCalendar …/>`).

**Interface:**

```ts
export type AdminCalendarDay = {
  dateKey: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  /** Open for a new booking of the selected service. */
  open: boolean;
  bookings: { id: string; type: BookingType; label: string; serviceName: string }[];
};
export function AdminCalendar(props: {
  lang: Lang;
  copy: VerticalCopy;
  monthLabel: string;
  weekdayLabels: string[];
  weeks: AdminCalendarDay[][];
  services: { id: string; name: string }[];
  selectedServiceId: string;
  onServiceChange: (id: string) => void;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
  onOpenDay: (dateKey: string) => void;
}): JSX.Element
```

The module computes `weeks` with the existing helpers (`createMonthMatrix`, `getBookingsForDate`, `isDateAvailable`) and passes callbacks that call the existing setters and `launchPublicFlow`.

Markup:
- `Card` + toolbar: `h2` month label (`aria-live="polite"`), a `rounded-lg ring-1` button group (‹ previous `IconButton`, Today, › next `IconButton`), `Select` "New booking for", and the legend + hint.
- Grid `grid grid-cols-7 gap-px bg-app-border` inside an `overflow-hidden rounded-lg ring-1`. Each day is a `button` (disabled unless `open`):
  - `bg-app-surface`; out-of-month `bg-app-subtle text-app-fg-muted`; open days `bg-app-accent-soft/60`;
  - day number in a `size-7` circle, accent-filled for today;
  - from `sm`: up to 3 chips (dot + label + truncated service) and `+N`;
  - below `sm`: dots + `+N`;
  - chip text stays in the DOM `sr-only` below `sm`.

- [ ] RED: `admin-calendar.test.tsx`:
  - 7 weekday labels; month label in `h2`;
  - a closed day renders `disabled`;
  - an open day renders an enabled button whose markup contains the "Open" label;
  - today has `aria-current="date"`;
  - a day with 5 bookings shows 3 chip labels and `+2`;
  - the service select has `aria-label` = `t.admin.newBookingPrefix`.
- [ ] GREEN: create the component; replace the module's `renderAdminCalendar` body with the prop mapping and `<AdminCalendar/>`.
- [ ] Append `components/provider/AdminCalendar.tsx` to `MIGRATED` + the lint list.
- [ ] Commit `feat(dashboard): extract admin calendar onto app-ui`.

### Task 6: Analytics

**Files:** `components/provider/ProviderAnalyticsSurface.tsx`, `components/provider/__tests__/provider-analytics-surface.test.tsx`, token test.

Mapping:
- `adminPanelClass` panels → `Card` + `CardHeader` (title, body) + `CardBody`.
- KPI tiles → `StatGroup`/`Stat`.
- Period buttons → `SegmentedControl`.
- Campaign table → `Table`/`THead`/`Th`/`Td`.
- Referrer chips → `Badge tone="neutral"`.
- Bars:
  - daily views → `bg-app-chart-1/35` and bookings → `bg-app-chart-1`;
  - funnel/health bars use a `bg-app-subtle` track with `bg-app-chart-1` (health "cancelled" uses `bg-app-chart-2`);
  - heatmap cells use `bg-app-chart-1` with `opacity` steps.
- Checkout banner → app-ui `Alert`; upgrade card → `Card` + primary `Button`; teaser → `StatGroup` + blurred preview kept.
- `EmptyState` → app-ui.

- [ ] RED: append to `MIGRATED`; update period-button assertions from `aria-pressed` to `role="radio"`/`aria-checked` if present.
- [ ] GREEN: rewrite markup only. Data shaping functions and fetch logic are untouched.
- [ ] Commit `feat(dashboard): rebuild analytics on app-ui`.

### Task 7: Cancel and reschedule dialogs, booking toasts

**Files:**
- Create `components/provider/CancelBookingDialog.tsx`, `RescheduleBookingDialog.tsx` and `ToastOnChange.tsx`, plus `components/provider/__tests__/booking-dialogs.test.tsx`.
- Modify the module.

**Interfaces:**

```ts
export function CancelBookingDialog(props: {
  open: boolean; lang: Lang; copy: VerticalCopy;
  serviceName: string; clientName: string; whenLabel: string;
  pending: boolean; error?: string | null;
  onConfirm: () => void; onKeep: () => void;
}): JSX.Element
// ConfirmDialog tone="danger"
//   title={copy.cancelBooking}
//   body: `${serviceName} · ${clientName} · ${whenLabel}` + copy.phrases.cancelExplain
//   confirmLabel=t.manage.confirmCancellation
//   cancelLabel=copy.phrases.keepBookingButton

export type RescheduleDay = { dateKey: string; dayOfMonth: number; inMonth: boolean; available: boolean; selected: boolean };
export function RescheduleBookingDialog(props: {
  open: boolean; lang: Lang; copy: VerticalCopy;
  serviceName: string; clientName: string; serviceDescription?: string;
  appointment: boolean; windowLabel: string; weekdayLabels: string[];
  weeks: RescheduleDay[][]; selectedDateLabel: string;
  slots: { value: string; label: string; selected: boolean }[];
  pending: boolean; error?: string;
  canSave: boolean;
  onToday: () => void; onSelectDay: (dateKey: string) => void; onSelectSlot: (value: string) => void;
  onSave: () => void; onClose: () => void;
}): JSX.Element
// Dialog size="lg", closeLabel=shell.closeDialog
// Day grid: buttons with aria-pressed=selected, disabled unless available.
// Slots: buttons with aria-pressed. No-slots text t.manage.noSlotsOnDateHelper.
// Full-day helper text t.manage.newDayFreeReplaceHelper.
// Footer: Cancel (secondary), Save new time (primary, loading=pending, disabled=!canSave).

export function ToastOnChange({ notice }: { notice: { id: number; message: string } | null }): null
// useEffect on notice?.id → notify({ message: notice.message })
```

**Module wiring:**
- In `renderCancellationModal` and `renderRescheduleModal`, `if (!isDedicatedPublicPage) return <CancelBookingDialog …/>` (or the reschedule equivalent) *before* the existing JSX. The public JSX is untouched.
- Add `const [bookingNotice, setBookingNotice] = useState<{ id: number; message: string } | null>(null)`.
- After a successful non-public cancel, call `setBookingNotice({ id: Date.now(), message: shell.cancelledToast })`. Do the same after a successful non-`target` reschedule.
- Render `<ToastOnChange notice={bookingNotice} />` inside `modals`. In shell mode it sits under DashboardApp's provider; in embedded mode, under the module's own provider.

- [ ] RED: `booking-dialogs.test.tsx`:
  - the cancel dialog renders `role`-less `<dialog>` with the title, `aria-describedby` pointing at the body text, and "Keep" / "Confirm" labels in es when `lang="es"`;
  - the reschedule dialog marks the selected day and slot with `aria-pressed="true"`, renders unavailable days `disabled`, and Save is `disabled` when `canSave` is false;
  - the full-day variant shows the helper text and no slot buttons.
- [ ] GREEN: implement, wire, and run the full unit suite.
- [ ] Commit `feat(dashboard): move admin cancel and reschedule onto app-ui dialogs`.

### Task 8: Appointment scanner

**Files:**
- Move `components/booking/AppointmentScanner.tsx` → `components/provider/AppointmentScannerDialog.tsx` (`git mv`).
- Move `components/booking/__tests__/appointment-scan-result.test.tsx` → `components/provider/__tests__/`.
- Update the module import.

- [ ] RED: move the test, point its import at the new path, and add an assertion that the dialog frame is a `<dialog` with `aria-labelledby`. It fails on the import first, then on the frame.
- [ ] GREEN:
  - `git mv` the component.
  - Replace its fixed overlay `div role="dialog"` frame with `Dialog` (`closeLabel` from its copy).
  - Drop its manual Esc keydown listener, since the native dialog handles Esc.
  - Restyle the inner panels to `rounded-lg bg-app-subtle p-4`, buttons to `Button`, and the result to `Alert`/`DescriptionList`.
  - Camera/scan logic is unchanged.
- [ ] Append to `MIGRATED` and the lint list. Commit `refactor(dashboard): move appointment scanner to provider on app-ui dialog`.

### Task 9: Gates and verification

- [ ] Lint list: append the Task 2–8 provider files to `MIGRATED_TO_APP_UI`. Run `npm run lint`.
- [ ] e2e: add to `e2e/dashboard-toasts.spec.ts` a test that cancels a booking from Bookings:
  - seed one via the public page, or use an existing seeded booking if the fixture has one;
  - confirm the dialog;
  - expect the "Cancellation saved" toast **visible after the dialog is gone** (`expect(page.getByRole("dialog")).toHaveCount(0)` first).
  - If no seeded booking exists, ledger the ruling and cover cancel via the unit tests only.
- [ ] `npm run ci`, full e2e on a freshly reset scratch DB, and the public screenshot guard (`E2E_VISUAL=1`): all green.
- [ ] `git diff --stat main -- components/landing components/ui 'app/[verticalSegment]' app/public` is empty. `components/booking` shows only the scanner move.
- [ ] Visual QA at 390/768/1280/1440 for Overview, Bookings, Calendar, Analytics, and the cancel/reschedule dialogs.
- [ ] Final whole-branch review → fix pass → PR → CI → squash merge → delete branch.
