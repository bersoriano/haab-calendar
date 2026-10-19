# Landing analytics (PostHog)

PostHog measures the marketing landing page at `/`. Provider booking analytics
remain in Supabase. No PostHog tracking runs on the gallery, login, setup,
dashboard, public booking pages, private manage links, or embedded booking demos.
Shared landing buttons also appear elsewhere; their attributes do nothing
without the landing observer.

## Activate collection

1. Use the existing US PostHog project on its free plan. No payment card is
   required. The monthly analytics allowance is currently 1 million events;
   collection above that allowance stops on the free plan. Section and interaction
   events count toward the allowance, not just page views.
2. Under **Settings → Project → Web analytics**, enable **Cookieless server hash
   mode**. Without this project setting, PostHog ignores cookieless events even
   if network requests succeed. Keep session replay and automatic capture off.
3. Set these variables in the deployment's **Production** environment:

   ```dotenv
   NEXT_PUBLIC_POSTHOG_KEY=<public project token from PostHog>
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   NEXT_PUBLIC_POSTHOG_ALLOWED_HOSTS=haabcalendar.com,www.haabcalendar.com
   ```

   The public project token starts with `phc_` and is write-only, not a personal
   API key. Never put a secret from PostHog or another service in any
   `NEXT_PUBLIC_*` variable. Local `.env.local` can hold
   these same values; it must not be committed.
4. Rebuild and deploy. Next.js embeds these variables at build time. A runtime
   restart alone does not update the browser bundle.
5. Open the production landing page in a normal browser. Confirm `$pageview`
   and `landing_section_view` arrive under **Activity → Explore** in PostHog.
   Follow the QA steps below before considering collection live.

The client stays disabled if any variable is absent, the hostname is not an
exact match, or the browser sends Do Not Track or Global Privacy Control. It
always excludes localhost, loopback IPs, and `*.vercel.app`, even if listed.
The code supports `https://eu.i.posthog.com` for future regional changes, but
the current project and privacy notice describe US processing; update both if
moving regions.

## Events and their meanings

Every event includes the current UI `language` (`en` or `es`), the visit's
`utm_source`, `utm_medium`, and `utm_campaign` when present, and a referring
hostname. Campaign values are trimmed, lowercased, and limited to 100 characters.
Do not put names, email addresses, or other personal data in campaign labels.

| Event | Metadata | Meaning |
| --- | --- | --- |
| `$pageview` | language and acquisition fields | Landing mounted; language switches do not create another view |
| `landing_section_view` | `section` | At least half of the section or viewport (whichever is smaller) was visible continuously for one second, in a foreground tab; once per page load |
| `landing_cta_click` | `section`, `action`, optional numeric `example` | Deliberate click on an annotated landing CTA |
| `landing_vertical_select` | `section`, `vertical` | Industry tile clicked; no page name or form contents |
| `landing_nav_click` | `section` | Section anchor clicked; section is the destination, not proof it was viewed |
| `landing_language_change` | `section`, `target_language` | Language control clicked; current language is included separately |
| `landing_faq_open` | `section`, numeric `question` | FAQ opened by interaction; initially open question does not count |
| `landing_video_progress` | `section`, `milestone` | First play, 25%, 50%, 75%, or complete; milestones use foreground playback time, not a seek to the end |
| `landing_scroll_depth` | `percent` | First reach of 25%, 50%, 75%, or 100% of document height, measured to viewport bottom |
| `$pageleave` | `duration_seconds`, `active_seconds`, `max_scroll_percent` | Visit ends or browser hides page for navigation; active time means foreground-tab time |

Sections: `header`, `hero`, `facts`, `verticals`, `how`, `demo`, `live-examples`,
`features`, `google-calendar`, `trust`, `faq`, `early-access`, `footer`.
The `verticals` picker is absent for an owner whose page already exists.

CTA actions: `create_page`, `resume_setup`, `open_dashboard`, `try_demo`,
`view_gallery`, `view_example`, `login`. An existing page or guest draft does
not count as a new-page CTA. Example numbers are zero-based indices into
`DEMO_PAGES` in `lib/demo-pages.ts`. FAQ numbers are one-based positions in the
English/Spanish `faq.items` arrays in `components/landing/translations.ts`.

## Reports to create in PostHog

Create a dashboard named **Landing performance**. These are report recipes;
the integration does not automatically provision dashboards or saved insights.

