# Manual test — Healthcare / urologist (two visit types, two locations)

Persona: **medical doctor (urologist)**. Real data copied from
`https://www.umgrupomedico.com/urologo-en-chalco` (Dr. Abraham López Venegas,
UM Grupo Médico). Exercises the healthcare vertical: medical specialty,
appointment vs follow-up pricing, and a service linked to two clinic addresses.

Last run: 2026-06-16 · Result: **PASS** (1 known limitation: per-location
pricing is free-text only — see findings + future-features).

---

## Setup

1. `npm run dev` → `http://localhost:3000`.
2. Reset workspace: Settings → **Reset standalone setup** → choose **Healthcare**.
3. Provider:
   - Full name `Dr. Abraham López Venegas`
   - Business `UM Grupo Médico — Urología`
   - Email `citas@umgrupomedico.example`
   - Phone 1 `55 2845 4843` · Phone 2 `221 9933 153`
   - **Address 1 (Mexico City / CDMX):** `Calle Riobamba 639, Col. Lindavista,
     Hospital Ángeles Lindavista, Consultorio 184, CDMX`
   - **Address 2 (State of Mexico / Chalco):** `Av. San Isidro #3, Col. La
     Conchita, Chalco Centro, Estado de México (UM Chalco, Consultorio 4)`
4. Availability: default Mon–Fri 09:00–17:00 → Continue → publish.
   Public page: `/doctors/um-grupo-medico-urologia`.

## Edit the two seeded services

Medical services tab. Edit the two seeded entries:

### First-time visit

| Field | Value |
|---|---|
| Name | `First-time visit` |
| Booking type / Duration | Appointment / 30 min |
| Medical specialty | `Urology` |
| Description | `First urology consultation — clinical history, physical exam, and diagnostic plan.` |
| Total | `$100 USD · CDMX / $75 USD · Edomex (75%)` |
| Location | tick **Address 1** and **Address 2** |
| Phone | tick **Phone 1** |

### Follow-up visit

| Field | Value |
|---|---|
| Name | `Follow-up visit` |
| Medical specialty | `Urology` |
| Description | `Follow-up urology visit to review results, progress, and adjust treatment.` |
| Total | `$70 USD · CDMX / $52.50 USD · Edomex (75%)` |
| Location | tick **Address 1** and **Address 2** |
| Phone | tick **Phone 1** |

## Checks

- Healthcare copy throughout: "Choose a medical service", "Specialty", patient
  wording, "/doctors/<slug>" public URL.
- Each service card (admin + public) shows: specialty **Urology**, both clinic
  addresses (CDMX + Chalco), the phone, and the dual-location total.
- Public flow: pick a service → weekday calendar (Mon–Fri) → slot → patient
  details → confirm. Confirmation shows the chosen service + linked addresses.

## Findings (2026-06-16)

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | — | Healthcare vertical handles two visit types, medical specialty, and a service linked to two addresses cleanly. | **Pass** |
| 2 | Medium (limitation) | The Edomex location is "75% of the price", but **pricing is one `cost` string per service** — there is no structured per-location price. Encoded here as free-text ("$100 CDMX / $75 Edomex"). The public flow does not let the patient pick a location or compute the discounted price. | Open — see future-features "per-location pricing". |

### Notes

- The real clinic lists MXN prices ($1,500 CDMX / $800 Chalco); this test uses
  the requested USD figures ($100/$70, Edomex at 75% → $75 / $52.50).
- Source page also lists a third location (La Viga, CDMX) — omitted; the app
  supports two provider address slots.
