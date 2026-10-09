import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SUPER_ADMIN_ACCENT_SOFT_CLASS } from "@/components/app-shell/super-admin-accent";

export type AlertTone = "neutral" | "success" | "warning" | "danger" | "accent";

const TONE_CLASS: Record<AlertTone, string> = {
  neutral: "border-[var(--line)] bg-[var(--surface-lowest)] text-[var(--ink)]",
  success: "border-[var(--success-line)] bg-[var(--success-soft)] text-[var(--success-strong)]",
  warning: "border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-strong)]",
  danger: "border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger-strong)]",
  accent: SUPER_ADMIN_ACCENT_SOFT_CLASS,
};

/** One status message style for the whole provider and admin UI. */
export function Alert({
  tone,
  title,
  children,
  actions,
  role,
  className,
}: {
  tone: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  role?: "status" | "alert";
  className?: string;
}) {
  return (
    <div
      role={role}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        TONE_CLASS[tone],
        className,
      )}
    >
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? (
          <div className={cn("break-words", title ? "mt-0.5" : "font-medium")}>{children}</div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
