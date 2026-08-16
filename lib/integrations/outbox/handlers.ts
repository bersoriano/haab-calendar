import { createGoogleCalendarHandler } from "@/lib/google/handler";
import type { IntegrationOutboxHandler } from "@/lib/integrations/outbox/types";

/**
 * The adapters that want to hear about booking changes.
 *
 * Each one re-resolves, server-side, everything that decides whether it may
 * act: the provider, the live connection, and the entitlement. The snapshot the
 * dashboard renders is presentation, never authorization for a background
 * write.
 *
 * A provider with no connection still produces a terminal `skipped` rather than
 * pending work, so an unconnected account leaves no backlog. Bookings made
 * before a connection existed are picked up by the reconciliation that runs
 * when the provider connects.
 */
const HANDLERS: IntegrationOutboxHandler[] = [createGoogleCalendarHandler()];

export function getIntegrationOutboxHandlers(): readonly IntegrationOutboxHandler[] {
  return HANDLERS;
}
