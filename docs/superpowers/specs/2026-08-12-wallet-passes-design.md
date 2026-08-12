# Wallet passes for booked events — exploratory design

**Status:** not scheduled. Written 2026-08-12 as a thinking document, deliberately
short. Nothing here is committed to; revisit before any work starts.

## What is being asked

Let someone who has just booked add the booking to the wallet app on their phone,
on both iOS and Android.

## The constraint that shapes everything

There is no cross-platform wallet format. Apple Wallet and Google Wallet are
unrelated systems with different artifacts, different credentials, and different
update models. Supporting both means building both and picking per device. The
long pole is not the code — it is the vendor onboarding, which is external and
takes days.

Google Wallet is Android-first; its iOS app will not carry these passes. So iOS
cannot be covered by the cheaper half. It is Apple-for-iOS and Google-for-Android
or nothing.

## Apple Wallet

A `.pkpass` is a ZIP of `pass.json`, images (`icon.png` plus @2x/@3x, `logo.png`),
a `manifest.json` of per-file hashes, and a detached PKCS#7 signature over that
manifest.

Needs, all external:

- Apple Developer Program membership, **$99/yr**, enrollment measured in days
- A registered Pass Type ID and a signing certificate that **expires annually**;
  when it lapses, pass issuing stops
- Team ID and the WWDR intermediate certificate

Build it with `passkit-generator` (or `jszip` + `node-forge`) in a Node-runtime
route handler — the API routes here already pin `runtime = "nodejs"`. Pass style
is `eventTicket` for the events vertical, `generic` for appointments. The
certificate and key live base64 in env, which is new secret-handling surface: the
app carries four env vars today.

Images are **bundled, not linked**, so a provider logo on Vercel Blob has to be
fetched and resized while the pass is built.

**Updates are the expensive part.** A `.pkpass` is a static file. Reschedules and
cancellations only reach an installed pass if we also run Apple's pass web
service (device registration, serial-number polling, pass fetch, logging) and push
through APNs with the same certificate. Treat that as a separate project. Until
then, accept staleness and lean on the manage link that already exists.

## Google Wallet

Needs a Google Cloud project with the Wallet API enabled, an Issuer account from
the Google Pay & Wallet Console (**free**, approval in days), and a service
account key.

The model is a Class (a template, created once — a one-off script fits the
`scripts/seed-public-examples.mjs` pattern already in the repo) plus an Object per
booking. `EventTicketClass/Object` suits races and workshops; `GenericClass/Object`
suits appointments.

Delivery is a signed link: an RS256 JWT holding the object, linked as
`https://pay.google.com/gp/v/save/<JWT>`. The JWT can create the object on first
save, so nothing needs pre-provisioning. Signing wants `jose` (small) or
`google-auth-library`.

**Updates are a `PATCH`** on the object and propagate to saved passes. Much better
than the Apple story.

## What the codebase already provides

Most of the data work is done:

- `BookingRecord` carries service name, date, start and end, plus cost and
  location snapshots
- `manageToken` is already an unguessable per-booking secret, so wallet endpoints
  can authorize on it rather than on a booking id
- `qrcode` is already a dependency, for the barcode
- `lib/ics.ts` shows the shape of the builder to copy
- `lib/timezone.ts` produces offset-anchored instants via `zonedWallTimeToUtc`.
  This matters directly: passes want a real instant, and before 2026-08-12 every
  account was on UTC, so both wallets would have received wrong times.

Missing: any wallet code, handling for the vendors' mandated "Add to…" artwork
(both ship EN/ES variants, which suits the bilingual UI), and a
certificate-rotation process.

## Rough effort

| Piece | Work | Blocked on |
| --- | --- | --- |
| Google Wallet end to end | 1–2 days | Issuer approval |
| Apple Wallet end to end | 2–3 days | Developer enrollment, certs, $99/yr |
| UI, i18n, tests, on success screen and manage page | 1–2 days | — |
| Apple update service and APNs | 3–5 days | Optional, defer |

About a week for both without live updates, with vendor onboarding on the
critical path. Start the account applications first; they run in the background.

## Two questions to answer before building

**Is this really about check-in?** A pass's advantage over the `.ics` we already
send is a scannable barcode and lock-screen relevance. There is no check-in or
scanning surface in this app at all, and a barcode nobody scans is decoration. For
a 600-runner race that is a real follow-on feature — scanner view, attendance
state — and probably the actual point. For a nail-salon appointment the calendar
entry is arguably the better artifact.

**Events vertical only, at least at first?** Races and workshops are where passes
earn their keep: fixed date, capacity, admission. Appointments get less from it.

## Leaning

Google Wallet first, scoped to the events vertical: free, better update story, no
annual certificate chore. Learn whether anyone actually uses it before taking on
Apple's recurring cost and permanent rotation obligation.
