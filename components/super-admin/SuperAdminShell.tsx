"use client";

import { SignOut } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { logout } from "@/app/login/actions";
import { AppShell } from "@/components/app-shell/AppShell";
import { ShellFooter } from "@/components/app-shell/ShellFooter";
import { ShellIcon } from "@/components/app-shell/ShellIcon";
import { SidebarNav, shellNavItemClass, shellNavItemStateClass } from "@/components/app-shell/SidebarNav";
import {
  SUPER_ADMIN_ACCENT_CLASS,
  SUPER_ADMIN_ACCENT_TEXT_CLASS,
} from "@/components/app-shell/super-admin-accent";
import type { ShellNavGroup } from "@/components/app-shell/types";
import { cn } from "@/lib/utils";

type SuperAdminPage = {
  id: string;
  href: string;
  title: string;
  description: string;
};

/** English only: super admin is an internal operator tool. */
const PAGES: SuperAdminPage[] = [
  {
    id: "overview",
    href: "/super-admin",
    title: "Overview",
    description: "Accounts, demo pages and cleanups at a glance.",
  },
  {
    id: "accounts",
    href: "/super-admin/accounts",
    title: "Accounts",
    description: "Publishing access, premium overrides and account deletion.",
  },
  {
    id: "demo-pages",
    href: "/super-admin/demo-pages",
    title: "Demo pages",
    description: "The public example pages linked from the landing page.",
  },
  {
    id: "cleanups",
    href: "/super-admin/cleanups",
    title: "Cleanups",
    description: "Deleted accounts whose branding files are still queued.",
  },
];

function pageForPathname(pathname: string) {
  return (
    PAGES.find((page) => page.href !== "/super-admin" && pathname.startsWith(page.href)) ??
    PAGES[0]
  );
}

/**
 * Super admin's layout: the same shell as the provider dashboard, with
 * ordinary links (every page here loads its own server data).
 */
export function SuperAdminShell({
  email,
  pendingCleanups,
  children,
}: {
  email?: string;
  pendingCleanups: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const page = pageForPathname(pathname);

  const groups: ShellNavGroup[] = [
    {
      id: "admin",
      items: [
        { id: "overview", href: "/super-admin", label: "Overview", icon: "overview" },
        { id: "accounts", href: "/super-admin/accounts", label: "Accounts", icon: "accounts" },
        { id: "demo-pages", href: "/super-admin/demo-pages", label: "Demo pages", icon: "demo" },
        {
          id: "cleanups",
          href: "/super-admin/cleanups",
          label: "Cleanups",
          icon: "cleanups",
          badge: pendingCleanups > 0 ? pendingCleanups : undefined,
        },
      ],
    },
  ];

  const sidebar = (
    <div className="flex min-h-full flex-1 flex-col gap-6 px-4 pb-5 pt-5">
      <Link
        href="/super-admin"
        className="flex min-h-11 items-center gap-2.5 rounded-2xl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl text-base font-extrabold",
            SUPER_ADMIN_ACCENT_CLASS,
          )}
        >
          H
        </span>
        <span className="min-w-0">
          <span className="block text-base font-bold tracking-[-0.02em] text-[var(--ink)]">
            Haab Calendar
          </span>
          <span
            className={cn(
              "block text-xs font-semibold uppercase tracking-[0.12em]",
              SUPER_ADMIN_ACCENT_TEXT_CLASS,
            )}
          >
            Super admin
          </span>
        </span>
      </Link>

      <SidebarNav groups={groups} activeId={page.id} ariaLabel="Super admin" />

      <div className="mt-auto flex flex-col gap-3 border-t border-[var(--line)]/60 pt-4">
        <Link href="/dashboard" className={cn(shellNavItemClass, shellNavItemStateClass(false))}>
          <ShellIcon name="back" />
          <span className="min-w-0 flex-1 truncate">My dashboard</span>
        </Link>
        <div className="flex min-w-0 items-center gap-3 px-2">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-highest)] text-sm font-semibold text-[var(--ink)]"
          >
            {(email ?? "A").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-[var(--muted)]">Signed in as</p>
            <p className="truncate text-sm font-medium text-[var(--ink)]" title={email}>
              {email}
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <SignOut aria-hidden="true" size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      sidebar={sidebar}
      title={page.title}
      description={page.description}
      navigationKey={page.id}
      copy={{
        skipToContent: "Skip to content",
        openMenu: "Open menu",
        closeMenu: "Close menu",
        menu: "Super admin",
      }}
      footer={
        <ShellFooter
          note={`© ${new Date().getFullYear()} Haab Calendar · Super admin`}
          links={[
            { href: "/", label: "Home" },
            { href: "/terms", label: "Terms" },
            { href: "/privacy", label: "Privacy" },
          ]}
        />
      }
    >
      {children}
    </AppShell>
  );
}
