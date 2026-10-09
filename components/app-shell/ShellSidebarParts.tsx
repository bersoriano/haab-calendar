"use client";

import { SignOut } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ShellLink } from "@/components/app-shell/SidebarNav";
import { Avatar, Badge, IconButton } from "@/components/app-ui";

const brandClass =
  "flex min-h-11 items-center gap-2.5 rounded-lg px-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent";

/** Haab mark + name, linking to the area's home. */
export function ShellBrand({
  href,
  onNavigate,
  badge,
}: {
  href: string;
  /** Client-side navigation (dashboard); omitted → next/link. */
  onNavigate?: () => void;
  badge?: ReactNode;
}) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-app-accent text-sm font-bold text-app-on-accent"
      >
        H
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-app-fg">Haab Calendar</span>
        {badge ? <span className="mt-0.5 block">{badge}</span> : null}
      </span>
    </>
  );

  return onNavigate ? (
    <ShellLink href={href} onNavigate={onNavigate} className={brandClass}>
      {content}
    </ShellLink>
  ) : (
    <Link href={href} className={brandClass}>
      {content}
    </Link>
  );
}

/** The business this workspace manages, and whether its page is live. */
export function ShellWorkspace({
  name,
  logoUrl,
  status,
}: {
  name: string;
  logoUrl?: string;
  status: { tone: "success" | "danger"; label: string };
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg p-2 ring-1 ring-app-border">
      <Avatar name={name} src={logoUrl} shape="square" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-app-fg" title={name}>
          {name}
        </p>
        <Badge tone={status.tone} dot className="mt-1">
          {status.label}
        </Badge>
      </div>
    </div>
  );
}

/**
 * Who is signed in, and the way out. A flex row with a shrinking middle: a
 * long email truncates instead of pushing sign-out out of the sidebar.
 */
export function ShellAccount({
  email,
  signedInAsLabel,
  signOutLabel,
  signOutAction,
}: {
  email?: string;
  signedInAsLabel: string;
  signOutLabel: string;
  signOutAction: () => void | Promise<void>;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-2">
      <Avatar name={email ?? "?"} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-app-fg-muted">{signedInAsLabel}</p>
        <p className="truncate text-sm font-medium text-app-fg" title={email}>
          {email}
        </p>
      </div>
      <form action={signOutAction}>
        <IconButton type="submit" label={signOutLabel} icon={<SignOut aria-hidden="true" size={18} />} />
      </form>
    </div>
  );
}
