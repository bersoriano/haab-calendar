# Manual test — Professional / software consultant (remote calls)

Persona: **freelance software consultant** using the app for paid consulting
calls and free recruiter interviews. Everything is **remote** (video call).
Exercises the professional vertical with a paid + a free service.

Last run: 2026-06-17 · Result: **PASS** (core flow); several remote-work gaps
found (see findings).

---

## Setup

1. `npm run dev` → `http://localhost:3000`.
2. Reset workspace: Settings → **Reset standalone setup** → choose
   **Professional services**.
3. Provider: Full name `Alex Rivera`, Business `Alex Rivera — Software
   Consulting`, Email `alex@rivera.dev`. Leave the address fields empty
   (remote). → Continue.
4. Availability: default Mon–Fri 09:00–18:00 → Continue → publish.
   Public page: `/professionals/alex-rivera-software-consulting`.

## Edit the two seeded services

Services tab.

### Strategy session → Consulting call (paid)

| Field | Value |
|---|---|
| Name | `Consulting call` |
| Duration | 1 hour |
| Total | `$180` |
| Capacity | `1 client` |
| Description | `A paid 1:1 call to review your architecture, codebase, or technical strategy…` |
| Location | type in "Add an address": `Online — Google Meet (link sent after booking)` (workaround — see findings) |

### Quick consult → Recruiter interview (free)

| Field | Value |
|---|---|
| Name | `Recruiter interview` |
| Duration | 30 minutes |
| Total | `Free` |
| Capacity | `1 recruiter` |
| Description | `A free 30-minute intro call for recruiters…` |
| Location | tick the existing `Online — …` address |

## Checks

- Professional copy throughout: "Choose a service", "session" / "schedule" /
  "client", `/professionals/<slug>` URL, "Session summary".
- Both services list on the public root with price ("$180" / "Free") and the
  online location.
- Book the free recruiter interview: weekday calendar → 30-min slot → details →
  confirm. Confirmation shows **Total: Free**, **Location: Online — …**, manage
  link + "Add to calendar".

## Findings (2026-06-17)

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | — | Professional vertical handles a paid + free service, weekday scheduling, and the full book→confirm→manage flow cleanly. | **Pass** |
| 2 | — | "Free" works as a free-text Total (shown as "Free" on cards, step 2/3, confirmation). | **Pass** (free-text) |
| 3 | Medium | **No online / video-call location.** Remote consultants have no street address; the only way to convey "this is a Google Meet/Zoom call" is to type it into the address field (which also promotes to a provider address slot). There's no structured meeting link, no "online" location type, and the join URL is not put into the `.ics` as a real join link. | Open — see future-features "Online / video-call location". |
| 4 | Low | **No real "free" concept.** Price is free-text, so "Free" is just text — no payment-free flag, no validation that free events skip cost. Fine for now. | Open (covered by structured-pricing future work). |
| 5 | Low (cosmetic) | Professional details + confirmation still read "About the Appointment" / "Type: Appointment" rather than session/professional wording (events were reworded; professional/spaces were not). | Open — extend the event-wording rework to all non-healthcare verticals, or make it copy-driven. |
| 6 | Low | Phone number is **required** to book. For a remote recruiter intro, phone may be irrelevant; email would suffice. | Open — consider making phone optional per service/vertical. |
| — | n/a | Timezone (cross-tz recruiter calls) and notifications ("link sent after booking" can't actually send) are already tracked in future-features. | Deferred |

### Notes

- The custom address typed on the first service promotes to the provider's
  Address 1 slot (existing behavior) — so subsequent services can tick it.
- "Add to calendar" downloads an `.ics`; it carries the location text but not a
  structured video-join URL.
