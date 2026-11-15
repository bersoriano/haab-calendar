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

Shared landing-page taxonomy. `landing-browser.ts` emits them from the
`data-landing-*` markup; `combineLandingCapture()` sends each one to GA
through `track()` and to PostHog under the same name. Every landing event
also carries `locale` (`en`/`es`).

| Event | Fires on | Parameters |
|---|---|---|
| `page_view` | each measured route (`<PageAnalytics />`) | `page_type`, `locale` |
| `section_view` | a `LANDING_SECTIONS` section half-visible for 1 s, once per visit | `section_id` |
| `cta_click` | start / demo / gallery / login buttons | `cta_type`, `cta_location` (section) |
| `select_content` | FAQ opened, industry picked, live example or featured post opened | `content_type`, `content_id` |
| `read_progress` | page scroll 25/50/75/100 %; demo video start/25/50/75/complete | `content_type` (`page`/`video`), `percent` |
| `language_change` | language switch | `language` (target) |

`data-landing-action` → event:

| Markup action | Event | Parameters |
|---|---|---|
| `create_page` | `cta_click` | `cta_type: signup` |
| `resume_setup` (a saved draft exists) | `cta_click` | `cta_type: resume` |
| `open_dashboard`, `login` | `cta_click` | `cta_type: login` |
| `try_demo` | `cta_click` | `cta_type: demo` |
| `view_gallery` | `cta_click` | `cta_type: gallery` |
| `view_example` | `select_content` | `content_type: example`, `content_id: example_<card index>` or `featured` |
| `read_post` | `select_content` | `content_type: article`, `content_id: featured` |

Values are enumerated in `lib/analytics/landing-policy.ts`
(`LANDING_SECTIONS`, `LANDING_CTA_TYPES`, `LANDING_CONTENT_TYPES`,
`LANDING_VERTICALS`, `isLandingContentId`). PostHog's `sanitizeLandingEvent`
drops any event or value not listed there, so add new values there first.
No free text, form contents, or account identity is ever sent.

**Renamed 2026-11-15.** Before that date, GA had page views only and PostHog
had `landing_section_view`, `landing_cta_click` (`action`), `landing_faq_open`,
`landing_vertical_select`, `landing_scroll_depth`, `landing_video_progress`,
`landing_language_change` and `landing_nav_click` (now dropped: the
destination's page view carries the referrer). Reports spanning the date need
both series. PostHog's `$pageview`/`$pageleave` are unchanged and stay
PostHog-only.

**Key event.** There is no server-confirmed sign-up on a measured page
(accounts are created on `/login`, which is private), so the conversion is the
derived event `create_page_click` = `cta_click` where `cta_type` = `signup`.

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
