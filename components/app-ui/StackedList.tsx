import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StackedList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ul role="list" className={cn("divide-y divide-app-border", className)}>
      {children}
    </ul>
  );
}

export function StackedListItem({
  leading,
  trailing,
  className,
  children,
}: {
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <li className={cn("flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6", className)}>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">{children}</div>
      {trailing ? <div className="flex shrink-0 flex-wrap items-center gap-2">{trailing}</div> : null}
    </li>
  );
}

/**
 * Sticks while its group scrolls past, below whatever the host pins on top:
 * the shell sets --app-sticky-top to its top bar's height; other hosts get 0.
 */
export function StackedListHeading({
  id,
  level = 3,
  children,
}: {
  id?: string;
  level?: 2 | 3;
  children: ReactNode;
}) {
  const Heading = level === 2 ? "h2" : "h3";

  return (
    <Heading
      id={id}
      className="sticky top-[var(--app-sticky-top,0px)] z-10 border-y border-app-border bg-app-subtle px-4 py-1.5 text-xs font-semibold text-app-fg-secondary sm:px-6"
    >
      {children}
    </Heading>
  );
}
