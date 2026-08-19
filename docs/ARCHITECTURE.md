# Core Architecture

**Status:** current as of 2026-08-04. Documents the main code organization and reuse seams.

**Scope:** code/module organization and reuse seams. For the current public lifecycle, server boundaries, hold behavior, and failure states, see `docs/booking-process.md`. `SYSTEM_REFERENCE.md` contains deeper engine and local-mode details.

---

## 1. Why it's organized this way

This repo is the **parent/base** for future child projects. Children customize but must keep receiving upstream updates from this repo. The enabling rule: **core stays untouched by children; customization happens only through defined seams** (config injection, theming, and — later — component slots and feature flags). Decomposition exists to make that possible: reusable pieces must be importable independently, not welded into one component.

The engine started as a single large client component. It has been split into layers so that:
- pure logic is testable and importable piece-by-piece,
- presentation is reusable and themable,
- persistence is isolated behind one swappable seam,
- a child can depend on the parts it needs without dragging in the rest.

---

## 2. Layered layout

```
lib/                              # pure, framework-agnostic — NO React
  types.ts                        # all domain types (ModuleStore, Service, BookingRecord, …)
  constants.ts                    # WEEKDAY_KEYS/LABELS, DURATION_OPTIONS, Intl formatters,
                                  #   BOOKING_HOLD_DURATION_MS, DEFAULT_STORAGE_KEY
  utils.ts                        # cn, createId, currentTimestamp, pad, slugify
  date.ts                         # date math, week/month windows, dateKey helpers
  format.ts                       # time/date/duration labels, status & type tones
  store.ts                        # createEmptyStore, normalize*, pruneBookingHolds, sortBookings
  availability.ts                 # getAvailableSlots, isDateAvailable, overlapExists, *ForDate
  holds.ts                        # hold selection, countdown, warning, and expiry helpers
  booking-flow-machine.ts         # public-flow step reducer (service → date/time → details →
                                  #   confirmed) + reachable-step guards
  ics.ts                          # buildIcsContent, escapeIcsText
  booking-tokens.ts               # manage-token gen, lookup, URL builder, backfill
  __tests__/                      # Vitest characterization tests for the above

config/
  templates.ts                    # QUICK_START_TEMPLATES — per-child seed data

components/
  ui/                             # presentational primitives (props-only, themable via CSS vars)
    buttonClasses.ts, ActionButton, ActionLink, ToneBadge, SectionTitle,
    SummaryField, SummaryStatusTitle, PublicProgressIndicator,
    BookingHoldCountdownBar, EmptyState, index.ts (barrel)
  booking/
    state/
      useModuleStore.ts           # persistence seam: hydrate/persist/multi-tab sync,
                                  #   activeStore derivation, commit actions, integratedMode
  provider/
    ProviderSettingsSurface.tsx   # the Settings tab: info form, availability, integrations
    ProviderIntegrationsSection.tsx # what Haab can connect to, and whether this
                                  #   provider may — display only
  haab-booking-module.tsx         # orchestrator + remaining feature render/state

app/                              # Next.js routes (thin — just mount the module with props)
  page.tsx                        # adaptive surface (admin + public)
  public/[slug]/page.tsx          # public-only booking flow
  public/[slug]/manage/[token]/page.tsx  # manage existing booking via token
  api/public/[verticalSegment]/[providerSlug]/
    holds/route.ts                # create, refresh, extend, and release public holds
    bookings/route.ts             # server-authoritative confirmation
    manage/[token]/route.ts       # public self-service lookup/reschedule/cancel
```

**Dependency direction:** `lib` → `lib` only (never imports React or `components`). `config` → `lib/types`. `components/ui` → `lib`. `components/booking` → `lib`. The monolith → everything below it. Routes → the monolith. This acyclic shape is what makes pieces independently importable.

---

## 3. The seams (how children customize without forking)

