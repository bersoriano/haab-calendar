import { NextResponse, type NextRequest } from "next/server";

import { RECEIPT_BUCKET } from "@/lib/deposit-checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ownerBooking(bookingId: string) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: NextResponse.json({ userMessage: "Sign in to review payment." }, { status: 401 }) };
  const { data: provider } = await client.from("providers").select("id")
    .eq("owner_user_id", user.id).maybeSingle<{ id: string }>();
  if (!provider) return { error: NextResponse.json({ userMessage: "Business not found." }, { status: 404 }) };
  const { data: booking, error } = await client.from("bookings")
    .select("id, provider_id, payment_request_id, payment_proof_id, status, payment_status, amount_due_minor, currency_code")
    .eq("id", bookingId).eq("provider_id", provider.id).maybeSingle();
  if (error) return { error: NextResponse.json({ userMessage: "Could not load booking." }, { status: 500 }) };
  if (!booking?.payment_request_id) return { error: NextResponse.json({ userMessage: "Deposit booking not found." }, { status: 404 }) };
  return { client, user, booking, provider };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await context.params;
  const result = await ownerBooking(bookingId);
  if (result.error) return result.error;
  const { client, booking } = result;
  const [requestResult, proofResult] = await Promise.all([
    client!.from("payment_requests").select("reference, amount_minor, currency_code, correction_deadline")
      .eq("id", booking!.payment_request_id).single(),
    client!.from("payment_proofs").select("id, storage_path, uploaded_at, status, rejection_reason")
      .eq("payment_request_id", booking!.payment_request_id).order("uploaded_at", { ascending: false }),
  ]);
  if (requestResult.error || proofResult.error) {
    return NextResponse.json({ userMessage: "Could not load payment proofs." }, { status: 500 });
  }
  const admin = createAdminClient();
  const proofs = await Promise.all((proofResult.data ?? []).map(async (proof) => {
    const { data } = await admin.storage.from(RECEIPT_BUCKET).createSignedUrl(proof.storage_path, 5 * 60);
    return { id: proof.id, uploadedAt: proof.uploaded_at, status: proof.status,
      rejectionReason: proof.rejection_reason, imageUrl: data?.signedUrl ?? null };
  }));
  return NextResponse.json({ bookingStatus: booking!.status, paymentStatus: booking!.payment_status,
    request: requestResult.data, proofs });
}

export async function POST(request: NextRequest, context: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await context.params;
  const result = await ownerBooking(bookingId);
  if (result.error) return result.error;
  let body: { action?: unknown; reason?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ userMessage: "Invalid payment review request." }, { status: 400 }); }
  const action = body.action;
  const reason = typeof body.reason === "string" ? body.reason.trim() : null;
  if (action !== "confirm" && action !== "reject" && action !== "refunded" && action !== "refund_due") {
    return NextResponse.json({ userMessage: "Choose a payment action." }, { status: 400 });
  }
  if (action === "reject" && (!reason || reason.length < 3 || reason.length > 500)) {
    return NextResponse.json({ userMessage: "Give a short rejection reason." }, { status: 400 });
  }
  const { error } = action === "refund_due"
    ? await result.client!.rpc("record_cancelled_deposit_refund_due", { p_booking_id: bookingId })
    : action === "refunded"
    ? await result.client!.rpc("record_bank_refund", { p_booking_id: bookingId })
    : await result.client!.rpc("review_bank_deposit", {
      p_booking_id: bookingId, p_action: action, p_reason: reason,
    });
  if (error) return NextResponse.json({ userMessage: error.message }, { status: error.code === "22023" ? 409 : 500 });
  return NextResponse.json({ status: action === "confirm" ? "payment_confirmed" :
    action === "refunded" ? "refunded" : action === "refund_due" ? "refund_due" : "receipt_rejected" });
}
