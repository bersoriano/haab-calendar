# Booking App Spanish Translation (i18n) — Design

> **Status:** Approved design, ready for implementation planning.
> **Scope of this spec:** Phase 1 — translate the **public-facing booking surfaces** of the booking
> application to Spanish, behind bilingual infrastructure. The marketing **landing page is explicitly
> out of scope** and is treated as a fully separate system (it has its own `LanguageProvider` and
> `translations.ts`). This spec does not touch the landing.

---

## 1. Goal & Decisions

Make the booking application bilingual (English / Spanish) with **English as the default**, where the
**provider's configured language** drives which language end clients see on the public booking page.

Locked decisions (from brainstorming):

| Decision | Choice |
| --- | --- |
| Language model | Bilingual infrastructure, **English default** |
| Who controls language | The **provider**, via a setting on their configuration |
| Setting scope | **One** language setting drives both surfaces (admin wired later) |
| Phase 1 coverage | **Public-facing only**: public booking flow + manage/reschedule |
| Spanish variant | **Mexican Spanish (es-MX), formal `usted`** for client-facing copy |
| Date/time formatting | Spanish locale month/weekday names + **24-hour** time when `lang === "es"` |
| Mechanism | **Option A** — config-threaded, no new React context |
| Landing page | Out of scope, kept fully separate |

### Why Option A (config-threaded, not a context)

The language is **data** (a field on the provider's config), not per-visitor UI state. It travels the
exact path `vertical` already travels: stored on the provider row, read into the `ModuleStore`, and
available in both the provider and public render contexts without any wrapping component. The landing's
`LanguageProvider` is a per-visitor `localStorage` toggle — a different model we deliberately do **not**
reuse, keeping booking and landing separate.

---

## 2. Source of Truth

`language` becomes a field on the provider's configuration, defaulting to `"en"`.

```ts
// lib/types.ts
export type Lang = "en" | "es";

export type ProviderInfo = {
  // ...existing fields...
  language: Lang; // default "en"
};
```

**Touchpoints to thread the field through (all existing code paths `vertical` already uses):**

1. **Type** — add `language: Lang` to `ProviderInfo` in `lib/types.ts`. Export `Lang` from there (single
   canonical definition; the booking i18n layer imports it).
2. **Normalization** — `normalizeProvider()` in `lib/store.ts` defaults `language: source?.language ?? "en"`.
3. **Database** — new `language` column on `public_providers` (Postgres `text` with a
   `check (language in ('en','es'))` constraint, `default 'en'`, `not null`). New migration file under
   `supabase/migrations/` following the existing timestamped naming convention.
4. **Public read** — add `language` to `PUBLIC_PROVIDER_SELECT` in `lib/public-booking-resolver.ts` and
   map it in `toModuleStore()` (`language: provider.language ?? "en"`). Same for the redirect-resolution
   select and `app/api/public/providers/[slug]/route.ts` if it independently selects columns.
5. **Provider write path** — wherever the provider's config is persisted to `public_providers`, include
   `language` in the upsert/update payload. (The provider config is currently localStorage-backed via
   `lib/store.ts`; the Supabase write path is established in the backend work. The implementation plan
   must confirm the exact write site and include `language` there so the setting round-trips.)

---

## 3. Three Text Layers (all keyed by `lang`)

All user-facing text on the public surfaces falls into one of three layers. Each gains a language
dimension; the English path stays byte-for-byte unchanged so existing behavior is the default.

### Layer 1 — Vertical copy (`lib/vertical-copy.ts`)

This is the bulk of public booking copy: vertical-specific nouns/verbs/phrases (service/booking/client
wording, public-flow titles and bodies, error messages). Today it exposes 5 English `VerticalCopy`
objects (`defaultCopy`, `healthcareCopy`, `eventsCopy`, `spacesCopy`, `professionalCopy`) selected by
`getVerticalCopy(verticalId?)`.

**Change:**
- Add Spanish siblings: `defaultCopyEs`, `healthcareCopyEs`, `eventsCopyEs`, `spacesCopyEs`,
  `professionalCopyEs` — full `VerticalCopy` objects in es-MX formal `usted`.
- Restructure the lookup to be language-keyed:
  ```ts
  const COPY: Record<Lang, Record<VerticalId, VerticalCopy>> = {
    en: { healthcare: healthcareCopy, /* ... */ },
    es: { healthcare: healthcareCopyEs, /* ... */ },
  };
  export function getVerticalCopy(verticalId?: VerticalId, lang: Lang = "en"): VerticalCopy {
    const byVertical = COPY[lang] ?? COPY.en;
    if (!verticalId) return lang === "es" ? defaultCopyEs : defaultCopy;
    return byVertical[verticalId] ?? (lang === "es" ? defaultCopyEs : defaultCopy);
  }
  ```
- The existing English consts are **not edited** — Spanish is added alongside (low risk).
- `lang` is optional and defaults to `"en"`, so existing call sites compile unchanged; the booking
  module updates its single call site (`getVerticalCopy(vertical)` → `getVerticalCopy(vertical, lang)`).

### Layer 2 — Inline public-surface strings (new `components/booking/i18n/`)

Strings rendered directly in JSX/template literals on public surfaces that are **not** in `vertical-copy`
— e.g. manage/reschedule UI, generic step labels and buttons, hold-countdown text, public-flow validation
messages not already routed through `copy.phrases`.

**New files:**
- `components/booking/i18n/translations.ts` — `export const bookingTranslations: Record<Lang, BookingDict>`
  with a typed `BookingDict` shape, English + es-MX formal. Structured by area (e.g. `manage`, `public`,
  `common`). This is **separate** from the landing's `components/landing/translations.ts`.
- `components/booking/i18n/index.ts` (optional) — `bookingT(lang): BookingDict` helper.

The module derives once, near where it derives `copy`:
```ts
const lang = store.provider.language ?? "en";
const copy = getVerticalCopy(vertical, lang);
const t = bookingTranslations[lang];
```
For public sub-components (manage/reschedule), pass `t` / `lang` as props (phase-1 surface is small).

### Layer 3 — Locale-aware date/time formatting

`lib/constants.ts` defines four module-level `Intl.DateTimeFormat("en-US", …)` singletons (month, long
date, compact date, weekday-short); `lib/format.ts` `formatTimeLabel` renders 12-hour AM/PM. These are
shared by both admin and public render paths.

**Change:** parameterize by `lang`.
- Replace the four singletons with small factory/getter functions, e.g.
  `getLongDateFormatter(lang)`, memoized per locale. `lang === "es"` → `"es-MX"`; otherwise `"en-US"`.
- `formatTimeLabel(time, lang)` → 24-hour `HH:MM` when `lang === "es"`; unchanged 12-hour AM/PM for `"en"`.
- Thread `lang` into the `lib/format.ts` functions used on public surfaces
  (`formatDateLabel`, `formatCompactDate`, `formatMonthLabel`, `formatTimeLabel`, `formatTimeRange`).
  Signatures gain an optional `lang: Lang = "en"` trailing arg so non-public call sites compile unchanged
  and keep English formatting until phase 2.

---

## 4. Settings UI (the language selector)

Add a **Language** selector to the provider **Settings** tab (`renderSettings()` in
`components/haab-booking-module.tsx`, ~line 2482). It writes `provider.language`.

- Phase 1: the selector's own label/options are in **English** (admin copy is not yet wired to the
  dictionary). Options: `English` / `Español`.
