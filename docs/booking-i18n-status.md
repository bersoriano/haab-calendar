# Booking App Internationalization (i18n) — Status & Strategy

> **Scope:** The booking application only. The marketing **landing page is a separate system**
> (`components/landing/` with its own `LanguageProvider` + `translations.ts`) and is intentionally not
> covered here.
>
> **Phase 1 (shipped on `feat/booking-spanish-i18n`):** Spanish (es-MX) for the **public-facing**
> booking surfaces, behind bilingual infrastructure, with **English as the default**.

Related documents:
- Design spec: `docs/superpowers/specs/2026-06-25-booking-spanish-i18n-design.md`
- Implementation plan: `docs/superpowers/plans/2026-06-25-booking-spanish-i18n.md`
- Manual test: `docs/manual-tests/booking-spanish-public-flow.md`
- Backend gap note: `docs/backend-implementation.md` → "Provider language (i18n)"

---

## 1. Goal

Make the booking app bilingual (English / Spanish) where the **provider's configured language** drives
which language their clients see on the public booking page. English is the default; a provider opts into
Spanish from their Settings. Spanish targets **Mexican Spanish (es-MX), formal `usted`**, with Spanish
month/weekday names and 24-hour time.

---

## 2. Strategy & Architecture

**Mechanism — "Option A": language is data, threaded from config (no new React context).**

The language is a field on the provider config (`provider.language: "en" | "es"`), travelling the exact
same path the existing `vertical` field already does: stored on the provider row → exposed by the
`public_providers` view → mapped into the `ModuleStore` by the resolver → read inside the booking module.
Because both the provider and public render contexts already hold the provider config in the store, no
wrapping provider/context was needed. This deliberately does **not** reuse the landing page's
per-visitor `localStorage` `LanguageProvider`, keeping booking and landing separate.

**Three text layers, all keyed by `lang` (English path unchanged = the default):**

1. **Vertical copy** — `lib/vertical-copy.ts`. The bulk of public copy (vertical-specific nouns/verbs/
   phrases). Now `getVerticalCopy(verticalId?, lang = "en")` selects from a
   `Record<Lang, Record<VerticalId, VerticalCopy>>`. Spanish sibling objects added for all 4 verticals +
   default. TypeScript enforces structural parity (every phrase key must exist in every object).
2. **Inline UI strings** — `components/booking/i18n/translations.ts` (`bookingTranslations: Record<Lang, BookingDict>`).
   Generic/structural public strings not in vertical copy (buttons, step labels, manage/reschedule UI,
   hold countdown). Separate from the landing dictionary. A runtime test enforces en/es key parity and
   "no empty Spanish strings".
3. **Locale formatters** — `lib/constants.ts` + `lib/format.ts`. Date/time formatters are now
   `lang`-aware: `es` → `es-MX` month/weekday names + 24-hour time + Spanish words ("Día completo",
   "Cita", "lugares"…); `en` → byte-for-byte identical to before.

**Source of truth & data flow (public page):**

```
Settings "Language" selector → updateProvider("language", …)            [client store]
public.providers.language (migration, default 'en', check en|es)
  → public_providers view (exposes language)
  → lib/public-booking-resolver.ts (PUBLIC_PROVIDER_SELECT + toModuleStore)
  → ModuleStore.provider.language
  → components/haab-booking-module.tsx: const lang = provider.language ?? "en"
  → getVerticalCopy(vertical, lang) · bookingTranslations[lang] · format*(…, lang)
```

The same `language` value is also read by `app/api/public/providers/[slug]/route.ts` (a second public
mapper kept in lockstep with the resolver).

---

## 3. What Was Done (Phase 1)

All changes are on branch `feat/booking-spanish-i18n` (10 implementation commits + 1 polish):