| Seam | Mechanism | Use |
|------|-----------|-----|
| **Data injection** | `injectedConfig` prop (+ `integratedMode`) | A host/child feeds its own provider/services/availability/bookings instead of the local store. |
| **Persistence** | `useModuleStore` hook + `storageKey` + `onStoreChange`/`onBookingsChange` | Swap localStorage for Supabase/another backend at one point; callbacks bubble changes to a host. |
| **Theming** | CSS variables (`--primary`, `--ink`, `--accent`, `--surface-soft`, `--line`, …) | Rebrand without touching component logic. |
| **Composition** | `surfaceMode` (`adaptive` / `public-only`) + `initialSurface` | Mount only the public booking surface, or the full admin+public app. |
| **Routing** | `requestedPublicSlug`, `manageBookingToken` props | Host owns routes and passes context in. |
| **Seed data** | `config/templates.ts` | Replace/extend the quick-start service templates per child. |
| **Entitlements** | `lib/entitlements/catalog.ts` + `resolveEntitlements` | Add or re-map paid features per child by editing the catalog; gates read the resolved snapshot rather than a plan string. |

Planned seams (Phase 5/6, not yet built): component **slot/override** props on the public components, and **feature flags**. See the decomposition plan.

---

## 4. Persistence seam detail (`useModuleStore`)

`useModuleStore({ injectedConfig, storageKey, onStoreChange, onBookingsChange })` owns all data state and returns `{ integratedMode, hydrated, store, actions }`. `actions` exposes `commitBookings`, `commitBookingHolds`, `releaseBookingHold`, `updateStandaloneStore`, `setStandaloneStore`, `readStandaloneStoreSnapshot`, `persistStandaloneStore`. The component's handlers call these; they never touch storage directly.

The hook remains the persistence boundary for standalone/demo state and the integrated module's in-memory shadow state. Canonical public routes now use Supabase-backed Route Handlers for booking-critical writes; they do not replace the standalone localStorage path.

Two persistence modes both flow through the hook:
- **standalone** — store in `localStorage[storageKey]`, with multi-tab sync through the `storage` event.
- **integrated** (`injectedConfig` present) — initial public data comes from the route resolver, while public holds/bookings/manage mutations are accepted by server Route Handlers and mirrored into `shadowBookings`/`shadowBookingHolds` after success. Canonical hierarchical public routes use this mode.

---

## 4a. The settings surface

`ProviderSettingsSurface` owns the Settings tab's markup — provider information,
the public booking URL, the standalone reset, availability, and the integrations
card. The module no longer has a `renderSettings()`; it passes state down and
takes edits and saves back through callbacks, so persistence stays in the
orchestrator and the surface renders without a store, a client, or a network.

Integrations live *inside* Settings rather than in a tab of their own: connecting
an outside tool is part of configuring the workspace. `ProviderIntegrationsSection`
shows one card today — Google Calendar — and is read-only preparation. There is
no OAuth, no Google API call, no token storage, and no sync: the card reports
eligibility and "not connected", nothing more.

---

## 4d. Billing (Stripe subscription projection)

```
supabase/migrations/20260816144447_add_stripe_billing_projection.sql
  public.stripe_webhook_events          # inbox, unique on Stripe's event id
  public.provider_billing_subscriptions # one row per provider: the projection
  claim_/apply_/ignore_/fail_/dead_letter_stripe_* RPCs

lib/stripe/config.ts     # lazy env reads; nothing throws at import
lib/stripe/client.ts     # memoised SDK client, pinned API version
lib/billing/projection.ts # pure: Stripe subscription → plan tier
lib/billing/processor.ts  # flatten, map provider, apply atomically
app/api/webhooks/stripe/route.ts
```

- **Verify, record, then act.** Nothing in a webhook body is trusted before the
  signature check — not the event id, not `livemode`. The raw request bytes go
  to `constructEvent`; parsing and re-serialising would break the signature,
  which is exactly what the test asserts.
