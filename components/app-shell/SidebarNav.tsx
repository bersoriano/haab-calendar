"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { shouldInterceptNavClick } from "@/lib/nav-click";
import { ShellIcon } from "@/components/app-shell/ShellIcon";
import { Badge } from "@/components/app-ui";
import type { ShellNavGroup, ShellNavItem } from "@/components/app-shell/types";

export const shellNavItemClass =
  "group flex h-11 items-center gap-x-3 rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent sm:h-9";

export function shellNavItemStateClass(active: boolean) {
  return active
    ? "bg-app-subtle text-app-accent"
    : "text-app-fg-secondary hover:bg-app-subtle hover:text-app-fg";
}

/** Super-admin signpost: the entry point from the dashboard into the admin area. */
export const shellNavItemAdminClass = "text-app-admin-fg hover:bg-app-admin-soft";

/**
 * An in-app link with a real `href`. With `onNavigate`, a plain click is
 * handled client-side while ⌘/Ctrl/middle clicks still open a new tab;
 * without it, the link is an ordinary Next.js link.
 */
export function ShellLink({
  href,
  active = false,
  className,
  onNavigate,
  children,
}: {
  href: string;
  active?: boolean;
  className?: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  if (!onNavigate) {
    return (
      <Link href={href} aria-current={active ? "page" : undefined} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={className}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (
          shouldInterceptNavClick({
            button: event.button,
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            defaultPrevented: event.defaultPrevented,
            target: event.currentTarget.target,
          })
        ) {
          event.preventDefault();
          onNavigate();
        }
      }}
    >
      {children}
    </a>
  );
}

export function SidebarNav({
  groups,
  activeId,
  ariaLabel,
  onNavigate,
}: {
  groups: ShellNavGroup[];
  activeId: string;
  ariaLabel: string;
  /** Client-side navigation for plain clicks; omitted → next/link. */
  onNavigate?: (item: ShellNavItem) => void;
}) {
  return (
    <nav aria-label={ariaLabel} className="grid gap-6">
      {groups.map((group) => (
        <div key={group.id}>
          {group.label ? (
            <p className="px-2 text-xs font-semibold text-app-fg-muted">
              {group.label}
            </p>
          ) : null}
          <ul className={cn("grid gap-1", group.label && "mt-2")}>
            {group.items.map((item) => {
              const active = item.id === activeId;

              return (
                <li key={item.id}>
                  <ShellLink
                    href={item.href}
                    active={active}
                    className={cn(shellNavItemClass, shellNavItemStateClass(active))}
                    onNavigate={onNavigate ? () => onNavigate(item) : undefined}
                  >
                    <ShellIcon name={item.icon} active={active} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge !== undefined ? <Badge tone="neutral">{item.badge}</Badge> : null}
                  </ShellLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
