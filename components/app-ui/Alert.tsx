import {
  CheckCircle,
  Info,
  ShieldStar,
  Warning,
  WarningCircle,
  X,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { IconButton } from "@/components/app-ui/Button";
import { toneSurface } from "@/components/app-ui/styles";
import { cn } from "@/lib/utils";

export type AlertTone = "neutral" | "success" | "warning" | "danger" | "info" | "admin";

const ICONS = {
  neutral: Info,
  info: Info,
  success: CheckCircle,
  warning: Warning,
  danger: WarningCircle,
  admin: ShieldStar,
} as const;

/** One status message style for every signed-in surface. */
export function Alert({
  tone,
  title,
  children,
  actions,
  role,
  onDismiss,
  dismissLabel = "Dismiss",
  className,
}: {
  tone: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  role?: "status" | "alert";
  /** Client callers only: a server component cannot pass a function. */
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}) {
  const Icon = ICONS[tone];
  const surface =
    tone === "neutral" ? "bg-app-surface text-app-fg ring-app-border" : toneSurface[tone];

  return (
    <div role={role} className={cn("flex gap-3 rounded-lg p-4 text-sm ring-1 ring-inset", surface, className)}>
      <Icon aria-hidden="true" size={20} weight="fill" className="mt-px shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 break-words">
          {title ? <p className="font-semibold">{title}</p> : null}
          {children ? <div className={cn(title ? "mt-1" : "font-medium")}>{children}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {onDismiss ? (
        <IconButton
          label={dismissLabel}
          icon={<X aria-hidden="true" size={16} />}
          size="sm"
          onClick={onDismiss}
          className="-my-1.5 -mr-1.5 text-current hover:bg-app-surface/60"
        />
      ) : null}
    </div>
  );
}
