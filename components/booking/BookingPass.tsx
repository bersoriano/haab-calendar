"use client";

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
function PassCell({
  label,
  value,
  prose,
  emphasis,
  className,
}: PassField & { className?: string }) {
  // A caller that places a cell by hand owns its whole span; the defaults below
  // only apply when nobody has.
  const span =
    className ??
    cn(
      // Every cell is the same width; only a phone's two-up grid is too
      // narrow to set a sentence in.
      prose && "col-span-2 sm:col-span-1",
      // A figure worth reading first gets the whole line to itself.
      emphasis && "col-span-2 lg:col-span-4",
    );

  return (
    <div className={cn("min-w-0", span)}>
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
  confirmationLabel,
  location,
  description,
  notes,
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
  /**
   * The moment, carried by the ticket itself: "Booking confirmed", "Booking
   * cancelled", "Booking updated". Badged on the stub above the code. Omit it
   * and the pass is just a pass.
   */
  confirmationLabel?: string;
  /** Where it happens. Bands off with the description below the fields. */
  location?: PassField;
  /** What the booking is for. Bands off with the location below the fields. */
  description?: PassField;
  /** What to know before coming. Bands off with the description and location. */
  notes?: PassField;
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
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
              {providerName}
            </p>
            <p className={cn("mt-1 truncate", microLabel)}>{serviceName}</p>
          </div>

          {/* The pair, on the same column system as every field below it. */}
          <div className="mt-7 grid grid-cols-1 gap-5 border-t border-dotted border-[rgba(15,23,42,0.2)] pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 lg:col-span-2">
              <p className={microLabel}>{t.publicFlow.passDate}</p>
              <p className={cn("mt-2", headlineClass)}>{dateLabel}</p>
            </div>
            <div className="min-w-0 lg:col-span-2">
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
          </div>

          {/* The fields, most-asked-for first, all on one column system so they
              read as a single table rather than a pass with notes stapled on. */}
          <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-dotted border-[rgba(15,23,42,0.2)] pt-6 lg:grid-cols-4 lg:pt-7">
            {/* The person first, then everything else about them, then the
                place and the provider — one continuous flow. */}
            <PassCell label={clientFieldLabel} value={booking.clientName || "—"} />

            {details.map((field) => (
              <PassCell key={field.label} {...field} />
            ))}
          </div>

          {/* The sentences: what it is, where it is, what to know before you
              come. A band of their own, a third of the pass each. */}
          {description || location || notes ? (
            <div className="mt-7 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-dotted border-[rgba(15,23,42,0.2)] pt-6 sm:grid-cols-2 lg:grid-cols-3 lg:pt-7">
              {description ? <PassCell {...description} prose /> : null}
              {location ? <PassCell {...location} prose /> : null}
              {notes ? <PassCell {...notes} prose /> : null}
            </div>
          ) : null}

          {/* The fare closes the ticket, the way a total closes a receipt. */}
          {costLabel ? (
            <div className="mt-7 border-t border-dotted border-[rgba(15,23,42,0.2)] pt-6 lg:pt-7">
              <PassCell label={t.publicFlow.total} value={costLabel} emphasis />
            </div>
          ) : null}
        </div>

        {/* ── Tear-off stub ─────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-4 border-t border-dotted border-[rgba(15,23,42,0.32)] bg-[var(--surface-soft)] p-6 text-center lg:border-l lg:border-t-0">
          {/* Arrival, stamped on the stub above the code — the stub's own
              voice: a mono line in a badge, not a headline. */}
          {confirmationLabel ? (
            <div
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-full px-3 py-2.5 ring-1 [animation:haab-pop-in_0.5s_cubic-bezier(0.34,1.4,0.64,1)_both]",
                isCancelled
                  ? "bg-[#fff1f2] text-[#be123c] ring-[rgba(190,18,60,0.22)]"
                  : "bg-[rgba(0,191,165,0.12)] text-[var(--action-teal)] ring-[rgba(0,191,165,0.28)]",
              )}
              role="status"
              aria-live="polite"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-3.5 w-3.5 shrink-0"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isCancelled ? (
                  <>
                    <path
                      d="M18 6 6 18"
                      pathLength={1}
                      className="[stroke-dasharray:1] [animation:haab-stroke-draw_0.3s_ease-out_0.3s_both]"
                    />
                    <path
                      d="m6 6 12 12"
                      pathLength={1}
                      className="[stroke-dasharray:1] [animation:haab-stroke-draw_0.3s_ease-out_0.5s_both]"
                    />
                  </>
                ) : (
                  <path
                    d="M20 7 9 18l-5-5"
                    pathLength={1}
                    className="[stroke-dasharray:1] [animation:haab-stroke-draw_0.45s_ease-out_0.3s_both]"
                  />
                )}
              </svg>
              <span className="min-w-0 truncate text-[0.625rem] font-semibold uppercase tracking-[0.14em] [font-family:var(--font-plex-mono)]">
                {confirmationLabel}
              </span>
            </div>
          ) : null}

          <p className={cn("w-full", microLabel)}>
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

          <div className="w-full space-y-3">
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
              className="mt-auto w-full rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {t.publicFlow.addToCalendar}
            </button>
          ) : null}
        </div>
      </div>

    </article>
  );
}