| Area | Change |
| --- | --- |
| Types | `Lang = "en" \| "es"`; `ProviderInfo.language` (default `"en"`); `normalizeProvider` defaults it |
| Database | Migration `20260625120000_add_provider_language.sql`: `providers.language` column + check + grant + `public_providers` view recreated to expose it |
| Resolver | `PUBLIC_PROVIDER_SELECT` + `toModuleStore` map `language`; API route mapper updated too |
| Formatters | `lib/constants.ts` per-locale memoized formatters + `lib/format.ts` `lang`-aware (es-MX, 24h) |
| Vertical copy | Spanish objects for all verticals; `getVerticalCopy(vertical, lang)`; 4 new phrase keys for grammatical Spanish titles |
| Dictionary | `components/booking/i18n/translations.ts` (`common`/`public`/`publicFlow`/`manage` groups, en+es) |
| Public booking flow | `renderPublicCalendar` + `renderPublicFlow` render in `lang`; all formatter calls threaded |
| Manage flow | `renderRescheduleModal`, `renderCancellationModal`, `renderCalendarQrModal`, manage-lookup states |
| Calendar headers | Public + reschedule weekday headers localized (`getWeekdayShortFormatter(lang)`) |
| Settings | English-labelled **Language** selector (English / Español) writing `provider.language` |
| Docs/tests | Manual-test script; unit tests for formatters (es), vertical-copy (es), dictionary parity, store default |

**Quality gates:** every task passed a spec-compliance review and a code-quality review; a final holistic
review confirmed the end-to-end data flow and the English-default guarantee. Current state: `vitest`
**191 passing**, `tsc --noEmit` clean, `npm run build` succeeds, `npm run lint` clean.

**English-default guarantee:** every entry point defaults to `"en"` (DB column default, `normalizeProvider`,
resolver/route ternaries on null, `getVerticalCopy` default param, every `format*` default arg, the module's
`?? "en"`). Admin formatter calls pass no `lang`, so admin dates/times stay `en-US`. A provider who never
touches the setting sees the exact pre-change English app.

---

## 4. What's Missing / Next Steps

### 4.1 Blocking for production use of the toggle — provider→Supabase write path
The provider config is currently **localStorage-first**; there is **no write path** that persists provider
config (including `language`) to `public.providers`. So today the Settings selector updates only the client
store and the choice does **not** reach the public page in production. The DB column, view, resolver, and UI
are all ready — when provider-config persistence is implemented, its upsert/update payload **must include
`language`**. Until then, set it manually to validate:
```sql
update public.providers set language = 'es' where slug = '<provider-slug>';
```
(Documented in `docs/backend-implementation.md`.)

### 4.2 Apply the migration
`supabase/migrations/20260625120000_add_provider_language.sql` has not been applied in this environment
(no Supabase CLI). Run `supabase migration up` (or apply via MCP/dashboard) before the public Spanish flow
works against a real backend.

### 4.3 Phase 2 — provider/admin surfaces
Phase 1 deliberately left admin **inline** strings in English. To fully localize the provider-facing app
(dashboard, bookings list, admin calendar, service & availability editors, setup wizard, rest of Settings):
translate those strings into `BookingDict` groups and thread `lang` into their `format*` calls. No schema
or mechanism change is required — the infrastructure already supports it.
- Note: shared `copy.phrases.*` and the shared manage/reschedule modals already localize for an
  es-provider on admin (accepted in phase 1). Phase 2 makes the rest consistent.

### 4.4 Additional languages
Adding a language = extend the `Lang` union, add a locale to `LOCALE` in `lib/constants.ts`, add the new
key to each `Record<Lang, …>` (vertical copy, dictionary), and update the DB check constraint + Settings
options. TypeScript will flag every place that needs a new translation.

### 4.5 Nice-to-haves / known minor gaps
- `bookingT()` helper in the dictionary is exported but unused (harmless; the module reads
  `bookingTranslations[lang]` directly).
- Generated `.ics` calendar text (`lib/ics.ts`) and any system emails are not yet localized.
- The Settings selector labels themselves are English in phase 1 (intentional).

---

## 5. How to Test the Spanish Public Flow Now
1. Apply the migration (4.2).
2. Pick a provider with `setup_complete = true`: `update public.providers set language = 'es' where slug = '<slug>';`
3. Open `/<vertical>/<slug>` and walk the public booking + `/manage/<token>` flows.
4. Verify: es-MX formal copy, Spanish weekday/month names, 24-hour times, "lugares disponibles".
5. Reset to `'en'` and confirm the original English is unchanged.

Full script: `docs/manual-tests/booking-spanish-public-flow.md`.
