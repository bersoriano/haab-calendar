import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DescriptionList({ className, children }: { className?: string; children: ReactNode }) {
  return <dl className={cn("divide-y divide-app-border", className)}>{children}</dl>;
}

export function DescriptionItem({
  term,
  flush = false,
  children,
}: {
  term: ReactNode;
  /** Drop the side padding when the list sits in an already padded body. */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("py-4 sm:grid sm:grid-cols-3 sm:gap-4", flush ? "px-0" : "px-4 sm:px-6")}>
      <dt className="text-sm font-medium text-app-fg">{term}</dt>
      <dd className="mt-1 break-words text-sm text-app-fg-secondary sm:col-span-2 sm:mt-0">{children}</dd>
    </div>
  );
}
