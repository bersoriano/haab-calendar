import { NextResponse, type NextRequest } from "next/server";

import {
  completeReceiptUpload, createDepositCheckout, createReceiptUpload,
  getDepositCheckout, publicCheckout,
} from "@/lib/deposit-checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicBookingWriteError, getPublishedProvider } from "@/lib/supabase/bookings";
import {
  normalizeUrlSlugSegment, parsePublicVerticalSegment, validateProviderSlug,
  getPublicVerticalSegment,
} from "@/lib/public-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { verticalSegment: string; providerSlug: string };

function readRoute(params: Params) {
  const vertical = parsePublicVerticalSegment(params.verticalSegment);
  const providerSlug = normalizeUrlSlugSegment(params.providerSlug);
  return vertical && validateProviderSlug(providerSlug).ok ? { vertical, providerSlug } : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function handleError(error: unknown) {
  if (error instanceof PublicBookingWriteError) {
    return NextResponse.json({ userMessage: error.userMessage }, { status: error.status });
  }
  console.error("deposit_checkout_failed", error);
  return NextResponse.json({ userMessage: "Could not prepare bank deposit." }, { status: 500 });
}

export async function POST(request: NextRequest, context: { params: Promise<Params> }) {
  const route = readRoute(await context.params);
  if (!route) return NextResponse.json({ userMessage: "Invalid booking link." }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ userMessage: "Invalid deposit request." }, { status: 400 }); }
  try {
    const admin = createAdminClient();
    const action = readString(body.action);
    if (action === "open") {
      const result = await createDepositCheckout(admin, {
        ...route, serviceId: readString(body.serviceId), dateKey: readString(body.dateKey),
      });
      return NextResponse.json(result);
    }
    const provider = await getPublishedProvider(admin, route.vertical, route.providerSlug);
    const checkout = await getDepositCheckout(admin, {
      checkoutId: readString(body.checkoutId), checkoutToken: readString(body.checkoutToken),
      providerId: provider.id,
    });
    if (action === "resume") {
      if (checkout.booking_id) {
        return NextResponse.json({ booked: true,
          managePath: `/${getPublicVerticalSegment(route.vertical)}/${encodeURIComponent(route.providerSlug)}/manage/${encodeURIComponent(readString(body.checkoutToken))}` });
      }
      if (checkout.status !== "checkout_open" || new Date(checkout.expires_at).getTime() <= Date.now()) {
        throw new PublicBookingWriteError("Payment link expired. Start booking again.", 409);
      }
      const { data: proof, error } = await admin.from("payment_proofs").select("id")
        .eq("payment_request_id", checkout.id).eq("status", "staged")
        .order("uploaded_at", { ascending: false }).limit(1).maybeSingle<{ id: string }>();
      if (error) throw new PublicBookingWriteError("Could not load receipt.", 500, error);
      return NextResponse.json({ required: true, ...publicCheckout(checkout), proofId: proof?.id ?? null });
    }
    if (action === "upload") {
      return NextResponse.json(await createReceiptUpload(admin, checkout, readString(body.mimeType)));
    }
    if (action === "complete") {
      return NextResponse.json(await completeReceiptUpload(admin, checkout, readString(body.storagePath)));
    }
    return NextResponse.json({ userMessage: "Unsupported deposit action." }, { status: 400 });
  } catch (error) { return handleError(error); }
}
