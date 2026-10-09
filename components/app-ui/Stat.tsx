import type { MouseEvent, ReactNode } from "react";

import { focusRing } from "@/components/app-ui/styles";
import { cn } from "@/lib/utils";

const COLUMNS = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" } as const;

/** Stats separated by hairlines: a 1px gap over the border color. */
export function StatGroup({
  columns = 4,
  className,
  children,
}: {
  columns?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-app-border shadow-xs ring-1 ring-app-border",
        COLUMNS[columns],
        className,
      )}
    >
      {children}
    </dl>
  );
}

/** A stat can link to where its number comes from. */
type StatLink =
  | { href?: undefined; linkLabel?: undefined; onClick?: undefined }
  | {
      href: string;
      /** Visible link text; the stat's label is appended for screen readers. */
      linkLabel: string;
      /** Client callers only, e.g. shallow navigation inside the dashboard. */
      onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    };

const TREND = { up: "text-app-success-fg", down: "text-app-danger-fg", flat: "text-app-fg-muted" } as const;

/** One stat. Renders dt/dd, so it belongs inside StatGroup. */
export function Stat({
  label,
  value,
  detail,
  trend,
  href,
  linkLabel,
  onClick,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  /** A change against an earlier period, worded by the caller. */
  trend?: { label: ReactNode; direction: keyof typeof TREND };
} & StatLink) {
  return (
    <div className="flex flex-col bg-app-surface px-4 py-5 sm:p-6">
      <dt className="text-sm font-medium text-app-fg-muted">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight text-app-fg tabular-nums">{value}</dd>
      {detail ? <dd className="mt-1 text-sm text-app-fg-muted">{detail}</dd> : null}
      {trend ? <dd className={cn("mt-1 text-xs font-semibold", TREND[trend.direction])}>{trend.label}</dd> : null}
      {href ? (
        <dd className="mt-3">
          <a
            href={href}
            onClick={onClick}
            className={cn(
              "inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-app-accent hover:text-app-accent-hover sm:min-h-0",
              focusRing,
            )}
          >
            {linkLabel}
            <span className="sr-only"> {label}</span>
          </a>
        </dd>
      ) : null}
    </div>
  );
}