- **Acquisition:** use **Web analytics**, filtered to pathname `/`. Compare
  channels, referring domains, UTMs, devices, and browsers. Add the
  `language` event-property filter for English/Spanish comparisons.
  Cookieless server hashing strips IP data before GeoIP enrichment, so country
  breakdowns are unavailable with this setup.
- **Section reach:** a total-count trend of `landing_section_view`, broken down
  by `section`. Divide each section's count by total `$pageview` events for the
  same period. Both count page loads; do not mix total views with unique users.
- **Create-page intent:** count `landing_cta_click` where `action = create_page`,
  broken down by `section`, source, device, or language. These are clicks, not
  completed signups.
- **CTA conversion among section viewers:** create a funnel from
  `landing_section_view` to `landing_cta_click`; filter both steps to the same
  section and the second to the desired action. An immediate click before the
  one-second visibility threshold can appear outside this funnel.
- **Examples and industries:** trends of `landing_cta_click` filtered to
  `view_example`, broken down by `example`; and `landing_vertical_select`,
  broken down by `vertical`.
- **FAQ and video:** `landing_faq_open` broken down by `question`, and
  `landing_video_progress` broken down by `milestone`.
- **Engagement:** scroll-depth event counts by `percent`; average
  `active_seconds` on `$pageleave`. Analyze phone and desktop separately.

## QA and interpretation

Use a normal browser on a production allowlisted host. PostHog filters bots and
automation, so an automated browser may not emit any events. Localhost and
preview traffic intentionally produce no analytics requests.

1. Open `/?utm_source=internal&utm_medium=qa&utm_campaign=landing-check&test_secret=must-not-send#hero`.
   Keep `utm_source != internal` as a filter on normal growth reports.
2. Inspect outgoing PostHog event bodies. `$current_url` must contain only the
   origin and `/`; `test_secret`, fragment, account emails, form data, and raw
   referring paths must be absent. The three UTM fields are intentional.
3. Wait one second in each section; scroll away and back. Section views must not
   duplicate. Brief passes and background tabs must not count.
4. Click hero/footer CTAs, an industry tile, gallery link, example card, FAQ, and
   language control. Verify placement/metadata and that every control still works.
   Test mobile menu and desktop controls at their actual widths.
5. Play the demo; then try seeking to its end. Seeking must not manufacture
   playback milestones. Replaying may add watched time; milestones remain once
   per page load.
6. Verify no `ph_*` cookies or analytics local/session-storage entries appear.
   Existing authentication/language cookies are unrelated.
7. Check the same events arrive in PostHog. HTTP success alone does not prove
   ingestion; the cookieless project setting must be on.

Cookieless identities are temporary and approximate. Reports cannot identify
customers or reliably follow people across days/devices. Referrer suppression
makes some traffic direct/unknown; tag WhatsApp, email, and campaign links with
UTMs. Page-leave delivery is best effort when browsers terminate, so timing
reports can be incomplete. Section exposure is not proof of reading. Scroll
and section events provide reach, not evidence that a section caused a click.

No replay, heatmaps, person profiles, automatic form capture, feature flags,
surveys, or exception capture are enabled. A strict `before_send` allowlist also
drops unapproved SDK events and properties, including initial URLs and person
updates. The SDK's `$raw_user_agent` is retained in outgoing events because
PostHog requires it for the cookieless daily hash. PostHog uses the user agent,
IP address, day, and host for hashing, then strips the raw user agent and IP
before further processing. Free-plan event retention is currently one year.

## Disable or troubleshoot

Unset `NEXT_PUBLIC_POSTHOG_KEY` and redeploy to disable collection. Tracking
failures never prevent a landing interaction or booking.

For missing events, check the build-time variables, hostname allowlist, regional
host, browser privacy signals, blockers, free-tier quota, and cookieless project
setting. Check **Event ingestion warnings** as well: `cookieless_missing_user_agent`
means a sanitizer or proxy removed the required `$raw_user_agent` property.
Live events and HTTP success can precede a dropped event; confirm stored events
under **Activity → Events**. Do not enable broad autocapture to troubleshoot.

References: [Next.js integration](https://posthog.com/docs/libraries/next-js),
[cookieless setup](https://posthog.com/tutorials/cookieless-tracking),
[web reports](https://posthog.com/docs/web-analytics/dashboard),
[free plan limits](https://posthog.com/pricing).
