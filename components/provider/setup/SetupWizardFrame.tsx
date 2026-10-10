import { Check } from "@phosphor-icons/react/dist/ssr";
import { useId, type ReactNode } from "react";

import { Alert, Button, Card, CardBody, CardFooter, CardHeader, SectionHeading } from "@/components/app-ui";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

type StepAction = { label: string; onClick: () => void; disabled?: boolean; loading?: boolean };

/**
 * The frame around first-run setup: the page heading, where you are in the
 * steps, and one card per step with its Back and Continue. The module keeps
 * every step's content and handler and passes them in.
 */
export function SetupWizardFrame({
  lang,
  eyebrow,
  title,
  body,
  steps,
  step,
  stepEyebrow,
  stepTitle,
  stepDescription,
  error,
  back,
  next,
  bare = false,
  children,
}: {
  lang: Lang;
  eyebrow?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  steps: readonly string[];
  /** 1-based. */
  step: number;
  stepEyebrow?: ReactNode;
  stepTitle: ReactNode;
  stepDescription?: ReactNode;
  error?: ReactNode;
  /** Omitted when the step offers no way back. */
  back?: StepAction;
  /** Omitted on the last step, whose actions live in its content. */
  next?: StepAction;
  /**
   * The step's content brings its own cards (the services editor): lay the
   * step out as a plain section, so cards are never nested.
   */
  bare?: boolean;
  children: ReactNode;
}) {
  const copy = dashboardCopy[lang];
  const stepTitleId = useId();
  const stepOf = copy.setupStepOf
    .replace("{current}", String(step))
    .replace("{total}", String(steps.length));

  const stepError = error ? (
    <Alert tone="danger" role="alert">
      {error}
    </Alert>
  ) : null;
  const stepActions =
    back || next ? (
      <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {back ? (
          <Button variant="secondary" onClick={back.onClick} disabled={back.disabled} loading={back.loading}>
            {back.label}
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        {next ? (
          <Button variant="primary" onClick={next.onClick} disabled={next.disabled} loading={next.loading}>
            {next.label}
          </Button>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="grid gap-6">
      <div>
        {eyebrow ? <p className="text-sm font-semibold text-app-accent">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-app-fg sm:text-3xl">{title}</h1>
        {body ? <p className="mt-2 max-w-2xl text-sm text-app-fg-muted sm:text-base">{body}</p> : null}
      </div>

      <nav aria-label={copy.setupProgress}>
        {/* The connected steps need md's width for the longest (Spanish)
            labels; below it, one line says where you are. */}
        <p className="text-sm font-medium text-app-fg-secondary md:hidden">
          {stepOf} · <span className="text-app-fg">{steps[step - 1]}</span>
        </p>
        <ol role="list" className="hidden items-center gap-3 md:flex">
          {steps.map((label, index) => {
            const number = index + 1;
            const done = number < step;
            const current = number === step;

            return (
              <li
                key={label}
                aria-current={current ? "step" : undefined}
                className="flex min-w-0 flex-1 items-center gap-3 last:flex-none"
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                    done && "bg-app-accent text-app-on-accent",
                    current && "bg-app-surface text-app-accent ring-2 ring-inset ring-app-accent",
                    !done && !current && "bg-app-surface text-app-fg-muted ring-1 ring-inset ring-app-border-strong",
                  )}
                >
                  {done ? <Check aria-hidden="true" size={16} weight="bold" /> : number}
                </span>
                <span
                  className={cn(
                    "truncate text-sm font-medium",
                    current ? "text-app-accent" : done ? "text-app-fg" : "text-app-fg-muted",
                  )}
                >
                  {label}
                </span>
                {number < steps.length ? (
                  <span
                    aria-hidden="true"
                    className={cn("h-0.5 min-w-4 flex-1 rounded-full", done ? "bg-app-accent" : "bg-app-border")}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      {bare ? (
        <section aria-labelledby={stepTitleId} className="grid gap-5">
          <SectionHeading eyebrow={stepEyebrow} titleId={stepTitleId} title={stepTitle} description={stepDescription} />
          {children}
          {stepError}
          {stepActions ? <div className="border-t border-app-border pt-4">{stepActions}</div> : null}
        </section>
      ) : (
        <Card as="section" aria-labelledby={stepTitleId}>
          <CardHeader eyebrow={stepEyebrow} titleId={stepTitleId} title={stepTitle} description={stepDescription} />
          <CardBody>{children}</CardBody>
          {stepError ? <div className="px-4 pb-5 sm:px-6">{stepError}</div> : null}
          {stepActions ? <CardFooter>{stepActions}</CardFooter> : null}
        </Card>
      )}
    </div>
  );
}
