import { NextResponse, type NextRequest } from "next/server";

import { completeReceiptUpload, createReceiptUpload, type CheckoutRow } from "@/lib/deposit-checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { getManagedBooking, PublicBookingWriteError } from "@/lib/supabase/bookings";
import { normalizeUrlSlugSegment, parsePublicVerticalSegment, validateProviderSlug } from "@/lib/public-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest, context: {
  params: Promise<{ verticalSegment: string; providerSlug: string; token: string }>;
}) {
  const params = await context.params;
  const vertical = parsePublicVerticalSegment(params.verticalSegment);
  const providerSlug = normalizeUrlSlugSegment(params.providerSlug);
  if (!vertical || !validateProviderSlug(providerSlug).ok || !params.token) {
    return NextResponse.json({ userMessage: "Invalid private booking link." }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ userMessage: "Invalid receipt request." }, { status: 400 }); }
  try {
    const admin = createAdminClient();
    const managed = await getManagedBooking(admin, { vertical, providerSlug, token: params.token });
    if (managed.booking.status !== "payment_action_required") {
      throw new PublicBookingWriteError("Booking does not need a replacement receipt.", 409);
    }
    const { data: booking, error: bookingError } = await admin.from("bookings")
      .select("id, payment_request_id")
      .eq("id", managed.booking.id).single<{ id: string; payment_request_id: string | null }>();
    if (bookingError || !booking?.payment_request_id) {
      throw new PublicBookingWriteError("Payment request not found.", 404);
    }
    const { data: checkout, error: checkoutError } = await admin.from("payment_requests")
      .select("*").eq("id", booking.payment_request_id).single<CheckoutRow>();
    if (checkoutError || !checkout) throw new PublicBookingWriteError("Payment request not found.", 404);
    const action = typeof body.action === "string" ? body.action : "";
    if (action === "upload") {
      return NextResponse.json(await createReceiptUpload(admin, checkout,
        typeof body.mimeType === "string" ? body.mimeType : ""));
    }
    if (action === "complete") {
      const completed = await completeReceiptUpload(admin, checkout,
        typeof body.storagePath === "string" ? body.storagePath : "");
      const { error } = await admin.rpc("replace_bank_deposit_receipt", {
        p_booking_id: booking.id, p_proof_id: completed.proofId,
      });
      if (error) throw new PublicBookingWriteError("Could not submit replacement receipt.", 409, error);
      return NextResponse.json({ bookingStatus: "pending_payment_verification", paymentStatus: "pending_verification" });
    }
    return NextResponse.json({ userMessage: "Unsupported receipt action." }, { status: 400 });
  } catch (error) {
    if (error instanceof PublicBookingWriteError) {
      return NextResponse.json({ userMessage: error.userMessage }, { status: error.status });
    }
    console.error("managed_receipt_upload_failed", error);
    return NextResponse.json({ userMessage: "Could not upload receipt." }, { status: 500 });
  }
}
