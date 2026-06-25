# Booking App Spanish i18n (Phase 1: Public-Facing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the booking app's public-facing surfaces (public booking flow + manage/reschedule) render in Mexican Spanish when a provider's `language` is `"es"`, with English as the default — behind bilingual infrastructure.

**Architecture:** Option A (config-threaded, no new React context). `language` is a field on the provider config that travels the same path `vertical` already does: stored on `public.providers`, exposed through the `public_providers` view, mapped into the `ModuleStore` by the resolver, and read inside `HaabBookingModule` as `store.provider.language`. Copy access functions (`getVerticalCopy`, new `bookingTranslations`, and the `lib/format` formatters) take a `lang` argument. The English path stays byte-for-byte unchanged.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Supabase (Postgres views + column grants), Vitest, Tailwind v4. es-MX formal `usted`, 24-hour time on Spanish surfaces.

**Reference spec:** `docs/superpowers/specs/2026-06-25-booking-spanish-i18n-design.md`

---

## Critical data-flow fact (read before starting)

The public booking page resolves its config **from Supabase**, not localStorage:

`app/[verticalSegment]/[providerSlug]/page.tsx` → `resolvePublicBookingUrl()` →
reads the `public_providers` view → `toModuleStore()` → `resolution.store` →
`PublicBookingPageShell injectedConfig={...}` → `HaabBookingModule` → `store.provider.language`.

So for the **public page** to render Spanish, the value must live in the `public.providers.language`
column and be exposed by the `public_providers` view. The provider's localStorage value does not reach
the public page on its own.

There is **no confirmed provider-config → Supabase write path** in the current code (the provider app is
localStorage-first; `app/page.tsx` only reads `setup_complete`). Task 9 handles this explicitly: the
Settings selector updates the in-memory/localStorage store now, the DB column + manual SQL let us validate
the public page in Spanish, and the task documents where to add `language` to the provider upsert once that
persistence path exists.

---

## File Structure

**Modify:**
- `lib/types.ts` — add `Lang` type; add `language: Lang` to `ProviderInfo`.
- `lib/store.ts` — `normalizeProvider` defaults `language`.
- `lib/constants.ts` — locale-aware `Intl.DateTimeFormat` getters.
- `lib/format.ts` — `lang`-aware formatting functions.
- `lib/vertical-copy.ts` — Spanish copy objects + language-keyed `getVerticalCopy`.
- `lib/public-booking-resolver.ts` — select + map `language`.
- `app/api/public/providers/[slug]/route.ts` — select + map `language` (if it selects columns independently).
- `components/haab-booking-module.tsx` — derive `lang`/`copy`/`t`; convert public-surface strings; Settings selector.

**Create:**
- `components/booking/i18n/translations.ts` — booking dictionary (`bookingTranslations`).
- `lib/__tests__/vertical-copy.test.ts` — Spanish lookup tests.
- `components/booking/i18n/__tests__/translations.test.ts` — key-parity test.
- `supabase/migrations/20260625120000_add_provider_language.sql` — column + view + grant.
- `docs/manual-tests/booking-spanish-public-flow.md` — manual test script.

**Out of scope (stay English):** everything under `components/landing/`, provider dashboard/editors/setup wizard, the rest of the Settings tab.

---

## Task 1: `Lang` type, `ProviderInfo.language`, store default

**Files:**
- Modify: `lib/types.ts:1-35`
- Modify: `lib/store.ts:258-276` (`normalizeProvider`)
- Test: `lib/__tests__/store.test.ts`

- [ ] **Step 1: Add a failing test for the default language**

Add to `lib/__tests__/store.test.ts` (place near the other `normalizeProvider` tests; if none exist, add a new `describe`):

```ts
import { describe, it, expect } from "vitest";
import { normalizeProvider } from "@/lib/store";

describe("normalizeProvider language", () => {
  it("defaults language to 'en' when missing", () => {
    expect(normalizeProvider(undefined).language).toBe("en");
    expect(normalizeProvider({}).language).toBe("en");
  });

  it("preserves a provided language", () => {
    expect(normalizeProvider({ language: "es" }).language).toBe("es");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run lib/__tests__/store.test.ts -t "normalizeProvider language"`
Expected: FAIL — `language` is not a property of `ProviderInfo` (type error) / `undefined`.

- [ ] **Step 3: Add the `Lang` type and `language` field**

In `lib/types.ts`, add near the top (after the other small unions, around line 6):

```ts
export type Lang = "en" | "es";
```

In the `ProviderInfo` type (line 22), add the field (after `galleryImageUrls`):

