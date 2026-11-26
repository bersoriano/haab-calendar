# Booking flow

The public booking lifecycle, end to end. Canonical repo sources are `docs/booking-process.md` (behavior) and `docs/booking-engine.md` (mechanism). The code wins where they differ.

## Contents
- Public URLs
- Client journey
- The 10-minute hold
- Confirmation and receipt
- Private manage link
- Booking modes and availability
- Statuses
- Failure states
- Owner side

## Public URLs

| URL | Purpose |
| --- | --- |
| `/{segment}/{providerSlug}` | Provider booking page |
| `/{segment}/{providerSlug}/{serviceSlug}` | One service's booking page |
| `/{segment}/{providerSlug}/manage/{token}` | Client's private manage page |
| `/{segment}/{providerSlug}/i/{token}` | Household invitation (invitation-only RSVP pages) |
| `?lang=en` / `?lang=es` | Switches the public page's language; no separate routes |

Segments: `doctors`, `spaces`, `professionals`, `events`, `restaurants`. Old slugs redirect to new ones.

## Client journey

1. **Choose a service.**
2. **Choose a date and time.** Only open times show. For timed services, tapping a slot creates the hold immediately; there is no separate "select" step. Full-day and single-occurrence services have no slot list, so the date step's main button creates the hold.
3. **Enter details while the countdown runs.** Name, email and phone are required. Depending on the service and industry, the form can also ask for:
   - date of birth (healthcare only, optional)
   - party size (restaurants)
   - traveler fields: passport, emergency contact, diet, hotel pickup
   - location choice, with a price per location
   - a bank deposit receipt, when the service requires one
4. **Confirm.** The success screen appears only after the server accepts the booking.

The progress indicator is always visible. It collapses into a compact pinned bar while the client scrolls. Going back never loses the chosen service. Losing a slot is never a dead end: the client returns to time selection with the date kept.

## The 10-minute hold

| Rule | Detail |
| --- | --- |
| Who owns time | The database `expires_at` decides. The client countdown is display only and corrects for clock drift with `serverNow`. |
| Duration | `BOOKING_HOLD_DURATION_MS` in `lib/constants.ts`, 10 minutes. The client counts down from the same constant. |
| Warning | "Still interested?" shows during the last 2 minutes. |
| Extension | One 5-minute extension (`extension_count = 0` required). Prevents an abandoned form from blocking a slot indefinitely. |
| Conflict | A competing hold or booking gets HTTP 409 and the client picks again. |
| Release | Leaving details, changing the selection or restarting deletes the hold. A best-effort `pagehide` keepalive also releases it on exit. |
| Expiry | Slot frees logically the instant `expires_at <= now()`. Cron deletes rows every minute (cleanup only, not the mechanism). |
| Offline | Countdown continues; confirm/extend disabled; reconnect re-checks the hold with the server. No false confirmation. |

When the hold expires, the client stays on the details step and the form is kept. Two choices appear:
- **Hold this time again** — one tap, same slot. Goes back to time selection only if the slot is gone (409).
- **Choose another time** — keeps the service, date and everything typed.

**Change time** while the hold is still live releases it and keeps the form. Time selection then shows "your details are saved."

Double-booking guarantee: the availability check in the app narrows the race window. The database closes it, with GiST exclusion for exclusive slots and capacity triggers plus an advisory lock for shared capacity. A time hidden by the UI and a time the database rejects are the same set.

## Confirmation and receipt

Server re-validates everything. That includes the hold matching the service, date and time, the inventory, and snapshots of price, capacity and location. It then creates the booking, issues a random manage token (only the SHA-256 hash is stored) and consumes the hold. An idempotency key stops duplicate submits.

The receipt screen shows:
- the provider, a status pill, a short reference and the date and time
- an **.ics download** and an **inline QR** that holds the private manage URL
- reschedule, cancel and book-another actions
- a **"Save this link"** card: "you can reschedule or cancel anytime without an account"

Emails go out through the outbox (Resend): a client confirmation and an owner notification. Reminders follow if enabled (see `features.md`).

## Private manage link

Treat it like a password-reset link: anyone holding it can manage that booking. The page shows, in order:
1. Status pill and plain-language meaning, then the date, time, service, client, price and location.
2. **Change this booking.** Cancel (with a confirmation step), add to calendar, show QR and book another. Reschedule re-enters the real availability for the **same service**, treats the booking's own slot as free and offers "keep current time". The new time saves directly with no hold, because the booking already exists. Single-date event registrations can be cancelled but not rescheduled.
3. **Note for the provider.** Optional, up to 500 characters. Never overwrites the notes from booking. Rejected on cancelled bookings.
4. **Save this link** card.

No account or password anywhere.

## Booking modes and availability

| Mode | Model | What blocks it |
| --- | --- | --- |
| Timed appointment | `bookingType: appointment`, `durationMinutes` | Weekly hours, blocked windows, a full-day booking that date, an overlapping exclusive booking or hold |
| Full-day | `bookingType: full-day` | Any booking that date, or a blocked window on that weekday (needs an uninterrupted day) |
| Capacity event | events, `occurrenceMode: single` or `weekly`, `maxSpots` | Spots used = confirmed and rescheduled bookings plus unexpired holds |
| Restaurant seating | `capacityScope: slot`, `maxSpots` tables | Tables used at that start time; dining room and terrace count separately |

- Availability also respects the booking window and the provider's timezone. Today's past times are hidden.
- One provider is one resource. A booked appointment blocks that time across all of the provider's services, unless the service uses shared capacity.

## Statuses

```text
confirmed   -> rescheduled | cancelled
rescheduled -> rescheduled | cancelled
cancelled   -> terminal
```

Deposit bookings add `pending_payment_verification` and `payment_action_required` (see `rsvp-and-deposits.md`). Cancelled bookings stop blocking availability.

## Failure states

| Condition | Client sees |
| --- | --- |
| Slot taken while choosing | 409 on hold; list refreshes; pick another |
| Connection lost in details | Countdown continues; confirm/extend disabled until reconnect |
| Hold expired | Stays on details, form intact; "hold this time again" / "choose another time" |
| Extension already used | Server refuses; hold state refreshes |
| Confirmation conflict | No success screen; back to times with "someone confirmed that time first" |
| Invalid manage token | Generic not-found; reveals nothing |
| QR fails to render | Booking stays confirmed; ICS still offered |

## Owner side

- The dashboard updates in real time through Supabase Realtime, with fallback refresh on focus, visibility, online and every 15 seconds.
- Owners reschedule or cancel from the dashboard. They scan a client's QR at `/dashboard/scan`.
- Bookings move to Archive after 7 days. They are deleted one calendar month after their date unless the owner turns on 1-year history.
