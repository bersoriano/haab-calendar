import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/types";
import { bookingTranslations } from "@/components/booking/i18n/translations";

export function PublicProgressIndicator({
  currentStep,
  isDedicatedPublicPage,
  lang = "en",
  compact = false,
  onStepSelect,
}: {
  currentStep: 2 | 3 | 4;
  isDedicatedPublicPage: boolean;
  lang?: Lang;
  /** Slim single-line form, so progress stays on screen once the header sticks. */
  compact?: boolean;
  /**
   * Called when a finished step is tapped. Going back is a normal thing to
   * want, and the indicator is where people reach for it. Omitted once the
   * booking exists, where there is nothing to go back to.
   */
  onStepSelect?: (step: 2 | 3) => void;
}) {
  const t = bookingTranslations[lang];
  const steps = [
    { key: 2 as const, label: t.publicFlow.dateAndTime },
    { key: 3 as const, label: t.publicFlow.myDetails },
    { key: 4 as const, label: t.publicFlow.confirm },
  ];

  if (compact) {
    const activeIndex = steps.findIndex((step) => step.key === currentStep);
    const current = steps[activeIndex] ?? steps[0];

    return (
      <nav aria-label={t.publicFlow.progressLabel} className="flex items-center gap-3">
        <ol className="flex items-center gap-1.5" role="list">
          {steps.map((step, index) => {
            const done = currentStep === 4 || step.key < currentStep;
            const isCurrent = step.key === currentStep;

            return (
              <li
                key={step.key}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  isCurrent ? "w-7 bg-[var(--primary)]" : "w-4",
                  !isCurrent && done && "bg-[var(--primary)] opacity-55",
                  !isCurrent &&
                    !done &&
                    (isDedicatedPublicPage ? "bg-[rgba(193,198,214,0.6)]" : "bg-[var(--line)]"),
                )}
              >
                <span className="sr-only">
                  {done
                    ? t.publicFlow.completedPrefix
                    : isCurrent
                      ? t.publicFlow.currentStepPrefix
                      : t.publicFlow.upcomingPrefix}
                  {steps[index].label}
                </span>
              </li>
            );
          })}
        </ol>
        <span className="truncate text-[0.8125rem] font-semibold text-[var(--ink)]">
          {current.label}
        </span>
        <span className="ml-auto shrink-0 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] tabular-nums">
          {Math.max(1, activeIndex + 1)}/{steps.length}
        </span>
      </nav>
    );
  }

  return (
    <nav aria-label={t.publicFlow.progressLabel}>
      <ol className="flex items-start" role="list">
        {steps.map((step, index) => {
          const isFinished = currentStep === 4;
          const status = isFinished
            ? "complete"
            : step.key < currentStep
              ? "complete"
              : step.key === currentStep
                ? "current"
                : "upcoming";
          const isLast = index === steps.length - 1;
          const connectorActive = isFinished || step.key < currentStep;

          const canGoBack =
            status === "complete" && !isFinished && Boolean(onStepSelect);
          const Marker = canGoBack ? "button" : "div";

          return (
            <li
              key={step.key}
              className={cn("flex items-start", isLast ? "shrink-0" : "flex-1")}
              aria-current={status === "current" ? "step" : undefined}
            >
              <Marker
                {...(canGoBack
                  ? {
                      type: "button" as const,
                      onClick: () => onStepSelect?.(step.key as 2 | 3),
                      "aria-label": `${t.publicFlow.completedPrefix}${step.label}`,
                    }
                  : {})}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-2",
                  canGoBack && "cursor-pointer rounded-2xl transition hover:opacity-80",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300",
                    status === "complete" &&
                      "bg-[var(--primary)] text-white shadow-[0_10px_22px_rgba(0,91,191,0.32),inset_0_1px_0_rgba(255,255,255,0.4)]",
                    status === "current" &&
                      "bg-white text-[var(--primary)] ring-2 ring-[var(--primary)] shadow-[0_10px_24px_rgba(26,115,232,0.28),inset_0_1px_0_rgba(255,255,255,0.95)]",
                    status === "upcoming" &&
                      (isDedicatedPublicPage
                        ? "bg-[rgba(255,255,255,0.55)] text-[var(--muted)] ring-1 ring-[rgba(193,198,214,0.5)]"
                        : "bg-[var(--surface-soft)] text-[var(--muted)] ring-1 ring-[var(--line)]"),
                  )}
                >
                  {status === "complete" ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 7 9 18l-5-5" />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                  {status === "current" ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1 rounded-full ring-4 ring-[rgba(26,115,232,0.18)]"
                    />
                  ) : null}
                </span>
                <span
                  className={cn(
                    // Narrow screens still wrap — three nowrap labels would not
                    // fit — but from sm up each step name reads as one line.
                    "max-w-[4.25rem] text-center text-[0.6875rem] font-semibold uppercase tracking-[0.12em] leading-tight transition-colors sm:max-w-none sm:whitespace-nowrap sm:text-[0.8125rem]",
                    status === "complete" && "text-[var(--ink)]",
                    status === "current" && "text-[var(--primary)]",
                    status === "upcoming" && "text-[var(--muted)]",
                  )}
                >
                  <span className="sr-only">
                    {status === "complete"
                      ? t.publicFlow.completedPrefix
                      : status === "current"
                        ? t.publicFlow.currentStepPrefix
                        : t.publicFlow.upcomingPrefix}
                  </span>
                  {step.label}
                </span>
              </Marker>
              {!isLast ? (
                <div
                  aria-hidden="true"
                  className="mx-2 mt-[17px] h-[2px] flex-1 sm:mx-3"
                >
                  <div
                    className={cn(
                      "h-full w-full rounded-full transition-colors duration-500",
                      connectorActive
                        ? "bg-[var(--primary)]"
                        : isDedicatedPublicPage
                          ? "bg-[rgba(193,198,214,0.45)]"
                          : "bg-[var(--line)]",
                    )}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
