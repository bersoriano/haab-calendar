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
