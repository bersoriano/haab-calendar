# Haab Calendar — Landing Page Spec

> **For the implementing LLM:** This document defines the structure, copy, and conversion intent of the marketing landing page. It is content + layout only — no code. Build it in the project's existing stack (Next.js 16 / React 19 / Tailwind v4) following the app's visual language (soft "liquid glass" surfaces, blue `--primary`, teal accents, generous radius, light background). Every section lists its **purpose**, **copy**, and **conversion notes**. Replace every `[PLACEHOLDER]` before publishing. Keep one primary action — "Create your booking page" — and repeat it down the page. Mobile-first: the product itself is mobile-polished, the page must be too.

---

## 0. Page-Level Decisions

- **Primary audience (assumption — retarget if wrong):** service providers and small businesses who need to take bookings — clinics, coaches/advisors, padel & sports courts, salons, venues/banquet halls, coworking spaces. They are the buyer and the setup user. Their clients are the *end bookers* (a secondary audience addressed only through the provider's eyes).
- **One job of this page:** get a provider to start creating their booking page.
- **Primary CTA (used everywhere):** `Create your booking page` → scrolls to the required workflow selector. Setup/authentication starts only after the provider chooses a vertical.
- **Secondary CTA:** `See a live booking page` → opens a demo public flow on the canonical route, for example `/doctors/<demo-slug>`.
- **Tone:** confident, concrete, calm. Describe working product behavior without implying scale, integrations, or outcomes that are not yet proven.
- **Proof posture:** Haab is in early access. Lead with the working differentiators: zero client accounts, server-backed 10-minute holds, three booking modes, industry-aware language, and no-login self-service.

---

## 1. Top Navigation (sticky)

**Purpose:** orient + keep the primary CTA always one tap away.

**Contents:**
- Left: logo wordmark — **Haab Calendar**
- Center (desktop only): `How it works` · `Features` · `Use cases` · `FAQ`
- Right: `See a live page` (text link) + `Create your booking page` (primary button)
- Mobile: collapse links into a menu; keep the primary button visible in the bar.

**Conversion notes:** sticky on scroll; primary button high-contrast; nav links are anchor scrolls, not new pages.

---

## 2. Hero (above the fold)

**Purpose:** state the value proposition in one breath and drive the primary action.

**Eyebrow:** Public booking for real-world schedules

**Headline (pick one, A/B later):**
- A: **One booking link. Zero client accounts.**
- B: **Appointments, full days, and capacity-based tickets — in one booking flow.**

**Subheadline:**
Haab Calendar is an early-access platform for appointments, full-day reservations, and capacity-based tickets. Clients see live availability, receive a 10-minute hold while they finish, and get a private link to reschedule or cancel — without creating an account.

**Primary CTA:** `Create your booking page`
**Secondary CTA:** `See a live booking page →`

**Under-CTA microcopy:** Early access · Core booking flows are live · The product is still evolving.

**Hero visual (note for implementer):** show the actual public booking flow on a phone frame beside a desktop frame — calendar with real open dates highlighted, a held time slot, and the confirmation screen with QR code. Use the app's real UI, not stock art.

**Trust strip (directly below hero):** small row — `No client accounts` · `Protected 10-minute holds` · `Appointments, full-day & tickets` · `Self-service reschedule & cancel`.

**Conversion notes:** value prop visible without scrolling; one dominant button; secondary CTA opens a real public example rather than setup.

---

## 3. Early-Access Proof Bar

**Purpose:** reduce risk without inventing customer traction.

**Copy:** `0 client accounts required` · `10-minute soft hold` · `3 booking modes`.

**Stage note:** The core public flow works today. More integrations and administration tools are still being built.

**Conversion notes:** these are product facts, not customer metrics. Replace them with audited traction only when real data exists.

---

## 4. Problem → Agitation

**Purpose:** make the visitor feel the pain the product removes.

**Section heading:** Booking gets messy when every change becomes a conversation.

**Body:** Sharing availability through messages, calendar screenshots, and manual updates works until two people want the same time or a client needs to reschedule. Haab turns that process into one public link with clear booking rules.

**Pain bullets:**
- Back-and-forth just to land one appointment.
- Double-bookings because two people grabbed the "same" open slot.
- Confirmations that never reach the client's calendar.
- Reschedules and cancellations that all land back on you.
- Class and event capacity that still gets counted by hand.

**Transition line:** Haab replaces that coordination with live availability and self-service.

**Conversion notes:** mirror the reader's real Tuesday; specific, not abstract; each pain maps to a feature later.

---

## 5. Solution — How It Works (3 steps)

**Purpose:** show how fast value arrives. Keep to three steps.

**Section heading:** Publish one page, then let clients handle the routine.

**Step 1 — Add what you offer.**
Choose healthcare, spaces, professional services, or events. Then set services, duration, capacity, price, and weekly availability.

**Step 2 — Share one link.**
You get a clean public booking page at your own address. Drop it in your bio, your emails, a QR code on the door. Clients book themselves.

**Step 3 — Keep changes out of your inbox.**
Clients choose live availability, receive a 10-minute hold, and confirm. Afterward, their private link lets them reschedule or cancel on their own.

**CTA after steps:** `Create your booking page`

**Conversion notes:** numbered, scannable; each step ends in an outcome; one CTA immediately after.

---

## 6. Core Features (benefit-led)

**Purpose:** convert capabilities into outcomes. Lead each with the benefit, name the feature second.

**Section heading:** The core booking flow, designed as one system.

**Feature cards:**

1. **Availability reflects bookings and active holds.** Haab computes options from working hours, confirmed bookings, and unexpired holds before showing a time as available. *(Live availability.)*

2. **Every selection gets a 10-minute soft hold.** A visible countdown shows the remaining time, while server-side conflict protection rejects competing confirmations within Haab. *(Booking holds.)*

3. **Confirmations that stick.** Every booking produces an add-to-calendar file and a QR code to scan straight onto a phone — so it lands in a calendar, not a forgotten inbox. *(Calendar export + QR.)*

4. **Clients manage themselves.** Each booking comes with a private link to reschedule or cancel — no account, no login, no message to you. *(Token-based self-service.)*

5. **Appointments or whole days.** Offer 30-minute slots or full-day reservations — courts, venues, offices — from the same page. *(Appointment & full-day modes.)*

6. **Capacity-based event registrations.** Confirmed bookings and active holds count against an event's capacity. Online payment is not included yet. *(Tickets and capacity.)*

7. **Industry-aware language.** Healthcare, spaces, professional services, and events each use appropriate names for clients and booking actions. *(Vertical-specific copy.)*

**Conversion notes:** benefit headline bold, feature name in italics/caption; icons optional; 2-col desktop / 1-col mobile; don't exceed 8 cards.

---

## 7. Differentiator Spotlight (deep-dive blocks)

**Purpose:** give the 2–3 strongest, least-common features room to breathe with a visual each.

**Block A — Protected booking holds.**
Heading: The slot stays protected while they finish.
Body: A 10-minute hold reserves the selection while the client enters details. The countdown shows remaining time, expired holds are released, and server checks protect the same availability again before confirmation.
Visual: the countdown bar mid-flow on mobile.

**Block B — No-account self-service.**
Heading: They can reschedule or cancel without creating an account.
Body: Every confirmation carries a private management link. Clients can return later to change the date or cancel; Haab updates the booking and recalculates availability.
Visual: confirmation screen and the private management page.

**Conversion notes:** alternate image/text sides and keep every statement directly testable in a live example.

---

## 8. Use Cases / Templates

**Purpose:** help each visitor self-identify; show range without diluting the pitch.

**Section heading:** One page, shaped to your business.

**Subtitle:** Select a workflow below to start with the right services, availability, and booking settings.

**Cards (mirror the in-app templates):**
- **Clinics & practitioners** — New-patient consults, follow-ups, timed appointments with capacity and price.
- **Padel, tennis & sports courts** — Hourly court rentals, max-player capacity, back-to-back slots without overlap.
- **Advisors & coaches** — Strategy and planning sessions, premium pricing, one household per slot.
- **Venues & banquet halls** — Full-day exclusive reservations for events and receptions.
- **Coworking & private offices** — Day-pass desk and office bookings, seats per space.

**Microcopy under grid:** Choose the workflow closest to your business. You can adjust its services and availability during setup.

**CTA:** `Create your booking page` → returns to the required workflow selector; it must not open an untyped setup flow.

**Conversion notes:** each card = a "that's me" moment; use the real template names already in the product.

---

## 9. Mobile Section

**Purpose:** prove the experience is great where most bookings happen — on a phone.

**Heading:** Most of your clients book on a phone. So we built for the phone first.

**Body:** Square, thumb-friendly calendar dates. A confirm button that follows you up the screen so you never hunt for it. Time slots in a clean two-up grid. A countdown that's impossible to miss. The booking page feels like a native app, not a shrunk-down website.

**Visual:** the real mobile flow — calendar, slot grid, sticky bottom action bar, confirmation.

**Conversion notes:** this is a genuine, recently-hardened strength of the product — show real screens.

---

## 10. Objection Handling / FAQ

**Purpose:** remove the last reasons not to start.

**Heading:** Questions, answered.

- **Do my clients need an account?** No. They pick a slot, enter their details, and they're booked. No signups, no passwords.
- **How are double-bookings prevented?** Selecting a slot holds it for 10 minutes with a live countdown. Availability is computed live, so taken and held times never show as open.
- **Can clients reschedule or cancel themselves?** Yes — every booking includes a private management link to reschedule or cancel, with no login.
- **Can I take ticket registrations?** Yes. Events support capacity-based registrations. Payment processing is not included yet.
- **Can I sell full-day bookings, not just appointments?** Yes — appointments and full-day reservations live on the same page.
- **Can bookings be added to a calendar?** Every confirmation includes an ICS file and QR code. Two-way calendar sync is not claimed yet.
- **What is available today?** Public pages, holds, confirmations, event capacity, and self-service management are live. Haab remains in early access.
- **What does it cost?** Haab is free during the current early-access period. Paid plans and limits are not finalized.

**Conversion notes:** answer the *real* hesitations (client friction, double-booking, cost); keep answers short; put a soft CTA below.

---

## 11. Testimonials / Results

**Purpose:** borrow trust with specifics.

**Heading:** What you can verify in the live examples.

**Format:** verifiable product behaviors until real customer evidence exists.

- A client can book without creating an account.
- An active hold reduces availability before confirmation.
- Every confirmation includes a private reschedule/cancel route.

**Conversion notes:** do not style these as customer quotes or imply measured outcomes.

---

## 12. Early-Access Teaser

**Purpose:** state the current stage and limits clearly.

**Heading:** Use the core booking flow while we keep building.
**Body:** Haab is in early access. Public pages, holds, confirmations, capacity, and self-service work today. Pricing and some integrations are still being defined.

---

## 13. Final CTA (closing band)

**Purpose:** last, strongest push for visitors who scrolled the whole way.

**Heading:** Give clients one link — and a way to manage their own booking.
**Subhead:** Create an early-access page for appointments, full-day reservations, or capacity-based events. Clients do not need an account.
**Primary CTA:** `Create your booking page`
**Secondary CTA:** `See a live booking page →`

**Conversion notes:** visually distinct full-width band; restate the core promise + low-friction reassurance; same two CTAs as the hero.

---

## 14. Footer

**Purpose:** close out with navigation and credibility.

**Columns:**
- **Product:** How it works · Features · Use cases · See a live page
- **Company:** About · Contact · `[PLACEHOLDER]`
- **Legal:** Privacy · Terms
- **Brand block:** logo + one-line descriptor — "Booking pages that just work." + copyright `[PLACEHOLDER: year]`.

**Conversion notes:** keep a final text CTA in the footer; don't introduce new pitches here.

---

## 15. Section Order Summary (for layout)

1. Sticky nav
2. Hero + trust strip
3. Social proof bar
4. Problem / agitation
5. How it works (3 steps) → CTA
6. Core features
7. Differentiator spotlight (holds · no-account self-service)
8. Use cases / templates → CTA
9. Mobile section
10. FAQ / objections
11. Testimonials
12. Early-access teaser
13. Final CTA band
14. Footer

**Global conversion principles applied:** single value prop; one repeated primary CTA; benefit-first copy; specific over vague; proof early and again late; objections handled before the close; mobile-first; honest placeholders instead of fabricated claims.
