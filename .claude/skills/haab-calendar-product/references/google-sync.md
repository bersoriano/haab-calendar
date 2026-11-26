# Google Calendar sync

Sources: `docs/tutorials/google-calendar-integration.md` (deep design), `lib/google/*`, `lib/entitlements/catalog.ts`. The tutorial predates 2026-11-20 and calls busy blocking and two-way sync "override only". That is stale: all three capabilities are on the free plan now.

## Contents
- Three capabilities
- Privacy promise
- Connecting
- Haab → Google
- Google → Haab: busy blocking
- Google → Haab: two-way
- Delivery timing
- Saying it correctly

## Three capabilities

| Capability | Direction | Entitlement key | Default | Needs |
| --- | --- | --- | --- | --- |
| Projection | Haab → Google | `google_calendar_sync` | On once connected | A connected account and a target calendar |
| Busy blocking | Google → Haab availability | `google_calendar_busy_blocking` | **Off** | Projection |
| Two-way sync | Google → Haab bookings | `google_calendar_two_way_sync` | **Off** | Projection and busy blocking |

All three are included on the free plan. Busy blocking and two-way stay off until the owner turns each on in Integrations, because both read or act on the owner's wider calendar.

## Privacy promise

| What | Goes to Google? |
| --- | --- |
| Service name, date and time | Yes |
| Client name, email, phone, notes, details | **Never** |
| Deposit receipt or bank details | **Never**. A pending deposit booking appears as a private busy event labeled payment pending. |
| Owner's other events (busy blocking) | Haab reads **free/busy intervals only**: no titles, descriptions, locations or attendees. |

Reason given publicly: calendars get shared, and Haab cannot control who sees an owner's calendar.

OAuth scopes are narrow: `calendar.events` and `calendar.calendarlist.readonly`, never the full `calendar` scope. Refresh tokens are sealed with AES-256-GCM before storage, and access tokens are never stored. Disconnecting is always available, even if the feature is turned off for the account, and revokes access immediately.

## Connecting

1. Owner opens Integrations, clicks Connect and approves on Google's consent screen.
2. Owner picks the target calendar Haab writes to.
3. Bookings made before connecting are backfilled from a start date (cancelled ones are skipped). New ones flow automatically.
4. Optional: turn on busy blocking and pick up to 10 calendars. Optional: turn on two-way.

## Haab → Google

- A booking never calls Google during the client's request. A database trigger writes an outbox row, and a worker delivers it at least once. A booking cannot fail because Google is down.
- Event IDs are deterministic (a hash of namespace, provider and booking), so retries never duplicate.
- Haab updates only events it owns, checked through private markers. It never overwrites a foreign event. Its updates touch only Haab's fields, so attendees, reminders, colour and conferencing the owner added survive.
- Times are the provider's local wall time plus timezone. Google applies DST. Full-day bookings become all-day events.

## Google → Haab: busy blocking

- Owner-chosen calendars block slots on the public page.
- The target calendar is never a busy source, because its events are Haab's own bookings.
- Browsing can use the cached snapshot. **Hold, confirmation and reschedule re-check.** If Google is unreachable and the cache is too old, the booking is refused with a retryable error rather than booked over a possible commitment (fails closed).

## Google → Haab: two-way

- Moving a Haab event in Google reschedules the booking. The move goes through the same rules as a reschedule in Haab: hours, capacity and overlap. The audit actor is `google_calendar`.
- Refused moves file a conflict, keep the booking as it was and restore the Google event:
  - duration changed (drag-resize, or turned into an all-day block)
  - moved onto another Haab booking or onto busy time
  - recurring event
  - deletion without opt-in
  - ownership mismatch
- Deleting the event cancels the booking only if the owner opted in (`deletionCancelsBooking`, off by default).
- Ownership-mismatch and calendar-changed conflicts are never repaired automatically.

## Delivery timing

- Workers run every 5 minutes, driven by a GitHub Actions schedule (not Vercel cron).
- Google push channels make inbound changes prompt where the domain is verified. Without push, changes arrive on the 5-minute cycle.
- Support note: a GitHub scheduled workflow is silently disabled after 60 days without a commit. Check that first if sync stalls with no errors.

## Saying it correctly

| Avoid | Use |
| --- | --- |
| "Full two-way sync with Google" (unqualified) | "Confirmed bookings appear on your Google Calendar. You can also let your calendar block times and let moves in Google update bookings." |
| "Haab reads your calendar" | "Haab reads only busy times from the calendars you pick, if you turn that on." |
| "Syncs your clients to Google" | "Your clients' details stay in Haab. Events carry only the service name." |
| "Works with Outlook, Apple or iCloud" | Not built. Only Google syncs. Any calendar app can import the `.ics` file from a confirmation. |
| "Requires Premium" | Included on the free plan. |
