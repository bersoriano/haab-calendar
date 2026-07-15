# Manual test — Spanish public booking flow (es-MX)

Validates Spanish continuity from the landing page through authentication,
provider setup/admin, the public booking experience, and the
manage/reschedule/cancel flow. It also includes an English regression pass.

Last run: (not yet run) · Result: —

---

## Setup

1. `npm run dev` → `http://localhost:3000`.
2. On the landing page, select **Español** and click **Crea tu página de
   reservas**. Confirm the page scrolls to **Una página, moldeada a tu
   negocio**, the subtitle begins **Selecciona un flujo**, and setup does not
   open before a vertical is selected.
3. Choose **Salud**. Confirm the
   login URL contains `lang=es` and its encoded `next` path also contains
   `lang=es`.
4. On the login page, switch to **EN** and back to **ES**. Confirm both `lang`
   and the language inside the encoded `next` path change together.
5. Sign in or create an account. On return, confirm the URL contains
   `vertical=healthcare&lang=es` and the setup heading reads **Configure su
   página de citas para pacientes** rather than the English equivalent.
   At the top of the admin setup, confirm the sticky workflow header shows
   **Salud**, **Para médicos y especialistas**, and **Elegir otro flujo**. Use
   that action once and confirm it returns to the vertical picker before
   selecting **Salud** again.
6. Confirm Step 1 is labeled **Datos del Médico**, not **Proveedor** or **Mis
   datos**. Enter the physician data:
   - Full name `Dra. Carmen Salinas`
   - Business `Clínica Salinas`
   - Email `citas@clinicasalinas.example`
   - Phone 1 `55 1234 5678`
   - Address 1 `Av. Insurgentes Sur 100, Col. Roma Norte, CDMX`
7. Availability: Mon–Fri 09:00–17:00 → Continue → publish.
   Public page: `/doctors/clinica-salinas`.
8. Enter the admin side and confirm dashboard, bookings, calendar, services,
   and settings remain Spanish. Reload and confirm Settings → Language is still
   **Español**. Settings must show **Información del Médico**, and healthcare
   service-editor profile hints must refer to **el médico**, never **el
   proveedor**.
9. Edit the seeded service (e.g. "First-time visit") — leave defaults; confirm it
   is an appointment type.

### Set language to Spanish

The first setup publish must pass through `PUT /api/provider/store` and persist
`public.providers.language = 'es'`. Settings → Language remains available for
changing the provider language later; saving an admin change uses the same
persistence path.

Reload the public page to pick up the saved value. If the page remains English,
inspect the stored value and public view before changing it manually:

```sql
select slug, language from public.providers where slug = 'clinica-salinas';
select slug, language from public.public_providers where slug = 'clinica-salinas';
update public.providers set language = 'es' where slug = 'clinica-salinas';
```

---

## Public booking flow (es)

Open `http://localhost:3000/doctors/clinica-salinas`.

### Copy and locale checks