- **Idempotent by Stripe's event id.** A redelivery collides on the unique
  constraint, and `claim_stripe_webhook_event` decides in one statement whether
  there is anything left to do — so two simultaneous deliveries cannot both
  process.
- **Ordering is Stripe's timestamp, not arrival order.** The projection stores
  `last_event_created_at`; an older event arriving late is recorded as handled
  and applied to nothing.
- **Provider mapping is `subscription.metadata.haab_provider_id`, and only
  that.** There is no email fallback: an email is not an identity, and matching
  on it would let anyone who can set one in Stripe claim another provider.
- **Access rules.** `active` and `trialing` grant premium; `past_due` keeps it
  while Stripe retries the charge; `unpaid`, `canceled`, `paused`, `incomplete`,
  and `incomplete_expired` withhold it. An unknown status, an unconfigured
  premium product list, or a subscription to another product all resolve to
  free — every uncertainty fails closed.
- **Status codes are instructions to Stripe.** 200 settles the event; 500 asks
  for redelivery; a permanent failure dead-letters and answers 200, because
  redelivering something unfixable only repeats the failure.
- **Precedence.** Overrides beat billing; billing beats the legacy
  `providers.plan_tier`, which remains only for accounts that predate
  subscriptions. An unreadable billing row fails closed rather than falling back
  to a stale column.

---

## 4c. Outbound integrations (transactional outbox)

```
supabase/migrations/20260816131850_add_integration_outbox.sql
  bookings.integration_version           # monotonic, bumped only by relevant changes
  public.integration_outbox_events       # private delivery state: leases, attempts, status
  private.set_booking_integration_version()   # BEFORE insert/update
  private.enqueue_booking_integration_event() # AFTER insert/update, SECURITY DEFINER
  claim_/complete_/skip_/retry_/dead_letter_integration_outbox_event(s)

lib/integrations/outbox/
  types.ts        # event, handler contract, typed HandlerResult, run summary
  errors.ts       # backoff, attempt ceiling, shape validation, message sanitising
  repository.ts   # server-only; the only caller of the outbox RPCs
  handlers.ts     # adapter registry — empty today, by design
  worker.ts       # claim → deliver → record outcome
app/api/cron/integration-outbox/route.ts   # Bearer CRON_SECRET, fails closed
```

- **The guarantee.** A booking change and its integration event are one
  transaction: the event is written by a trigger on `public.bookings`, so a
  commit takes both and a rollback takes neither. Writing it from TypeScript
  after the booking write could not offer that — booking mutations here are
  discrete PostgREST calls with no application transaction, so a crash between
  the two would commit a booking nobody ever hears about.
- **Separate from `booking_events`.** That table is the provider's audit
  history: owner-readable, written once. This one is private operational state a
  worker rewrites on every attempt. One table would mean either showing lease
  state to providers or letting workers edit audit history.
- **`integration_version`** rises by exactly one when a field an outside
  calendar could show has changed, and not at all otherwise. It orders events,
  dedupes them through `unique (booking_id, aggregate_version)`, and lets a
  future adapter recognise a stale delivery. The database sets it; a client
  cannot.
- **At-least-once, never exactly-once.** A worker claims rows with
  `FOR UPDATE SKIP LOCKED` and a timed lease, does the external work outside any
  transaction, then records the outcome — matched on the lease token, so a
  worker whose lease expired cannot overwrite the worker that took the row from
  it. A crash mid-delivery replays the event. **Every handler must therefore be
  idempotent**, normally by storing the external ID and the version it last
  wrote.
- **Ordering.** A later version of a booking is not claimable while any earlier
  version of the same booking is still non-terminal, so a cancellation cannot
  overtake the reschedule before it.
- **Failure policy.** Retryable failures back off exponentially (30s → 6h ceiling,
  with jitter) up to 8 attempts, then dead-letter. Permanent failures
  dead-letter immediately. Dead letters stay visible as failures — nothing is
  marked succeeded to tidy the queue.
