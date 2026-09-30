import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import type { DateTile, SummaryRow } from "@/lib/details-summary";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The live summary on the details step. Two shapes of one thing: the receipt-like
 * card that rides beside the form on wide screens, and the compact card that
 * leads the page on a phone. Neither owns state; the caller hands over what to
 * show and what each button does.
 */

export type SummaryDate = {
  tile: DateTile | null;
  /** "Thursday, October 1, 2026" */
  label: string;
  /** "9:00 – 9:30 AM · 30 min", "Full day", or an event's window. */
  timeLine: string;
  /** The same without the length, for the phone's narrow card. */
  timeShort: string;
};

export type SummaryFooter = {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled: boolean;
  isExpired: boolean;
  /** "Held for you · 9:57 left"; null once the hold is gone. */
  heldText: string | null;
  error: string | null;
  errorId: string;
  chooseAnotherLabel: string;
  onChooseAnother: () => void;
};

const eyebrowClass =
  "text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] [font-family:var(--font-plex-mono)]";
const livery = "bg-[linear-gradient(90deg,#005bbf,#1a73e8_45%,#00bfa5)]";
// `!` on the button type: globals.css resets `font` on buttons outside any
// layer, which outranks layered utilities.
const primaryButtonClass =
  "inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] px-6 !text-[16px] !font-semibold text-white shadow-[0_14px_30px_rgba(26,115,232,0.28)] transition hover:saturate-125 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * A price is free text: "$95" earns 30px, but "฿1,400 / attendee" or
 * "Menú de temporada 48 €" at 30px would push the label off the row.
 */
const isLongCost = (cost: string) => cost.length > 10;

function DateTileBox({ tile, small = false }: { tile: DateTile; small?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "shrink-0 overflow-hidden rounded-[14px] bg-white text-center shadow-[0_4px_12px_rgba(15,23,42,0.08)]",
        small ? "w-14" : "w-[60px]",
      )}
    >
      <div className="bg-[#0b57d0] py-1 text-[11px] font-bold tracking-[0.1em] text-white">
        {tile.month}
      </div>
      <div
        className={cn(
          "pt-0.5 font-bold leading-[1.2] text-[var(--ink)]",
          small ? "text-[22px]" : "text-2xl",
        )}
      >
        {tile.day}
      </div>
      <div className="pb-1 text-[10.5px] font-semibold text-[var(--muted)]">{tile.weekday}</div>
    </div>
  );
}

function ChangeLink({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "self-start text-left !font-semibold text-[#0b57d0] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        className,
      )}
    >
      {label}
    </button>
  );
}

/** Says why confirming was refused, where the eye already is: above the button. */
export function BookingErrorAlert({
  id,
  message,
  className,
}: {
  id: string;
  message: string;
  className?: string;
}) {
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "rounded-2xl border border-[var(--danger-line)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium leading-5 text-[var(--danger-strong)]",
        className,
      )}
    >
      {message}
    </p>
  );
}

function StatusIcon({ status }: { status: SummaryRow["status"] }) {
  if (status === "filled") {
    return (
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--action-teal)] text-white"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 7 9 18l-5-5" />
        </svg>
      </span>
    );
  }

  return status === "missing" ? (
    <span
      aria-hidden="true"
      className="h-5 w-5 shrink-0 rounded-full border-2 border-dashed border-[#b4bac4]"
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef0f3] text-xs font-bold text-[#8a9097]"
    >
      –
    </span>
  );
}

