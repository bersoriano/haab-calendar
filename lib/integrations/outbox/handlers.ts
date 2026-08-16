import type { IntegrationOutboxHandler } from "@/lib/integrations/outbox/types";

/**
 * The adapters that want to hear about booking changes.
 *
 * Empty today, and that is the correct production behaviour: no Google
 * Calendar adapter exists yet, so every event resolves to `skipped` with
 * `no_active_integrations` rather than waiting around as pending work. When
 * the Google adapter lands it registers here, and its connection flow performs
 * an initial reconciliation of the bookings that were skipped before it
 * existed — which is why those skips need no replay.
 *
 * A handler must re-resolve, server-side, everything that decides whether it
 * may act: the provider, the live connection, and the entitlement. The
 * snapshot the dashboard renders is presentation, never authorization for a
 * background write.
 */
const HANDLERS: IntegrationOutboxHandler[] = [];

export function getIntegrationOutboxHandlers(): readonly IntegrationOutboxHandler[] {
  return HANDLERS;
}
