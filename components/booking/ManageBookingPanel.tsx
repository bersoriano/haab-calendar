"use client";

import { type ReactNode } from "react";

import { ActionButton } from "@/components/ui/ActionButton";
import { BookingStatusPill } from "@/components/ui/BookingStatusPill";
import { PrivateLinkCard } from "@/components/ui/PrivateLinkCard";
import { SummaryField } from "@/components/ui/SummaryField";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { formatDateLabel, formatTimeRange } from "@/lib/format";
import type { BookingRecord, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

export type ManageNoteStatus = "idle" | "saved" | "failed";

/**
 * The page behind the private link. It answers three questions in this order —
 * is my booking still on, when is it, and what can I change — and never asks the
 * client to sign in for any of them.
 */
export function ManageBookingPanel({
  booking,
  providerName,
  addresses,
  phones,
  costLabel,
  manageUrl,
  copiedManageLink,
  onCopyManageLink,
  canReschedule,
  onReschedule,
  onCancel,
  onAddToCalendar,
  onShowQr,
  qrDataUrl,
  qrError,
  noteDraft,
  onNoteDraftChange,
  onSaveNote,
  isSavingNote,
  noteStatus,
  savedNote,
  bookAnotherAction,
  copy,
  lang = "en",
  panelClass,
  insetClass,
  buttonClass,
  ghostButtonClass,
}: {
  booking: BookingRecord;
  providerName: string;
  addresses: string[];
  phones: string[];
  costLabel: string;
  manageUrl: string;
  copiedManageLink: boolean;
  onCopyManageLink: () => void;
  canReschedule: boolean;
  onReschedule: () => void;
  onCancel: () => void;
  onAddToCalendar: () => void;
  onShowQr: () => void;
  qrDataUrl?: string;
  qrError?: string;
  noteDraft: string;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
  isSavingNote: boolean;
  noteStatus: ManageNoteStatus;
  savedNote: string;
  bookAnotherAction: ReactNode;
  copy: VerticalCopy;
  lang?: Lang;
  panelClass: string;
  insetClass: string;
  buttonClass?: string;
  ghostButtonClass?: string;
}) {
  const t = bookingTranslations[lang];
  const isCancelled = booking.status === "cancelled";
  const statusBody = isCancelled
    ? t.manage.statusCancelledBody
    : booking.status === "rescheduled"
      ? t.manage.statusRescheduledBody
      : t.manage.statusConfirmedBody;
  const noteUnchanged = noteDraft.trim() === savedNote.trim();

  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-8 xl:px-10 xl:py-10">
      {/* 1. Status first: the whole reason someone opens this link. */}
      <section className={panelClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              {providerName || copy.bookingPage}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-3xl">
              {t.manage.yourBookingTitle}
            </h2>
          </div>
          <BookingStatusPill status={booking.status} lang={lang} />
        </div>
        <p className="mt-3 text-[0.9375rem] leading-6 text-[var(--muted)]">{statusBody}</p>

        <div className={cn("mt-6", insetClass)}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            {t.publicFlow.dateAndTime}
          </p>
          <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
            <p
              className={cn(
                "text-2xl font-bold leading-tight tracking-[-0.03em] sm:text-[2rem]",
                isCancelled ? "text-[var(--muted)] line-through" : "text-[var(--ink)]",
              )}
            >
              {formatDateLabel(booking.dateKey, lang)}
            </p>
            <p
              className={cn(
                "text-2xl font-bold leading-tight tracking-[-0.03em] sm:text-[2rem]",
                isCancelled ? "text-[var(--muted)] line-through" : "text-[var(--ink)]",
              )}
            >
              {formatTimeRange(booking.startTime, booking.endTime, lang)}
            </p>
          </div>

          <div className="mt-5 h-px bg-[rgba(15,23,42,0.06)]" aria-hidden="true" />

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <SummaryField label={copy.phrases.typeOfServiceLabel} value={booking.serviceName} />
            <SummaryField label={copy.phrases.clientLabel} value={booking.clientName || "—"} />
            {costLabel ? (
              <SummaryField label={t.publicFlow.total} value={costLabel} />
            ) : null}
            {addresses.length > 0 ? (
              <SummaryField
                label={addresses.length > 1 ? t.publicFlow.locations : t.publicFlow.location}
                value={
                  <div className="flex flex-col gap-1.5">
                    {addresses.map((entry) => (
                      <span key={`manage-addr-${entry}`} className="min-w-0 break-words">
                        {entry}
                      </span>
                    ))}
                  </div>
                }
              />
            ) : null}
            {phones.length > 0 ? (
              <SummaryField
                label={phones.length > 1 ? t.publicFlow.phones : t.publicFlow.phone}
                value={
                  <div className="flex flex-col gap-1.5">
                    {phones.map((entry) => (
                      <span key={`manage-phone-${entry}`} className="min-w-0 break-words">
                        {entry}
                      </span>
                    ))}
                  </div>
                }
              />
            ) : null}
            {booking.notes.trim() ? (
              <SummaryField label={t.publicFlow.notes} value={booking.notes} />
            ) : null}
          </dl>
        </div>
      </section>

      {/* 2. The two changes a client ever wants to make. */}
      <section className={panelClass}>
        <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
          {t.manage.manageActionsTitle}
        </h3>
        <div className="mt-4 flex flex-wrap gap-3">
          {canReschedule ? (
            <ActionButton
              tone="primary"
              className={cn("min-w-[170px]", buttonClass)}
              disabled={isCancelled}
              onClick={onReschedule}
            >
              {t.manage.rescheduleOneTap}
            </ActionButton>
          ) : null}
          <ActionButton
            tone="danger"
            className={cn("min-w-[150px]", buttonClass)}
            disabled={isCancelled}
            onClick={onCancel}
          >
            {t.manage.cancelBooking}
          </ActionButton>
          <ActionButton
            tone="ghost"
            className={cn("min-w-[150px]", ghostButtonClass)}
            disabled={isCancelled}
            onClick={onAddToCalendar}
          >
            {t.publicFlow.addToCalendar}
          </ActionButton>
          <ActionButton
            tone="ghost"
            className={cn("min-w-[150px]", ghostButtonClass)}
            disabled={isCancelled}
            onClick={onShowQr}
          >
            {t.publicFlow.showQrCode}
          </ActionButton>
          {bookAnotherAction}
        </div>

        {!isCancelled ? (
          <div className={cn("mt-5 flex flex-wrap items-center gap-5", insetClass)}>
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-[var(--line)]">
              {qrDataUrl ? (
                <div
                  aria-label={copy.phrases.calendarQrLabel}
                  className="h-full w-full bg-contain bg-center bg-no-repeat"
                  role="img"
                  style={{ backgroundImage: `url(${qrDataUrl})` }}
                />
              ) : (
                <p className="px-2 text-center text-[0.6875rem] leading-4 text-[var(--muted)]">
                  {qrError || t.manage.preparingQr}
                </p>
              )}
            </div>
            <p className="min-w-0 flex-1 text-sm leading-6 text-[var(--muted)]">
              {t.publicFlow.scanToAdd}
            </p>
          </div>
        ) : null}
      </section>

      {/* 3. A one-way note. Cheaper than a phone call for both sides. */}
      {!isCancelled ? (
        <section className={panelClass}>
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
            {t.manage.noteTitle}
          </h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{t.manage.noteBody}</p>
          {savedNote.trim() ? (
            <div className={cn("mt-4", insetClass)}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {t.manage.noteOnRecord}
              </p>
              <p className="mt-2 whitespace-pre-line text-[0.9375rem] leading-6 text-[var(--ink)]">
                {savedNote}
              </p>
            </div>
          ) : null}
          <label className="mt-4 grid gap-2">
            <span className="sr-only">{t.manage.noteTitle}</span>
            <textarea
              value={noteDraft}
              onChange={(event) => onNoteDraftChange(event.target.value)}
              placeholder={t.manage.notePlaceholder}
              rows={3}
              maxLength={500}
              className="w-full rounded-[22px] border border-[var(--line)] bg-white px-4 py-3 text-[0.9375rem] leading-6 text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(26,115,232,0.14)]"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton
              tone="secondary"
              className={cn("min-w-[150px]", buttonClass)}
              disabled={isSavingNote || noteUnchanged}
              onClick={onSaveNote}
            >
              {isSavingNote ? t.manage.savingNote : t.manage.saveNote}
            </ActionButton>
            <p
              role="status"
              aria-live="polite"
              className={cn(
                "text-sm font-semibold",
                noteStatus === "failed" ? "text-[#be123c]" : "text-[var(--accent-strong)]",
              )}
            >
              {noteStatus === "saved"
                ? t.manage.noteSaved
                : noteStatus === "failed"
                  ? t.manage.noteFailed
                  : ""}
            </p>
          </div>
        </section>
      ) : null}

      {/* 4. The key to this page. Repeated here because this is where people
          arrive from an email weeks later. */}
      <PrivateLinkCard
        url={manageUrl}
        lang={lang}
        copied={copiedManageLink}
        onCopy={onCopyManageLink}
        showOpenLink={false}
      />
      <p className="px-2 text-center text-xs leading-5 text-[var(--muted)]">
        {t.manage.privateLinkTrust}
      </p>
    </div>
  );
}
