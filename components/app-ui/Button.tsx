import { ArrowUpRight, CircleNotch } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { appControl, buttonStyles, type ButtonSize, type ButtonVariant } from "@/components/app-ui/styles";

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({
  variant,
  size,
  leadingIcon,
  loading = false,
  type = "button",
  disabled,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> &
  StyleProps & { leadingIcon?: ReactNode; loading?: boolean }) {
  return (
    <button
      {...appControl}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...rest}
    >
      {loading ? (
        <CircleNotch aria-hidden="true" size={16} className="animate-spin" />
      ) : (
        leadingIcon
      )}
      {children}
    </button>
  );
}

/** An external link opens a new tab, and says so to screen readers. */
type ExternalProps =
  | { external?: false; newTabLabel?: undefined; externalIconClassName?: undefined }
  | {
      external: true;
      /** Read after the link text, e.g. "(opens in a new tab)". */
      newTabLabel: string;
      externalIconClassName?: string;
    };

export function ButtonLink({
  href,
  variant = "secondary",
  size,
  leadingIcon,
  external,
  newTabLabel,
  externalIconClassName,
  className,
  children,
  ...rest
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  StyleProps & { href: string; leadingIcon?: ReactNode } & ExternalProps) {
  const classes = buttonStyles({ variant, size, className });

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        {leadingIcon}
        {children}
        <span className="sr-only">{newTabLabel}</span>
        <ArrowUpRight aria-hidden="true" size={16} className={externalIconClassName} />
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {leadingIcon}
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  icon,
  variant = "plain",
  size,
  type = "button",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & StyleProps & { label: string; icon: ReactNode }) {
  return (
    <button
      {...appControl}
      type={type}
      aria-label={label}
      title={label}
      className={buttonStyles({ variant, size, iconOnly: true, className })}
      {...rest}
    >
      {icon}
    </button>
  );
}
