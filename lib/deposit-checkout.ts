import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isEligibleDepositBusiness } from "@/lib/bank-deposit-settings";
import { detectReceiptMime, hashCheckoutToken, isDecodableReceiptImage, matchesCheckoutToken } from "@/lib/deposit-receipt-validation";
import { getDateTimeKeysInTimeZone } from "@/lib/date";
import { getPublishedProvider, PublicBookingWriteError } from "@/lib/supabase/bookings";
import type { VerticalId } from "@/lib/types";

export const RECEIPT_BUCKET = "deposit-receipts";
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
const RECEIPT_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

export type CheckoutRow = {
  id: string;
  provider_id: string;
  service_id: string;
  service_date: string;
  amount_minor: number;
  currency_code: string;
  reference: string;
  account_snapshot: Record<string, unknown>;
  checkout_token_hash: string;
  status: string;
  expires_at: string;
  booking_id: string | null;
  correction_deadline: string | null;
};

function acceptsReceipt(checkout: CheckoutRow) {
  return (checkout.status === "checkout_open" && new Date(checkout.expires_at).getTime() > Date.now()) ||
    (checkout.status === "receipt_rejected" && Boolean(checkout.booking_id) &&
     (!checkout.correction_deadline || new Date(checkout.correction_deadline).getTime() > Date.now()));
}

export async function getDepositCheckout(
  admin: SupabaseClient,
  options: { checkoutId: string; checkoutToken: string; providerId?: string },
) {
  const { data, error } = await admin.from("payment_requests").select("*")
    .eq("id", options.checkoutId).maybeSingle<CheckoutRow>();
  if (error) throw new PublicBookingWriteError("Could not load payment instructions.", 500, error);
  if (!data || (options.providerId && data.provider_id !== options.providerId) ||
      !matchesCheckoutToken(data.checkout_token_hash, options.checkoutToken)) {
    throw new PublicBookingWriteError("This payment link is invalid.", 404);
  }
  return data;
}

export function publicCheckout(checkout: CheckoutRow) {
  return {
    checkoutId: checkout.id,
    serviceId: checkout.service_id,
    serviceDate: checkout.service_date,
    amountMinor: checkout.amount_minor,
    currencyCode: checkout.currency_code,
    reference: checkout.reference,
    account: checkout.account_snapshot,
    expiresAt: checkout.expires_at,
  };
}

