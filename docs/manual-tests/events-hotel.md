# Manual test — Events / hotel (edit seeded events; single + periodic)

Persona: **hotel manager** at the Grand Hilton Kuala Lumpur. Exercises the
**edit** path (vs create) and both occurrence modes.

- Single-occurrence: a one-off wine tasting on a fixed date/time.
- Periodic: a Petronas Towers sightseeing tour bookable on any open day.

Last run: 2026-06-16 · Result: **PASS** (verifies the two yoga-test fixes;
1 minor residual noted).

---

## Setup

1. `npm run dev` → `http://localhost:3000`.
2. Reset workspace: Settings → **Reset standalone setup** → choose **Events**.
3. Provider step:
   - Full name `Daniel Lim`
   - Business `Grand Hilton Kuala Lumpur`
   - Email `events@grandhilton-kl.example`
   - Phone 1 `+60 3-1234 5678`
   - Address 1 `3 Jalan Stesen Sentral, Kuala Lumpur 50470`
4. Availability: enable **all 7 days** (tick Monday + Tuesday) → Continue.
5. Publish → Go to dashboard. Public page: `/events/grand-hilton-kuala-lumpur`.

The events vertical seeds two events ("General admission", "Full-day pass"),
both single-occurrence. This scenario **edits** them rather than creating new.

## Edit 1 — General admission → Wine Tasting Evening (single)

Events tab → Edit "General admission" (loads with occurrence = Single, seeded
window 18:00–20:00, empty date):

| Field | Value |
|---|---|
| Event name | `Wine Tasting Evening` |
| Occurrence | Single occurrence (unchanged) |
| Event date | a Saturday (e.g. `2026-06-20`) |
| Start / End | `19:00` / `21:00` |
| Description | `An exclusive sommelier-led wine tasting in the Grand Ballroom…` |
| Capacity | `Up to 30 guests` |
| Maximum spots | `30` |
| Total | `RM 280 / guest` |
| Location | tick **Address 1** (the hotel) |

Save event.

## Edit 2 — Full-day pass → Petronas Towers Sightseeing Tour (periodic)

Edit "Full-day pass" → switch Occurrence to **Periodic**:

| Field | Value |
|---|---|
| Occurrence | Periodic |
| Booking type | Appointment |
| Duration | 1 hour |
| Event name | `Petronas Towers Sightseeing Tour` |
| Description | `A guided tour of the iconic Petronas Twin Towers… Runs daily.` |
| Capacity | `Up to 15 per tour` |
| Maximum spots | `15` |
| Total | `RM 90 / guest` |
| Location | tick **Address 1** |

Save event.

## Public flow checks

Open `/events/grand-hilton-kuala-lumpur`.

1. **Single (Wine Tasting):** fixed date/time card
   `Saturday, June 20, 2026 · 7:00 PM–9:00 PM`, `30 spots left`, **Reserve my
   spot**, hotel address shown. No calendar.
2. Reserve → details show **"About the Event"**, no Type/Length rows, **When**
   = full window `7:00 PM–9:00 PM`, Location shown → fill attendee → Confirm.
   - **Expected:** confirmation time `7:00 PM - 9:00 PM`, header **"Event
     details"**, **Cancel my spot**.
3. Book another → reopen Wine Tasting → **`29 spots left`** (decremented).
4. **Periodic (Petronas Tour):** month calendar, every open day selectable,
   1-hour slots 10:00 AM–7:00 PM.

## Native input snippet (date/time/description)

`fill_form` does not reliably set the segmented date/time inputs or the
multiline description. Use a native value setter:

```js
const setNative = (el, val) => {
  const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
  d.set.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
setNative(document.querySelector('input[type=date]'), '2026-06-20');
const [s, e] = document.querySelectorAll('input[type=time]');
setNative(s, '19:00'); setNative(e, '21:00');
setNative(document.querySelector('textarea'), 'Event description…');
```

## Findings (2026-06-16)

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | — | Edit path loads occurrence fields correctly; seeded single event edits cleanly; Single↔Periodic toggle works mid-edit. | **Pass** |
| 2 | — | endTime fix verified: single confirmation shows `7:00 PM - 9:00 PM` (full window), not duration-derived. | **Pass** (commit 8d94aee) |
| 3 | — | Detail/confirmation labels: "About the Event" / "Event details", no Type/Length rows, window under "When". | **Pass** (commit 8d94aee) |
| 4 | — | Spots-left decrements on registration (30 → 29); capacity + linked location surface on public + confirmation. | **Pass** |
| 5 | Low (cosmetic) | On the **details step**, the right "Registration summary" → **When** showed the start time only (`7:00 PM`) for single events, while the left panel showed the full window. | **Fixed** — the summary "When" now shows the full window (start–end) for single + weekly events. |

### Test-harness notes (not app bugs)

- Multiline `<textarea>` (Description) and segmented date/time inputs are not set
  by automated `fill_form`; use the native-setter snippet above or type by hand.
- "Reserve my spot" may need the page settled before it becomes interactive
  (first click focuses; the flow advances once the hold starts).
