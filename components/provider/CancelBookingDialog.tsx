"use client";

import { ConfirmDialog } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import type { Lang } from "@/lib/types";
import type { VerticalCopy } from "@/lib/vertical-copy";

/** The dashboard's cancel confirmation. Public pages keep their own modal. */
export function CancelBookingDialog({
  open,
  lang,
  copy,
  serviceName,
  clientName,
  whenLabel,
  pending,
  error,
  onConfirm,
  onKeep,
}: {
  open: boolean;
  lang: Lang;
  copy: VerticalCopy;
  serviceName: string;
  clientName: string;
  whenLabel: string;
  pending: boolean;
  error?: string | null;
  onConfirm: () => void;
  onKeep: () => void;
}) {
  const t = bookingTranslations[lang];

  return (
    <ConfirmDialog
      open={open}
      title={copy.cancelBooking}
      body={
        <>
          <p className="font-medium text-app-fg">{`${serviceName} · ${clientName} · ${whenLabel}`}</p>
          <p className="mt-2">{copy.phrases.cancelExplain}</p>
        </>
      }
      confirmLabel={t.manage.confirmCancellation}
      cancelLabel={copy.phrases.keepBookingButton}
      closeLabel={dashboardCopy[lang].closeDialog}
      tone="danger"
      pending={pending}
      error={error ?? undefined}
      onConfirm={onConfirm}
      onCancel={onKeep}
    />
  );
}
