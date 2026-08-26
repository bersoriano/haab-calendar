import { NextResponse, type NextRequest } from "next/server";

import { parseAppointmentQrCode } from "@/lib/booking-scan";
import {
  getProviderBookingByManageToken,
  PublicBookingWriteError,
} from "@/lib/supabase/bookings";
import { getTrustedAppOrigins } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readCode(request: NextRequest) {
  try {
    const body = (await request.json()) as { code?: unknown };
    return typeof body.code === "string" ? body.code.trim() : "";
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { userMessage: "Sign in before scanning appointments." },
      { status: 401 },
    );
  }

  const code = await readCode(request);
  // The origin serving this request plus any the deployment still owns. A QR is
  // printed once and scanned for months: after a domain change the code in the
  // customer's wallet names the old host, which is no longer the request origin
  // and which a redirect cannot fix, because this is a string comparison.
  const parsed = parseAppointmentQrCode(code, [
    new URL(request.url).origin,
    ...getTrustedAppOrigins(),
  ]);

  if (!parsed) {
    return NextResponse.json(
      { userMessage: "That is not a valid Haab appointment QR code." },
      { status: 400 },
    );
  }

  try {
    const booking = await getProviderBookingByManageToken(supabase, parsed.token);
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof PublicBookingWriteError) {
      return NextResponse.json(
        { userMessage: error.userMessage },
        { status: error.status },
      );
    }

    console.error("provider_appointment_scan_failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { userMessage: "Could not retrieve that appointment." },
      { status: 500 },
    );
  }
}
