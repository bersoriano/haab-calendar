import type { StatusTone } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The one keyboard focus treatment for every interactive element. */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent";

export type ButtonVariant = "primary" | "secondary" | "soft" | "plain" | "danger" | "danger-plain";
export type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-app-accent text-app-on-accent shadow-xs hover:bg-app-accent-hover",
  secondary:
    "bg-app-surface text-app-fg shadow-xs ring-1 ring-inset ring-app-border-strong hover:bg-app-subtle",
  soft: "bg-app-accent-soft text-app-accent-on-soft hover:bg-app-accent-soft-hover",
  plain: "text-app-fg-secondary hover:bg-app-subtle hover:text-app-fg",
  danger: "bg-app-danger text-app-on-accent shadow-xs hover:bg-app-danger-hover",
  "danger-plain": "text-app-danger-fg hover:bg-app-danger-soft",
};

const BUTTON_SIZES: Record<ButtonSize, { text: string; icon: string }> = {
  md: { text: "h-11 px-4 sm:h-9 sm:px-3", icon: "h-11 w-11 sm:h-9 sm:w-9" },
  sm: { text: "h-11 px-3 sm:h-8 sm:px-2.5", icon: "h-11 w-11 sm:h-8 sm:w-8" },
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  iconOnly = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    focusRing,
    BUTTON_VARIANTS[variant],
    iconOnly ? BUTTON_SIZES[size].icon : BUTTON_SIZES[size].text,
    className,
  );
}

export function inputStyles({ invalid = false, className }: { invalid?: boolean; className?: string } = {}) {
  return cn(
    "block w-full rounded-lg bg-app-surface px-3 text-base text-app-fg outline-1 -outline-offset-1 placeholder:text-app-placeholder focus:outline-2 focus:-outline-offset-2 disabled:cursor-not-allowed disabled:bg-app-subtle disabled:text-app-fg-muted sm:text-sm",
    invalid
      ? "outline-app-danger-fg focus:outline-app-danger-fg"
      : "outline-app-border-strong focus:outline-app-accent",
    className,
  );
}

/** Soft background, readable text and an inset ring, per tone. */
export const toneSurface: Record<StatusTone, string> = {
  neutral: "bg-app-neutral-soft text-app-neutral-fg ring-app-neutral-ring",
  accent: "bg-app-accent-soft text-app-accent-on-soft ring-app-accent-ring",
  success: "bg-app-success-soft text-app-success-fg ring-app-success-ring",
  warning: "bg-app-warning-soft text-app-warning-fg ring-app-warning-ring",
  danger: "bg-app-danger-soft text-app-danger-fg ring-app-danger-ring",
  info: "bg-app-info-soft text-app-info-fg ring-app-info-ring",
  admin: "bg-app-admin-soft text-app-admin-fg ring-app-admin-ring",
};

export function badgeStyles(tone: StatusTone, className?: string) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
    toneSurface[tone],
    className,
  );
}

export function cardStyles(className?: string) {
  return cn("rounded-xl bg-app-surface shadow-xs ring-1 ring-app-border", className);
}

/** One option of a segmented control or language toggle. */
export function segmentStyles(selected: boolean) {
  return cn(
    "inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors sm:h-8",
    focusRing,
    selected
      ? "bg-app-surface text-app-fg shadow-xs ring-1 ring-app-border"
      : "text-app-fg-muted hover:text-app-fg",
  );
}