- Persisted through the same provider-config save path as other settings (Section 2, item 5).
- Effect today: choosing `Español` flips the provider's **public booking page** to Spanish. Their admin
  view stays English until phase 2 — consistent with "one setting drives both," just not wired on admin.

---

## 5. Scope Guardrail (Phase 1 = public-facing)

Only these render paths consume `es` in phase 1:

- **Public booking flow** — service selection, date/slot picking, client details, booking summary,
  confirmation/success, hold countdown, capacity/“spots left” text, public validation errors.
- **Manage / reschedule flow** — `…/manage/[token]` surfaces: lookup, booking summary, cancel,
  reschedule.
- The **Settings language selector** (the control itself; label stays English).

**Explicitly untouched in phase 1** (remain English literals): provider dashboard, bookings list,
admin calendar, service editor, availability editor, setup wizard, and the rest of the Settings tab.
These keep passing the default `lang = "en"` to formatters and continue using inline English strings.
Phase 2 (separate spec) wires the admin side to the same `lang`.

> **Boundary note:** because `vertical-copy` phrases are shared between admin and public, some admin
> strings sourced from `copy.phrases` *will* localize once the provider picks Spanish (they read the
> language-keyed copy). That is acceptable and harmless. The guardrail governs **new** wiring of inline
> strings and formatters, not the shared copy dictionary.

---

## 6. Tone & Translation Guidelines

- **es-MX, formal `usted`** for all client-facing copy. No `vosotros`.
- Natural, concise Mexican Spanish — translate meaning, not word-for-word.
- Keep product/brand nouns as-is ("Haab Calendar").
- Preserve placeholders, interpolation, and any embedded `copy.*` nouns within phrases.
- 24-hour time and Spanish month/weekday names on Spanish surfaces.

---

## 7. Testing

**Unit (vitest):**
- `getVerticalCopy(vertical, "es")` returns the Spanish object for each vertical and falls back to
  `defaultCopyEs` for unknown/undefined vertical; `getVerticalCopy(vertical)` (no lang) still returns
  English.
- Formatters: `"es"` produces es-MX month/weekday names and 24-hour time; `"en"` output is **identical**
  to current (regression guard on existing `lib/__tests__/format.test.ts` / `date.test.ts`).
- `bookingTranslations` has matching key shapes for `en` and `es` (no missing keys).

**Manual:**
- New `docs/manual-tests/booking-spanish-public-flow.md` — a provider sets language = Español, then a
  walk-through of the public booking flow and the manage/reschedule flow verifying Spanish copy,
  es-MX dates, and 24-hour times. Include an English-default regression pass.

---

## 8. Files Touched (summary)

**Edit:**
- `lib/types.ts` — `Lang` type, `ProviderInfo.language`.
- `lib/store.ts` — `normalizeProvider` default.
- `lib/vertical-copy.ts` — Spanish copy objects + language-keyed `getVerticalCopy`.
- `lib/constants.ts` — locale-aware formatter factories.
- `lib/format.ts` — `lang`-aware formatting functions.
- `lib/public-booking-resolver.ts` — select + `toModuleStore` mapping.
- `app/api/public/providers/[slug]/route.ts` — select `language` if applicable.
- `components/haab-booking-module.tsx` — derive `lang`/`t`, pass `lang` to copy/formatters on public
  paths, Settings language selector.
- Provider config Supabase write path — include `language` in payload.

**Create:**
- `components/booking/i18n/translations.ts` (+ optional `index.ts`).
- `supabase/migrations/<timestamp>_add_provider_language.sql`.
- `docs/manual-tests/booking-spanish-public-flow.md`.

**Out of scope:** everything under `components/landing/`, the marketing page, and all phase-1-untouched
admin surfaces.

---

## 9. Phase 2 (noted, not in this spec)

Wire the provider admin surfaces (dashboard, editors, setup wizard, full Settings tab) to the same
`lang`, translate their inline strings into a corresponding `BookingDict` area, and switch their
formatter/`getVerticalCopy` calls to pass `lang`. No schema or mechanism changes required — the
infrastructure from phase 1 already supports it.
