# Industries, terminology, presets, demos

Sources: `config/verticals.ts` (presets), `lib/vertical-copy.ts` (word sets), `lib/demo-pages.ts` (demo allowlist).

## Contents
- Verticals and presets
- Terminology (EN/ES)
- Word sets
- Live demo pages
- What no vertical models

## Verticals and presets

Five verticals (`VerticalId`). Each preset prefills services, hours and prices. Owners edit everything.

| Vertical id | URL segment | For | Preset services | Preset hours |
| --- | --- | --- | --- | --- |
| `healthcare` | `doctors` | Doctors, specialists, dentists, vets | New patient consultation 30 min $120; Follow-up visit 15 min $60 | Mon–Fri 09–17 |
| `spaces` | `spaces` | Courts, venues, shared offices | Court/space rental 60 min $40/hour; Full-day venue | Every day 08–22 |
| `professional` | `professionals` | Advisors, accountants, consultants, salons, coaches | Strategy session 60 min $200; Quick consult 30 min $90 | Mon–Fri 09–18 |
| `events` | `events` | Races, workshops, classes, gatherings, tours, weddings | General admission 120 min, 50 spots, $25/ticket; Full-day pass, 200 spots | Wed–Sun 10–20 |
| `restaurant` | `restaurants` | Dining rooms taking table reservations | Dinner table 90 min, 12 tables, party ≤8; Lunch table 60 min, 10 tables, party ≤6 | Lunch and dinner with an afternoon break (blocked window) |

- Healthcare is the core industry on the landing page ("Our core industry") and has its own SEO page.
- Prices are free text typed by the owner ("$95", "£220"). They are never formatted for a locale.

## Terminology (EN/ES)

Every label, confirmation and error uses the vertical's words. Use them in copy aimed at that industry.

| Vertical | Client | Booking | Book verb | Services | Page |
| --- | --- | --- | --- | --- | --- |
| Healthcare | patient / paciente | appointment / cita | schedule / agendar | medical services / servicios médicos | appointment page |
| Spaces | guest / huésped | reservation / reserva | reserve / reservar | spaces / espacios | reservation page |
| Professional | client / cliente | appointment / cita | schedule / agendar | services / servicios | scheduling page |
| Events | attendee / asistente | registration / registro | register / registrarse | events / eventos | registration page |
| Restaurants | guest / comensal | reservation / reserva | reserve / reservar | tables / mesas | reservation page |
| Default (no vertical) | client / cliente | booking / reserva | book / reservar | services / servicios | booking page |

Never call patients "customers". The landing page says: "Patients see 'patients,' not 'customers.'"

## Word sets

A word set (`Vocabulary`) replaces a vertical's words on one provider's page and dashboard. Behavior does not change.

| Word set | Used with | Client | Booking | Verb |
| --- | --- | --- | --- | --- |
| `tours` | events | traveler / viajero | booking / reserva | book / reservar |
| `weddings` | events | guest / invitado | RSVP / confirmación | RSVP / confirmar asistencia |

- Word sets are separate from invitation-only RSVP mode. `weddings` renames things; `rsvp_mode = invitations` changes behavior.
- Industry wording belongs in word sets, never hard-coded in shared components. This repo is the parent template for child projects.

## Live demo pages

All are fictional and public. No login is needed; anyone can book them like a client. The full grid is at `/gallery`. The landing page shows four, and Dr. Maya Rivera is always first.

| Demo | URL | Shows |
| --- | --- | --- |
| Dr. Maya Rivera | `/doctors/dr-maya-rivera` | Healthcare appointments, patient language |
| Riverside Padel Club | `/spaces/riverside-padel-club` | Hourly court; a booked slot blocks others |
| Northstar Strategy | `/professionals/northstar-strategy` | Consulting sessions, email and manage link |
| Makers Workshop | `/events/makers-workshop` | Event capacity, spots left |
| Kilómetro Cero Running (ES) | `/events/kilometro-cero-running` | Single-date race plus weekly training |
| Nube Rosa Nail Studio (ES) | `/professionals/nube-rosa-nail-studio` | Beauty appointments |
| Brightpoint Dental | `/doctors/brightpoint-dental` | Dentist, lunch break, one chair |
| Clínica Veterinaria Patitas (ES) | `/doctors/clinica-veterinaria-patitas` | Veterinary |
| Copperline Hair Studio | `/professionals/copperline-hair-studio` | One chair, each appointment its own slot |
| Northgate Auto Service | `/professionals/northgate-auto-service` | One service bay |
| Fairway Lab Golf | `/professionals/fairway-lab-golf` | Personal coaching, price by length |
| Casa Mirador | `/restaurants/casa-mirador` | 12 tables per seating; dining room and terrace counted separately |
| Ruta Cenote Tours | `/events/ruta-cenote-tours` | `tours` word set, dated departures, minimum group size, traveler details |
| Boda de Valeria & Diego (ES) | `/events/boda-valeria-y-diego` | Invitation-only RSVP, 31 households |

Wedding sample invitations:
- Unanswered: `/events/boda-valeria-y-diego/i/DemoBodaValeriaYDiego-sample-invitation-001`
- Answered and seated: `/events/boda-valeria-y-diego/i/DemoBodaValeriaYDiego-answered-invitation-1`

Any other token, such as `…-002`, correctly shows "link not valid". That is not a bug.

Every demo except Casa Mirador models a **single-resource** business: one room, chair, bay or coach. A booked slot blocks that time across all of the provider's services.

## What no vertical models

- **Hotel stays.** A booking has one `dateKey`. A 3-night stay would be 3 unlinked bookings. No demo exists, and none should be promised.
- **Multi-resource scheduling** (several staff or rooms under one page with separate calendars). Not modeled, except shared capacity for events and restaurants.
- **Full-day demos.** None exist. Full-day needs an uninterrupted day, so blocked windows on that weekday prevent it.
