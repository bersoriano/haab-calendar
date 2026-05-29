import { type ReactNode } from "react";

export function SectionTitle({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
          {title}
        </h3>
        {body ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