```ts
export type ProviderInfo = {
  fullName: string;
  businessName: string;
  email: string;
  phoneNumber1: string;
  phoneNumber2: string;
  address1: string;
  address2: string;
  publicSlug: string;
  headerImageUrl?: string;
  heroText?: string;
  galleryImageUrls?: string[];
  /** UI/content language for this provider. Drives the public booking page. */
  language: Lang;
};
```

- [ ] **Step 4: Default it in `normalizeProvider`**

In `lib/store.ts`, inside the object returned by `normalizeProvider` (line 259), add as the last property:

```ts
    language: source?.language === "es" ? "es" : "en",
```

Also confirm the blank-store default near line 37 includes `language: "en"` in its `provider` object; add it if the literal omits it (TypeScript will flag the missing property).

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npx vitest run lib/__tests__/store.test.ts -t "normalizeProvider language"`
Expected: PASS.

- [ ] **Step 6: Typecheck (catches every now-missing `language` literal)**

Run: `npx tsc --noEmit`
Expected: PASS, or errors pointing only at object literals that build a `ProviderInfo` and now need `language: "en"`. Add `language: "en"` to any such literal (e.g. test fixtures, `toModuleStore` — Task 3 covers the resolver). Re-run until clean.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/store.ts lib/__tests__/store.test.ts
git commit -m "feat(i18n): add Lang type and provider.language field (default en)"
```

---

## Task 2: Database migration — `language` column + view

**Files:**
- Create: `supabase/migrations/20260625120000_add_provider_language.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260625120000_add_provider_language.sql`:

```sql
-- Provider content language. Drives the public booking page (en default).
alter table public.providers
  add column if not exists language text not null default 'en';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'providers_language_check'
  ) then
    alter table public.providers
      add constraint providers_language_check
      check (language in ('en', 'es'));
  end if;
end $$;

-- Column-level read for anonymous public booking visitors.
grant select (language) on public.providers to anon;

-- Re-create the public view to expose language.
drop view if exists public.public_providers;

create or replace view public.public_providers
with (security_invoker = true)
as
select
  id,
  full_name,
  business_name,
  slug,
  vertical,
  language,
  timezone,
  booking_window_days,
  availability
from public.providers
where setup_complete = true;

grant select on public.public_providers to anon, authenticated;
```

- [ ] **Step 2: Apply the migration**

If the Supabase CLI is available and a local stack is running:
Run: `supabase migration up`
Expected: migration applies cleanly; no errors.

If no local stack, apply via the Supabase MCP `apply_migration` tool (name `add_provider_language`, the SQL above) against the linked project, OR note in the commit body that it must be applied before the public Spanish flow can be validated. Do **not** skip — the public page reads `language` from this view.

- [ ] **Step 3: Verify the column is exposed**

Run (CLI) `supabase db diff` or query the view:
`select language from public.public_providers limit 1;`
Expected: column exists, no error.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260625120000_add_provider_language.sql
git commit -m "feat(i18n): add providers.language column and expose in public view"
```

---

## Task 3: Resolver — select and map `language`

**Files:**
- Modify: `lib/public-booking-resolver.ts:16` (select), `:33` (row type), `:120-138` (`toModuleStore`)
- Modify: `app/api/public/providers/[slug]/route.ts:14` (row type), `:64` (mapping) — only if it selects/maps columns itself

- [ ] **Step 1: Add `language` to the select**

In `lib/public-booking-resolver.ts`, update `PUBLIC_PROVIDER_SELECT` (line 16):

```ts
export const PUBLIC_PROVIDER_SELECT =
  "id, full_name, business_name, slug, vertical, language, timezone, booking_window_days, availability";
```

- [ ] **Step 2: Add `language` to the row type**

In the `PublicProviderRow` type (around line 33), add:

```ts
  language: "en" | "es" | null;
```

- [ ] **Step 3: Map it in `toModuleStore`**

In `toModuleStore` (line 120), inside the `provider: { ... }` object, add (after `publicSlug: provider.slug`):

```ts
      language: provider.language === "es" ? "es" : "en",