- **Entitlements are not consulted at enqueue time.** The trigger stays
  deterministic and transaction-local; a plan or override can change after the
  event exists. The future Google handler re-resolves provider, connection, and
  `google_calendar_sync` server-side, at delivery time.
- **Today's behaviour: every event is `skipped`** with `no_active_integrations`,
  because no adapter is registered. That is correct — when the Google adapter
  lands, its connection flow performs an initial reconciliation, so the skipped
  history needs no replay.

---

## 4b. Entitlements

What a provider may use is resolved, not stored as a flag on the session.

```
lib/entitlements/
  catalog.ts            # FEATURE_KEYS, plan tiers, plan → feature map, labels
  resolve.ts            # resolveEntitlements() — pure, clock injected
  server.ts             # server-only reads and the two audited mutations
  override-request.ts   # request payloads for the super-admin UI
```

- **Plan first, override second.** `resolveEntitlements({ providerId, planTier, overrides, now })`
  starts from the plan's features and lets an *active* override win in either
  direction. An override with a null expiry is permanent; a past expiry is not a
  decision, so the plan answers again. An unparseable expiry fails closed, and a
  persisted key no longer in the catalog is ignored.
- **Pure and testable.** The resolver takes its clock as an argument, so the
  expiry boundary is asserted rather than left to when the suite runs.
- **Never cached into a token.** Overrides change out of band; entitlements are
  resolved per request. Putting them in a JWT or `user_metadata` would keep
  granting access after a revoke, and would place the decision in state the user
  partly controls.
- **Mutations are super-admin only and audited.** `setProviderFeatureOverride` /
  `clearProviderFeatureOverride` call `requireSuperAdmin()` first and record its
  verified user as the actor. Each calls an RPC that writes the state change and
  its audit row in one statement. Providers hold no grant on either table.
- **The dashboard resolves them server-side.** `getProviderDashboardContext()`
  returns the provider ID next to the store; `app/page.tsx` resolves entitlements
  from that ID and passes the snapshot to `HomeExperience` → `HaabBookingModule`
  → `ProviderSettingsSurface` as its own prop. It is deliberately *not* inside
  `ModuleStore`: the store is editable configuration that round-trips through the
  provider API, and an answer about paid access must not be writable by the thing
  it governs. A failed resolve is logged and passed on as `undefined`; the
  dashboard still renders and the integrations card says it cannot tell.
- **A client snapshot is presentation, never authorization.** It decides what the
  UI says. Any future integration mutation must re-authenticate the owner and
  re-resolve the entitlement server-side, through its own endpoints and its own
  storage — never through `/api/provider/store`, which carries the booking-page
  configuration and must never carry OAuth credentials or connection state.
- **Gates consume the snapshot, and only the snapshot.**
  `canUseCustomProviderSlug`, `validateCustomProviderSlug`, and
  `prepareProviderSlugChange` accept `ProviderEntitlements` — a plan tier is a
  type error, so a caller cannot bypass an override by reaching for the cheaper
  argument. The database's `plan_tier` check on `custom_slug` was dropped for the
  same reason: it could not see overrides.

Adding a feature: add the key to `FEATURE_KEYS`, map it in `PLAN_FEATURES`, give
it a label, and read it through `hasEntitlement` / `requireEntitlement` at the
gate. No migration is needed — override rows are keyed by text.

---

## 4f. Google Calendar (outbound projection)

```
supabase/migrations/20260816153412_add_google_calendar_connections.sql
  provider_google_calendar_connections        # grant, encrypted token, target calendar
  provider_google_calendar_event_mappings     # booking ↔ Google event, projected version

lib/google/
  config.ts          # lazy env, narrow scopes
  crypto.ts          # AES-256-GCM envelope for refresh tokens
  oauth.ts           # PKCE, state, exchange, refresh, revoke, scope validation
  calendar-client.ts # the REST slice this feature uses, injectable
  ids.ts             # deterministic event id + ownership properties
  connections.ts     # server-only connection store
  handler.ts         # the outbox handler
  reconcile.ts       # bookings that predate the connection
app/api/google/oauth/{start,callback}/route.ts
app/api/google/connection/route.ts             # status, choose calendar, disconnect
```

