import { cn } from "@/lib/utils";

export function PublicProgressIndicator({
  currentStep,
  isDedicatedPublicPage,
}: {
  currentStep: 2 | 3 | 4;
  isDedicatedPublicPage: boolean;
}) {
  const steps = [
    { key: 2 as const, label: "Date & Time" },
    { key: 3 as const, label: "My Details" },
    { key: 4 as const, label: "Confirm" },
  ];

  return (
    <nav aria-label="Booking progress">
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

          return (
            <li
              key={step.key}
              className={cn("flex items-start", isLast ? "shrink-0" : "flex-1")}
              aria-current={status === "current" ? "step" : undefined}
            >
              <div className="flex shrink-0 flex-col items-center gap-2">
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
                    "max-w-[4.25rem] text-center text-[0.6875rem] font-semibold uppercase tracking-[0.12em] leading-tight transition-colors sm:max-w-[7.5rem] sm:text-[0.8125rem]",
                    status === "complete" && "text-[var(--ink)]",
                    status === "current" && "text-[var(--primary)]",
                    status === "upcoming" && "text-[var(--muted)]",
                  )}
                >
                  <span className="sr-only">
                    {status === "complete"
                      ? "Completed: "
                      : status === "current"
                        ? "Current step: "
                        : "Upcoming: "}
                  </span>
                  {step.label}
                </span>
              </div>
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
