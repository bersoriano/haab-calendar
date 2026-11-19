import "server-only";

import { createReminderManageToken } from "@/lib/email/reminder-link";
import { buildManagePath } from "@/lib/public-url";
import { getSiteOrigin } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VerticalId } from "@/lib/types";
import type { IntegrationOutboxHandler } from "@/lib/integrations/outbox/types";

/** Booking updates enqueue transactionally; this handler sends each reviewed proof once. */
export function createDepositStatusEmailHandler(): IntegrationOutboxHandler {
  return {
    key: "deposit_status_email",
    supports: (event) => event.eventType === "booking.updated",
    async deliver(event) {
      const admin = createAdminClient();
      const { data: booking, error: bookingError } = await admin.from("bookings")
        .select("id, provider_id, status, payment_proof_id, payment_status, client_name, client_email, client_language, service_name")
        .eq("id", event.bookingId).eq("provider_id", event.providerId).maybeSingle();
      if (bookingError) return { outcome: "retryable_failure", errorCode: "deposit_booking_read_failed" };
      if (!booking?.payment_proof_id ||
          !["payment_confirmed", "receipt_rejected"].includes(booking.payment_status ?? "")) {
        return { outcome: "skipped", reasonCode: "deposit_notice_not_due" };
      }
      if ((booking.payment_status === "payment_confirmed" && booking.status !== "confirmed") ||
          (booking.payment_status === "receipt_rejected" && booking.status !== "payment_action_required")) {
        return { outcome: "skipped", reasonCode: "deposit_notice_superseded" };
      }
      const { data: proof, error: proofError } = await admin.from("payment_proofs")
        .select("id, status, rejection_reason, customer_notice_sent_at")
        .eq("id", booking.payment_proof_id).maybeSingle();
      if (proofError || !proof) return { outcome: "retryable_failure", errorCode: "deposit_proof_read_failed" };
      if (proof.customer_notice_sent_at) return { outcome: "succeeded" };
      if (proof.status !== "accepted" && proof.status !== "rejected") {
        return { outcome: "skipped", reasonCode: "deposit_proof_not_reviewed" };
      }
      const { data: provider, error: providerError } = await admin.from("providers")
        .select("vertical, slug").eq("id", booking.provider_id)
        .maybeSingle<{ vertical: VerticalId; slug: string }>();
      if (providerError || !provider) return { outcome: "retryable_failure", errorCode: "deposit_provider_read_failed" };
      const key = process.env.RESEND_API_KEY?.trim();
      const from = process.env.BOOKING_EMAIL_FROM?.trim();
      if (!key || !from) return { outcome: "retryable_failure", errorCode: "email_unconfigured" };
      const spanish = booking.client_language === "es";
      const confirmed = proof.status === "accepted";
      let manageUrl: string;
      try {
        manageUrl = `${getSiteOrigin()}${buildManagePath(provider.vertical, provider.slug,
          createReminderManageToken(booking.id))}?lang=${spanish ? "es" : "en"}`;
      } catch {
        return { outcome: "retryable_failure", errorCode: "deposit_link_unconfigured" };
      }
      const subject = spanish
        ? `${confirmed ? "Pago confirmado" : "Comprobante rechazado"}: ${booking.service_name}`
        : `${confirmed ? "Payment confirmed" : "Receipt rejected"}: ${booking.service_name}`;
      const text = spanish
        ? confirmed
          ? `Hola ${booking.client_name},\n\nEl negocio confirmó tu depósito. Tu reserva para ${booking.service_name} está confirmada.\n\nConsulta tu reserva: ${manageUrl}`
          : `Hola ${booking.client_name},\n\nEl negocio rechazó tu comprobante para ${booking.service_name}. Motivo: ${proof.rejection_reason ?? "No se pudo verificar el depósito."}\n\nSube un nuevo comprobante dentro de 24 horas: ${manageUrl}`
        : confirmed
          ? `Hello ${booking.client_name},\n\nThe business confirmed your deposit. Your ${booking.service_name} booking is confirmed.\n\nView your booking: ${manageUrl}`
          : `Hello ${booking.client_name},\n\nThe business rejected your ${booking.service_name} receipt. Reason: ${proof.rejection_reason ?? "The deposit could not be verified."}\n\nUpload a new receipt within 24 hours: ${manageUrl}`;
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json",
            "Idempotency-Key": `deposit-status/${proof.id}/${proof.status}` },
          body: JSON.stringify({ from, to: [booking.client_email], subject, text }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) return { outcome: "retryable_failure", errorCode: "deposit_email_send_failed" };
      } catch {
        return { outcome: "retryable_failure", errorCode: "deposit_email_send_failed" };
      }
      const { error: updateError } = await admin.rpc("record_deposit_notice_delivered", {
        p_proof_id: proof.id,
      });
      if (updateError) return { outcome: "retryable_failure", errorCode: "deposit_notice_write_failed" };
      return { outcome: "succeeded" };
    },
  };
}
