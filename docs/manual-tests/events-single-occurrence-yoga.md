# Manual test — Events / yoga studio (single + periodic)

Persona: **yoga instructor** running a small studio. Exercises both occurrence
modes in the events vertical.

- Single-occurrence: a one-off community class on a fixed date/time.
- Periodic: a private 1-on-1 bookable on any open day/time.

Last run: 2026-06-16 · Result: **PASS** (2 issues found, both since fixed).

---

## Setup

1. `npm run dev` → open `http://localhost:3000`.
2. Reset workspace: Settings → **Reset standalone setup**.
3. On the vertical picker, choose **Events**.
4. Provider step: Full name `Ananda Rivera`, Business `Lotus Flow Yoga`,
   Email `ananda@lotusflow.example` → Continue.
5. Availability step: enable **all 7 days** (defaults to Wed–Sun 10:00–20:00;
   tick Monday + Tuesday so the any-day private class works) → Continue.
6. Publish → Go to dashboard. Public page: `/events/lotus-flow-yoga`.

> Periodic events share this one global weekly availability. That's why the
> "Friday 7pm" class is modeled as a single-occurrence dated session rather than
> a periodic Friday-only one — per-event weekly recurrence (RRULE) is out of
> scope.

## Event A — Community Vinyasa (single occurrence)

Events tab → New event (defaults to **Single occurrence**):

| Field | Value |
|---|---|
| Event name | `Community Vinyasa — Fri 7pm` |
| Occurrence | Single occurrence |
| Event date | next Friday (e.g. `2026-06-19`) |
| Start / End | `19:00` / `20:00` |
| Description | `A flowing all-levels vinyasa class to close out the week. Mats provided.` |
| Capacity | `Up to 20 yogis` |
| Maximum spots | `20` |
| Total | `$18 / class` |

Add event.

**Expected (provider):** booking-type + duration controls hidden while Single is
selected; date/time + Maximum spots shown.

## Event B — Private 1-on-1 Yoga (periodic)

New event → switch Occurrence to **Periodic**:

| Field | Value |
|---|---|
| Occurrence | Periodic |
| Booking type | Appointment |
| Duration | 1 hour |
| Event name | `Private 1-on-1 Yoga` |
| Description | `A personalised one-on-one session tailored to your practice. Book any open day and time.` |
| Capacity | `1 yogi (private)` |
| Maximum spots | `1` |
| Total | `$70 / session` |

Add event. (Optionally delete the two seeded events to leave just these two.)

**Expected (provider):** Periodic shows booking-type + duration, hides date/time;
helper reads "This event repeats on your weekly availability."

## Public flow checks

Open `/events/lotus-flow-yoga`.

1. **Single (Community Vinyasa):** no month calendar; a fixed date/time card
   showing `Friday, June 19, 2026 · 7:00 PM–8:00 PM`, `20 spots left`, and a
   **Reserve my spot** button.
2. Reserve → enter attendee details → Confirm.
   - **Expected:** confirmation "When" shows `7:00 PM – 8:00 PM` (full window),
     no "Type"/"Length" rows, header "Event details", "Cancel my spot" button.
3. Book another → reopen Community Vinyasa → **Expected:** `19 spots left`
   (spots decrement after a registration).
4. **Periodic (Private 1-on-1):** shows the month calendar; every open day is
   selectable; 1-hour slots 10:00 AM–7:00 PM. Confirms "any open day and time".

## Setup-time native input snippet

Date/time segmented inputs (only one date input + two time inputs on the Events
tab) can be set via:

```js
const setNative = (el, val) => {
  const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
  d.set.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
setNative(document.querySelector('input[type=date]'), '2026-06-19');
const [s, e] = document.querySelectorAll('input[type=time]');
setNative(s, '19:00'); setNative(e, '20:00');
```

## Findings (2026-06-16)

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | Medium | Confirmed single-occurrence booking showed end time from the appointment duration (7:00–7:30) instead of the event window end (7:00–8:00). | **Fixed** — `resolveBookingStartTime/EndTime` (commit 8d94aee). |
| 2 | Low (cosmetic) | Public detail/confirmation panels showed appointment-only "Type"/"Length" rows and "About the Appointment" for single events. | **Fixed** — rows dropped for single, retitled "About the Event" / "Event details", window shown under "When" (commit 8d94aee). |

Working as intended: occurrence toggle flips the form correctly; single public
flow skips the calendar; spots-left decrements on registration; events copy
(Registrations / Attendee / Reserve my spot / Cancel my spot) throughout.
