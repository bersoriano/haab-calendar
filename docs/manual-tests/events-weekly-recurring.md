# Manual test — Events / weekly recurrence (day-of-week + time)

Persona: **yoga instructor** who wants a class limited to a specific weekday and
time — e.g. **Hot Yoga every Tuesday 6:30 PM**.

This exercises the third occurrence mode, **Weekly**: a per-event recurrence on
chosen weekday(s) at a fixed start/end time, self-contained (it does not use the
page's global weekly availability), with per-date capacity.

Last run: 2026-06-16 · Result: **PASS** (1 low/cosmetic note).

---

## Background

Before this feature only two modes existed:

- **Single** — one fixed calendar date.
- **Periodic** — follows the page's one shared global weekly availability, so it
  could not express "this event only on Tuesdays at 6:30" per event.

**Weekly** fills that gap. Occurrence options are now **Single / Weekly /
Periodic**.

## Setup

1. `npm run dev` → `http://localhost:3000`.
2. Reset workspace: Settings → **Reset standalone setup** → choose **Events**.
3. Provider: Full name `Ananda Rivera`, Business `Lotus Flow Yoga`,
   Email `ananda@lotusflow.example` → Continue.
4. Availability step: leave defaults (weekly mode ignores it) → Continue.
5. Publish → dashboard. Public page: `/events/lotus-flow-yoga`.

## Edit — General admission → Hot Yoga (Tuesdays 6:30 PM)

Events tab → Edit "General admission":

| Field | Value |
|---|---|
| Event name | `Hot Yoga (Tuesdays 6:30 PM)` |
| Occurrence | **Weekly** |
| Repeats on | **Tue** (toggle the weekday chip) |
| Start / End | `18:30` / `19:30` |
| Description | `Heated 90-min hot yoga, all levels welcome. Bring a towel and water.` |
| Capacity | `Up to 12 yogis` |
| Maximum spots | `12` |
| Total | `$22 / class` |

Save event.

**Expected (provider):**
- Occurrence toggle shows three buttons: Single / Weekly / Periodic.
- Weekly reveals a **Repeats on** weekday chip row (Sun–Sat) + Start/End time;
  booking-type + duration controls are hidden.
- Re-opening the saved event reloads Weekly + the chosen weekday(s) + window.
- Validation: saving Weekly with no weekday or no start time is blocked
  ("Pick at least one weekday and a start time…").

## Public flow checks

Open `/events/lotus-flow-yoga` → choose **Hot Yoga**.

1. The month calendar enables **only Tuesdays** (e.g. Jun 16, 23, 30, Jul 7);
   every other day is disabled.
2. Picking a Tuesday shows a single slot **6:30 PM – 7:30 PM**.
3. Continue → details → Confirm.
   - **Expected:** confirmation time `6:30 PM - 7:30 PM` (full window),
     "Cancel my spot".
4. Capacity: each date has its own 12-spot cap; once a Tuesday is full it becomes
   unavailable on the calendar (covered by unit tests in
   `lib/__tests__/availability.test.ts`).

## Native input snippet

`fill_form` does not reliably set the segmented time inputs or the textarea; the
weekday chips are buttons (click them). Use the native setter for times:

```js
const setNative = (el, val) => {
  const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
  d.set.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
const [s, e] = document.querySelectorAll('input[type=time]');
setNative(s, '18:30'); setNative(e, '19:30');
```

## Findings (2026-06-16)

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | — | Weekly mode added (`occurrenceMode: "weekly"` + `weekdays`); provider toggle, weekday picker, validation, and edit-reload all work. | **Pass** |
| 2 | — | Public calendar limits bookable days to the chosen weekday(s); one fixed slot per matching day; confirmation shows the full window. | **Pass** |
| 3 | — | Per-date capacity enforced for weekly (unit-tested: matching weekday, past date, non-matching weekday, full date). | **Pass** |
| 4 | Low (cosmetic) | On the details + confirmation panels, weekly (and periodic) events still show appointment-flavoured labels ("About the Appointment", "APPOINTMENT DETAILS", "Type: Appointment", "Length"). Single events were already reworded; weekly/periodic were not. | Open — reword to event language for all events-vertical modes. |

### Notes

- Weekly events ignore the page's global weekly availability by design — the
  event defines its own weekday(s) + time. To run the same class on multiple days
  (e.g. Tue + Thu), toggle several weekday chips.
- True calendar-date recurrence rules (e.g. "first Monday of the month",
  end-dates, exceptions) remain out of scope.