export function AppointmentSummary({
  title,
  serviceName,
  meta,
  date,
  changeLabel,
  onChangeDateTime,
  clientTitle,
  rows,
  cost,
  footer,
  lang,
}: {
  title: string;
  serviceName: string;
  /** "{specialty} · {provider}", already joined; empty parts are the caller's to drop. */
  meta: string;
  date: SummaryDate | null;
  changeLabel: string;
  /** Null when there is no date to change (a fixed-date event). */
  onChangeDateTime: (() => void) | null;
  /** The vertical's word for the person: Patient, Guest, Attendee. */
  clientTitle: string;
  rows: SummaryRow[];
  /** Null hides the Total row entirely. */
  cost: string | null;
  footer: SummaryFooter;
  lang: Lang;
}) {
  const t = bookingTranslations[lang];

  return (
    <aside
      aria-label={title}
      className="relative hidden flex-col overflow-y-auto overflow-x-hidden rounded-[30px] bg-white shadow-[0_30px_70px_rgba(15,23,42,0.12)] ring-1 ring-[rgba(255,255,255,0.9)] lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100dvh-2rem)]"
    >
      <div aria-hidden="true" className={cn("h-1.5 shrink-0", livery)} />
      <div className="flex flex-col gap-[18px] px-[26px] pt-[26px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">{title}</h2>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--action-teal-deep)]">
            <span
              aria-hidden="true"
              className="haab-live-dot h-[7px] w-[7px] rounded-full bg-[var(--action-teal)] shadow-[0_0_0_3px_rgba(0,191,165,0.2)]"
            />
            {t.publicFlow.summaryLive}
          </span>
        </div>

        {date ? (
          <div className="flex items-center gap-3.5 rounded-[18px] bg-[var(--summary-surface)] p-3.5">
            {date.tile ? <DateTileBox tile={date.tile} /> : null}
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="text-[15.5px] font-semibold text-[var(--ink)]">{date.label}</span>
              {date.timeLine ? (
                <span className="text-sm text-[#3c4043]">{date.timeLine}</span>
              ) : null}
              {onChangeDateTime ? (
                <ChangeLink
                  label={changeLabel}
                  onClick={onChangeDateTime}
                  className="mt-0.5 !text-[13.5px]"
                />
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-0.5">
          <span className="break-words text-[15px] font-semibold text-[var(--ink)]">{serviceName}</span>
          {meta ? <span className="break-words text-[13.5px] text-[var(--muted)]">{meta}</span> : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-dashed border-[#d3d8e0] pt-4">
          <span className={eyebrowClass}>{clientTitle}</span>
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-2.5">
              <StatusIcon status={row.status} />
              <span
                className={cn(
                  "min-w-0 break-words text-[14.5px]",
                  row.status === "filled"
                    ? "line-clamp-2 font-medium text-[var(--ink)]"
                    : "text-[var(--muted)]",
                )}
              >
                {row.status === "filled"
                  ? row.value
                  : row.status === "missing"
                    ? fillTemplate(t.publicFlow.summaryAddField, {
                        field: row.label.toLocaleLowerCase(lang),
                      })
                    : t.publicFlow.summaryNoNotes}
              </span>
            </div>
          ))}
        </div>

        {cost ? (
          <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-[#d3d8e0] pt-4">
            <span className="text-sm font-semibold text-[#3c4043]">{t.publicFlow.total}</span>
            <span
              className={cn(
                "break-words text-right font-bold leading-tight tracking-[-0.03em] text-[var(--ink)]",
                isLongCost(cost) ? "text-xl" : "text-[30px]",
              )}
            >
              {cost}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-[22px] flex flex-col gap-2.5 border-t border-[#e8ebf0] bg-[#f6f8fb] px-[26px] pb-6 pt-5">
        {footer.error ? <BookingErrorAlert id={footer.errorId} message={footer.error} /> : null}
        <button
          type="button"
          disabled={footer.primaryDisabled}
          onClick={footer.onPrimary}
          className={cn(primaryButtonClass, "h-[54px]")}
        >
          {footer.primaryLabel}
        </button>
        {footer.isExpired ? (
          <button
            type="button"
            onClick={footer.onChooseAnother}
            className="mx-auto min-h-11 rounded-full px-4 !text-sm !font-semibold text-[#0b57d0] hover:underline"
          >
            {footer.chooseAnotherLabel}
          </button>
        ) : footer.heldText ? (
          <p className="flex items-center justify-center gap-1.5 text-[13px] text-[var(--muted)]">
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00796b"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {footer.heldText}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

/** The phone's version: what you are booking, on one card, before the form. */
export function CompactAppointmentSummary({
  title,
  serviceName,
  date,
  changeLabel,
  onChangeDateTime,
  cost,
}: {
  title: string;
  serviceName: string;
  date: SummaryDate | null;
  changeLabel: string;
  onChangeDateTime: (() => void) | null;
  cost: string | null;
}) {
  return (
    <section
      aria-label={title}
      className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.10)] lg:hidden"
    >
      <div aria-hidden="true" className={cn("h-[5px]", livery)} />
      <div className="flex items-center gap-3.5 p-4">
        {date?.tile ? <DateTileBox tile={date.tile} small /> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {date ? (
            <span className="text-[15px] font-semibold text-[var(--ink)]">
              {date.timeShort || date.label}
            </span>
          ) : null}
          <span className="break-words text-[13.5px] text-[#3c4043]">{serviceName}</span>
          {onChangeDateTime ? (
            <ChangeLink
              label={changeLabel}
              onClick={onChangeDateTime}
              className="min-h-6 !text-[13px]"
            />
          ) : null}
        </div>
        {cost ? (
          <span
            className={cn(
              "max-w-[40%] shrink-0 break-words text-right font-bold leading-tight tracking-[-0.03em] text-[var(--ink)]",
              isLongCost(cost) ? "text-base" : "text-[22px]",
            )}
          >
            {cost}
          </span>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The phone's action bar. It sits last in the flow and sticks to the bottom of
 * the screen, so nothing is ever hidden behind it, and leaves room for the home
 * indicator. The hold's countdown rides here too: the keyboard covers the hold
 * panel the moment a field is tapped, which is when the visitor wants to know
 * the time is still theirs.
 */
export function MobileConfirmBar({
  total,
  totalLabel,
  footer,
}: {
  total: string | null;
  totalLabel: string;
  footer: SummaryFooter;
}) {
  return (
    <div className="sticky bottom-0 z-30 flex flex-col gap-2 border-t border-[rgba(193,198,214,0.5)] bg-[rgba(248,249,250,0.94)] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-[18px] lg:hidden">
      {footer.error ? <BookingErrorAlert id={footer.errorId} message={footer.error} /> : null}
      {footer.isExpired ? (
        <button
          type="button"
          onClick={footer.onChooseAnother}
          className="min-h-11 self-center rounded-full px-4 !text-sm !font-semibold text-[#0b57d0]"
        >
          {footer.chooseAnotherLabel}
        </button>
      ) : footer.heldText ? (
        <p className="text-center text-xs text-[var(--muted)]">{footer.heldText}</p>
      ) : null}
      <div className="flex items-center gap-3.5">
        {total ? (
          <div className="flex max-w-[45%] shrink-0 flex-col">
            <span className="text-xs text-[var(--muted)]">{totalLabel}</span>
            <span
              className={cn(
                "break-words font-bold leading-tight tracking-[-0.03em] text-[var(--ink)]",
                isLongCost(total) ? "text-base" : "text-[22px]",
              )}
            >
              {total}
            </span>
          </div>
        ) : null}
        <button
          type="button"
          disabled={footer.primaryDisabled}
          onClick={footer.onPrimary}
          className={cn(primaryButtonClass, "h-[52px] flex-1")}
        >
          {footer.primaryLabel}
        </button>
      </div>
    </div>
  );
}
