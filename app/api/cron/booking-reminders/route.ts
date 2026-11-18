import { NextResponse, type NextRequest } from "next/server";
import { runBookingReminderWorker } from "@/lib/email/booking-reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ userMessage: "Not found." }, { status: 401 });
  }
  try {
    return NextResponse.json(await runBookingReminderWorker());
  } catch (error) {
    console.error("booking_reminder_worker_failed", {
      errorCode: error instanceof Error ? error.name : "unknown_error",
    });
    return NextResponse.json({ userMessage: "Could not run booking reminders." }, { status: 500 });
  }
}