export async function createDepositCheckout(admin: SupabaseClient, options: {
  vertical: VerticalId;
  providerSlug: string;
  serviceId: string;
  dateKey: string;
}) {
  const provider = await getPublishedProvider(admin, options.vertical, options.providerSlug);
  const requestedDate = new Date(`${options.dateKey}T00:00:00Z`);
  const todayKey = getDateTimeKeysInTimeZone(new Date(), provider.timezone).dateKey;
  const latestDate = new Date(`${todayKey}T00:00:00Z`);
  latestDate.setUTCDate(latestDate.getUTCDate() + provider.booking_window_days);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.dateKey) ||
      Number.isNaN(requestedDate.getTime()) || requestedDate.toISOString().slice(0, 10) !== options.dateKey ||
      options.dateKey < todayKey || options.dateKey > latestDate.toISOString().slice(0, 10)) {
    throw new PublicBookingWriteError("Choose a valid booking date.", 400);
  }
  const [{ data: service, error: serviceError }, { data: account, error: accountError }] = await Promise.all([
    admin.from("services").select("id, deposit_required, deposit_amount_minor, deposit_currency_code")
      .eq("provider_id", provider.id).eq("id", options.serviceId).maybeSingle<{
        id: string; deposit_required: boolean; deposit_amount_minor: number | null;
        deposit_currency_code: string | null;
      }>(),
    admin.from("business_bank_accounts").select("*").eq("provider_id", provider.id).maybeSingle(),
  ]);
  if (serviceError || accountError) throw new PublicBookingWriteError("Could not load payment instructions.", 500);
  if (!service) throw new PublicBookingWriteError("That service is not available.", 404);
  if (!service.deposit_required) return { required: false as const };
  if (!isEligibleDepositBusiness(provider.vertical, provider.rsvp_mode ?? undefined) ||
      !account?.enabled || !service.deposit_amount_minor || !service.deposit_currency_code ||
      account.currency_code !== service.deposit_currency_code) {
    throw new PublicBookingWriteError("Bank deposit instructions are unavailable.", 409);
  }

  const checkoutToken = randomBytes(32).toString("base64url");
  const reference = `HB-${randomBytes(5).toString("hex").toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const snapshot = {
    bankName: account.bank_name, accountHolder: account.account_holder,
    countryCode: account.country_code, currencyCode: account.currency_code,
    accountNumber: account.account_number, clabe: account.clabe, iban: account.iban,
    swiftBic: account.swift_bic, routingCode: account.routing_code,
    instructionsEn: account.instructions_en, instructionsEs: account.instructions_es,
  };
  const { data, error } = await admin.from("payment_requests").insert({
    provider_id: provider.id, service_id: service.id, service_date: options.dateKey,
    amount_minor: service.deposit_amount_minor, currency_code: service.deposit_currency_code,
    reference, account_snapshot: snapshot, checkout_token_hash: hashCheckoutToken(checkoutToken),
    expires_at: expiresAt, delete_after: options.dateKey,
  }).select("*").single<CheckoutRow>();
  if (error) throw new PublicBookingWriteError("Could not prepare payment instructions.", 500, error);
  await admin.from("payment_events").insert({
    payment_request_id: data.id, provider_id: provider.id,
    actor_type: "customer", event_type: "checkout_opened",
  });
  return { required: true as const, checkoutToken, ...publicCheckout(data) };
}

export async function createReceiptUpload(admin: SupabaseClient, checkout: CheckoutRow, mimeType: string) {
  if (!acceptsReceipt(checkout)) {
    throw new PublicBookingWriteError("Payment link expired. Start booking again.", 409);
  }
  if (!RECEIPT_MIMES.includes(mimeType as typeof RECEIPT_MIMES[number])) {
    throw new PublicBookingWriteError("Upload a JPEG, PNG, or WebP receipt image.", 400);
  }
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const storagePath = `${checkout.provider_id}/${checkout.id}/${randomUUID()}.${extension}`;
  const { error: intentError } = await admin.from("payment_receipt_upload_intents")
    .insert({ payment_request_id: checkout.id, storage_path: storagePath });
  if (intentError) throw new PublicBookingWriteError("Could not start receipt upload.", 500, intentError);
  const { data, error } = await admin.storage.from(RECEIPT_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (error || !data) {
    await admin.from("payment_receipt_upload_intents").delete().eq("storage_path", storagePath);
    throw new PublicBookingWriteError("Could not start receipt upload.", 500, error);
  }
  return { storagePath, uploadToken: data.token };
}

export async function completeReceiptUpload(admin: SupabaseClient, checkout: CheckoutRow, storagePath: string) {
  if (!acceptsReceipt(checkout) ||
      !new RegExp(`^${checkout.provider_id}/${checkout.id}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(storagePath)) {
    throw new PublicBookingWriteError("Receipt upload link is invalid or expired.", 409);
  }
  const { data: existing, error: existingError } = await admin.from("payment_proofs")
    .select("id, payment_request_id, status").eq("storage_path", storagePath).maybeSingle();
  if (existingError) throw new PublicBookingWriteError("Could not check receipt upload.", 500, existingError);
  if (existing && existing.payment_request_id === checkout.id && existing.status === "staged") {
    return { proofId: existing.id };
  }
  const { data: intent, error: intentError } = await admin.from("payment_receipt_upload_intents")
    .select("storage_path, issued_at, completed_at")
    .eq("storage_path", storagePath).eq("payment_request_id", checkout.id).maybeSingle();
  if (intentError || !intent || intent.completed_at ||
      new Date(intent.issued_at).getTime() < Date.now() - 2 * 60 * 60 * 1000) {
    throw new PublicBookingWriteError("Receipt upload link expired. Try again.", 409);
  }
  const { data: file, error: downloadError } = await admin.storage.from(RECEIPT_BUCKET).download(storagePath);
  if (downloadError || !file) throw new PublicBookingWriteError("Finish uploading receipt before continuing.", 409);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectReceiptMime(bytes);
  const expectedMime = storagePath.endsWith(".png") ? "image/png" :
    storagePath.endsWith(".webp") ? "image/webp" : "image/jpeg";
  if (!mimeType || mimeType !== expectedMime || bytes.length === 0 || bytes.length > RECEIPT_MAX_BYTES ||
      !await isDecodableReceiptImage(bytes, expectedMime)) {
    await admin.storage.from(RECEIPT_BUCKET).remove([storagePath]);
    throw new PublicBookingWriteError("Upload a JPEG, PNG, or WebP receipt under 10 MB.", 400);
  }
  const { data, error } = await admin.from("payment_proofs").insert({
    payment_request_id: checkout.id, storage_path: storagePath,
    mime_type: mimeType, byte_size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"), status: "staged",
  }).select("id").single<{ id: string }>();
  if (error) {
    if (error.code === "23505") throw new PublicBookingWriteError("Receipt already uploaded.", 409);
    throw new PublicBookingWriteError("Could not save receipt.", 500, error);
  }
  const { error: completeError } = await admin.from("payment_receipt_upload_intents")
    .update({ completed_at: new Date().toISOString() }).eq("storage_path", storagePath);
  if (completeError) throw new PublicBookingWriteError("Could not finish receipt upload.", 500, completeError);
  return { proofId: data.id };
}
