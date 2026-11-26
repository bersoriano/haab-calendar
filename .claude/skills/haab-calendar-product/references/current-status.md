# Current status

**As of 2026-11-26** (repo `main @ 50fa348c`, last product change 2026-11-20). Re-verify anything time-sensitive in the code before stating it as current.

## Contents
- Stage
- Shipped timeline
- Known limits
- Not built
- Stale sources

## Stage

- **Live in production** at `https://haabcalendar.com`, with 14 public demo pages.
- **Free:** every shipped feature is on the free plan since 2026-11-20 (PRs #100, #101). The premium tier exists but equals free. Stripe checkout stays wired for future paid features.
- Never describe the product as beta, early access or a waitlist.
- No published customer metrics, testimonials or case studies.

## Shipped timeline (high level)

| When (2026) | Shipped |
| --- | --- |
| May–Jul | Public booking flow, 10-minute server holds, manage links, ICS/QR, verticals and presets, Spanish (Jun), Supabase backend |
| Aug | Guest builder, restaurants (tables per seating), language decisions, custom slugs, themes, entitlements, Google Calendar projection, busy blocking, two-way |
| Oct | Dashboard redesign and routes, booking-page analytics, retention, custom footer |
| Nov 3 | Client list |
| Nov 8–9 | Invitation-only RSVPs: guest list, deadline, questions, seating, QR check-in, story; wedding demo |
| Nov 18–19 | Email reminders; bank deposit receipts |
| Nov 20 | Landing feature list; everything on the free plan; Google sync on the free plan |

## Known limits (true today; say them plainly when relevant)

| Limit | Detail |
| --- | --- |
| One date per booking | No multi-night or date-range stays; no hotel use case |
| One resource per page | A booked appointment blocks that time across all of the provider's services. Shared capacity exists only for events and restaurants. |
| One page per account | A planner runs one wedding per account |
| Open events: one spot per registration | No party size or group tickets on open events; restaurants have party size; invitations have seat limits |
| One price per service | Text price plus optional per-location override; no ticket tiers |
| Weekly events recur forever | No end date, skip dates or every-other-week |
| Full-day needs an uninterrupted day | A blocked window on that weekday or any booking that date prevents it |
| Reminders | Email only; delivery needs host email config and running workers |
| Deposits | One bank account, full amount, manual review; not for healthcare, restaurants or RSVP pages |
| Payments | None online |
| Customer reschedule policy | No owner-set cutoff or "disable rescheduling" yet (designed 2026-08-19, not built) |
| Guest-list editor offline | Read-only offline; no offline edit queue |
| Spanish demo pages | The English toggle doesn't translate the owner's own text |
| Booking history | Deleted one calendar month after its date unless 1-year history is on |
| Calendars | Google only; other calendars import `.ics` |

## Not built (don't promise; okay to call "not available")

- Online card payments, partial deposits, automatic refunds, OCR receipt matching
- Waitlists, ticket tiers, group tickets for open events, promo codes
- SMS or WhatsApp notifications; automatic RSVP reminders
- Outlook, Apple or iCloud calendar sync
- Multi-staff or multi-room scheduling, several pages per account, team accounts
- Reviews or ratings, telemedicine, intake forms beyond the built-in fields
- Recurring-event end dates and exceptions; timezone conversion for viewers
- Wallet passes (Apple/Google Wallet): design note only, not scheduled
- Component slot overrides and feature flags for child projects (planned seams)

## Stale sources (don't quote as current)

| File | Stale because |
| --- | --- |
| `docs/future-features.md` (Jul) | Lists notifications as unbuilt; they shipped |
| `STRATEGIC_PRODUCT_ROADMAP.md`, `EPICS_AND_STORIES.md`, `UX_RECOMMENDATIONS.md`, `BACKEND_RECOMMENDATIONS.md` (Jun–Aug) | Early plans; many items are now shipped |
| `docs/tutorials/google-calendar-integration.md`, `premium-features.md` | Say busy blocking and two-way are override-only and Google sync is premium; all are free now |
| `docs/landing-page.md` sections 3, 10, 12 | Early-access framing and "two-way sync not claimed". The "Current implementation" block at the top is current. |
| `docs/booking-process.md` §10b | Says Google adapter doesn't exist; it does |
| `docs/superpowers/specs/*` | Design intent; check the code for what shipped |
