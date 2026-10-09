import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Fieldset({
  legend,
  description,
  className,
  children,
}: {
  legend: ReactNode;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className={cn("grid gap-4", className)}>
      {/* legend must be the fieldset's first child */}
      <legend className="text-sm font-semibold text-app-fg">{legend}</legend>
      {description ? <p className="-mt-3 text-sm text-app-fg-muted">{description}</p> : null}
      {children}
    </fieldset>
  );
}

/**
 * The Tailwind Plus settings layout: heading on the left, fields on the
 * right from lg. Stack sections inside `divide-y divide-app-border`.
 */
export function FormSection({
  title,
  description,
  titleId,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  titleId?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn("grid grid-cols-1 gap-x-8 gap-y-6 py-8 first:pt-0 last:pb-0 lg:grid-cols-3", className)}
    >
      <div>
        <h2 id={titleId} className="text-base font-semibold text-app-fg">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-app-fg-muted">{description}</p> : null}
      </div>
      <div className="grid gap-6 lg:col-span-2">{children}</div>
    </section>
  );
}
