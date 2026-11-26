# Differentiators and positioning

Sources: `docs/landing-page.md` (conversion brief), `components/landing/translations.ts` (shipping copy), `public/llms.txt`.

## Contents
- Positioning
- Differentiators with proof
- Message hierarchy
- Objections and answers
- Proof posture

## Positioning

| Element | Statement |
| --- | --- |
| Category | Online booking pages for small businesses |
| Audience (buyer) | Owners who take bookings: clinics and practitioners, courts and venues, advisors and coaches, salons, event and class organizers, restaurants, wedding planners |
| End users | Their clients, addressed only through the owner's eyes |
| Promise | One link. No sign-up. No double bookings. |
| Job of the marketing site | Get an owner to start creating their booking page |
| Price | Free; every feature is on the free plan |

## Differentiators with proof

Each claim must be checkable in a live demo (`industries.md`).

| # | Differentiator | Why it matters | Proof |
| --- | --- | --- | --- |
| 1 | **No client accounts, ever** | No sign-up friction for clients and no passwords to store or leak | Book any demo; only name, email and phone are asked |
| 2 | **10-minute server-side hold** | Two people can't confirm the same time; the slot is protected while the client types | Tap a slot on `/doctors/dr-maya-rivera`; the countdown starts; another browser can't take it |
| 3 | **Private self-service link** | Reschedules and cancellations stop landing in the owner's inbox | The confirmation shows "Save this link"; open it and reschedule |
| 4 | **Three booking modes on one page** | An hourly consult, a full-day venue and 40 class seats share one link and one tool | `/events/makers-workshop`, `/spaces/riverside-padel-club` |
| 5 | **Speaks the industry's language, in EN and ES** | Patients see "patients"; diners see "comensales"; every label, email and error matches | Compare `/doctors/...` with `/restaurants/casa-mirador` |
| 6 | **Industry presets** | The page arrives with services, hours and prices already set; edit instead of starting blank | Start dialog, about 20 seconds |
| 7 | **Privacy-first Google Calendar sync** | Bookings land on the owner's calendar; client details never go to Google | `google-sync.md` |
| 8 | **Invitation-only RSVPs** | A wedding's attendance end to end: household links, seats, menu, tables, QR door check-in that works offline | `/events/boda-valeria-y-diego` and sample invitations |
| 9 | **Build before sign-up** | Owners see their real page before creating an account | "Create your page" from the landing page |
| 10 | **Free** | No plan math; nothing is held back | FAQ: "Nothing. Every feature is on the free plan." |

Supporting strengths, best used where relevant:
- Confirmations and reminders that let clients act: `.ics`, QR and manage link in every email.
- Mobile-first public flow.
- Works through flaky connections: holds survive reconnects, and the door check-in runs offline.
- Bank deposit receipts suit businesses that are paid by transfer, e.g. CLABE in Mexico.
- Spanish-first details: Spanish demos, CLABE fields, WhatsApp invitations, tú voice.

## Message hierarchy

1. **Headline:** One link. No sign-up. No double bookings.
2. **Support:** live availability → 10-minute hold → private link to reschedule. No accounts, and no confirming bookings by hand.
3. **Range:** appointments, full days and events with capacity, on one page.
4. **Fit:** your industry's words and a preset, in English or Spanish.
5. **Extras:** reminders, Google Calendar, RSVPs, deposits, analytics.
6. **Close:** free; see a live page; create yours.

The fact strip on the landing page uses product facts, not traction:
- 10 min hold
- 0 client accounts
- {n} live demo pages
- ES · EN

## Objections and answers

| Objection | Answer |
| --- | --- |
| "Will clients bother signing up?" | They don't sign up. They pick a time, enter details and they're booked. |
| "How do you stop double bookings?" | The server holds the slot for 10 minutes and rejects any competing confirmation, even at the same second. |
| "I'll still get reschedule messages." | Every booking has a private link to reschedule or cancel without contacting you. |
| "I run classes, not appointments." | Events count confirmed and held spots against capacity and close when full. |
| "Does it work with my calendar?" | Confirmed bookings can appear on Google Calendar. Every confirmation has an `.ics` file for any calendar app. |
| "What does it cost?" | Nothing. Every feature is on the free plan; no credit card. |
| "Can I take payment?" | Not online. You can ask for a bank deposit; clients upload the receipt and you confirm. |
| "My clients speak Spanish." | The whole page, emails and reminders work in Spanish, with your industry's words. |

## Proof posture

- Use **product facts** and **verifiable behaviors**, never customer metrics, testimonials, logos or outcome claims. None exist in the project.
- "What you can verify in the live examples" replaces testimonials.
- Never imply scale ("thousands of businesses"), uptime guarantees or integrations that don't exist.
- Name no competitors and invent no comparisons. If asked to compare, describe Haab's own behavior and let the reader judge.
