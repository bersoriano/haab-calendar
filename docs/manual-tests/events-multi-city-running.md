# Manual test — Events / multi-city running series

Persona: **Mariana Torres**, event manager for **Ruta Viva México**, an organizer
that runs public races in several Mexican cities. This scenario exercises
one-time events, independent capacity, multiple locations, Spanish event copy,
and the complete attendee registration flow.

Reference: [Carrera Elmo CDMX 2026](https://enrolit.mx/evento/carrera-elmo-cdmx-2026).
The reference uses a fixed race date, distance-based tickets, a start venue,
participant limits, prices, and runner-kit instructions. This scenario models
the closest supported Haab shape: each city/distance is an event registration
option on one organizer page.

Status: **Ready to run** · Created 2026-07-16 · Not yet executed against an
authenticated local account.

---

## What this scenario covers

- A single organizer page for events across CDMX, Guadalajara, and Monterrey.
- Three dated race options based on the reference's 3K, 5K, and 10K choices.
- Reusable provider locations plus a third event-specific location.
- A fixed start/end window and capacity for each race.
- Spanish provider and public registration copy.
- Location, total, notes, capacity decrement, confirmation, and calendar export.

## Setup

1. `npm run dev` → `http://localhost:3000`.
2. Sign in with the disposable local test account.
3. Reset the workspace: Settings → **Restablecer configuración independiente**.
4. Choose **Eventos**. The workflow tagline should include **carreras**.
5. Provider step:

   | Field | Value |
   |---|---|
   | Nombre completo | `Mariana Torres` |
   | Negocio | `Ruta Viva México` |
   | Correo | `eventos@rutaviva.example` |
   | Teléfono 1 | `+52 55 5555 0101` |
   | Dirección 1 | `Av. de los Compositores, Bosque de Chapultepec II Sección, Miguel Hidalgo, CDMX` |
   | Dirección 2 | `Av. Mariano Otero 1499, Verde Valle, Guadalajara, Jalisco` |

6. Leave the default weekly availability unchanged. All three races use
   **Único**, so global availability must not alter their dates or times.
7. Publish and open the Events tab. Expected public root:
   `/events/ruta-viva-mexico`.

## Configure the race series

Edit the two seeded events, then add the third. For every option, choose
**Único** and ensure the event list badge reads **Único**, not **Cita**.

### Event A — CDMX 10K

Edit **General admission**:

| Field | Value |
|---|---|
| Nombre del evento | `Ruta Viva CDMX — Carrera 10K` |
| Frecuencia | `Único` |
| Fecha | `2026-08-29` |
| Inicio / Fin | `07:00` / `08:30` |
| Descripción | `Carrera urbana de 10 km con salida y meta en la Segunda Sección de Chapultepec. Incluye número, playera, hidratación y medalla de finalista.` |
| Lugares máximos | `400` |
| Total | `MX$590` |
| Notas | `Entrega de kit: 22 de agosto, 08:00–14:00. Presentar identificación.` |
| Ubicación | Select **Dirección 1** |

Expected provider card: **Único**, **90 min**, `Hasta 400 lugares`, `MX$590`,
and the CDMX address.

### Event B — Guadalajara 5K

Edit **Full-day pass**:

| Field | Value |
|---|---|
| Nombre del evento | `Ruta Viva Guadalajara — Carrera 5K` |
| Frecuencia | `Único` |
| Fecha | `2026-09-20` |
| Inicio / Fin | `07:00` / `08:15` |
| Descripción | `Carrera de 5 km para corredores de todos los niveles. Incluye número, playera, hidratación y medalla de finalista.` |
| Lugares máximos | `300` |
| Total | `MX$590` |
| Notas | `Recoge tu kit el 19 de septiembre. No habrá entrega el día de la carrera.` |
| Ubicación | Select **Dirección 2** |

Expected provider card: **Único**, **75 min**, `Hasta 300 lugares`, `MX$590`,
and the Guadalajara address.

### Event C — Monterrey 3K family walk

Add a new event:

| Field | Value |
|---|---|
| Nombre del evento | `Ruta Viva Monterrey — Caminata 3K` |
| Frecuencia | `Único` |
| Fecha | `2026-10-11` |
| Inicio / Fin | `08:00` / `09:00` |
| Descripción | `Caminata familiar de 3 km abierta a adultos y niñas y niños inscritos. Incluye número, playera, hidratación y medalla.` |
| Lugares máximos | `250` |
| Total | `MX$540` |
| Notas | `La entrega del kit es personal. Llevar identificación y confirmación de registro.` |
| Agregar otra dirección | `Parque Fundidora, Av. Fundidora, Obrera, Monterrey, Nuevo León` |

Both provider address slots are already occupied, so the Monterrey value must
remain local to this event and must not replace either reusable address.

Expected provider card: **Único**, **1 h**, `Hasta 250 lugares`, `MX$540`, and
only the Monterrey address.

## Validation checks

Before saving any event, exercise these failures and then restore the valid
values:

1. Clear the end time → save is blocked with the localized valid-time-window
   error.
2. Set end time equal to or earlier than start time → save is blocked.
3. Clear maximum spots → save is blocked.
4. Clear the date → save is blocked.

No invalid event should be added to the event list.

## Public registration checks

Open `/events/ruta-viva-mexico`.

1. The chooser introduces events as registrations and lets the attendee compare
   schedule, location, price, and spots.
2. All three cards show the correct city-specific location and total. There
   must be no location leakage between CDMX, Guadalajara, and Monterrey.
3. Open **Ruta Viva CDMX — Carrera 10K**:
   - No month calendar is shown.
   - The fixed card shows `sábado, 29 de agosto de 2026`, `7:00–8:30`, and
     `400 lugares disponibles`.
   - The primary action reads **Reserve su lugar**.
4. Continue and register:

   | Field | Value |
   |---|---|
   | Asistente | `Sofía Hernández` |
   | Correo | `sofia.runner@example.com` |
   | Teléfono | `+52 55 5555 0202` |
   | Notas | `Talla M; tiempo estimado 55–65 min; contacto de emergencia: Luis +52 55 5555 0303.` |

5. Review before confirming:
   - Event: CDMX 10K.
   - When: full `07:00–08:30` window.
   - Location: CDMX address.
   - Total: `MX$590`.
   - Copy reads **Acerca del evento** / **Detalles del evento**, with no
     appointment type row.
6. Confirm. The success state keeps the same date, time, location, and total and
   offers calendar export plus the private management link.
7. Start another registration for CDMX 10K. Capacity decreases from 400 to
   **399 lugares disponibles**. Guadalajara and Monterrey remain at 300 and 250.
8. Download the calendar file and verify it contains the CDMX event name,
   `07:00–08:30`, and only the CDMX address.

## Reference parity and intentional gaps

| Reference capability | Haab scenario | Status |
|---|---|---|
| Fixed race date, start, and venue | Single occurrence with start/end and linked/custom address | Covered |
| 3K, 5K, and 10K choices | Separate city/distance event cards | Workaround |
| Capacity / sold-out state | Maximum spots and spots-left decrement | Covered |
| Participant profile (birth date, sex, state, shirt size, pace) | Free-text attendee notes | Gap |
| Ticket sale windows and late pricing | One free-text Total | Gap |
| Card/PayPal checkout and platform fee | No payment processing | Gap |
| Waiver, kit QR, and conditional fields | Notes/description only | Gap |
| Several reusable organizer locations | Two provider addresses plus event-local custom locations | Partial |

The most important product gap for true race parity is **structured registration
questions per event/ticket**. Payment and nested ticket types are the next major
gaps; this scenario should not imply that entering `MX$590` charges the attendee.

## Native date/time input helper

If automated `fill` does not update segmented date/time inputs, use the existing
React-compatible native setter pattern:

```js
const setNative = (el, value) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(el),
    "value",
  );
  descriptor.set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
};
```
