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
  whatHappensNext,
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
  /** Saves the .ics. Lives on the stub, with the QR and the reference. */
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
  /**
   * What to do before the day, in this vertical's words. Sits with the name of
   * the place and the thing booked, because that is the part a visitor reads
   * before deciding they are finished with the page.
   */
  whatHappensNext?: string;
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
      className="overflow-hidden rounded-[30px] bg-[var(--surface-lowest)] ring-1 ring-[rgba(15,23,42,0.08)] shadow-[0_30px_70px_rgba(15,23,42,0.10)]"
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
            {whatHappensNext && !isCancelled ? (
              <p className="mt-3 text-[0.9375rem] leading-6 text-[var(--muted)]">
                {whatHappensNext}
              </p>
            ) : null}
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
              className="flex aspect-square w-full max-w-[168px] items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-lowest)] p-2 ring-1 ring-[rgba(15,23,42,0.1)] transition hover:ring-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
              className="mt-auto w-full rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--on-primary)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {t.publicFlow.addToCalendar}
            </button>
          ) : null}

        </div>
      </div>

    </article>
  );
}


/* ── Refined pass ───────────────────────────────────────────────────────── */

const refinedLabel = cn(microLabel, "text-[0.65625rem] tracking-[0.16em]");
const dottedRule = "border-t border-dotted border-[rgba(15,23,42,0.22)]";

/** Human values are set in the body face; only machine values stay mono. */
function RefinedCell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <p className={refinedLabel}>{label}</p>
      {children}
    </div>
  );
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/**
 * The confirmation pass as the dedicated page shows it: a header with the type
 * badge, the moment on an inset block, the people and places in auto-fitting
 * columns, the sentences banded below, and the tear-off stub beside (above the
 * fields on a phone, where it becomes a horizontal band between tear lines).
 *
 * The classic `BookingPass` above stays as it was for the embedded surface.
 * Takes structured fields rather than a list of cells, because each one has a
 * place in this layout.
 */