```

- [ ] **Step 4: Mirror in the API route if needed**

Open `app/api/public/providers/[slug]/route.ts`. If it has its own provider row type and select string (around lines 14 and the select call), add `language` there and map `language: provider.language === "es" ? "es" : "en"` into its returned provider object. If it imports `PUBLIC_PROVIDER_SELECT`/`toModuleStore` from the resolver, no change is needed.

- [ ] **Step 5: Typecheck and run the existing public-url tests**

Run: `npx tsc --noEmit && npx vitest run lib/__tests__/public-url.test.ts`
Expected: PASS. (If a fixture builds a provider row, add `language: "en"`.)

- [ ] **Step 6: Commit**

```bash
git add lib/public-booking-resolver.ts app/api/public/providers
git commit -m "feat(i18n): select and map provider language in public resolver"
```

---

## Task 4: Locale-aware date/time formatters

**Files:**
- Modify: `lib/constants.ts:25-46`
- Modify: `lib/format.ts` (whole file)
- Test: `lib/__tests__/format.test.ts`

The English path must stay identical. Spanish path = `es-MX` locale + 24-hour time + Spanish words.

- [ ] **Step 1: Write failing Spanish tests**

Append to `lib/__tests__/format.test.ts`:

```ts
import {
  formatDateLabel,
} from "@/lib/format";

describe("formatTimeLabel — Spanish (24h)", () => {
  it("formats noon as 12:00 in es", () => {
    expect(formatTimeLabel("12:00", "es")).toBe("12:00");
  });
  it("formats afternoon in 24h in es", () => {
    expect(formatTimeLabel("14:00", "es")).toBe("14:00");
  });
  it("formats midnight as 00:00 in es", () => {
    expect(formatTimeLabel("00:00", "es")).toBe("00:00");
  });
  it("returns 'Día completo' for full day in es", () => {
    expect(formatTimeLabel(undefined, "es")).toBe("Día completo");
  });
  it("keeps English AM/PM when lang omitted", () => {
    expect(formatTimeLabel("14:00")).toBe("2:00 PM");
  });
});

describe("formatTimeRange — Spanish", () => {
  it("formats a 24h range in es", () => {
    expect(formatTimeRange("09:00", "17:30", "es")).toBe("9:00 - 17:30");
  });
});

describe("formatDuration / capacity / bookingType — Spanish", () => {
  const base: Service = { id: "s", name: "X", bookingType: "appointment", description: "" };
  it("uses Spanish hour/min words", () => {
    expect(formatDuration({ ...base, durationMinutes: 60 }, "es")).toBe("1 h");
    expect(formatDuration({ ...base, durationMinutes: 30 }, "es")).toBe("30 min");
  });
  it("uses Spanish capacity words", () => {
    expect(formatCapacityLabel({ ...base, maxSpots: 1 }, "es")).toBe("Hasta 1 lugar");
    expect(formatCapacityLabel({ ...base, maxSpots: 5 }, "es")).toBe("Hasta 5 lugares");
  });
  it("translates booking type label", () => {
    expect(getBookingTypeLabel("appointment", "es")).toBe("Cita");
    expect(getBookingTypeLabel("full-day", "es")).toBe("Día completo");
  });
});

