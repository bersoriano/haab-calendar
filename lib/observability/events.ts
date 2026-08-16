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

export const OPERATIONAL_EVENTS = [
  ...STRIPE_EVENTS,
  ...BILLING_EVENTS,
  ...ENTITLEMENT_EVENTS,
  ...OUTBOX_EVENTS,
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
} as const;

export type SpanName = (typeof SPAN_NAMES)[keyof typeof SPAN_NAMES];
