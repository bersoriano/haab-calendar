"use client";

import { BookingStatusPill } from "@/components/ui/BookingStatusPill";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { BookingRecord, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

export type PassField = {
  label: string;
  value: string;
  /** Sentences, not data: rendered in the body face rather than mono. */
  prose?: boolean;
  /** A figure that carries weight of its own — set larger, on its own line. */
  emphasis?: boolean;
};

/** Machine-read fields: mono, uppercase, tiny. The ticket's whole voice. */
const microLabel =
  "text-[0.625rem] font-medium uppercase tracking-[0.16em] text-[var(--muted)] [font-family:var(--font-plex-mono)]";
const monoValue =
  "text-[0.875rem] font-medium text-[var(--ink)] [font-family:var(--font-plex-mono)]";

/**
 * Every value on the ticket is one of these, whatever it holds. Same label
 * treatment, same cell, same grid — which is what keeps a phone number and a
 * paragraph of instructions reading as parts of one document.
 */
/** Full-width dashed rule that breaks the field table into bands. */
function PassRule() {
  return (
    <div
      aria-hidden="true"
      className="col-span-2 mt-1 border-t border-dashed border-[rgba(15,23,42,0.12)] lg:col-span-4"
    />
  );
}

function PassCell({
  label,
  value,
  prose,
  emphasis,
  className,
}: PassField & { className?: string }) {
  return (
    <div
      className={cn(
        "min-w-0",
        // Every cell is the same width; only a phone's two-up grid is too
        // narrow to set a sentence in.
        prose && "col-span-2 sm:col-span-1",
        // A figure worth reading first gets the whole line to itself.
        emphasis && "col-span-2 lg:col-span-4",
        className,
      )}
    >
      <p className={microLabel}>{label}</p>
      <p
        className={cn(
          "mt-1.5 whitespace-pre-line break-words",
          prose
            ? "text-[0.8125rem] leading-6 text-[var(--ink)]"
            : emphasis
              ? "text-[1.25rem] font-medium leading-none tracking-[-0.02em] text-[var(--ink)] lg:text-[1.5rem] [font-family:var(--font-plex-mono)]"
              : monoValue,
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * The whole confirmation on one ticket.
 *
 * The top of the pass carries what someone is asked for at the door — when,
 * who, where, how much — with the tear-off stub holding the QR and the
 * reference. Everything else the booking knows runs along the foot of the same
 * card as a terms strip, grouped by whose information it is.
 */
export function BookingPass({
  booking,
  providerName,
  serviceName,
  dateLabel,
  timeLabel,
  isFullDay,
  durationLabel,
  clientFieldLabel,
  costLabel,
  admitLabel,
  reference,
  issuedLabel,
  qrDataUrl,
  qrError,
  onOpenQr,
  onDownloadIcs,
  description,
  details,
  copy,
  lang = "en",
}: {
  booking: BookingRecord;
  providerName: string;
  serviceName: string;
  dateLabel: string;
  /** The one time that matters: when the appointment starts. */
  timeLabel: string;
  isFullDay: boolean;
  durationLabel: string;
  /** Vertical-aware word for the person: patient, guest, client, attendee. */
  clientFieldLabel: string;
  costLabel?: string;
  /** Capacity line on the stub, e.g. "1 patient". */
  admitLabel?: string;
  reference: string;
  issuedLabel: string;
  qrDataUrl?: string;
  qrError?: string;
  onOpenQr: () => void;
  onDownloadIcs: () => void;
  /** Sits beside the date and time: what the booking is actually for. */
  description?: PassField;
  /**
   * Every remaining field, in reading order. Labels must stand alone — the
   * ticket has no section headings to lean on.
   */
  details: PassField[];
  copy: VerticalCopy;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang];
  const isCancelled = booking.status === "cancelled";

  // Date and time are the same fact split in two — a ticket shows them as a
  // matched pair, not a headline with a caption.
  const headlineClass = cn(
    "font-semibold leading-tight tracking-[-0.035em] text-[1.25rem] min-[420px]:text-[1.5rem] lg:text-[2rem]",
    isCancelled ? "text-[var(--muted)] line-through" : "text-[var(--ink)]",
  );

  return (
    <article
      aria-label={t.publicFlow.passEyebrow}
      className="overflow-hidden rounded-[30px] bg-white ring-1 ring-[rgba(15,23,42,0.08)] shadow-[0_30px_70px_rgba(15,23,42,0.10)]"
    >
      {/* Livery band. The one place the pass carries colour. */}
      <div
        aria-hidden="true"
        className={cn(
          "h-1.5 w-full",
          isCancelled
            ? "bg-[#e11d48]"
            : "bg-[linear-gradient(90deg,var(--accent-strong),var(--accent)_45%,var(--action-teal))]",
        )}
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* ── Pass body ─────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={microLabel}>{t.publicFlow.passEyebrow}</p>
              <p className="mt-2 truncate text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
                {providerName}
              </p>
              <p className={cn("mt-1 truncate", microLabel)}>{serviceName}</p>
            </div>
            <BookingStatusPill status={booking.status} lang={lang} />
          </div>

          {/* The pair, on the same column system as every field below it. */}
          <div className="mt-7 grid grid-cols-1 gap-5 border-t border-[rgba(15,23,42,0.08)] pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 lg:col-span-2">
              <p className={microLabel}>{t.publicFlow.passDate}</p>
              <p className={cn("mt-2", headlineClass)}>{dateLabel}</p>
            </div>
            <div className="min-w-0">
              <p className={microLabel}>
                {isFullDay ? t.publicFlow.when : t.publicFlow.passTime}
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <p className={cn("whitespace-nowrap", headlineClass)}>
                  {isFullDay ? t.publicFlow.fullDay : timeLabel}
                </p>
                {!isFullDay && durationLabel ? (
                  <span
                    className={cn(
                      "rounded-full bg-[var(--surface-soft)] px-3 py-1.5 ring-1 ring-[rgba(15,23,42,0.06)]",
                      microLabel,
                    )}
                  >
                    {durationLabel}
                  </span>
                ) : null}
              </div>
            </div>
            {description ? (
              <div className="min-w-0">
                <p className={microLabel}>{description.label}</p>
                <p className="mt-2 text-[0.8125rem] leading-6 text-[var(--ink)]">
                  {description.value}
                </p>
              </div>
            ) : null}
          </div>

          {/* The fields, most-asked-for first, all on one column system so they
              read as a single table rather than a pass with notes stapled on. */}
          <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[rgba(15,23,42,0.08)] pt-6 lg:grid-cols-4 lg:pt-7">
            {/* The person first, then everything else about them, then the
                place and the provider — one continuous flow. */}
            <PassCell label={clientFieldLabel} value={booking.clientName || "—"} />

            {details.map((field) => (
              <PassCell key={field.label} {...field} />
            ))}

            {/* The fare closes the ticket, the way a total closes a receipt. */}
            {costLabel ? (
              <>
                <PassRule />
                <PassCell label={t.publicFlow.total} value={costLabel} emphasis />
              </>
            ) : null}
          </div>
        </div>

        {/* ── Tear-off stub ─────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-4 border-t border-dashed border-[rgba(15,23,42,0.22)] bg-[var(--surface-soft)] p-6 lg:border-l lg:border-t-0">
          <p className={cn("w-full text-left", microLabel)}>
            {admitLabel || t.publicFlow.passEyebrow}
          </p>

          {isCancelled ? (
            <p
              aria-hidden="true"
              className="my-6 rotate-[-8deg] rounded-lg border-[3px] border-[#be123c] px-4 py-2 text-lg font-bold uppercase tracking-[0.18em] text-[#be123c] opacity-80"
            >
              {t.publicFlow.statusCancelled}
            </p>
          ) : (
            <button
              type="button"
              onClick={onOpenQr}
              aria-label={copy.phrases.calendarQrLabel}
              className="flex aspect-square w-full max-w-[168px] items-center justify-center overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-[rgba(15,23,42,0.1)] transition hover:ring-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {qrDataUrl ? (
                <span
                  className="h-full w-full bg-contain bg-center bg-no-repeat"
                  role="img"
                  aria-label={copy.phrases.calendarQrLabel}
                  style={{ backgroundImage: `url(${qrDataUrl})` }}
                />
              ) : (
                <span className="px-3 text-center text-xs leading-5 text-[var(--muted)]">
                  {qrError || t.manage.preparingQr}
                </span>
              )}
            </button>
          )}

          <div className="w-full space-y-3 text-left">
            <div>
              <p className={microLabel}>{t.publicFlow.receiptReference}</p>
              <p className={cn("mt-1 uppercase", monoValue)}>{reference}</p>
            </div>
            <div>
              <p className={microLabel}>{t.publicFlow.receiptIssued}</p>
              <p className={cn("mt-1", monoValue)}>{issuedLabel}</p>
            </div>
          </div>

          {!isCancelled ? (
            <button
              type="button"
              onClick={onDownloadIcs}
              className="mt-2 w-full rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {t.publicFlow.addToCalendar}
            </button>
          ) : null}
        </div>
      </div>

    </article>
  );
}

