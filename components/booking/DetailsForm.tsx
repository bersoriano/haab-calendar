import { useId } from "react";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { todayKey } from "@/lib/date";
import { EARLIEST_DATE_OF_BIRTH } from "@/lib/date-of-birth";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

export type DetailsField =
  | "clientName"
  | "clientEmail"
  | "clientPhone"
  | "partySize"
  | "dateOfBirth"
  | "notes";

// 16px on a phone because anything smaller makes iOS zoom the page on focus.
// The size is `!` because globals.css resets `font` on inputs outside any layer,
// which outranks every layered utility.
// The focus state is a 2px accent edge (border + a 1px ring, so nothing shifts)
// and a 4px soft halo.
const inputClass =
  "w-full rounded-[15px] border border-[#cfd5df] bg-white px-4 !text-[16px] text-[var(--ink)] outline-none transition placeholder:text-[#8a9097] focus:border-[var(--accent)] focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_rgba(26,115,232,0.14)] aria-[invalid=true]:border-[var(--danger-strong)] sm:rounded-2xl sm:!text-[15px]";
const labelClass = "text-[13px] font-semibold text-[#3c4043]";

/**
 * The "Your details" card. Controlled by the caller: nothing here holds state,
 * validates, or decides what a missing field means. `invalidRequired` only
 * paints the empty required fields once confirming has already said so, and
 * `complete` paints the whole card green once nothing required is left.
 */
export function DetailsForm({
  values,
  onChange,
  showPartySize,
  showDateOfBirth,
  invalidRequired,
  complete,
  errorId,
  copy,
  lang,
}: {
  values: Record<DetailsField, string>;
  onChange: (field: DetailsField, value: string) => void;
  /** Services that seat a number of guests ask for one. */
  showPartySize: boolean;
  /** Only healthcare asks for a date of birth. */
  showDateOfBirth: boolean;
  /** Confirming was refused for empty required fields. */
  invalidRequired: boolean;
  /** Every required field is filled: the card turns green and says so. */
  complete: boolean;
  /** The alert that explains it, so the fields can point at it. */
  errorId: string;
  copy: VerticalCopy;
  lang: Lang;
}) {
  const t = bookingTranslations[lang];
  const id = useId();
  const fieldId = (field: DetailsField) => `${id}-${field}`;
  const invalid = (field: DetailsField, required = true) =>
    invalidRequired && required && !values[field].trim() ? true : undefined;
  const describedBy = (field: DetailsField, required = true) =>
    invalid(field, required) ? errorId : undefined;

  return (
    <section
      data-complete={complete || undefined}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-3xl px-[18px] py-5 shadow-[0_14px_34px_rgba(25,28,29,0.06)] transition-[background-color,box-shadow] duration-300 sm:gap-5 sm:rounded-[30px] sm:p-7 sm:shadow-[0_18px_42px_rgba(25,28,29,0.06)]",
        complete
          ? "bg-[var(--callout-mint)] ring-2 ring-[var(--action-teal)]"
          : "bg-[var(--panel-tint-94)] ring-1 ring-[rgba(255,255,255,0.7)]",
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink)] sm:text-[22px]">
            {t.publicFlow.myDetails}
          </h2>
          {/* Said in words too, so the state never rests on colour alone. The
              live region stays mounted so the change is announced. */}
          <span role="status" className="shrink-0">
            {complete ? (
              <span className="flex items-center gap-1.5 rounded-full bg-[var(--action-teal-deep)] py-1 pl-1.5 pr-2.5 text-xs font-semibold text-white">
                <svg
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 7 9 18l-5-5" />
                </svg>
                {t.publicFlow.detailsComplete}
              </span>
            ) : null}
          </span>
        </div>
        <p className="text-[13.5px] text-[var(--muted)] sm:text-sm">
          {t.publicFlow.detailsReassurance}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId("clientName")} className={labelClass}>
          {t.publicFlow.fullName}
        </label>
        <input
          id={fieldId("clientName")}
          value={values.clientName}
          onChange={(event) => onChange("clientName", event.target.value)}
          placeholder={t.publicFlow.namePlaceholder}
          autoComplete="name"
          enterKeyHint="next"
          aria-invalid={invalid("clientName")}
          aria-describedby={describedBy("clientName")}
          className={cn(inputClass, "h-[50px]")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-3.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={fieldId("clientPhone")} className={labelClass}>
            {t.publicFlow.phoneNumber}
          </label>
          <input
            id={fieldId("clientPhone")}
            value={values.clientPhone}
            onChange={(event) => onChange("clientPhone", event.target.value)}
            placeholder={t.publicFlow.phonePlaceholder}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="next"
            aria-invalid={invalid("clientPhone")}
            aria-describedby={describedBy("clientPhone")}
            className={cn(inputClass, "h-[50px]")}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={fieldId("clientEmail")} className={labelClass}>
            {t.publicFlow.email}
          </label>
          <input
            id={fieldId("clientEmail")}
            value={values.clientEmail}
            onChange={(event) => onChange("clientEmail", event.target.value)}
            placeholder={t.publicFlow.emailPlaceholder}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            aria-invalid={invalid("clientEmail")}
            aria-describedby={describedBy("clientEmail")}
            className={cn(inputClass, "h-[50px]")}
          />
        </div>
      </div>

      {showDateOfBirth ? (
        <div className="flex flex-col gap-1.5 sm:w-[calc(50%-0.4375rem)]">
          <label htmlFor={fieldId("dateOfBirth")} className={labelClass}>
            {t.publicFlow.dateOfBirth}{" "}
            <span className="font-normal text-[var(--muted)]">{t.publicFlow.optionalSuffix}</span>
          </label>
          <input
            id={fieldId("dateOfBirth")}
            type="date"
            value={values.dateOfBirth}
            onChange={(event) => onChange("dateOfBirth", event.target.value)}
            min={EARLIEST_DATE_OF_BIRTH}
            max={todayKey()}
            autoComplete="bday"
            enterKeyHint="next"
            className={cn(inputClass, "h-[50px]")}
          />
        </div>
      ) : null}

      {showPartySize ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId("partySize")} className={labelClass}>
            {t.admin.partySizeLabel}
          </label>
          <input
            id={fieldId("partySize")}
            value={values.partySize}
            // Digits only, as before: the value is a count of seats.
            onChange={(event) =>
              onChange("partySize", event.target.value.replace(/[^0-9]/g, ""))
            }
            inputMode="numeric"
            placeholder={t.admin.partySizePlaceholder}
            className={cn(inputClass, "h-[50px]")}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId("notes")} className={labelClass}>
          {t.publicFlow.notes}{" "}
          <span className="font-normal text-[var(--muted)]">{t.publicFlow.optionalSuffix}</span>
        </label>
        <textarea
          id={fieldId("notes")}
          value={values.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          placeholder={copy.phrases.notesPlaceholder}
          rows={3}
          className={cn(inputClass, "resize-y py-3.5")}
        />
      </div>
    </section>
  );
}
