import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { RECEIPT_BUCKET } from "@/lib/deposit-checkout";

type RequestRow = {
  id: string;
  provider_id: string;
  delete_after: string;
  status: string;
  reference: string;
};

async function sendDeletionNotice(admin: SupabaseClient, row: RequestRow) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BOOKING_EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("Deposit retention email is not configured.");
  const { data: provider, error } = await admin.from("providers")
    .select("email, business_name").eq("id", row.provider_id)
    .single<{ email: string; business_name: string }>();
  if (error || !provider?.email) throw error ?? new Error("Owner email missing.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json",
      "Idempotency-Key": `deposit-retention/${row.id}` },
    body: JSON.stringify({ from, to: [provider.email],
      subject: "Upcoming bank receipt deletion / Próxima eliminación de comprobante",
      text: `Deposit receipt ${row.reference} for ${provider.business_name} is scheduled for deletion on ${row.delete_after}. Review or export it before then. Un comprobante de depósito será eliminado el ${row.delete_after}. Revísalo o expórtalo antes de esa fecha.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Deposit retention email returned HTTP ${response.status}.`);
}

export async function runDepositRetentionWorker(admin: SupabaseClient = createAdminClient()) {
  const now = new Date();
  const nowIso = now.toISOString();
  const noticeThrough = new Date(now.getTime() + 30 * 86_400_000).toISOString();
  const { data: notices, error: noticeError } = await admin.from("payment_requests")
    .select("id, provider_id, delete_after, status, reference")
    .is("deletion_notice_sent_at", null).gt("delete_at", nowIso)
    .lte("delete_at", noticeThrough).order("delete_at").limit(100)
    .returns<RequestRow[]>();
  if (noticeError) throw noticeError;
  let notified = 0;
  for (const row of notices ?? []) {
    try {
      await sendDeletionNotice(admin, row);
      const { error } = await admin.from("payment_requests")
        .update({ deletion_notice_sent_at: new Date().toISOString() }).eq("id", row.id);
      if (error) throw error;
      notified += 1;
    } catch (error) {
      console.error("deposit_retention_notice_failed", { requestId: row.id,
        error: error instanceof Error ? error.message : String(error) });
    }
  }

  const { data: abandoned, error: abandonedError } = await admin.from("payment_requests")
    .select("id, provider_id, delete_after, status, reference")
    .eq("status", "checkout_open").is("booking_id", null)
    .lt("expires_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
    .limit(100).returns<RequestRow[]>();
  if (abandonedError) throw abandonedError;

  const { data: staged, error: stagedError } = await admin.from("payment_proofs")
    .select("id, storage_path").eq("status", "staged")
    .lt("uploaded_at", new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString())
    .limit(100);
  if (stagedError) throw stagedError;
  if (staged?.length) {
    const { error: removeError } = await admin.storage.from(RECEIPT_BUCKET)
      .remove(staged.map((proof) => proof.storage_path));
    if (removeError) throw removeError;
    const { error: deleteError } = await admin.from("payment_proofs")
      .delete().in("id", staged.map((proof) => proof.id)).eq("status", "staged");
    if (deleteError) throw deleteError;
  }

  const { data: staleIntents, error: intentsError } = await admin.from("payment_receipt_upload_intents")
    .select("storage_path").is("completed_at", null)
    .lt("issued_at", new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString())
    .limit(100);
  if (intentsError) throw intentsError;
  if (staleIntents?.length) {
    const paths = staleIntents.map((intent) => intent.storage_path);
    const { error: removeError } = await admin.storage.from(RECEIPT_BUCKET).remove(paths);
    if (removeError) throw removeError;
    const { error: deleteError } = await admin.from("payment_receipt_upload_intents")
      .delete().in("storage_path", paths).is("completed_at", null);
    if (deleteError) throw deleteError;
  }

  const { data: expired, error: expiredError } = await admin.from("payment_requests")
    .select("id, provider_id, delete_after, status, reference")
    .lte("delete_at", nowIso).order("delete_at").limit(100)
    .returns<RequestRow[]>();
  if (expiredError) throw expiredError;
  let deleted = 0;
  const abandonedIds = new Set((abandoned ?? []).map((row) => row.id));
  for (const row of [...(abandoned ?? []), ...(expired ?? []).filter((row) => !abandonedIds.has(row.id))]) {
    const { data: proofs, error: proofsError } = await admin.from("payment_proofs")
      .select("storage_path").eq("payment_request_id", row.id);
    if (proofsError) throw proofsError;
    const paths = (proofs ?? []).map((proof) => proof.storage_path);
    if (paths.length) {
      const { error: removeError } = await admin.storage.from(RECEIPT_BUCKET).remove(paths);
      if (removeError) throw removeError;
    }
    const { error: deleteError } = await admin.from("payment_requests").delete().eq("id", row.id);
    if (deleteError) throw deleteError;
    deleted += 1;
  }
  const { data: correctionCount, error: correctionError } = await admin.rpc("expire_rejected_deposits", {
    p_batch_size: 100,
  });
  if (correctionError) throw correctionError;
  return { notified, deleted, hasMore: (notices?.length ?? 0) === 100 ||
      (abandoned?.length ?? 0) === 100 || (staged?.length ?? 0) === 100 ||
      (staleIntents?.length ?? 0) === 100 || (expired?.length ?? 0) === 100 ||
      correctionCount === 100,
    abandoned: abandoned?.length ?? 0, stagedRemoved: staged?.length ?? 0,
    staleUploadsRemoved: staleIntents?.length ?? 0,
    expiredCorrections: correctionCount as number };
}
