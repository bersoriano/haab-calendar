# Haab Calendar — Landing Page Spec

> **For the implementing LLM:** This document defines the structure, copy, and conversion intent of the marketing landing page. It is content + layout only — no code. Build it in the project's existing stack (Next.js 16 / React 19 / Tailwind v4) following the app's visual language (soft "liquid glass" surfaces, blue `--primary`, teal accents, generous radius, light background). Every section lists its **purpose**, **copy**, and **conversion notes**. Replace every `[PLACEHOLDER]` before publishing. Keep one primary action — "Create your booking page" — and repeat it down the page. Mobile-first: the product itself is mobile-polished, the page must be too.

---

## 0. Page-Level Decisions

- **Primary audience (assumption — retarget if wrong):** service providers and small businesses who need to take bookings — clinics, coaches/advisors, padel & sports courts, salons, venues/banquet halls, coworking spaces. They are the buyer and the setup user. Their clients are the *end bookers* (a secondary audience addressed only through the provider's eyes).
- **One job of this page:** get a provider to start creating their booking page.
- **Primary CTA (used everywhere):** `Create your booking page` → links to the setup wizard (`/` setup flow).
- **Secondary CTA:** `See a live booking page` → opens a demo public flow on the canonical route, for example `/doctors/<demo-slug>`.
- **Tone:** confident, concrete, calm. Sell outcomes (filled calendar, fewer no-shows, zero back-and-forth), not features.
- **Proof posture:** the product has real, specific differentiators (offline-first, natural-language booking, slot holds, no-login self-service). Lead with those instead of inventing metrics.

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

**Eyebrow:** Booking pages for people who hate booking software

**Headline (pick one, A/B later):**
- A: **Your booking page, live in minutes — not your whole afternoon.**
- B: **Take bookings on a page that just works — online, offline, and on every phone.**

**Subheadline:**
Haab Calendar gives you a clean, shareable booking page where clients pick a real open slot, hold it, and confirm — with calendar files, reminders-ready confirmations, and self-service rescheduling. No accounts for your clients. No double-bookings. No back-and-forth.

**Primary CTA:** `Create your booking page`
**Secondary CTA:** `See a live booking page →`

**Under-CTA microcopy:** Free to set up · No credit card · Your first service takes about 2 minutes.

**Hero visual (note for implementer):** show the actual public booking flow on a phone frame beside a desktop frame — calendar with real open dates highlighted, a held time slot, and the confirmation screen with QR code. Use the app's real UI, not stock art.

**Trust strip (directly below hero):** small row — `Works offline` · `No client logins` · `Appointments & full-day` · `Add-to-calendar built in`. (Swap for customer logos once available — `[PLACEHOLDER: logos]`.)

**Conversion notes:** value prop visible without scrolling; one dominant button; secondary CTA lets skeptics self-serve proof; specificity ("about 2 minutes") beats vague claims.

---

## 3. Social Proof Bar

**Purpose:** reduce risk immediately after the hero.

**Copy options (use what's true):**
- Logo wall: `[PLACEHOLDER: 5–8 customer or industry logos]`
- Stat row (only with real data): `[PLACEHOLDER: e.g. "12,000 bookings confirmed"] · [PLACEHOLDER: "98% slots held without conflict"] · [PLACEHOLDER: "Set up in under 5 minutes"]`
- If no proof yet: replace with a single founder/credibility line — `[PLACEHOLDER: "Built by people who ran a clinic front desk for 6 years."]`

**Conversion notes:** never fake numbers; if empty, use an honest credibility statement rather than placeholder logos.

---

## 4. Problem → Agitation

**Purpose:** make the visitor feel the pain the product removes.

**Section heading:** Booking shouldn't cost you a job's worth of admin.

**Body:** Most providers run scheduling out of DMs, a phone, and a shared calendar held together by hope. Clients ask "what've you got Thursday?", you screenshot your week, they pick a slot that's already gone, you redo it. Someone double-books. A no-show eats an hour you can't refill.

**Pain bullets:**
- Endless back-and-forth just to land one appointment.
- Double-bookings because two people grabbed the "same" open slot.
- No-shows from bookings nobody added to a calendar.
- Reschedules and cancellations that all land back on you.
- Tools that die the moment the wifi does.

**Transition line:** Haab Calendar closes every one of those gaps.

**Conversion notes:** mirror the reader's real Tuesday; specific, not abstract; each pain maps to a feature later.

---

## 5. Solution — How It Works (3 steps)

**Purpose:** show how fast value arrives. Keep to three steps.

**Section heading:** From zero to a shareable booking page in three steps.

**Step 1 — Add what you offer.**
Pick a template (consult, court rental, strategy session, full-day venue, day office) or start blank. Set duration, capacity, price, and your weekly hours. Done in minutes.

**Step 2 — Share one link.**
You get a clean public booking page at your own address. Drop it in your bio, your emails, a QR code on the door. Clients book themselves.

**Step 3 — Let it run.**
Clients pick a genuinely open slot, the system holds it while they finish, and they get an add-to-calendar file plus a self-service link to reschedule or cancel. Your calendar fills itself.

**CTA after steps:** `Create your booking page`

**Conversion notes:** numbered, scannable; each step ends in an outcome; one CTA immediately after.

---

## 6. Core Features (benefit-led)

**Purpose:** convert capabilities into outcomes. Lead each with the benefit, name the feature second.

**Section heading:** Everything a booking page needs — and nothing it doesn't.

**Feature cards:**

1. **Only real open slots show.** Availability is computed live from your hours and existing bookings, so clients can only pick times that are actually free. *(Real-time availability engine.)*

2. **No more double-bookings.** The instant a client selects a time, it's held for them for 10 minutes with a visible countdown. Two people can't grab the same slot. *(Booking holds.)*

3. **Book by typing it.** Clients can type "next Monday at 2pm" or "tomorrow morning" and the page understands it. *(Natural-language scheduling.)*

4. **Confirmations that stick.** Every booking produces an add-to-calendar file and a QR code to scan straight onto a phone — so it lands in a calendar, not a forgotten inbox. *(Calendar export + QR.)*

5. **Clients manage themselves.** Each booking comes with a private link to reschedule or cancel — no account, no login, no message to you. *(Token-based self-service.)*

6. **Appointments or whole days.** Sell 30-minute slots or full-day reservations — courts, venues, offices — from the same page. *(Appointment & full-day modes.)*

7. **It works when the internet doesn't.** The page keeps running offline and syncs when you're back online, so a dead signal never costs you a booking. *(Offline-first architecture.)*

8. **Looks right on every phone.** The booking flow is built mobile-first — big tap targets, a sticky confirm button, a calendar that's actually usable with a thumb. *(Mobile-optimized public flow.)*

**Conversion notes:** benefit headline bold, feature name in italics/caption; icons optional; 2-col desktop / 1-col mobile; don't exceed 8 cards.

---

## 7. Differentiator Spotlight (deep-dive blocks)

**Purpose:** give the 2–3 strongest, least-common features room to breathe with a visual each.

**Block A — Holds that kill double-booking.**
Heading: The slot is theirs the moment they tap it.
Body: A 10-minute hold with a live countdown locks the time while the client enters their details. Green to amber to red, an expiry warning, and a graceful release if they walk away. No other booker can take a held slot. Conflicts simply can't happen.
Visual: the countdown bar mid-flow on mobile.

**Block B — Natural-language booking.**
Heading: They book the way they think.
Body: "Next Friday." "Tomorrow at 3:30." "May 15 morning." The page parses plain language into a real, available slot — then confirms it back so there's no ambiguity. Fewer fields, faster bookings, less drop-off.
Visual: the type-a-date input resolving to a confirmed slot.

**Block C — Offline-first.**
Heading: A booking tool that doesn't need perfect wifi.
Body: Haab Calendar runs locally first and treats the network as a sync target, not a lifeline. Take bookings at a court with one bar of signal, in a basement clinic, at a venue with flaky guest wifi — and let it catch up when you're back online.
Visual: subtle "offline → synced" state indicator.

**Conversion notes:** alternate image/text sides; these are the "why us, not Calendly" blocks — keep them concrete.

---

## 8. Use Cases / Templates

**Purpose:** help each visitor self-identify; show range without diluting the pitch.

**Section heading:** One page, shaped to your business.

**Cards (mirror the in-app templates):**
- **Clinics & practitioners** — New-patient consults, follow-ups, timed appointments with capacity and price.
- **Padel, tennis & sports courts** — Hourly court rentals, max-player capacity, back-to-back slots without overlap.
- **Advisors & coaches** — Strategy and planning sessions, premium pricing, one household per slot.
- **Venues & banquet halls** — Full-day exclusive reservations for events and receptions.
- **Coworking & private offices** — Day-pass desk and office bookings, seats per space.

**Microcopy under grid:** Don't see yours? Start from blank — it takes two minutes.

**CTA:** `Create your booking page`

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
- **Does it work without internet?** Yes. Haab Calendar runs offline-first and syncs when you reconnect.
- **Can I sell full-day bookings, not just appointments?** Yes — appointments and full-day reservations live on the same page.
- **Will bookings land in my calendar?** Every confirmation includes an add-to-calendar file and a scannable QR code.
- **How long does setup take?** Your first service takes about two minutes. `[PLACEHOLDER: confirm/adjust]`
- **What does it cost?** `[PLACEHOLDER: pricing answer — keep honest and simple.]`

**Conversion notes:** answer the *real* hesitations (client friction, double-booking, cost); keep answers short; put a soft CTA below.

---

## 11. Testimonials / Results

**Purpose:** borrow trust with specifics.

**Heading:** Providers who stopped chasing bookings.

**Format:** 2–3 short quotes, each with name, role, business type, and one concrete outcome.

- `[PLACEHOLDER: "Cut my front-desk back-and-forth to basically zero." — Name, Clinic owner]`
- `[PLACEHOLDER: "No double-booked courts since we switched." — Name, Padel club manager]`
- `[PLACEHOLDER: "Clients reschedule themselves now. I just show up." — Name, Advisor]`

**Conversion notes:** specific outcome > generic praise; include a face/photo slot; never fabricate — leave as placeholders until real quotes exist.

---

## 12. Pricing Teaser (optional — include only if pricing exists)

**Purpose:** set expectation and route to detail without derailing the page.

**Heading:** Simple pricing. `[PLACEHOLDER]`
**Body:** `[PLACEHOLDER: one-line pricing summary + "See full pricing →" link.]`

**Conversion notes:** if pricing isn't ready, omit this section entirely rather than show a placeholder; an empty pricing block kills trust.

---

## 13. Final CTA (closing band)

**Purpose:** last, strongest push for visitors who scrolled the whole way.

**Heading:** Give your clients one link. Get your calendar back.
**Subhead:** Set up your first service in about two minutes — free, no credit card.
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
7. Differentiator spotlight (holds · natural language · offline)
8. Use cases / templates → CTA
9. Mobile section
10. FAQ / objections
11. Testimonials
12. Pricing teaser (optional)
13. Final CTA band
14. Footer

**Global conversion principles applied:** single value prop; one repeated primary CTA; benefit-first copy; specific over vague; proof early and again late; objections handled before the close; mobile-first; honest placeholders instead of fabricated claims.