- Header / hero copy is rendered in Spanish (vertical copy: "Elija un servicio
  médico", "Reservar", etc.).
- Calendar month and weekday names are Spanish (e.g. "junio 2026",
  "lu ma mi ju vi sa do").
- Time slots use 24-hour format (e.g. "09:00", "17:30") — **no AM/PM**.
- Service cards show Spanish labels: "Tipo", "Duración", "Capacidad", "Total".
- The "Continue to My Details" button reads **"Continúe a sus datos"**.
- The "Reserve my spot" button reads **"Reserve su lugar"**.
- Capacity label shows "lugares disponibles" suffix (e.g. "2 lugares disponibles")
  when spots are limited.

### Book a slot

1. Pick any highlighted (free) weekday on the calendar.
2. Select a time slot — the slot button is in 24-hour format.
3. A hold countdown appears; confirm it reads in Spanish:
   **"Tiempo restante para confirmar"** followed by the countdown timer.
4. Click **"Continúe a sus datos"** / **"Reserve su lugar"**.
5. Fill in client details — labels are Spanish:
   - Name field: "Nombre completo" (placeholder "Juan Pérez")
   - Email field: "Correo electrónico" (placeholder "juan@ejemplo.com")
   - Phone field: "Número de teléfono" (placeholder "+52 55 1234 5678")
   - Notes field: "Notas"
6. Click **"Confirmar"**.

### Success summary checks

- Heading reads **"Reserva confirmada"**.
- Appointment details section headed **"Detalles de la cita"**.
- Client details section headed **"Datos del cliente"**.
- Date shown uses Spanish weekday and month names (e.g. "lunes, 29 de junio de 2026").
- Time shown uses 24-hour format (e.g. "10:00").
- "Add to calendar" button reads **"Agregar al calendario"**.
- "Show QR code" button reads **"Mostrar código QR"**.
- Manage-link section reads **"Gestione esta reserva en cualquier momento"**.
- "Copy link" button reads **"Copiar enlace"**.
- "Book another" link reads **"Reserve otra"**.

---

## Manage / reschedule / cancel flow (es)

Copy the manage link from the success summary. It follows the pattern:
`/<vertical>/<provider-slug>/manage/<token>`
e.g. `http://localhost:3000/doctors/clinica-salinas/manage/<token>`

### Lookup and summary checks

- Page title reads **"Gestione su reserva"**.
- Lookup prompt reads **"Ingrese su referencia de reserva"**.
- After entering the token, the booking summary is shown in Spanish:
  - Date uses Spanish weekday/month names.
  - Time uses 24-hour format.
  - Labels: "Cuándo", "Tipo", "Duración", "Total".

### Cancel flow

1. Click the cancel button — it reads **"Cancelar"**.
2. A confirmation prompt appears: **"¿Está seguro de que desea cancelar?"**
3. Confirm cancellation — button reads **"Confirmar cancelación"**.
4. Status message reads **"Su reserva ha sido cancelada."**

### Reschedule flow

With a different (non-cancelled) booking, open its manage URL.

1. Click **"Reagendar"**.
2. Panel heading reads **"Reagende su reserva"** (or **"Elija un nuevo horario"**
   for appointments).
3. Pick a new weekday date — calendar labels are Spanish.
4. Select a replacement slot in 24-hour format — helper text reads
   **"Elija un nuevo horario"** / **"Seleccione un horario de reemplazo"**.
5. Confirm — button reads **"Guardar nuevo horario"**.
6. Status message reads **"Su reserva ha sido reagendada."**

### Calendar QR modal (es)

From the success summary, click **"Mostrar código QR"**.

- Modal heading or loading text reads **"Preparando código QR del calendario..."**
- Download button reads **"Descargue el evento en su teléfono"**.
- Close button reads **"Cerrar"**.

---

## English regression (default)

Restore the provider to English from Settings → **Language** and save. Use SQL
only as a diagnostic fallback:

```sql
update public.providers set language = 'en' where slug = 'clinica-salinas';
```

Reload `http://localhost:3000/doctors/clinica-salinas` and confirm:

- Calendar month and weekday names are English (e.g. "June 2026", "Mo Tu We Th Fr Sa Su").
- Time slots use AM/PM format (e.g. "9:00 AM", "5:30 PM").
- "Continue to My Details" / "Reserve my spot" — original English buttons.
- Booking success heading reads **"Booking Confirmed"**.
- Manage page title reads **"Manage your booking"**.
- Cancellation confirmation reads **"Are you sure you want to cancel?"**
- All section labels ("Appointment Details", "Customer Details", "When", "Type",
  "Duration", "Total") are English.

---

## Findings

| # | Severity | Finding | Status |
|---|---|---|---|
| — | — | Results from first run go here. | Pending |

### Notes

- The `language` column must be present in `public_providers`; the migration in
  `supabase/migrations/` must expose it through the view. If the column is
  missing, the resolver silently defaults to `"en"`.
- Standalone (localStorage) mode seeds `provider.language` from the landing
  choice while setup is incomplete. In an authenticated Supabase-backed
  setup/admin flow, publishing and later Settings saves persist the same value
  through `PUT /api/provider/store`.
- If the saved database value is correct but the public page remains English,
  verify that `public_providers` exposes `language` and that the resolver/API
  mapper has not defaulted a missing value to `en`.
