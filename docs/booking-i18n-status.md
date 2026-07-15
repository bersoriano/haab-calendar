# Internationalization (i18n) — Current Status

> **Last audited:** 2026-07-15 on `main`.
>
> The booking application and marketing landing page use separate language
> systems. This document describes both boundaries, with the booking application
> as the primary focus.

Related documents:

- Phase 1 public-flow design: `docs/superpowers/specs/2026-06-25-booking-spanish-i18n-design.md`
- Phase 1 implementation plan: `docs/superpowers/plans/2026-06-25-booking-spanish-i18n.md`
- Phase 2 admin implementation plan: `docs/superpowers/plans/2026-06-26-admin-i18n.md`
- Public-flow manual test: `docs/manual-tests/booking-spanish-public-flow.md`
- Backend data path: `docs/backend-implementation.md` → "Provider language (i18n)"
- Next.js 16 reference: `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`

---

## 1. Supported Languages and Ownership

The application supports English (`en`) and Mexican Spanish (`es`, formatted
with the `es-MX` locale).

The two language systems have different owners and defaults:

| Surface | Language owner | Default | Persistence |
| --- | --- | --- | --- |
| Marketing landing page | Visitor | Spanish | `localStorage` key `haab-lang` |
| Provider/admin application | Provider configuration, seeded from the visitor during first setup | Selected visitor language for first setup; English fallback | `public.providers.language` |
| Public booking and manage pages | Provider configuration | English | Read through `public_providers.language` |
| Login, signup, and confirmation | Visitor | Spanish | `lang` query/form value plus `haab-lang` synchronization |

The booking copy uses formal Mexican Spanish (`usted`). English remains the
fallback whenever stored language data is absent or invalid.

Visitor language travels from the landing page to `/login?lang=...`, in the
post-authentication `next` path, and in a hidden form field to the authentication
Server Action. Signup confirmation URLs and `app/auth/confirm/route.ts` preserve
the same value. Changing language on the login page updates both the visible
login language and the language inside `next`. The login client also synchronizes
`haab-lang`.

For a provider who has not completed setup, that explicit return language seeds
`ModuleStore.provider.language`, including over an incomplete local draft. The
same value therefore drives the setup wizard and becomes provider-owned when
setup is published. A completed provider's persisted language wins instead and
is not overwritten by a visitor preference.

---

## 2. Booking i18n Architecture

The booking application uses configuration-threaded language data rather than a
React language context.

### Text layers

1. **Vertical copy** — `lib/vertical-copy.ts`
   - Language-specific terminology and phrases for default, healthcare, events,
     spaces, and professional-services verticals.
   - `getVerticalCopy(verticalId?, lang = "en")` selects the deck.
   - TypeScript enforces matching object shapes.
2. **Generic UI copy** — `components/booking/i18n/translations.ts`
   - Typed `BookingDict` groups: `common`, `public`, `manage`, `publicFlow`,
     `admin`, `setup`, `welcome`, and `providerForm`.
   - `bookingTranslations: Record<Lang, BookingDict>` provides English and
     Spanish values.
   - Unit tests enforce English/Spanish key parity and reject empty Spanish
     values.
3. **Locale-aware formatting** — `lib/constants.ts` and `lib/format.ts`
   - Spanish uses `es-MX` month and weekday names and 24-hour time.
   - English keeps the existing `en-US` and AM/PM behavior.

### Persisted data flow

```text
Landing language
  → /login?lang=... + language-bearing next path
  → HomeExperience initialLanguage
  → seedSetupLanguage(...) for incomplete setup only
  → ModuleStore.provider.language
  → setup and admin dictionaries
  → PUT /api/provider/store on publish

Settings → Language
  → updateProvider("language", ...)
  → PUT /api/provider/store
  → lib/supabase/provider-store.ts
  → public.providers.language
  → public_providers.language
  → lib/public-booking-resolver.ts
  → ModuleStore.provider.language
  → getVerticalCopy(...) · bookingTranslations[lang] · format*(..., lang)
```

`app/api/public/providers/[slug]/route.ts` contains a second public mapper and
must remain aligned with `lib/public-booking-resolver.ts`.

The schema contract is introduced by
`supabase/migrations/20260625120000_add_provider_language.sql`: the column
defaults to `en`, accepts only `en` or `es`, and is exposed by the public view.
The repository cannot prove whether this migration is applied to every remote
environment; deployment verification must check remote migration history.

---

## 3. Implemented Coverage

