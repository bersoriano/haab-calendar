# Google Analytics

GA4 property **Haab Calendar**, web stream measurement ID `G-2RHC147XNR`.
The code follows the shared landing-page GA baseline: one module, manual page
views, the shared event taxonomy, strict privacy.

| Piece | Where |
|---|---|
| Start-up (loads `gtag.js` from the bundle, no inline script) | `instrumentation-client.ts` → `initAnalytics()` |
| Gates, URL cleaning, GA destination, `track()` | `lib/analytics/analytics.client.ts`, `lib/analytics/analytics.ts` |
| One `page_view` per route | `components/analytics/page-analytics.tsx`, mounted in `app/layout.tsx` |
| Pages that may be measured | `ANALYTICS_PATHS` in `lib/analytics/landing-policy.ts` |
| Landing events (sections, CTAs, FAQ, video, scroll, language) | `lib/analytics/landing-browser.ts` → `components/landing/landing-analytics.tsx` |
| Tests | `lib/analytics/__tests__/analytics.test.ts` |

## Configuration

| Variable | Production | Preview | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_GA_ID` | `G-2RHC147XNR` | `G-2RHC147XNR` | Empty disables GA. |
| `NEXT_PUBLIC_SITE_URL` | `https://haabcalendar.com` | `https://haabcalendar.com` | GA collects only on this hostname. Also the site's canonical origin (metadata, sitemap). |
| `NEXT_PUBLIC_GA_DEBUG` | unset | `true` | Preview/localhost send with `debug_mode` for DebugView; ignored on the production host. |

All three are `NEXT_PUBLIC_*`, inlined into the browser bundle **at build
time**. Changing one in Vercel does nothing until the next deployment.

```sh
vercel env add NEXT_PUBLIC_GA_ID production        # G-2RHC147XNR
vercel env add NEXT_PUBLIC_GA_ID preview           # G-2RHC147XNR
vercel env add NEXT_PUBLIC_SITE_URL production     # https://haabcalendar.com
vercel env add NEXT_PUBLIC_SITE_URL preview        # https://haabcalendar.com
vercel env add NEXT_PUBLIC_GA_DEBUG preview        # true
```

Previews keep the production site URL on purpose: the host gate still keeps
`*.vercel.app` out of reports, and canonical links stay correct.

**One host.** The gate accepts exactly one hostname. `www.haabcalendar.com`
is not measured; redirect it to `haabcalendar.com` in Vercel → Domains so
those visitors land on the measured host.

## Privacy gates

GA starts only when **all** hold, checked once per document before hydration:

1. The hostname equals `NEXT_PUBLIC_SITE_URL`'s (no previews, no localhost, no www).
2. Neither Do Not Track nor Global Privacy Control is on.
3. The path is in `ANALYTICS_PATHS`: `/`, the two localized doctors pages,
   `/gallery`, `/privacy`, `/terms`. An allowlist: new routes are private by default.

Booking pages, setup, dashboards and `…/manage/<token>` links (the token is a
bearer credential) are never on the list. A document that starts on one of
them never loads Google. When a client-side navigation reaches one,
`ga-disable-G-2RHC147XNR` is set and collection stays off for that document,
including a later return to a public page, until a full page load.

What is sent:

- `page_location`: origin + path + UTM tags only. Every other query parameter
  and every fragment is removed.
- `page_referrer`: other sites' origin only; this site's own path only when
  that path is itself in `ANALYTICS_PATHS` (a manage link referrer becomes
  the bare origin).
- `set` is queued **before** `js`, so the Google tag's own container tag uses
  these settings too. `send_page_view: false`, Google signals and ad
  personalization off, cookies ~13 months.

The privacy notice (`lib/legal/content.ts`, Cookies section) describes this;
update it with any change here.

## Page views: manual, Enhanced Measurement OFF

`<PageAnalytics />` sends one `page_view` per pathname, the initial load
included, with `page_type` (`landing`, `supporting`, `legal`) and `locale`
(`en`/`es`, from `<html lang>`).

In the GA web stream, **Enhanced measurement must be OFF** (Admin → Data
streams → web stream → Enhanced measurement). Its history-based page views
would count every route twice and send raw URLs past the cleaning above; its
scroll, outbound-click and form events duplicate ours.

Turn it off **in the same release** that ships manual page views (the switch
from Enhanced Measurement history page views to `<PageAnalytics />`): before
the deploy, views would be missing; after the deploy with it still on, every
view doubles.

## Events

<!-- Filled in with the approved landing event mapping. -->

## PostHog

PostHog keeps its own landing-only client (`lib/analytics/landing-client.ts`):
cookieless, memory persistence, initialized only on `LANDING_PATHS`, behind
`NEXT_PUBLIC_POSTHOG_*`. It receives the same landing events as GA.

## Verifying

1. Build output carries the ID: `grep -rl G-2RHC147XNR .next/static`.
2. Live: `bash ~/.claude/skills/landing-page-ga/scripts/audit.sh . --live https://haabcalendar.com`.
3. On `https://haabcalendar.com/`, DevTools → Network → filter `collect`:
   exactly one `en=page_view` per route, `dl` without query strings,
   `npa=1`. GA **Realtime** shows the visit.
4. Preview with `NEXT_PUBLIC_GA_DEBUG=true`: events appear in **DebugView**.

Analytics blockers and browser privacy signals prevent collection by design.
