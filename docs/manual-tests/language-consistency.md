# Language consistency — manual verification

Run with browser language set to English, then repeat with it set to Spanish
(Chrome: Settings → Languages → move Español to the top).

| # | Screen | Check | EN browser | ES browser |
|---|--------|-------|-----------|-----------|
| 1 | `/` marketing, no `?lang` | English by default with an EN browser; Spanish only with an ES browser | | |
| 2 | `/` marketing | No wrong-language flash on hard reload (throttle to Slow 3G) | | |
| 3 | `/` marketing | `<html lang>` in DevTools matches the visible language | | |
| 4 | `/` switcher | Same pill control as everywhere else; active option obvious | | |
| 5 | `/login` | Entirely one language; switcher identical to the marketing one | | |
| 6 | `/login` | A failed sign-in shows dictionary copy, never a raw Supabase message | | |
| 7 | Dashboard | Headline matches the rest of the interface — no English title on a Spanish UI | | |
| 8 | Dashboard → Settings | Two distinct controls: "Language your clients see" and "Your workspace language" | | |
| 9 | Dashboard → Settings | Set client language to Spanish, workspace to English — both hold after reload | | |
| 10 | Dashboard | Dates, weekday names and times match the workspace language | | |
| 11 | Public booking page | Opens in the owner's client language regardless of browser language | | |
| 12 | Public booking page | No flash of the other language on hard reload | | |
| 13 | Public booking page | Client switches language → URL gains `?lang=`; reload keeps it | | |
| 14 | Public booking page | After switching there, reload `/` — the marketing site is unchanged | | |
| 15 | Booking flow | Hold countdown, status pills, and helper text all in one language | | |
| 16 | Confirmation screen | Same language as the booking flow that produced it | | |
| 17 | Shared link `?lang=es` | Opens Spanish immediately, from the first paint | | |
| 18 | Owner content | An English service description on a Spanish page stays English (expected) | | |
| 19 | `/nonexistent` | 404 page matches the resolved language | | |
| 20 | Service editor date field | Known limitation: native input follows the OS locale, not the page | n/a | n/a |
| 21 | Public booking page, Spanish-configured owner | Known limitation: served `<html lang>` follows the *visitor*, not the owner's page language, and is corrected only after hydration. Check View Source (not DevTools, which shows the corrected DOM) | | |
| 21b | Same page with `?lang=es` on an EN browser | Same limitation, not a way around it: the proxy ignores `?lang` on these routes, so View Source still shows `<html lang="en">` while the visible copy is Spanish from the first paint | | |
| 22 | Dashboard → Settings | Change "Language your clients see" only — the dashboard headline, workflow header and the rest of the workspace must NOT change language | | |
| 23 | Dashboard → Settings | Change "Your workspace language" only — the headline above the module changes immediately, with no reload | | |
| 24 | Dashboard → Settings → `/` | After changing "Language your clients see", reload `/` — the marketing site is unchanged | | |

## Known limitations recorded in code

- **Native date input** (`components/provider/ServiceEditor.tsx`) renders in the
  OS/browser locale. Chromium honours the `lang` attribute; Firefox and Safari
  ignore it. Fixing it needs a custom picker.
- **`<html lang>` on public booking pages** (`app/layout.tsx`). The root layout
  resolves the *visitor's* language from cookie and `Accept-Language`; it has no
  slug, no params and no database access, so it cannot see the owner's saved
  `provider.language`. The page content is correct from the first paint — only
  the `lang` attribute lags until `haab-booking-module` corrects it after
  hydration. The proxy deliberately keeps the owner's page language out of the
  shared cookie (`lib/language/public-routes.ts`), because promoting it there is
  what let one business's language follow a client to the marketing site.
  That exemption also means `?lang=` does not resolve on these routes, so it
  applies with a `?lang=` in the URL exactly as it does without one — row 21b.
