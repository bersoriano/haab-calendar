"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { logout } from "@/app/login/actions";
import { AppShell } from "@/components/app-shell/AppShell";
import { ShellFooter } from "@/components/app-shell/ShellFooter";
import { ShellAccount, ShellBrand } from "@/components/app-shell/ShellSidebarParts";
import { SidebarNav, shellNavItemClass, shellNavItemStateClass } from "@/components/app-shell/SidebarNav";
import { Badge, ToastProvider } from "@/components/app-ui";
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
    <div className="flex min-h-full flex-1 flex-col gap-6 px-4 pb-5 pt-4">
      <ShellBrand href="/super-admin" badge={<Badge tone="admin">Super admin</Badge>} />

      <SidebarNav groups={groups} activeId={page.id} ariaLabel="Super admin" />

      <div className="mt-auto flex flex-col gap-3 border-t border-app-border pt-4">
        <Link href="/dashboard" className={cn(shellNavItemClass, shellNavItemStateClass(false))}>
          <ArrowLeft aria-hidden="true" size={20} className="shrink-0 text-app-fg-muted" />
          <span className="min-w-0 flex-1 truncate">My dashboard</span>
        </Link>
        <ShellAccount
          email={email}
          signedInAsLabel="Signed in as"
          signOutLabel="Sign out"
          signOutAction={logout}
        />
      </div>
    </div>
  );

  return (
    <ToastProvider>
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
    </ToastProvider>
  );
}
