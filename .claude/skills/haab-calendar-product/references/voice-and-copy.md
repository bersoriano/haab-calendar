# Voice, copy rules, and language decisions

Sources: `docs/landing-page.md`, `components/landing/translations.ts`, landing copy tests in `components/landing/__tests__/`, and product decisions on language (2026-08-12).

## Contents
- Voice
- Standard phrases and CTAs
- Banned and guarded claims
- Spanish rules
- Language behavior in the product
- Copy that tests or reviewers pin

## Voice

- **Confident, concrete, calm.** Describe behavior that works. Don't hype.
- **Benefit first, feature second.** "Clients manage themselves." *(Token-based self-service.)*
- **Specific over vague.** "Held for ten minutes" beats "secure booking".
- **Short.** Fragments are fine in UI and marketing. One idea per sentence.
- **Address the owner as "you"**, and their customers by the industry word (`industries.md`).
- In public copy prefer "business", "owner" or "you" over "provider". "Provider" is an internal code term. Event organizer screens must not say "provider".

## Standard phrases and CTAs

| Purpose | English | Spanish |
| --- | --- | --- |
| Primary CTA | Create your booking page / Create your page | Crear mi página |
| Secondary CTA | See a live booking page | Ver una página real |
| Headline | One link. No sign-up. No double bookings. | Un enlace. Sin registrarse. Sin reservas duplicadas. |
| Price line | Free. No credit card needed. | Gratis y sin tarjeta de crédito. |
| Hold | 10-minute hold | Apartado de 10 minutos |
| Manage link | Private link to reschedule or cancel | Enlace privado para reagendar o cancelar |
| Save link card | Save this link – you can reschedule or cancel anytime without an account | — (see `components/booking/i18n/translations.ts`) |

Keep one primary action per page and repeat it.

## Banned and guarded claims

| Never say | Why |
| --- | --- |
| beta, early access, acceso anticipado | Product is live; a landing test fails on these words |
| HIPAA, SOC 2, NOM-024, "compliant", "certified" | No certifications; the doctors page test bans them |
| payments, pagos (healthcare copy); "accept payments online" anywhere | No payment processing. Bank deposits are manual review and not offered to healthcare. |
| reviews, reseñas, telemedicine, telemedicina | Not built |
| Customer counts, testimonials, ratings, logos | No audited traction exists |
| SMS or WhatsApp reminders | Reminders are email only. WhatsApp is only for sharing RSVP invitations. |
| Outlook, Apple or iCloud sync | Only Google syncs; `.ics` works anywhere |
| "Unlimited", "enterprise", "multi-location chains", "staff scheduling" | Not modeled; one page per account, one resource per page |
| "Premium feature" | Everything is on the free plan |

Guarded, i.e. true only with a qualifier:
- **"Busy times block your page"**: only if the owner turns on busy blocking.
- **"Two-way sync"**: opt-in, off by default.
- **"Works offline"**: true for holds surviving reconnects, standalone mode and RSVP door check-in. A public booking still needs the server to confirm.
- **"Reminders"**: email, on by default for new businesses, and only if delivery is configured on the host.

## Spanish rules

- Marketing speaks to the owner as **tú**: "tus clientes", "crea tu página". Never "usted", "su consultorio" or "sus pacientes" on marketing pages; a test enforces this on the doctors page.
- Use the industry's Spanish words: paciente/cita/agendar, comensal/mesa, asistente/registro, invitado/confirmar asistencia, huésped/reserva.
- Mexican and Latin American context is natural (CLABE, WhatsApp, quinceañera, tornaboda). Keep currency as the owner typed it.
- English and Spanish copy must have identical structure. Every key exists in both and none is empty.

## Language behavior in the product

These are locked product decisions. Raise any conflict instead of quietly reversing them.
1. **English is the default everywhere** (marketing, auth, setup). Spanish is opt-in and never a fallback.
2. **Spanish is detected from `Accept-Language` only.** No geo-IP.
3. **On a public booking page the owner's saved language wins** over the client's browser. Clients can switch with `?lang=`.
4. **Dashboard language is separate** from page language (`dashboard_language`).
5. **Prices are not locale-formatted.** `cost` is owner-typed free text. Deposit amounts are the exception: they are structured minor units plus an ISO currency.
6. **Super-admin is English-only** by design.

Emails and reminders use the **client's booking language**. Demo content: English demos are translated to Spanish. Spanish demos are not translated to English; the toggle changes only interface text.

## Copy that tests or reviewers pin

| Copy | Constraint |
| --- | --- |
| Landing `googleIntegration` (title, purpose, items, privacyLink) | Google's OAuth review reads it. Pinned by `components/landing/__tests__/google-disclosure.test.tsx`. Change layout freely; change words only with care. |
| Landing feature list | Must not contain beta or early access |
| Doctors page | No payments, reviews, certifications or telemedicine; Spanish in tú |
| Demo video | Never autoplays; exactly one caption track on |
| Demo count | Comes from `DEMO_PAGES.length` (`{n}` in copy); never hard-code it |