export function RefinedBookingPass({
  booking,
  providerName,
  serviceName,
  typeBadge,
  dateLabel,
  dateLabelCompact,
  timeLabel,
  isFullDay,
  durationLabel,
  clientFieldLabel,
  addresses,
  providerPhones,
  providerEmail,
  category,
  description,
  bringLabel,
  notes,
  clientNotes,
  costLabel,
  admitLabel,
  reference,
  issuedLabel,
  qrDataUrl,
  qrError,
  onOpenQr,
  onDownloadIcs,
  confirmationLabel,
  copy,
  lang = "en",
}: {
  booking: BookingRecord;
  providerName: string;
  serviceName: string;
  typeBadge?: { label: string; tone: "primary" | "secondary" };
  dateLabel: string;
  /** A shorter form of the date for a phone; falls back to `dateLabel`. */
  dateLabelCompact?: string;
  timeLabel: string;
  isFullDay: boolean;
  durationLabel: string;
  clientFieldLabel: string;
  addresses: string[];
  providerPhones: string[];
  providerEmail?: string;
  /** Specialty or category. Omitted when the service has none. */
  category?: PassField;
  description?: string;
  /** The vertical's heading over the notes: "Bring with you", "Before you arrive". */
  bringLabel: string;
  notes?: string;
  /** What the client wrote on the booking, when they wrote something. */
  clientNotes?: PassField;
  costLabel?: string;
  admitLabel?: string;
  reference: string;
  issuedLabel: string;
  qrDataUrl?: string;
  qrError?: string;
  onOpenQr: () => void;
  onDownloadIcs: () => void;
  /** Kept for views that want the moment on the pass itself. */
  confirmationLabel?: string;
  copy: VerticalCopy;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang];
  const isCancelled = booking.status === "cancelled";
  const hasWhere = addresses.length > 0 || providerPhones.length > 0 || Boolean(providerEmail);
  const hasProse = Boolean(description || notes || clientNotes);
  const headline = cn(
    "text-[19px] font-semibold leading-[1.15] tracking-[-0.03em] lg:text-[28px] lg:tracking-[-0.035em]",
    isCancelled ? "text-[var(--muted)] line-through" : "text-[var(--ink)]",
  );

  return (
    <article
      aria-label={t.publicFlow.passEyebrow}
      className="overflow-hidden rounded-[26px] bg-[var(--surface-lowest)] shadow-[0_24px_54px_rgba(15,23,42,0.10)] ring-1 ring-[rgba(15,23,42,0.06)] lg:rounded-[30px] lg:shadow-[0_30px_70px_rgba(15,23,42,0.10)]"
    >
      <div
        aria-hidden="true"
        className={cn(
          "h-[5px] w-full lg:h-1.5",
          isCancelled
            ? "bg-[#e11d48]"
            : "bg-[linear-gradient(90deg,var(--accent-strong),var(--accent)_45%,var(--action-teal))]",
        )}
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* On a phone this wrapper dissolves so the stub can sit between the
            moment and the fields; from lg it is the pass's left column. */}
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-[26px] lg:p-8">
          <div className="order-1 flex items-start justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-8 lg:p-0">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="break-words text-base font-semibold tracking-[-0.02em] text-[var(--ink)] lg:text-lg">
                {providerName}
              </p>
              <p className={cn("break-words", refinedLabel)}>{serviceName}</p>
              {confirmationLabel ? (
                <p
                  className={cn(
                    "mt-1 self-start rounded-full px-2.5 py-1 font-semibold [font-family:var(--font-plex-mono)] text-[0.625rem] uppercase tracking-[0.14em]",
                    isCancelled
                      ? "bg-[#fff1f2] text-[#be123c]"
                      : "bg-[rgba(0,191,165,0.12)] text-[var(--action-teal-deep)]",
                  )}
                >
                  {confirmationLabel}
                </p>
              ) : null}
            </div>
            {typeBadge ? (
              <span
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em]",
                  typeBadge.tone === "primary"
                    ? "bg-[#dfe8fb] text-[#0b57d0]"
                    : "bg-[#eef0f3] text-[#3c4043]",
                )}
              >
                {typeBadge.label}
              </span>
            ) : null}
          </div>

          <div className="order-2 mx-5 mt-[18px] grid grid-cols-2 gap-3.5 rounded-2xl bg-[var(--summary-surface)] p-4 sm:mx-8 lg:mx-0 lg:mt-0 lg:gap-5 lg:rounded-[20px] lg:px-6 lg:py-[22px]">
            <RefinedCell label={t.publicFlow.passDate}>
              <p className={headline}>
                {dateLabelCompact ? (
                  <>
                    <span className="lg:hidden">{dateLabelCompact}</span>
                    <span className="hidden lg:inline">{dateLabel}</span>
                  </>
                ) : (
                  dateLabel
                )}
              </p>
            </RefinedCell>
            <RefinedCell label={isFullDay ? t.publicFlow.when : t.publicFlow.passTime}>
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
                <p className={cn("whitespace-nowrap", headline)}>
                  {isFullDay ? t.publicFlow.fullDay : timeLabel}
                </p>
                {!isFullDay && durationLabel ? (
                  <span
                    className={cn(
                      "rounded-full bg-white px-2.5 py-1 uppercase text-[var(--ink)]",
                      microLabel,
                    )}
                  >
                    {durationLabel}
                  </span>
                ) : null}
              </div>
            </RefinedCell>
          </div>

          <div className="order-4 flex flex-col gap-4 p-5 sm:p-8 lg:gap-[26px] lg:p-0">
            <div className="grid gap-x-6 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))] lg:gap-y-[22px]">
              <RefinedCell label={clientFieldLabel}>
                <p className="break-words text-[15px] font-semibold text-[var(--ink)]">
                  {booking.clientName || "—"}
                </p>
                {booking.clientEmail || booking.clientPhone ? (
                  <p className="break-all text-sm leading-[1.5] text-[#3c4043]">
                    {booking.clientEmail}
                    {booking.clientEmail && booking.clientPhone ? <br /> : null}
                    {booking.clientPhone}
                  </p>
                ) : null}
              </RefinedCell>
              {hasWhere ? (
                <RefinedCell label={t.publicFlow.where}>
                  {addresses.map((address) => (
                    <p key={address} className="break-words text-[15px] font-medium leading-[1.45] text-[var(--ink)]">
                      {address}
                    </p>
                  ))}
                  {providerPhones.map((phone) => (
                    <a
                      key={phone}
                      href={telHref(phone)}
                      className="text-sm font-medium text-[var(--primary)]"
                    >
                      {phone}
                    </a>
                  ))}
                  {providerEmail ? (
                    <a
                      href={`mailto:${providerEmail}`}
                      className="break-all text-sm font-medium text-[var(--primary)]"
                    >
                      {providerEmail}
                    </a>
                  ) : null}
                </RefinedCell>
              ) : null}
              {category ? (
                <RefinedCell label={category.label}>
                  <p className="break-words text-[15px] font-medium text-[var(--ink)]">
                    {category.value}
                  </p>
                </RefinedCell>
              ) : null}
            </div>

            {hasProse ? (
              <div className={cn("grid gap-x-6 gap-y-4 pt-4 sm:grid-cols-2 lg:pt-[22px]", dottedRule)}>
                {description ? (
                  <RefinedCell label={t.publicFlow.passAbout}>
                    <p className="text-sm leading-[1.6] text-[#3c4043]">{description}</p>
                  </RefinedCell>
                ) : null}
                {notes ? (
                  <RefinedCell label={bringLabel}>
                    <p className="whitespace-pre-line text-sm leading-[1.6] text-[#3c4043]">
                      {notes}
                    </p>
                  </RefinedCell>
                ) : null}
                {clientNotes ? (
                  <RefinedCell label={clientNotes.label} className="sm:col-span-2">
                    <p className="whitespace-pre-line text-sm leading-[1.6] text-[#3c4043]">
                      {clientNotes.value}
                    </p>
                  </RefinedCell>
                ) : null}
              </div>
            ) : null}

            {costLabel ? (
              <div
                className={cn(
                  "flex items-baseline justify-between gap-4 pt-3.5 lg:pt-5",
                  dottedRule,
                )}
              >
                <p className={refinedLabel}>{t.publicFlow.total}</p>
                <p
                  className={cn(
                    "break-words text-right font-bold tracking-[-0.03em] text-[var(--ink)]",
                    costLabel.length > 10 ? "text-xl" : "text-2xl lg:text-[30px]",
                  )}
                >
                  {costLabel}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Tear-off stub ─────────────────────────────────────── */}
        <div className="haab-pass-stub order-3 mt-5 border-y-2 border-dashed border-[rgba(15,23,42,0.16)] bg-[#f3f4f6] p-5 lg:order-none lg:mt-0 lg:border-y-0 lg:border-l-2 lg:p-8">
          <p className="[grid-area:title] text-sm font-semibold text-[var(--ink)]">
            {t.publicFlow.passShowAtCheckIn}
          </p>

          {isCancelled ? (
            <p
              aria-hidden="true"
              className="[grid-area:qr] max-w-full rotate-[-8deg] justify-self-center rounded-lg border-[3px] border-[#be123c] px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#be123c] opacity-80 lg:my-6 lg:px-4 lg:py-2 lg:text-lg lg:tracking-[0.14em]"
            >
              {t.publicFlow.statusCancelled}
            </p>
          ) : (
            <button
              type="button"
              onClick={onOpenQr}
              aria-label={copy.phrases.calendarQrLabel}
              className="[grid-area:qr] flex aspect-square w-full max-w-[120px] items-center justify-center overflow-hidden rounded-2xl bg-white p-[9px] shadow-[0_6px_16px_rgba(15,23,42,0.08)] transition hover:ring-2 hover:ring-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:max-w-[176px] lg:rounded-[20px] lg:p-3 lg:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            >
              {qrDataUrl ? (
                <span
                  className="h-full w-full bg-contain bg-center bg-no-repeat"
                  role="img"
                  aria-label={copy.phrases.calendarQrLabel}
                  style={{ backgroundImage: `url(${qrDataUrl})` }}
                />
              ) : (
                <span className="px-2 text-center text-xs leading-5 text-[var(--muted)]">
                  {qrError || t.manage.preparingQr}
                </span>
              )}
            </button>
          )}

          {admitLabel ? (
            <span
              className={cn(
                "[grid-area:pill] self-start rounded-full bg-white px-2.5 py-1 uppercase text-[#3c4043] lg:self-auto lg:px-3 lg:py-[5px]",
                microLabel,
              )}
            >
              {admitLabel}
            </span>
          ) : null}

          <div className="[grid-area:meta] grid w-full grid-cols-1 gap-2.5 text-left lg:grid-cols-2 lg:pt-1 lg:text-center">
            <div className="flex flex-col gap-1">
              <p className={refinedLabel}>{t.publicFlow.receiptReference}</p>
              <p className={cn("uppercase", monoValue)}>{reference}</p>
            </div>
            <div className="hidden flex-col gap-1 lg:flex">
              <p className={refinedLabel}>{t.publicFlow.receiptIssued}</p>
              <p className={monoValue}>{issuedLabel}</p>
            </div>
          </div>

          {!isCancelled ? (
            <button
              type="button"
              onClick={onDownloadIcs}
              className="[grid-area:ics] mt-1 hidden h-[46px] w-full items-center justify-center rounded-full border border-[#cfd5df] bg-white px-4 !text-sm !font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:inline-flex"
            >
              {t.publicFlow.passDownloadIcs}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
