import type { ReactNode } from "react";

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

/** One stat. Renders dt/dd, so it belongs inside StatGroup. */
export function Stat({
  label,
  value,
  detail,
  action,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col bg-app-surface px-4 py-5 sm:p-6">
      <dt className="text-sm font-medium text-app-fg-muted">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight text-app-fg tabular-nums">{value}</dd>
      {detail ? <dd className="mt-1 text-sm text-app-fg-muted">{detail}</dd> : null}
      {action ? <dd className="mt-3">{action}</dd> : null}
    </div>
  );
}
