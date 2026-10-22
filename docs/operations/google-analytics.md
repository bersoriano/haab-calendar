# Google Analytics

The Google tag uses measurement ID `G-PDRMG0Z2SM`. No environment variable or
additional package is required. Deploy a production build to activate it on
`haabcalendar.com` and `www.haabcalendar.com`; development and preview hosts
do not collect data.

Collection covers `/`, both localized doctors landing pages, `/gallery`,
`/privacy`, and `/terms`. Existing PostHog tracking remains separate.

Private booking management URLs contain bearer credentials. The tag never
initializes outside the public page allowlist, on URLs with unrecognized query
parameters, or when Do Not Track / Global Privacy Control is enabled. Initial
page URLs omit query strings and fragments; initial referrers contain only
their origin. Standard UTM campaign fields are passed separately and must not
contain personal information. Google signals and advertising personalization
are disabled.

Before a client navigation leaves the allowlist, the tag sets Google's
`ga-disable-G-PDRMG0Z2SM` flag. Collection stays disabled for that document,
including a later return to marketing, until a full page load. This prevents
automatic events from collecting private locations or private referrers.

In the Google Analytics web stream, keep **Enhanced measurement → Page views →
Page changes based on browser history events** enabled to measure navigation
between public pages. The integration does not emit duplicate manual views.

After deployment, visit the production landing page and confirm the visit in
Google Analytics **Realtime**. Analytics blockers and browser privacy signals
can prevent collection. Local tests verify initialization and the privacy
boundary; receipt in the Google Analytics property requires this production
check.
