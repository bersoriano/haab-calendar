import { type ReactNode } from "react";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[28px] bg-[rgba(243,244,245,0.88)] p-6 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      <h4 className="text-lg font-semibold text-[var(--ink)]">{title}</h4>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
