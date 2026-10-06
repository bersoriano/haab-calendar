import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The panel above the service list on the dedicated page: where this step sits
 * in the journey, then what to do. Wide screens get the four steps as pills;
 * a phone has no room for labels, so it gets a four-segment bar and the
 * current step's name in the eyebrow.
 */
export function ServiceStepIntro({
  title,
  body,
  serviceLabel,
  lang,
}: {
  title: string;
  body: string;
  /** The vertical's noun for step one ("Service", "Event", "Space"). */
  serviceLabel: string;
  lang: Lang;
}) {
  const t = bookingTranslations[lang];
  const steps = [
    serviceLabel,
    t.publicFlow.dateAndTime,
    t.publicFlow.myDetails,
    t.publicFlow.confirm,
  ];
  const eyebrow = t.publicFlow.stepOfTotal.replace("{n}", "1").replace("{total}", "4");

  return (
    <div className="relative isolate flex flex-col justify-between gap-8 overflow-hidden rounded-[28px] bg-[var(--panel-glass-62)] px-5 py-5 ring-1 ring-[rgba(255,255,255,0.86)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_22px_56px_rgba(15,23,42,0.10)] backdrop-blur-[22px] sm:px-8 sm:py-[30px] lg:flex-row lg:items-end">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_center,rgba(26,115,232,0.28),transparent_65%)] blur-2xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-[-3rem] h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(104,250,221,0.32),transparent_65%)] blur-2xl"
      />

      <div className="relative flex min-w-0 flex-col gap-2.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent-strong)] [font-family:var(--font-plex-mono)] sm:text-[11.5px]">
          {eyebrow}
          <span className="lg:hidden"> · {serviceLabel}</span>
        </p>

        <div aria-hidden="true" className="grid grid-cols-4 gap-1 lg:hidden">
          {steps.map((step, index) => (
            <span
              key={step}
              className={cn(
                "h-1 rounded-full",
                index === 0 ? "bg-[var(--primary)]" : "bg-[rgba(255,255,255,0.9)]",
              )}
            />
          ))}
        </div>

        <h2 className="mt-1 text-[25px] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--ink)] sm:text-[30px] sm:leading-[1.1] lg:mt-0">
          {title}
        </h2>
        <p className="max-w-[520px] text-sm leading-[1.5] text-[var(--muted)] sm:text-[15px] sm:leading-[1.55]">
          {body}
        </p>
      </div>

      <ol
        aria-label={t.publicFlow.progressLabel}
        className="relative m-0 hidden shrink-0 list-none items-center gap-2 whitespace-nowrap p-0 text-[13px] font-semibold lg:flex"
      >
        {steps.flatMap((step, index) => {
          const current = index === 0;
          const pill = (
            <li
              key={step}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-[7px]",
                current
                  ? "bg-[var(--primary)] text-[var(--on-primary)]"
                  : "bg-[rgba(255,255,255,0.75)] text-[var(--muted)]",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px]",
                  current ? "bg-[rgba(255,255,255,0.25)]" : "bg-[var(--surface-highest)]",
                )}
              >
                {index + 1}
              </span>
              {step}
            </li>
          );

          return index === 0
            ? [pill]
            : [
                <li
                  key={`${step}-connector`}
                  aria-hidden="true"
                  className="h-0.5 w-4 bg-[rgba(95,99,104,0.3)]"
                />,
                pill,
              ];
        })}
      </ol>
    </div>
  );
}