describe("formatDateLabel — Spanish locale", () => {
  it("renders a Spanish weekday/month", () => {
    // 2026-01-05 is a Monday → "lunes" / "enero" in es-MX
    const label = formatDateLabel("2026-01-05", "es");
    expect(label.toLowerCase()).toContain("lunes");
    expect(label.toLowerCase()).toContain("enero");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run lib/__tests__/format.test.ts`
Expected: FAIL — functions don't accept a `lang` arg / return English.

- [ ] **Step 3: Make the formatters locale-aware in `lib/constants.ts`**

Replace the four `Intl.DateTimeFormat` singletons (lines 25-46) with cached per-locale getters. Keep the original named exports as English aliases so any other importer keeps working:

```ts
import type { Lang, WeekdayKey } from "./types";

const LOCALE: Record<Lang, string> = { en: "en-US", es: "es-MX" };

function memoFormatter(make: (locale: string) => Intl.DateTimeFormat) {
  const cache = new Map<Lang, Intl.DateTimeFormat>();
  return (lang: Lang = "en") => {
    let f = cache.get(lang);
    if (!f) {
      f = make(LOCALE[lang]);
      cache.set(lang, f);
    }
    return f;
  };
}

export const getMonthFormatter = memoFormatter(
  (locale) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
);
export const getLongDateFormatter = memoFormatter(
  (locale) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
);
export const getCompactDateFormatter = memoFormatter(
  (locale) => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }),
);
export const getWeekdayShortFormatter = memoFormatter(
  (locale) => new Intl.DateTimeFormat(locale, { weekday: "short" }),
);

// Backward-compatible English singletons (existing importers).
export const monthFormatter = getMonthFormatter("en");
export const longDateFormatter = getLongDateFormatter("en");
export const compactDateFormatter = getCompactDateFormatter("en");
export const weekdayShortFormatter = getWeekdayShortFormatter("en");
```

Leave `WEEKDAY_KEYS`, `WEEKDAY_LABELS`, and the rest of the file unchanged. (Add the `Lang` import to the existing `import type { WeekdayKey } from "./types";` line as shown.)

- [ ] **Step 4: Make `lib/format.ts` lang-aware**

Replace the relevant functions. The full set of edited functions:

```ts
import {
  getMonthFormatter,
  getLongDateFormatter,
  getCompactDateFormatter,
} from "./constants";
import { parseDateKey } from "./date";
import { pad } from "./utils";
import type { BookingStatus, BookingType, Lang, Service } from "./types";

const FULL_DAY: Record<Lang, string> = { en: "Full Day", es: "Día completo" };
const APPOINTMENT: Record<Lang, string> = { en: "Appointment", es: "Cita" };

export function formatDateLabel(dateKey: string, lang: Lang = "en") {
  return getLongDateFormatter(lang).format(parseDateKey(dateKey));
}

export function formatCompactDate(dateKey: string, lang: Lang = "en") {
  return getCompactDateFormatter(lang).format(parseDateKey(dateKey));
}

export function formatMonthLabel(date: Date, lang: Lang = "en") {
  return getMonthFormatter(lang).format(date);
}

export function formatTimeLabel(time?: string, lang: Lang = "en") {
  if (!time) {
    return FULL_DAY[lang];
  }
  const [hours, minutes] = time.split(":").map(Number);
  if (lang === "es") {
    return `${hours}:${pad(minutes)}`; // 24-hour
  }
  const meridiem = hours >= 12 ? "PM" : "AM";
  const safeHours = hours % 12 || 12;
  return `${safeHours}:${pad(minutes)} ${meridiem}`;
}

export function formatTimeRange(startTime?: string, endTime?: string, lang: Lang = "en") {
  if (!startTime || !endTime) {
    return FULL_DAY[lang];
  }
  return `${formatTimeLabel(startTime, lang)} - ${formatTimeLabel(endTime, lang)}`;
}

export function formatDuration(service: Service, lang: Lang = "en") {
  if (service.bookingType === "full-day") {
    return FULL_DAY[lang];
  }
  if (!service.durationMinutes) {
    return APPOINTMENT[lang];
  }
  if (service.durationMinutes >= 60 && service.durationMinutes % 60 === 0) {
    const hours = service.durationMinutes / 60;
    if (lang === "es") {
      return `${hours} h`;
    }
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }
  return `${service.durationMinutes} min`;
}

export function formatCapacityLabel(service: Service, lang: Lang = "en") {
  if (typeof service.maxSpots === "number" && Number.isFinite(service.maxSpots)) {
    if (lang === "es") {
      return `Hasta ${service.maxSpots} ${service.maxSpots === 1 ? "lugar" : "lugares"}`;
    }
    return `Up to ${service.maxSpots} ${service.maxSpots === 1 ? "spot" : "spots"}`;
  }
  if (service.capacity) {
    return service.capacity;
  }
  if (lang === "es") {
    return service.bookingType === "appointment" ? "1 cliente" : "No definido";
  }
  return service.bookingType === "appointment" ? "1 client" : "Not set";
}

export function getBookingTypeLabel(type: BookingType, lang: Lang = "en") {
  if (lang === "es") {
    return type === "appointment" ? "Cita" : "Día completo";
  }
  return type === "appointment" ? "Appointment" : "Full Day";
}
```

Keep `formatCountdown`, `statusTone`, and `bookingTypeTone` exactly as they are (no language dimension).

- [ ] **Step 5: Run the full format test file**

Run: `npx vitest run lib/__tests__/format.test.ts`
Expected: PASS — both the original English tests and the new Spanish ones.

- [ ] **Step 6: Commit**

```bash
git add lib/constants.ts lib/format.ts lib/__tests__/format.test.ts
git commit -m "feat(i18n): locale-aware date/time formatters (es-MX, 24h)"
```

---

## Task 5: Bilingual `vertical-copy.ts`

**Files:**
- Modify: `lib/vertical-copy.ts` (add Spanish objects + lang-keyed lookup)
- Test: `lib/__tests__/vertical-copy.test.ts` (create)

This file holds the bulk of public booking copy. The structural change is exact; the Spanish content is
produced by translating each existing English `VerticalCopy` object field-for-field into es-MX formal
`usted`, using the glossary below for consistency.

**Translation glossary (use verbatim for the noun/verb fields):**

| English | es-MX (formal) |
| --- | --- |
| service / Service | servicio / Servicio |
| services / Services | servicios / Servicios |
| booking / Booking | reserva / Reserva |
| bookings / Bookings | reservas / Reservas |
| client / Client | cliente / Cliente |
| clients / Clients | clientes / Clientes |
| Book / book (verb) | Reservar / reservar |
| booking page | página de reservas |
| Full Day | Día completo |
| Appointment | Cita |
| spot / spots | lugar / lugares |
| Confirm | Confirmar |
| Cancel | Cancelar |
| Reschedule | Reagendar |
| Manage booking | Gestionar reserva |
| Choose a service | Elija un servicio |
| Notes | Notas |
| Search | Buscar |

For healthcare use *paciente/pacientes* where the English uses patient-flavored wording; for events use
*asistente/asistentes* and *registrarse* where `bookVerb` is "register". Keep `usted` throughout (e.g.
"Elija un horario", "Confirme su reserva"). Preserve any `${...}`-style interpolation if present in a phrase.

- [ ] **Step 1: Write the failing lookup test**

Create `lib/__tests__/vertical-copy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getVerticalCopy } from "@/lib/vertical-copy";

describe("getVerticalCopy language", () => {
  it("returns English by default (no lang)", () => {
    expect(getVerticalCopy("healthcare").service).toBe("medical service");
  });

  it("returns Spanish nouns when lang is es", () => {
    expect(getVerticalCopy("healthcare", "es").service).toBe("servicio médico");
    expect(getVerticalCopy("events", "es").bookVerb).toBe("registrarse");
  });

  it("falls back to Spanish default for unknown/undefined vertical in es", () => {
    expect(getVerticalCopy(undefined, "es").service).toBe("servicio");
  });

  it("keeps English path unchanged for unknown vertical", () => {
    expect(getVerticalCopy(undefined).service).toBe("service");
  });
});
```

> Adjust the exact expected strings in this test to match the English source values (e.g. confirm
> `healthcareCopy.service` is `"medical service"`) and your chosen Spanish translations before running.

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run lib/__tests__/vertical-copy.test.ts`
Expected: FAIL — `getVerticalCopy` takes only one argument.

- [ ] **Step 3: Add Spanish copy objects**

In `lib/vertical-copy.ts`, after each English const, add its Spanish sibling translating **every** field
of the `VerticalCopy` interface (including all `phrases.*`). Use this fully worked template for the
default object, then apply the same pattern to the four verticals:

```ts
export const defaultCopyEs: VerticalCopy = {
  service: "servicio",
  Service: "Servicio",
  services: "servicios",
  Services: "Servicios",
  booking: "reserva",
  Booking: "Reserva",
  bookings: "reservas",
  Bookings: "Reservas",
  client: "cliente",
  Client: "Cliente",
  clients: "clientes",
  Clients: "Clientes",
  bookVerb: "reservar",
  bookingPage: "página de reservas",
  publicBookingUrl: "enlace de reservas público",
  bookingWorkspace: "panel de reservas",
  bookingSummary: "resumen de la reserva",
  manageBooking: "Gestionar reserva",
  cancelBooking: "Cancelar reserva",
  rescheduleBooking: "Reagendar reserva",
  bookFullDay: "Reservar día completo",
  phrases: {
    // Translate EVERY phrase key present in the English `defaultCopy.phrases`,
    // field-for-field, into es-MX formal `usted`. Examples:
    chooseServiceTitle: "Elija un servicio",
    chooseServiceBody: "Seleccione el servicio que desea reservar.",
    notesPlaceholder: "Agregue una nota (opcional)",
    bookingSummaryBodyReview: "Revise los detalles antes de confirmar.",
    bookingSummaryBodySuccess: "¡Su reserva está confirmada!",
    clientFieldsRequiredError: "Por favor complete su nombre y datos de contacto.",
    pickDateFirstError: "Primero elija una fecha.",
    chooseServiceFirstError: "Primero elija un servicio.",
    // ...continue for ALL remaining keys in defaultCopy.phrases...
  },
};
```

Do the same for `healthcareCopyEs`, `eventsCopyEs`, `spacesCopyEs`, `professionalCopyEs`, translating each
from its English counterpart. Because the Spanish object must satisfy the `VerticalCopy` interface,
TypeScript will error on any missing `phrases` key — use `npx tsc --noEmit` (Step 5) as the completeness
check: a clean typecheck proves no phrase was skipped.

- [ ] **Step 4: Replace the lookup with a language-keyed version**

Replace the `COPY_BY_VERTICAL` map and `getVerticalCopy` (lines 662-674) with:

```ts
import type { Lang, VerticalId } from "./types";

const COPY: Record<Lang, Record<VerticalId, VerticalCopy>> = {
  en: {
    healthcare: healthcareCopy,
    events: eventsCopy,
    spaces: spacesCopy,
    professional: professionalCopy,
  },
  es: {
    healthcare: healthcareCopyEs,
    events: eventsCopyEs,
    spaces: spacesCopyEs,
    professional: professionalCopyEs,
  },
};

const DEFAULTS: Record<Lang, VerticalCopy> = { en: defaultCopy, es: defaultCopyEs };

export function getVerticalCopy(
  verticalId?: VerticalId,
  lang: Lang = "en",
): VerticalCopy {
  const table = COPY[lang] ?? COPY.en;
  if (!verticalId) {
    return DEFAULTS[lang] ?? defaultCopy;
  }
  return table[verticalId] ?? DEFAULTS[lang] ?? defaultCopy;
}
```

(Update the existing top-of-file `import type { VerticalId } from "./types";` to also import `Lang`.)

- [ ] **Step 5: Typecheck for completeness, then run tests**

Run: `npx tsc --noEmit`
Expected: PASS (any missing Spanish phrase key surfaces here — fix and re-run).

Run: `npx vitest run lib/__tests__/vertical-copy.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/vertical-copy.ts lib/__tests__/vertical-copy.test.ts
git commit -m "feat(i18n): bilingual vertical copy with language-keyed getVerticalCopy"
```

---

## Task 6: Booking i18n dictionary for inline public strings

**Files:**
- Create: `components/booking/i18n/translations.ts`
- Test: `components/booking/i18n/__tests__/translations.test.ts`

This dictionary holds public-surface strings that are **not** in `vertical-copy` — generic buttons, step
labels, the hold-countdown, manage/reschedule UI, and any hardcoded English literal on a public render
path. Seed it with the keys below; during Task 7 you will add a key here for every additional public-path
literal you convert (do not invent keys for strings that don't exist on a public surface).

- [ ] **Step 1: Write the parity test**

Create `components/booking/i18n/__tests__/translations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { bookingTranslations } from "@/components/booking/i18n/translations";

function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      keyPaths(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

describe("bookingTranslations", () => {
  it("has identical key shapes for en and es", () => {
    const en = keyPaths(bookingTranslations.en).sort();
    const es = keyPaths(bookingTranslations.es).sort();
    expect(es).toEqual(en);
  });

  it("has no empty Spanish strings", () => {
    const flatten = (o: Record<string, unknown>): string[] =>
      Object.values(o).flatMap((v) =>
        typeof v === "string" ? [v] : flatten(v as Record<string, unknown>),
      );
    expect(flatten(bookingTranslations.es).every((s) => s.trim().length > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run components/booking/i18n/__tests__/translations.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the dictionary**

Create `components/booking/i18n/translations.ts`:

```ts
import type { Lang } from "@/lib/types";

export type BookingDict = {
  common: {
    back: string;
    next: string;
    confirm: string;
    cancel: string;
    loading: string;
    required: string;
  };
  public: {
    yourName: string;
    email: string;
    phone: string;
    notes: string;
    selectDate: string;
    selectTime: string;
    holdRemaining: string; // e.g. "Time left to confirm"
    spotsLeftSuffix: string; // e.g. "left"
    fullyBooked: string;
  };
  manage: {
    title: string;
    lookupPrompt: string;
    notFound: string;
    cancelConfirm: string;
    rescheduleTitle: string;
    cancelled: string;
    rescheduled: string;
  };
};

export const bookingTranslations: Record<Lang, BookingDict> = {
  en: {
    common: {
      back: "Back",
      next: "Next",
      confirm: "Confirm",
      cancel: "Cancel",
      loading: "Loading…",
      required: "Required",
    },
    public: {
      yourName: "Your name",
      email: "Email",
      phone: "Phone",
      notes: "Notes",
      selectDate: "Select a date",
      selectTime: "Select a time",
      holdRemaining: "Time left to confirm",
      spotsLeftSuffix: "left",
      fullyBooked: "Fully booked",
    },
    manage: {
      title: "Manage your booking",
      lookupPrompt: "Enter your booking reference",
      notFound: "We couldn't find that booking.",
      cancelConfirm: "Are you sure you want to cancel?",
      rescheduleTitle: "Reschedule your booking",
      cancelled: "Your booking has been cancelled.",
      rescheduled: "Your booking has been rescheduled.",
    },
  },
  es: {
    common: {
      back: "Atrás",
      next: "Siguiente",
      confirm: "Confirmar",
      cancel: "Cancelar",
      loading: "Cargando…",
      required: "Obligatorio",
    },
    public: {
      yourName: "Su nombre",
      email: "Correo electrónico",
      phone: "Teléfono",
      notes: "Notas",
      selectDate: "Seleccione una fecha",
      selectTime: "Seleccione un horario",
      holdRemaining: "Tiempo restante para confirmar",
      spotsLeftSuffix: "disponibles",
      fullyBooked: "Cupo lleno",
    },
    manage: {
      title: "Gestione su reserva",
      lookupPrompt: "Ingrese su referencia de reserva",
      notFound: "No encontramos esa reserva.",
      cancelConfirm: "¿Está seguro de que desea cancelar?",
      rescheduleTitle: "Reagende su reserva",
      cancelled: "Su reserva ha sido cancelada.",
      rescheduled: "Su reserva ha sido reagendada.",
    },
  },
};

export function bookingT(lang: Lang = "en"): BookingDict {
  return bookingTranslations[lang] ?? bookingTranslations.en;
}
```

- [ ] **Step 4: Run the parity test**

Run: `npx vitest run components/booking/i18n/__tests__/translations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/booking/i18n/translations.ts components/booking/i18n/__tests__/translations.test.ts
git commit -m "feat(i18n): booking translation dictionary for public inline strings"
```

---

## Task 7: Wire the module's public surfaces to `lang`

**Files:**
- Modify: `components/haab-booking-module.tsx`

Goal: on **public** render paths only, source language from the store and use it. Do not touch admin
render functions (dashboard, bookings, calendar, services/availability editors, setup wizard).

- [ ] **Step 1: Derive `lang`, `copy`, and `t` from the store**

Near the existing `const copy = getVerticalCopy(vertical);` (line ~309), replace with:

```ts
const lang = store.provider.language ?? "en";
const copy = getVerticalCopy(vertical, lang);
const t = bookingTranslations[lang];
```

Add the import at the top of the file:

```ts
import { bookingTranslations } from "@/components/booking/i18n/translations";
```

(`getVerticalCopy` is already imported at line 121.)

- [ ] **Step 2: Pass `lang` to formatter calls on public paths**

In the public booking render path and the manage/reschedule render path, update calls to the `lib/format`
functions to pass `lang`: `formatTimeLabel(x, lang)`, `formatTimeRange(a, b, lang)`,
`formatDateLabel(k, lang)`, `formatCompactDate(k, lang)`, `formatMonthLabel(d, lang)`,
`formatDuration(svc, lang)`, `formatCapacityLabel(svc, lang)`, `getBookingTypeLabel(type, lang)`.

Locate these calls within the public render functions only. Leave admin-path calls (inside dashboard /
bookings / calendar / editors) unchanged — they pass no `lang` and stay English.

- [ ] **Step 3: Replace hardcoded English literals on public paths with `t.*`**

Walk the public render path and the manage/reschedule path. For each hardcoded English string (e.g.
button labels, field labels, the hold-countdown caption, "spots left" suffix, manage lookup/cancel/
reschedule copy), replace it with the matching `t.*` entry. If a string has no key yet, add it to
`BookingDict` (both `en` and `es`) in `components/booking/i18n/translations.ts`, then reference it. The
parity test from Task 6 guards that every new key exists in both languages.

For the "spots left" line specifically (around lines 2799-2808), replace the inline suffix with
`t.public.spotsLeftSuffix` and keep using `copy.phrases.spotsLeftSuffix` only if that vertical-specific
phrase reads better — prefer the vertical copy where it already exists, the `t` dict for generic strings.

> Scope discipline: only convert strings that are actually rendered on a public surface
> (`surfaceMode === "public-only"` paths and the `manage` flow). When unsure whether a render function is
> public, check how it's reached from the public entry; if it's admin-only, leave it.

- [ ] **Step 4: Pass `t` and `lang` to public sub-components**

For any extracted public components (manage/reschedule views, summary, progress indicator) that render
text, pass `t` and `lang` as props and use them instead of literals. Update those component signatures
accordingly.

- [ ] **Step 5: Typecheck and build**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add components/haab-booking-module.tsx components/booking/i18n/translations.ts
git commit -m "feat(i18n): render public booking + manage flows in provider language"
```

---

## Task 8: Settings language selector

**Files:**
- Modify: `components/haab-booking-module.tsx` (`renderSettings`, ~line 2482)

- [ ] **Step 1: Add the selector to the Settings tab**

Inside `renderSettings()`, add a Language field that writes `provider.language` through the same provider
`onChange` mechanism the other settings use (mirror how `renderSettings` updates `provider` fields — e.g.
the same setter used for `businessName`). Use this control (labels stay English in phase 1):

```tsx
<label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
  Language
  <select
    value={store.provider.language ?? "en"}
    onChange={(event) =>
      updateProvider("language", event.target.value as "en" | "es")
    }
    className={cn("min-h-12", adminFieldClass)}
  >
    <option value="en">English</option>
    <option value="es">Español</option>
  </select>
  <span className="text-xs leading-5 text-[var(--muted)]">
    Sets the language clients see on your public booking page.
  </span>
</label>
```

Use whatever the existing provider-field setter is named in this file (search `renderSettings` for the
handler that updates provider fields, e.g. `updateProvider` / `onProviderChange`); match it exactly. Import
`cn` and `adminFieldClass` if not already imported in this file.

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 3: Manual smoke (provider side)**

Run: `npm run dev`, open the app, go to Settings, switch Language to Español, and confirm the control
persists across a reload (localStorage store). Public-page validation is Task 9.

- [ ] **Step 4: Commit**

```bash
git add components/haab-booking-module.tsx
git commit -m "feat(i18n): add language selector to provider settings"
```

---

## Task 9: Provider write-path wiring + manual test + final verification

**Files:**
- Investigate/Modify: provider-config Supabase persistence (see below)
- Create: `docs/manual-tests/booking-spanish-public-flow.md`

- [ ] **Step 1: Locate the provider-config → Supabase write path**

Search for where provider config is persisted to the `providers` table:
Run: `grep -rn "from(\"providers\")\|\.upsert\|\.update(" lib app components --include=*.ts --include=*.tsx`

If a provider upsert/update exists, add `language: store.provider.language` (snake_case `language`) to the
written payload so the Settings choice reaches `public.providers.language`. Typecheck and commit.

If **no** such write path exists yet (provider config is currently localStorage-only), do not fabricate
one. Add a short note to `docs/backend-implementation.md` under a "Provider language" line stating that
`language` must be included when provider-config persistence to `public.providers` is implemented, and
rely on Step 2's manual SQL to validate the public page now.

- [ ] **Step 2: Write the manual test doc**

Create `docs/manual-tests/booking-spanish-public-flow.md`:

```markdown
# Manual test: Spanish public booking flow

## Setup
1. Have a provider row in `public.providers` with `setup_complete = true` and at least one service.
2. Set its language to Spanish (until provider-config persistence writes `language` automatically):
   ```sql
   update public.providers set language = 'es' where slug = '<provider-slug>';
   ```

## Public booking flow (es)
1. Open the provider's public URL: `/<vertical>/<provider-slug>`.
2. Verify all copy is in Mexican Spanish, formal `usted` (service selection, date/slot picker,
   client form labels, summary, confirmation).
3. Verify dates show Spanish weekday/month names and times are 24-hour (e.g. "17:30", not "5:30 PM").
4. Verify the slot hold countdown caption and "lugares disponibles" text are Spanish.
5. Complete a booking; confirm the success summary is Spanish.

## Manage / reschedule flow (es)
1. Open the manage URL `/<vertical>/<provider-slug>/manage/<token>`.
2. Verify lookup, summary, cancel, and reschedule copy are Spanish.
3. Cancel and reschedule; confirm status messages are Spanish.

## English regression (default)
1. Set the provider back to English: `update public.providers set language = 'en' where slug = '<slug>';`
2. Reload the public URL and confirm every surface is identical to pre-change English
   (AM/PM times, English month/weekday names, English copy).
```

- [ ] **Step 3: Apply the manual test**

Follow the doc against a running dev server + the linked/local Supabase. Record results; fix any
untranslated public-surface strings by adding the missing key to `BookingDict` (or the Spanish
`VerticalCopy`) and referencing it.

- [ ] **Step 4: Full verification**

Run: `npx vitest run`
Expected: all tests PASS.

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

Run: `npm run lint`
Expected: PASS (fix any lint introduced by the changes).

- [ ] **Step 5: Commit**

```bash
git add docs/manual-tests/booking-spanish-public-flow.md docs/backend-implementation.md
git commit -m "docs(i18n): manual test for Spanish public flow + provider language note"
```

---

## Self-review checklist (completed)

- **Spec coverage:** source-of-truth field (T1), DB column + view (T2), resolver mapping (T3), formatters
  es-MX/24h (T4), bilingual vertical copy (T5), inline-string dictionary (T6), public-surface wiring (T7),
  Settings selector (T8), tone/usted (glossary in T5 + es strings), testing unit + manual (T1/T4/T5/T6 + T9).
- **Phase-1 guardrail:** T7 explicitly limits conversion to public + manage paths; admin untouched.
- **Open integration (provider write path):** surfaced honestly in T9 with a manual-SQL fallback so the
  public Spanish flow is validatable regardless.
- **Type consistency:** `Lang` defined once in `lib/types.ts` and imported everywhere; `getVerticalCopy`,
  `bookingTranslations`/`bookingT`, and all `format` functions share the same `lang: Lang = "en"` trailing
  convention; English path is default everywhere.
```
