import { NextResponse, type NextRequest } from "next/server";

import { runGoogleInboundApplyWorker } from "@/lib/google/apply-inbound";
import { runGoogleRevocationWorker } from "@/lib/google/connections";
import { runGoogleReconciliationWorker } from "@/lib/google/reconcile";
import { runGoogleConflictRepairWorker } from "@/lib/google/repair";
import { runGoogleWebhookWorker } from "@/lib/google/webhook-worker";
import { resolveRequestId, withRequestId } from "@/lib/observability/context";
import { toSafeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Runs the Google background workers, one unit of work each.
 *
 * Same authorization as the outbox cron — a bearer secret in the header, and a
 * missing secret fails closed rather than leaving an unguarded worker endpoint
 * open to anyone who guesses the path.
 *
 * Each worker claims at most one job per invocation and returns quickly. The
 * schedule, not the request, is what gets through a backlog.
 *
 * The order is deliberate. A notification has to be read before there is a
 * change to apply, and a change has to be judged before there is a conflict to
 * repair, so running them in that order moves one edit through the whole
 * pipeline within a single invocation rather than one stage per minute.
 * Revocation runs last but unconditionally: a provider waiting for their grant
 * to be released must not queue behind a calendar backfill.
 */
export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const log = logger.child({ requestId });
  const respond = (body: Record<string, unknown>, status = 200) =>
    withRequestId(NextResponse.json(body, { status }), requestId);

  const secret = process.env.CRON_SECRET;

  if (!secret) {
    log.error("google.reconcile.failed", { errorCode: "cron_unconfigured" });
    return respond({ userMessage: "Not found." }, 401);
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return respond({ userMessage: "Not found." }, 401);
  }

  try {
    const webhook = await runGoogleWebhookWorker({});
    const inbound = await runGoogleInboundApplyWorker({});
    const repair = await runGoogleConflictRepairWorker({});
    const reconciliation = await runGoogleReconciliationWorker({});
    const revocation = await runGoogleRevocationWorker({});

    return respond({
      // Counters and outcomes only. No provider, booking, calendar, or event
      // identifier is ever in a cron response — the log carries those.
      webhook: { claimed: webhook.claimed, dispatched: webhook.dispatched },
      inbound: { claimed: inbound.claimed, outcome: inbound.outcome },
      repair: { claimed: repair.claimed, repaired: repair.repaired },
      reconciliation: {
        claimed: reconciliation.claimed,
        completed: reconciliation.completed,
        considered: reconciliation.considered,
        written: reconciliation.written,
        skipped: reconciliation.skipped,
        failed: reconciliation.failed,
      },
      revocation,
    });
  } catch (error) {
    const safe = toSafeError(error);
    log.error("google.reconcile.failed", {
      errorCode: safe.code,
      errorName: safe.name,
      outcome: "failed",
    });

    return respond({ userMessage: "Could not run the Google workers." }, 500);
  }
}
