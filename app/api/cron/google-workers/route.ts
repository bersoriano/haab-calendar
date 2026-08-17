import { NextResponse, type NextRequest } from "next/server";

import { runGoogleRevocationWorker } from "@/lib/google/connections";
import { runGoogleReconciliationWorker } from "@/lib/google/reconcile";
import { resolveRequestId, withRequestId } from "@/lib/observability/context";
import { toSafeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Runs the Google background workers: reconciliation, then revocation.
 *
 * Same authorization as the outbox cron — a bearer secret in the header, and a
 * missing secret fails closed rather than leaving an unguarded worker endpoint
 * open to anyone who guesses the path.
 *
 * Both workers claim at most one job per invocation and return quickly. The
 * schedule, not the request, is what gets through a backlog.
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
    const reconciliation = await runGoogleReconciliationWorker({ });

    // Revocation runs whatever reconciliation did: a provider waiting for their
    // grant to be revoked should not queue behind a calendar backfill.
    const revocation = await runGoogleRevocationWorker({});

    return respond({
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
