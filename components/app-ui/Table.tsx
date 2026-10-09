import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("min-w-full divide-y divide-app-border text-sm", className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-app-subtle">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-app-border bg-app-surface">{children}</tbody>;
}

export function Tr({ className, children }: { className?: string; children: ReactNode }) {
  return <tr className={className}>{children}</tr>;
}

export function Th({
  align = "left",
  className,
  children,
}: {
  align?: "left" | "right";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-app-fg-secondary first:pl-4 sm:first:pl-6",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  align = "left",
  className,
  children,
}: {
  align?: "left" | "right";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <td
      className={cn(
        "px-4 py-4 align-top text-app-fg-secondary first:pl-4 sm:first:pl-6",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}
