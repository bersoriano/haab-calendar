import { NextResponse, type NextRequest } from "next/server";

import { OutboxInfrastructureError } from "@/lib/integrations/outbox/errors";
import { runIntegrationOutboxWorker } from "@/lib/integrations/outbox/worker";
import { resolveRequestId, withRequestId } from "@/lib/observability/context";
import { toSafeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Drains the integration outbox. Invoked by a scheduler, never by a browser.
 *
 * Authorized by a shared secret in the Authorization header — not a query
 * string, which would land the secret in access logs and referrers. A missing
 * secret fails closed: an unconfigured deployment must not leave an unguarded
 * worker endpoint open to anyone who guesses the path.
 */
export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const log = logger.child({ requestId });
  const respond = (body: Record<string, unknown>, status = 200) =>
    withRequestId(NextResponse.json(body, { status }), requestId);

  const secret = process.env.CRON_SECRET;

  if (!secret) {
    log.error("integration.outbox.claim_failed", { errorCode: "cron_unconfigured" });
    return respond({ userMessage: "Not found." }, 401);
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return respond({ userMessage: "Not found." }, 401);
  }

  try {
    // The worker logs the run itself; the request id is threaded in so a cron
    // invocation and the deliveries it made share one correlation key.
    const summary = await runIntegrationOutboxWorker({ requestId });

    return respond(summary);
  } catch (error) {
    // Only reached when the outbox itself is unreachable — nothing could be
    // claimed, or an outcome could not be recorded. Those events keep their
    // leases and are retried once the leases expire.
    const safe = toSafeError(error);
    log.error("integration.outbox.claim_failed", {
      errorCode:
        error instanceof OutboxInfrastructureError ? "infrastructure" : safe.code,
      errorName: safe.name,
      outcome: "failed",
    });

    return respond({ userMessage: "Could not run the integration outbox." }, 500);
  }
}