- **Outbound is the default and the only direction that is ever automatic.**
  Haab writes; Google reflects. Reading Google back into a booking exists (4g)
  but is off until a provider switches it on.
- **Create-or-update is read, verify, write.** Google has no upsert, and
  pretending otherwise once meant overwriting events this deployment did not
  own. `project-event.ts` reads the event, checks its private properties name
  *this* namespace, provider, and booking, and only then inserts or patches.
  A mismatch is a permanent `event_id_collision`; nothing is overwritten. 409
  recovers through the same check; 412 refetches, re-verifies, and retries once.
  PATCH carries only Haab's fields, so attendees, reminders, colour, and
  conferencing survive.
- **Idempotence is structural.** The event id is a hash of (namespace, provider,
  booking); the mapping records which booking version Google already reflects,
  so a stale replay costs no API call. Delivery is at-least-once and both are
  what make that survivable.
- **Times are the provider's, not the calendar's.** A booking's date and times
  are local wall times where the provider works. `dateTime` + `timeZone` lets
  Google apply the zone's DST rules; full-day bookings use `start.date` with an
  exclusive `end.date`.
- **Reconciliation is a durable job**, not work done inside the
  calendar-selection request. It pages with a `(date, id)` cursor, resumes after
  a crash, and marks `completed_at` only when a short page proves there is
  nothing left. Queued on calendar selection and on entitlement restoration.
- **Entitlement loss pauses; restoration resumes.** The grant is kept — making a
  provider re-authorize because a subscription lapsed for a week would be a
  punishment. Restoration queues a reconciliation rather than replaying the
  outbox, because the skipped events are terminal and what matters is that
  Google matches the bookings as they are now.
- **Disconnect is durable.** Revocation is attempted inline; if Google is
  unreachable the sealed token moves into a revocation job that outlives the
  connection row, so a grant is never stranded. If that job cannot be written,
  the disconnect fails rather than silently orphaning the grant.
- **Tokens are sealed before they reach the database.** AES-256-GCM at the
  application layer with a key from `GOOGLE_TOKEN_ENCRYPTION_KEY` and a
  `key_version` column for rotation. A database dump yields ciphertext. Access
  tokens are never stored — they are minted from the refresh token per call.
- **Narrow scopes.** `calendar.events` and `calendar.calendarlist.readonly`, plus
  `openid`/`email` for identity — never the full `calendar` scope. Granular
  consent means a callback can succeed with scopes missing, so the grant is
  validated server-side before it is stored.

## 4g. Google Calendar (busy blocking and two-way)

```
supabase/migrations/20260819050507_add_google_busy_and_two_way.sql
  provider_google_calendar_busy_sources       # calendars chosen to block availability
  provider_google_calendar_busy_intervals     # generational snapshot of busy time
  provider_google_calendar_watch_channels     # push channels, token stored hashed
  google_calendar_webhook_inbox               # notifications, deduplicated
  provider_google_calendar_sync_cursors       # events.list sync tokens
  google_calendar_inbound_changes             # staged changes, times only
  google_calendar_sync_conflicts              # what Haab would not do, and why
supabase/migrations/20260819063000_add_google_inbound_claim_and_actor.sql
  booking_events.actor_type += 'google_calendar'
  claim_google_inbound_change / _webhook_notification / _sync_conflict_for_repair

lib/google/
  busy.ts             # interval maths, freshness thresholds
  busy-refresh.ts     # FreeBusy → generational snapshot
  availability-guard.ts # the check immediately before a booking is written
  watch.ts            # channel credentials, header parsing, authorization
  watch-worker.ts     # create / renew / stop, reconciled against desire
  webhook-worker.ts   # notification → busy refresh or incremental sync
  inbound-sync.ts     # events.list with sync tokens → staged changes
  inbound-time.ts     # Google times → provider-local booking times
  apply-inbound.ts    # judges a staged change; applies or files a conflict
  repair.ts           # restores Google from Haab after a refusal
  capabilities.ts     # what a provider switched on, and what they chose
app/api/webhooks/google-calendar/route.ts   # always 204, never calls Google
app/api/google/capabilities/route.ts        # read and change the two switches
```

