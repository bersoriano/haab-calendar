import { NextResponse, type NextRequest } from "next/server";

import { OutboxInfrastructureError } from "@/lib/integrations/outbox/errors";
import { runIntegrationOutboxWorker } from "@/lib/integrations/outbox/worker";

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
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("integration_outbox_cron_unconfigured");
    return NextResponse.json({ userMessage: "Not found." }, { status: 401 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ userMessage: "Not found." }, { status: 401 });
  }

  try {
    const summary = await runIntegrationOutboxWorker();

    // Counts only. A failing event has already been written down as failed or
    // dead-lettered, so the run itself succeeded even when deliveries did not.
    console.log("integration_outbox_run", summary);

    return NextResponse.json(summary);
  } catch (error) {
    // Only reached when the outbox itself is unreachable — nothing could be
    // claimed, or an outcome could not be recorded. Those events keep their
    // leases and are retried once the leases expire.
    console.error("integration_outbox_run_failed", {
      error:
        error instanceof OutboxInfrastructureError
          ? error.message
          : "Unexpected outbox worker failure.",
    });

    return NextResponse.json(
      { userMessage: "Could not run the integration outbox." },
      { status: 500 },
    );
  }
}
