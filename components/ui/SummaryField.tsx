import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { compactMetaTextClass } from "@/lib/constants";

export function SummaryField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid">
      <dt className={cn("text-[var(--muted)]", compactMetaTextClass)}>{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium leading-6 text-[var(--ink)]">
        {value}
      </dd>
    </div>
  );
}
