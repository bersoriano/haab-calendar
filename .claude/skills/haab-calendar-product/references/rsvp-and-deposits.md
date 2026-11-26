# Invitation-only RSVPs and bank deposit receipts

Two optional modes that change the public flow. Sources:
- `docs/superpowers/specs/2026-11-08-wedding-rsvp-design.md`
- `docs/superpowers/specs/2026-11-18-bank-deposit-receipts-design.md`
- `lib/rsvp-*.ts`, `lib/invitations.ts`, `lib/seating.ts`, `lib/door.ts`
- `lib/bank-deposit*.ts`

## Contents
- Invitation-only RSVPs
- Bank deposit receipts
- Claims to avoid

## Invitation-only RSVPs

**What:** a setting on an **events** page (Settings → "Invitation-only RSVPs"). Only invited households can answer, each through its own link. Built for weddings. It also fits quinceañeras, baptisms, galas and other private events. It shipped in PRs #82–#90 (Nov 2026).

**Separate from wording:** RSVP mode is behavior. The `weddings` word set is wording (guest/invitado, RSVP/confirmación). They are independent settings.

### Model

| Concept | Meaning |
| --- | --- |
| Wedding / private event | One provider page on events with `rsvp_mode = invitations`. Its services are the moments, e.g. welcome dinner, ceremony, brunch. |
| Invitation | One household: a display name, optional phone and email, a **seat limit**, the events it is invited to, its own link and planner notes |
| Guest | One person on an invitation. There are never more guests than the seat limit. An unnamed plus-one shows as "Guest of Ana". |
| Response | Per invitation and event, derived: *no answer*, *attending* or *declined* |

### Guest experience

- The public page shows the story, cover and schedule (date, time, place, notes). It has **no booking button**; it tells guests to open their personal link.
- The invitation link (`/events/{slug}/i/{token}`) greets the household ("we saved 4 seats for you") and shows only its invited events.
- **One submit covers every event:**
  - who's coming to each event
  - "we can't make it"
  - the planner's questions, per guest (menu, diet) or per invitation (shuttle hotel)
  - corrected contact details
- Declining everything is a valid answer.
- Answers can be edited from the same link until the **RSVP deadline**. After that they are read-only, with the planner's contact shown.
- Once the planner publishes seating, each guest sees a table per event and a **QR** to show at the door.
- No account. An invalid link shows a plain "ask whoever sent it" page and reveals nothing.
- **RSVPs never become bookings.** An invited guest is never turned away because an event is "full". Capacity is the planner's job; the dashboard warns when confirmed people exceed it.

### Planner experience

- **Guests** dashboard section, first in the nav in this mode:
  - recent answers
  - totals per event: confirmed people, declined, no answer, capacity warning
  - filters and search
  - add guests one at a time or **paste from a spreadsheet** (with a preview and per-row errors)
  - CSV export
- **Invitations:** send by **WhatsApp link** (message prefilled) or email. Reminders are sent manually by the planner; there are no automatic reminders.
- **Questions:** fixed-option questions per guest or per invitation on chosen events, with per-option counts for caterers.
- **Seating:** named tables per event, assigned per person, hidden from guests until "publish seating".
- **Door check-in:** scan the household QR. The door list is kept in the browser and works **with no network**. Scans are matched by token hash locally.
- **Story:** short text shown on the page and in the link preview when the URL is shared.
- **Limits:** one wedding per account. The guest-list editor is read-only offline; no offline edit queue yet. The English toggle on a Spanish wedding page changes interface text, not the planner's own text.

## Bank deposit receipts

**What:** for chosen services, the client pays a deposit by bank transfer or cash deposit **outside Haab**, uploads the receipt and books. The owner checks their own bank and confirms or rejects. **A receipt is evidence for review, not proof of payment.** Haab moves no money.

**Eligible:** spaces, professional services and open events. **Not eligible:** healthcare, restaurants and invitation-only RSVP pages. This is enforced in the database.

### Owner setup

Settings → Bank deposits:
1. Enter one bank account: bank name, account holder, ISO country and currency, and at least one of account number, CLABE or IBAN. SWIFT/BIC and routing code are optional. Add instructions in English and Spanish.
2. Enable it.
3. On each service, turn on the deposit and enter an **exact numeric amount** in that currency. The free-text display price cannot be used.

### Client flow

- The final step shows the amount, a **reference**, the bank details, the instructions and a copyable return link.
- The client uploads one JPEG, PNG or WebP image (10 MB maximum). The server validates it, and Confirm stays disabled until the upload succeeds.
- The booking is created as **pending payment verification** and **occupies the slot**.
- The email says "receipt received, booking pending", never "payment confirmed".
- A bank trip can outlast the 10-minute hold. The return link restores the checkout and uploaded receipt for up to **72 hours**, but the client must pick an available slot again.

### Review

| Owner action | Result |
| --- | --- |
| Confirm | Booking fully confirmed; client emailed |
| Reject with reason | Client emailed. A **24-hour correction window** starts once that email is accepted for delivery. The manage link accepts a replacement receipt. |
| No replacement in 24 hours | Booking cancelled; capacity freed |
| Money arrives after cancellation | Owner marks `refund_due`, refunds outside Haab, then marks `refunded` |

### Statuses

- Booking: `pending_payment_verification` and `payment_action_required`, in addition to the usual ones.
- Payment: `pending_verification`, `receipt_rejected`, `payment_confirmed`, `refund_due`, `refunded`.

### Privacy and retention

- Receipts sit in private storage. Only the owner can view them, through 5-minute signed URLs.
- Receipts are never attached to email or put on calendar events.
- All attempts, including rejected ones, are kept for at most 12 months from the later of the service date or the resolution. The owner is warned 30 days before deletion.

### Not in this release

OCR, automatic bank matching, multiple accounts, partial deposits, automatic refunds and card payments.

## Claims to avoid

| Avoid | Use |
| --- | --- |
| "Collect payments", "accept deposits online" | "Ask for a bank deposit; clients upload the receipt and you confirm after checking your bank." |
| "Verified payments" | The owner verifies. Haab records the decision. |
| "Wedding website builder" | "Invitation-only RSVPs: one link per household, guest list, questions, seating, QR check-in." |
| "Automatic RSVP reminders" | Reminders are sent by the planner via WhatsApp link or email. |
| "SMS or WhatsApp login" | Personal links only. |
