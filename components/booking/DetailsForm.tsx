import { useId } from "react";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { VerticalCopy } from "@/lib/vertical-copy";

export type DetailsField =
  | "clientName"
  | "clientEmail"
  | "clientPhone"
  | "partySize"
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
 * paints the empty required fields once confirming has already said so.
 */
export function DetailsForm({
  values,
  onChange,
  showPartySize,
  invalidRequired,
  errorId,
  copy,
  lang,
}: {
  values: Record<DetailsField, string>;
  onChange: (field: DetailsField, value: string) => void;
  /** Services that seat a number of guests ask for one. */
  showPartySize: boolean;
  /** Confirming was refused for empty required fields. */
  invalidRequired: boolean;
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
    <section className="flex min-w-0 flex-col gap-4 rounded-3xl bg-[var(--panel-tint-94)] px-[18px] py-5 ring-1 ring-[rgba(255,255,255,0.7)] shadow-[0_14px_34px_rgba(25,28,29,0.06)] sm:gap-5 sm:rounded-[30px] sm:p-7 sm:shadow-[0_18px_42px_rgba(25,28,29,0.06)]">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink)] sm:text-[22px]">
          {t.publicFlow.myDetails}
        </h2>
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
