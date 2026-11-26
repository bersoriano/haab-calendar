# Feature inventory

Everything listed here has shipped and is on the free plan unless marked otherwise. Verified against `main @ 50fa348c` (2026-11-20). For anything absent, check `current-status.md` before answering.

## Contents
- Setup and publishing
- Public booking page
- Booking and capacity
- Client self-service
- Notifications
- Owner dashboard
- Analytics and growth
- Integrations, payments, RSVPs
- Data and privacy
- Plans and entitlements

## Setup and publishing

| Feature | Detail |
| --- | --- |
| Build before sign-up | A visitor can build and preview a complete page with no account. The draft is kept in the browser. An account is needed only to **publish**. |
| Industry presets | Picking an industry prefills services, durations, weekly hours, prices and booking rules. Everything is editable. See `industries.md`. |
| Account | Email and password (Supabase Auth). One booking page per owner account. |
| Change business type | The industry can be switched later from the dashboard. |
| Own link | Custom slug (`custom_slug`). Old slugs redirect. |
| Publish control | The page stays private until published and can be taken down without losing work. |

## Public booking page

| Feature | Detail |
| --- | --- |
| Themes | Six: default, dark, pink, summer, miami, winter. Chosen in Appearance. No code needed. |
| Branding | Header image, gallery images, hero text, custom booking footer (`custom_booking_footer`). |
| Language | English and Spanish. The owner's saved language wins and clients can switch with `?lang=`. |
| Mobile-first | Thumb-sized dates, a two-column slot grid, a sticky action bar and a compact progress bar. |
| Live availability | Shows only open times in the provider's timezone. |
| Locations | Up to two business addresses plus a custom address per service, each with an optional price override. |

## Booking and capacity

| Feature | Detail |
| --- | --- |
| Three modes, one page | Timed appointments, full-day reservations and capacity events side by side. |
| 10-minute server hold | One 5-minute extension and offline-safe. See `booking-flow.md`. |
| Event capacity | `maxSpots`; holds count against it; the event closes itself when full. Single-date or weekly. |
| Restaurant tables | N tables per seating; party size up to `maxPartySize`; separate rooms count separately. |
| Blocked windows | Breaks inside opening hours (lunch, split service). |
| Booking window | How far ahead clients can book. |
| Extra fields | Date of birth (healthcare), traveler fields (passport, emergency contact, diet, hotel pickup), notes. |

## Client self-service

- No account: a private manage link on the receipt, in every email and inside the QR.
- Reschedule within the same service using real availability. Cancel, with a confirmation step.
- Leave a note for the provider (500 characters).
- An `.ics` calendar file and a QR code on every confirmation.

## Notifications

| Feature | Detail |
| --- | --- |
| Confirmation email | To the client, plus a notification to the owner. Sent through a transactional outbox with retries. |
| Email reminders | On by default for new businesses, 24 hours before. Optional second reminder, custom lead times and a short custom message. Can be turned off per service. Sent in the client's booking language, with the manage link. Never includes client notes. Cancelling stops reminders and rescheduling replaces them. A reminder whose lead time has already passed is not sent late. Set in Settings → Email reminders. |
| Not built | SMS and WhatsApp booking notifications. WhatsApp exists only as the RSVP invitation share link. |

## Owner dashboard

| Section | Does |
| --- | --- |
| Dashboard | Overview |
| Guests | Guest list, only in invitation-only RSVP mode |
| Bookings | List, week and month views; reschedule, cancel, Archive; real-time updates |
| Clients | Everyone who has booked, kept after their bookings are gone; CSV export (`client_export`) |
| Scan | Scan a client's QR to open the booking |
| Analytics | Unique visitors per day; funnel: opened page → chose what → chose when → booked; which links bring bookings (`analytics`) |
| Campaigns | Tagged share links (source, medium, campaign) for each place the link is posted, with an optional QR for flyers |
| Services | Services, duration, price, capacity, locations, fields, deposits |
| Availability | Weekly hours, blocked windows, booking window |
| Appearance | Theme, images, text |
| Integrations | Google Calendar |
| Settings | Page and dashboard language (separate), reminders, retention, footer, RSVP mode, word set, bank deposits |

## Analytics and growth

- Booking-page analytics live in Supabase. The marketing site uses cookieless PostHog and GA4; that is not owner-facing.
- Live demo gallery at `/gallery` (see `industries.md`). A blog lives at `/blog`. SEO pages: `/en/online-booking-for-doctors`, `/es/agenda-online-para-medicos`.

## Integrations, payments, RSVPs

- **Google Calendar sync**: see `google-sync.md`.
- **Bank deposit receipts**: see `rsvp-and-deposits.md`. Spaces, professional services and open events only.
- **Invitation-only RSVPs**: see `rsvp-and-deposits.md`. Events vertical only.
- **No online payments.** Stripe is wired only for Haab's own future paid plans, not for client payments.

## Data and privacy

- Bookings move to Archive after 7 days and are deleted one calendar month after their date. One-year history is opt-in (`booking_history_retention`).
- Deposit receipts follow their own 12-month maximum.
- Client contact data never reaches Google. The manage token is stored only as a hash. Anonymous visitors never see booking lists or client data.

## Plans and entitlements

Source of truth: `lib/entitlements/catalog.ts`.

| Key | Free plan |
| --- | --- |
| `custom_slug` | Yes |
| `google_calendar_sync` | Yes |
| `google_calendar_busy_blocking` | Yes (needs sync; owner opts in) |
| `google_calendar_two_way_sync` | Yes (needs sync and busy blocking; owner opts in) |
| `analytics` | Yes |
| `booking_history_retention` | Yes (owner opts in) |
| `custom_booking_footer` | Yes |
| `client_export` | Yes |

- Premium is a placeholder tier and currently equals free.
- A support override can turn off any feature for one account. Precedence: override → billing subscription → plan tier → off.
- Lookups fail closed: an error resolves to "off".