- **Busy blocking reads availability, never content.** FreeBusy returns
  intervals, and intervals are all that is stored. No title, description,
  location, attendee, or organizer of an event Haab did not create is ever
  persisted or logged.
- **The snapshot is generational.** Intervals are written under a new
  generation and `activate_google_busy_snapshot` swaps it in atomically, so
  availability never reads a half-written refresh. A failed refresh leaves the
  previous snapshot intact — stale is a state that can be reasoned about;
  partial is not.
- **The final check fails closed.** Slot browsing may read the cache, because a
  list of times is a hint. The write is not a hint: it confirms against Google
  when the cache is not fresh enough, and an unverifiable answer refuses the
  booking with a retryable 503. It is wired inside `lib/supabase/bookings.ts`
  at the three points that decide a slot — hold, confirmation, reschedule — so
  every entry point is covered once rather than five times.
- **The target calendar is never a busy source.** Its events are Haab's own
  bookings; counting them again would make a service with room for two look
  full after one, and would let a booking block its own reschedule.
- **The push endpoint does no work.** It authenticates the notification against
  a hashed channel token, writes one inbox row, and answers 204 — no Google
  call, no database read beyond the channel. A flood of notifications therefore
  cannot become a flood of API calls on a public route.
- **The notification is a hint, never an instruction.** Which provider it
  concerns comes from the stored channel, never from the request. The resource
  URI Google sends is not trusted for anything.
- **Two-way applies through the same mutation the UI calls.** No booking SQL
  lives in the Google worker, so business hours, capacity, and overlap are
  enforced once and identically. The audit records `google_calendar` as the
  actor — not the provider, who did not act in Haab, and not `system`.
- **What Haab will not do, it files rather than forces.** A resize, a move into
  an occupied slot, a recurring event, a deletion the provider did not opt
  into: each becomes a conflict, the booking stays as it is, and repair
  restores the Google event. A booking is an agreement with a client; a drag in
  a calendar UI is not authority to break it.
- **Loop prevention is explicit origin tracking, not a time window.** The
  mapping records the etag Haab's own write produced, so the notification it
  provokes is recognised as an echo. "Recent" would be a guess, and a guess
  here means either an ignored real edit or an endless loop.
- **Renewal creates before it stops.** The other order leaves a window where a
  provider's change is announced to nobody; a brief overlap only costs a
  duplicate notification, which the inbox deduplicates anyway.
- **Identity comes from a verified ID token**, checked for signature, issuer,
  audience, expiry, and a nonce bound to this flow. Never from the Haab session:
  a provider signed in as one address may connect a different Google account,
  and recording the Haab address would be a lie later checks would act on.
- **Reconnect starts over.** A new grant rotates the connection generation and
  clears the selected calendar, so old mappings cannot authorize writes against
  it — enforced by composite foreign keys, not only by application code.
- **The deployment namespace** is stamped into every managed event's private
  properties, so a staging deployment can never adopt a production booking's
  event.
- **Entitlement is re-resolved at delivery time**, from the provider id on the
  event. The dashboard's snapshot is presentation; this is the authorization. A
  provider whose entitlement lapsed produces a terminal `skipped`, not a retry.
- **Disconnect is never gated.** A provider whose plan lapsed can still revoke
  Haab's access — the refresh token is revoked at Google as well as deleted
  here. Account deletion cascades the connection away with the provider.
