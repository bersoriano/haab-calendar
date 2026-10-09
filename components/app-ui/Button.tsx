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

export function ButtonLink({
  href,
  variant = "secondary",
  size,
  leadingIcon,
  external = false,
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> &
  StyleProps & { href: string; leadingIcon?: ReactNode; external?: boolean }) {
  const classes = buttonStyles({ variant, size, className });

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        {leadingIcon}
        {children}
        <ArrowUpRight aria-hidden="true" size={16} />
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
