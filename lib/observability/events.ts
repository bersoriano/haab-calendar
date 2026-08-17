/**
 * Every operational event name this application emits.
 *
 * A closed union rather than free strings: an alert or a saved query is written
 * against a name, and a typo that silently invents `stripe.webhook.proccessed`
 * would make that alert quietly stop matching. Adding a name here is a
 * deliberate act.
 */

export const STRIPE_EVENTS = [
  "stripe.webhook.received",
  "stripe.webhook.signature_invalid",
  "stripe.webhook.mode_mismatch",
  "stripe.webhook.duplicate",
  "stripe.webhook.persisted",
  "stripe.webhook.processed",
  "stripe.webhook.ignored",
  "stripe.webhook.retry_scheduled",
  "stripe.webhook.dead_lettered",
  "stripe.webhook.failed",
  "stripe.webhook.unconfigured",
] as const;

export const BILLING_EVENTS = [
  "billing.projection.updated",
  "billing.projection.unchanged",
  "billing.projection.failed",
  "billing.provider_mapping_missing",
  "billing.status_unknown",
] as const;

export const ENTITLEMENT_EVENTS = [
  "entitlements.resolved",
  "entitlements.billing_read_failed",
  "entitlements.override_read_failed",
  "entitlements.denied",
  "entitlements.override_applied",
] as const;

export const OUTBOX_EVENTS = [
  "integration.outbox.run_started",
  "integration.outbox.run_completed",
  "integration.outbox.claim_failed",
  "integration.outbox.delivery_succeeded",
  "integration.outbox.delivery_skipped",
  "integration.outbox.delivery_retry",
  "integration.outbox.delivery_dead_letter",
  "integration.outbox.lease_conflict",
] as const;

/**
 * Google's own operational vocabulary.
 *
 * Separate from the entitlement names on purpose: reusing `entitlements.denied`
 * to report a successful OAuth connection, as an earlier version did, makes
 * both names useless for an alert.
 */
export const GOOGLE_EVENTS = [
  "google.oauth.started",
  "google.oauth.succeeded",
  "google.oauth.failed",
  "google.connection.saved",
  "google.connection.disconnected",
  "google.connection.needs_reauth",
  "google.calendar.selected",
  "google.reconcile.enqueued",
  "google.reconcile.started",
  "google.reconcile.page",
  "google.reconcile.completed",
  "google.reconcile.failed",
  "google.event.inserted",
  "google.event.patched",
  "google.event.deleted",
  "google.event.skipped",
  "google.event.collision",
  "google.event.mapping_failed",
  "google.revocation.enqueued",
  "google.revocation.completed",
  "google.revocation.failed",
] as const;

export const OPERATIONAL_EVENTS = [
  ...STRIPE_EVENTS,
  ...BILLING_EVENTS,
  ...ENTITLEMENT_EVENTS,
  ...OUTBOX_EVENTS,
  ...GOOGLE_EVENTS,
] as const;

export type OperationalEvent = (typeof OPERATIONAL_EVENTS)[number];

/** Span names. Kept beside the events so the two vocabularies stay in step. */
export const SPAN_NAMES = {
  stripeWebhookVerify: "stripe.webhook.verify",
  stripeWebhookPersist: "stripe.webhook.persist",
  stripeWebhookProcess: "stripe.webhook.process",
  stripeSubscriptionRetrieve: "stripe.subscription.retrieve",
  billingProjectionApply: "billing.projection.apply",
  entitlementsResolve: "entitlements.resolve",
  premiumCustomSlugAuthorize: "premium.custom_slug.authorize",
  outboxClaim: "integration.outbox.claim",
  outboxDeliver: "integration.outbox.deliver",
  outboxRecordOutcome: "integration.outbox.record_outcome",
  googleProjectEvent: "google.project_event",
  googleReconcilePage: "google.reconcile.page",
} as const;

export type SpanName = (typeof SPAN_NAMES)[keyof typeof SPAN_NAMES];
