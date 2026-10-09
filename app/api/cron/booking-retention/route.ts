import { NextResponse } from "next/server";
import { runBookingRetentionWorker } from "@/lib/booking-retention/worker";
import { toSafeError } from "@/lib/observability/errors";
import { resolveRequestId, withRequestId } from "@/lib/observability/context";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = resolveRequestId(request.headers);
  const log = logger.child({ requestId });
  const respond = (body: Record<string, unknown>, status = 200) =>
    withRequestId(NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }), requestId);
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return respond({ userMessage: "Not found." }, 401);
  }
  try {
    const summary = await runBookingRetentionWorker();
    log.info("booking.retention.completed", summary);
    return respond(summary);
  } catch (error) {
    const safe = toSafeError(error);
    log.error("booking.retention.failed", { errorCode: safe.code, errorName: safe.name });
    return respond({ userMessage: "Could not clean up expired bookings." }, 500);
  }
}
