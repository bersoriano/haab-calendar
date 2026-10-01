import { useId } from "react";

import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import type { Lang, Service } from "@/lib/types";
import type { VerticalCopy } from "@/lib/vertical-copy";

// Same field as the details form: 16px on a phone so iOS does not zoom on
// focus, `!` because globals.css resets `font` on form controls outside any layer.
const selectClass =
  "h-[50px] w-full appearance-none rounded-[15px] border border-[#cfd5df] bg-white pl-4 pr-11 !text-[16px] text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_rgba(26,115,232,0.14)] disabled:cursor-wait disabled:opacity-60 sm:rounded-2xl sm:!text-[15px]";

/**
 * "Selected service" on the details step: the service picked on step 1, in a
 * select so it can be changed without walking back through the flow. What a
 * change does to the held slot is the caller's to decide.
 */
export function ServicePicker({
  services,
  value,
  onChange,
  disabled,
  copy,
  lang,
}: {
  services: Service[];
  value: string;
  onChange: (serviceId: string) => void;
  /** A change is already being held for. */
  disabled: boolean;
  copy: VerticalCopy;
  lang: Lang;
}) {
  const t = bookingTranslations[lang];
  const id = useId();
  const words = { service: copy.service, Service: copy.Service };

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-3xl bg-[var(--panel-tint-94)] px-[18px] py-5 ring-1 ring-[rgba(255,255,255,0.7)] shadow-[0_14px_34px_rgba(25,28,29,0.06)] sm:gap-5 sm:rounded-[30px] sm:p-7 sm:shadow-[0_18px_42px_rgba(25,28,29,0.06)]">
      <div className="flex flex-col gap-1">
        <h2
          id={`${id}-title`}
          className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink)] sm:text-[22px]"
        >
          {fillTemplate(t.publicFlow.selectedServiceTitle, words)}
        </h2>
        <p id={`${id}-hint`} className="text-[13.5px] text-[var(--muted)] sm:text-sm">
          {fillTemplate(t.publicFlow.selectedServiceHint, words)}
        </p>
      </div>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-hint`}
          className={selectClass}
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.cost?.trim() ? `${service.name} · ${service.cost.trim()}` : service.name}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5f6368"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </section>
  );
}