| Area | Current state |
| --- | --- |
| Public provider and service pages | Localized |
| Public calendar and booking flow | Localized |
| Booking confirmation | Localized |
| Manage, cancel, and reschedule flows | Localized |
| Booking hold warning | Localized, including shared countdown states |
| Provider dashboard and bookings list | Localized |
| Admin calendar | Localized |
| Setup wizard and welcome screen | Localized |
| Availability editor | Localized, including weekdays and blocked-time controls |
| Provider information and header-image form | Localized, including placeholders and upload controls |
| Service editor | Localized, including the notes placeholder |
| Settings and admin navigation | Localized, including save, language, and public-link helpers |
| Shared progress and booking-status UI | Localized, including screen-reader labels |
| Marketing landing page | Localized, including home integration panels and vertical cards |
| Login, signup, and confirmation results | Localized and language-preserving across Supabase Auth redirects |
| Landing → authentication → setup → admin continuity | Selected language seeds incomplete setup, persists on publish, and stays synchronized with Settings |

Phase 1 supplied the public booking infrastructure. Phase 2 subsequently added
the `admin`, `setup`, `welcome`, and `providerForm` dictionaries and wired most
provider-facing surfaces to the same stored language. The old Phase 1 statement
that the admin application remains English is no longer accurate.

---

## 4. Remaining Translation Gaps

### Booking and provider application

- Client-side natural-language parsing, setup validation, provider-save,
  booking, reschedule, and cancellation errors still contain English fallbacks
  in `components/haab-booking-module.tsx`.
- Booking/provider API validation, persistence, and fallback error messages are
  English-only. A client dictionary cannot translate raw server messages
  reliably; these need stable error codes or localized server output.
- Upload-route error details can still arrive as raw English server messages,
  although the image uploader's own labels, validation, and fallback error are
  localized.

### Landing and authentication

- `config/verticals.ts` stores English preset labels, descriptions, seeded
  service content, and hints. Landing cards no longer render these fields
  directly, but applying a preset still seeds English provider-authored content.
  Its translation policy must be explicit.
- The Supabase-hosted confirmation email template is external to the application
  dictionary and is not selected by the visitor's `lang` value.
- Metadata in `app/layout.tsx` is English-only.

### Exported and provider-authored content

- `lib/ics.ts` exports English labels (`Client`, `Phone`, `Notes`, and manage-link
  instructions) and an English product identifier.
- Provider-authored service names, descriptions, notes, and hero text are stored
  in one language only. There is no localized content model or fallback chain.
- Booking email/SMS notification templates are not part of the current i18n
  dictionaries.

### Document language and routing

- `app/layout.tsx` server-renders `<html lang="en">`, while the landing page
  initially renders Spanish and updates the document language only after client
  hydration. This is inaccurate during the landing server render. The login page
  now scopes its rendered content with `lang`, but the root element remains
  static.
- The application does not implement locale-prefixed routes, `Accept-Language`
  negotiation, or server-loaded locale dictionaries. The bundled Next.js 16
  guide documents those patterns, but provider-owned booking language does not
  require locale-prefixed booking URLs. A product decision is still needed for
  visitor-owned landing and authentication routes.

---

## 5. Verification

Audit baseline on 2026-07-15:

- `npm test` — 212 tests passing across 14 test files.
- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- Booking dictionary parity and non-empty Spanish values are covered by
  `components/booking/i18n/__tests__/translations.test.ts`.
- Landing dictionary parity, non-empty values, visitor-language normalization,
  and Supabase auth-error mapping are covered by
  `components/landing/__tests__/translations.test.ts` and
  `lib/__tests__/auth-i18n.test.ts`.
- Setup-language seeding and completed-provider protection are covered by
  `lib/__tests__/store.test.ts`.
- Locale formatting and vertical-copy behavior are covered in `lib/__tests__`.

Missing automated coverage:

- No hardcoded-string detector or per-surface translation coverage test.
- No browser-level English/Spanish end-to-end test.
- No automated assertion for `<html lang>` on each surface.

Use `docs/manual-tests/booking-spanish-public-flow.md` for the current manual
public and manage-flow regression.

---

## 6. Adding Another Language

1. Extend `Lang` in `lib/types.ts`.
2. Add the locale to `LOCALE` in `lib/constants.ts`.
3. Add a complete vertical-copy deck in `lib/vertical-copy.ts`.
4. Add a complete `BookingDict` entry.
5. Update the provider-language database constraint and Settings options.
6. Update the public resolver and public API mapper normalization.
7. Add formatter, dictionary-parity, persistence, and browser-flow tests.

Do not assume TypeScript alone covers strings outside the typed dictionaries;
the remaining hardcoded surfaces require an explicit audit.