- **Nothing about the client reaches Google.** The event carries the service
  name and the times. Not the client's name, email, phone, or notes: a calendar
  can be shared, and Haab is not the system that decides who may read those.

---

## 4e. Observability

```
instrumentation.ts            # registerOTel, Node runtime only, no-op without an exporter
lib/observability/
  logger.ts    # one-line JSON, injected clock and sink, allowlist + redaction
  events.ts    # the closed set of event and span names
  context.ts   # request-id resolution and echo
  errors.ts    # toSafeError: { name, code }, never a message or a stack
  tracing.ts   # withSpan over @opentelemetry/api
```

- **Vendor-neutral.** Records go to stdout as single-line JSON. Any platform can
  ingest them; with no platform, `jq` reads them.
- **Two defences against leaking.** The logger takes allowlisted fields, and
  `redact()` replaces any key matching a sensitive concept — `token`, `email`,
  `secret`, `payload`, `signature` — with `[REDACTED]`. Matching the concept
  means a newly invented `refreshTokenV2` is covered the day it appears.
- **Logging never breaks a caller.** A sink that throws, or a value that cannot
  be serialised, loses the record and nothing else.
- **Correlation, not authorization.** `x-request-id` is accepted only in a
  strict format and echoed back. It is never an identity and never an
  idempotency key: the caller chooses it.
- **Telemetry cannot break startup.** `registerOTel` installs a provider; with
  no OTLP exporter configured the SDK drops spans and the application runs
  exactly as before.
- **Cardinality lives in logs.** Span attributes are statuses and outcomes;
  provider, booking, and event ids stay in log fields, where one more distinct
  value costs nothing.

Event catalog, alert thresholds, and investigation procedures:
`docs/operations/premium-observability.md`.

---

## 5. Testing

`npm run test:unit` runs Vitest across pure booking logic and selected render-level components; `npm run test:coverage` adds enforced thresholds over the premium-critical modules; `npm run test:db` and `npm run test:e2e` need a local Supabase and refuse to run against any other host. `npm run test` remains the unit alias. Tests assert current behavior; treat failures as a behavior change that must be understood, not merely updated.

The full orchestrated browser lifecycle is not covered by unit tests. Verify it with a production build and a live mobile smoke test on a canonical route: hold → offline/reconnect → warning/extend → confirm → ICS/QR → reschedule → cancel → expiry/release. See `docs/booking-process.md` §12.

---

## 6. Current state & what's next

**Done (merged):** Phases 0/1/3/4 — `lib`/`config`/`components/ui` extraction, the `useModuleStore` hook, and the test net. Canonical public routes also connect the shared module to Supabase-backed reads and booking-critical Route Handlers.

**Deferred (Phase 5/6):** carving the remaining feature code out of `components/haab-booking-module.tsx` — the public booking flow, admin surfaces, setup wizard, and modals — into feature components + headless hooks, then reducing the module to a thin orchestrator with a documented public API barrel. Do each sub-step with its own reviewed step-plan and functional smoke test.

The public flow's *step transitions* are already out: `lib/booking-flow-machine.ts`
is a pure reducer the monolith dispatches into, so the extraction of the public
flow components has one less piece of tangled state to carry.

---

## 7. Related docs

- `SYSTEM_REFERENCE.md` — engine behavior, data model, rules, invariants (the ground truth for *what it does*).
- `docs/booking-process.md` — current end-to-end public booking lifecycle and server boundaries.
- `docs/superpowers/plans/2026-05-29-monolith-decomposition-plan.md` — full phased roadmap.
- `docs/superpowers/plans/2026-06-06-backend-implementation-plan.md` — phased Supabase backend implementation plan.
- `BACKEND_RECOMMENDATIONS.md` — Supabase migration target (slots into the `useModuleStore` seam).
- `TESTING_RECOMMENDATIONS.md` — testing strategy background.
- `liquid-glass-style-guide.md` / `UX_RECOMMENDATIONS.md` — visual/UX guidance.
