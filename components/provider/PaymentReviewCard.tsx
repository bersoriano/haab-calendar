"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/app-ui";
import type { BookingRecord, Lang } from "@/lib/types";

type PaymentDetail = {
  request: { reference: string; amount_minor: number; currency_code: string; correction_deadline: string | null };
  proofs: Array<{ id: string; imageUrl: string | null; uploadedAt: string; status: string; rejectionReason: string | null }>;
};

export function PaymentReviewCard({ booking, lang, onReviewed }: {
  booking: BookingRecord;
  lang: Lang;
  onReviewed: (booking: BookingRecord) => void;
}) {
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const base = `/api/provider/bookings/${encodeURIComponent(booking.id)}/payment`;

  useEffect(() => {
    let cancelled = false;
    void fetch(base).then(async (response) => {
      const payload = await response.json() as PaymentDetail & { userMessage?: string };
      if (!response.ok) throw new Error(payload.userMessage ?? "Could not load receipt.");
      if (!cancelled) setDetail(payload);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load receipt.");
    });
    return () => { cancelled = true; };
  }, [base]);

  async function review(action: "confirm" | "reject" | "refunded" | "refund_due") {
    setBusy(true); setError(null);
    try {
      const response = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }) });
      const payload = await response.json() as { userMessage?: string };
      if (!response.ok) throw new Error(payload.userMessage ?? "Could not review receipt.");
      onReviewed({ ...booking,
        status: action === "confirm" ? "confirmed" : action === "reject" ? "payment_action_required" : booking.status,
        paymentStatus: action === "confirm" ? "payment_confirmed" : action === "reject" ? "receipt_rejected" :
          action === "refund_due" ? "refund_due" : "refunded",
        updatedAt: new Date().toISOString(),
      });
      setShowReject(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not review receipt.");
    } finally { setBusy(false); }
  }

  const amount = detail?.request
    ? new Intl.NumberFormat(lang === "es" ? "es-MX" : "en-US", {
        style: "currency", currency: detail.request.currency_code,
      }).format(detail.request.amount_minor / (10 ** (new Intl.NumberFormat("en", {
        style: "currency", currency: detail.request.currency_code,
      }).resolvedOptions().maximumFractionDigits ?? 2))) : "";

  return (
    <section className="col-span-full rounded-2xl border border-app-border bg-app-surface p-4 text-sm" aria-label={lang === "es" ? "Verificación de depósito" : "Deposit verification"}>
      <h3 className="font-semibold text-app-fg">{lang === "es" ? "Verificación de depósito" : "Deposit verification"}</h3>
      {detail ? <p className="mt-1 text-app-fg-muted">
        {amount} · {lang === "es" ? "Referencia" : "Reference"}: <strong>{detail.request.reference}</strong>
      </p> : <p className="mt-1 text-app-fg-muted">{lang === "es" ? "Cargando comprobante…" : "Loading receipt…"}</p>}
      {detail?.proofs.map((proof) => proof.imageUrl ? (
        <div key={proof.id} className="mt-3">
          <p className="text-xs text-app-fg-muted">{proof.status} · {new Date(proof.uploadedAt).toLocaleString(lang)}</p>
          <a href={proof.imageUrl} target="_blank" rel="noreferrer" className="mt-1 block w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL expires in five minutes */}
            <img src={proof.imageUrl} alt={lang === "es" ? "Comprobante de depósito enviado" : "Submitted bank deposit receipt"}
              className="max-h-72 max-w-full rounded-xl border border-app-border object-contain" />
          </a>
          {proof.rejectionReason ? <p className="mt-1 text-app-fg-muted">{proof.rejectionReason}</p> : null}
        </div>
      ) : null)}
      {booking.status === "pending_payment_verification" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" loading={busy} onClick={() => void review("confirm")}>
            {lang === "es" ? "Marcar pago confirmado" : "Mark as payment confirmed"}
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setShowReject((current) => !current)}>
            {lang === "es" ? "Rechazar comprobante" : "Reject receipt"}
          </Button>
        </div>
      ) : null}
      {booking.paymentStatus === "refund_due" ? <div className="mt-3">
        <p className="mb-2 text-app-fg-muted">{lang === "es" ? "Gestiona el reembolso fuera de Haab y registra cuando esté hecho." :
          "Handle refund outside Haab, then record when complete."}</p>
        <Button size="sm" variant="secondary" loading={busy} onClick={() => void review("refunded")}>
          {lang === "es" ? "Marcar reembolso realizado" : "Mark refund completed"}
        </Button>
      </div> : null}
      {booking.status === "cancelled" &&
       (booking.paymentStatus === "pending_verification" || booking.paymentStatus === "receipt_rejected") ? (
        <div className="mt-3">
          <p className="mb-2 text-app-fg-muted">{lang === "es"
            ? "Si el depósito llegó después de cancelar, regístralo para gestionar el reembolso fuera de Haab."
            : "If deposit arrived after cancellation, record it and handle refund outside Haab."}</p>
          <Button size="sm" variant="secondary" loading={busy} onClick={() => void review("refund_due")}>
            {lang === "es" ? "Depósito recibido: reembolso pendiente" : "Deposit received: refund due"}
          </Button>
        </div>
      ) : null}
      {showReject ? <div className="mt-3 grid max-w-lg gap-2">
        <label className="font-medium" htmlFor={`deposit-reason-${booking.id}`}>
          {lang === "es" ? "Motivo para el cliente" : "Reason shown to customer"}
        </label>
        <textarea id={`deposit-reason-${booking.id}`} value={reason} maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          className="rounded-xl border border-app-border p-3" rows={2} />
        <Button size="sm" variant="danger-plain" disabled={busy || reason.trim().length < 3}
          onClick={() => void review("reject")}>
          {lang === "es" ? "Rechazar y dar 24 horas" : "Reject and allow 24 hours"}
        </Button>
      </div> : null}
      {error ? <p className="mt-2 text-app-danger" role="alert">{error}</p> : null}
    </section>
  );
}
