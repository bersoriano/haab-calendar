"use client";

import { ArrowSquareOut, Check, Copy, SignOut } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logout } from "@/app/login/actions";
import { stopDemoEdit } from "@/app/super-admin/actions";
import { AppShell } from "@/components/app-shell/AppShell";
import { ShellFooter } from "@/components/app-shell/ShellFooter";
import { ShellIcon } from "@/components/app-shell/ShellIcon";
import {
  ShellLink,
  SidebarNav,
  shellNavItemClass,
} from "@/components/app-shell/SidebarNav";
import {
  SUPER_ADMIN_ACCENT_CLASS,
  SUPER_ADMIN_ACCENT_HOVER_CLASS,
  SUPER_ADMIN_ACCENT_TEXT_CLASS,
} from "@/components/app-shell/super-admin-accent";
import type { ShellIconName, ShellNavGroup } from "@/components/app-shell/types";
import { HaabBookingModule } from "@/components/haab-booking-module";
import { dashboardCopy, sectionTitle } from "@/components/provider/dashboard-copy";
import { Alert } from "@/components/ui/Alert";
import { ClientOnly } from "@/components/ui/ClientOnly";
import {
  DASHBOARD_SECTIONS,
  pathForSection,
  sectionFromPathname,
  type CheckoutResult,
  type DashboardNavGroup,
  type GoogleOutcome,
} from "@/lib/dashboard-routes";
import type { DemoEditBanner } from "@/lib/demo-pages";
import type { ProviderEntitlements } from "@/lib/entitlements/resolve";
import { buildProviderPath } from "@/lib/public-url";
import type { PublicationStatus } from "@/lib/supabase/publication";
import type { AdminTab, Lang, ModuleStore } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";
import { getVerticalCopy } from "@/lib/vertical-copy";

const SECTION_ICONS: Record<AdminTab, ShellIconName> = {
  dashboard: "overview",
  bookings: "bookings",
  calendar: "calendar",
  analytics: "analytics",
  services: "services",
  availability: "availability",
  appearance: "appearance",
  integrations: "integrations",
  settings: "settings",
};

const topActionClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:px-4";

function googleOutcomeTone(outcome: GoogleOutcome) {
  if (outcome === "connected") return "success" as const;
  if (outcome === "declined" || outcome === "not_entitled") return "warning" as const;
  return "danger" as const;
}

export type DashboardAppProps = {
  initialSection: AdminTab;
  store: ModuleStore;
  email?: string;
  isSuperAdmin: boolean;
  demoEdit?: DemoEditBanner;
  /**
   * Server-resolved feature access, kept apart from the store: the store is
   * editable configuration that round-trips through the provider API, and this
   * is a read-only answer about what the account may use. Absent whenever the
   * resolve failed — the UI treats the absence as "cannot tell", never as
   * access.
   */
  providerEntitlements?: ProviderEntitlements;
  publicationStatus?: PublicationStatus;
  /** Server-resolved language for the viewer; the default until they pin one. */
  viewerLanguage: Lang;
  /** How a Stripe Checkout the provider just left ended. */
  checkoutResult?: CheckoutResult;
  /** What the Google Calendar OAuth callback reported. */
  googleOutcome?: GoogleOutcome;
};

/**
 * The signed-in provider dashboard: the app shell around the booking module.
 *
 * The URL is the source of truth for the section. Sidebar links are real
 * `/dashboard/...` hrefs, but a plain click only pushes history — Next.js
 * syncs `usePathname` — so switching sections never waits on the server and
 * keeps working offline, with unsaved edits intact in the one module instance.
 */
export function DashboardApp({
  initialSection,
  store,
  email,
  isSuperAdmin,
  demoEdit,
  providerEntitlements,
  publicationStatus,
  viewerLanguage,
  checkoutResult,
  googleOutcome,
}: DashboardAppProps) {
  const pathname = usePathname();
  const section = sectionFromPathname(pathname) ?? initialSection;
  // The module reports every edit and every save; the shell reads the latest
  // snapshot for the business name, logo, public link and workspace language.
  const [snapshot, setSnapshot] = useState<ModuleStore>(store);
  // One-shot notices from the URL (Checkout, Google) belong to the page the
  // provider landed on, not to every section they visit afterwards.
  const [hasNavigated, setHasNavigated] = useState(false);
  const [copied, setCopied] = useState(false);
  const lastSectionRef = useRef(section);

  const lang: Lang = snapshot.provider.dashboardLanguage ?? viewerLanguage;
  const shell = dashboardCopy[lang];
  const verticalCopy = getVerticalCopy(snapshot.vertical, lang);
  const title = sectionTitle(section, lang, verticalCopy);
  const businessName =
    snapshot.provider.businessName || snapshot.provider.fullName || "Haab Calendar";
  const slug =
    snapshot.provider.publicSlug ||
    slugify(snapshot.provider.businessName || snapshot.provider.fullName || "haab-calendar");
  const publicPath = snapshot.vertical ? buildProviderPath(snapshot.vertical, slug) : undefined;
  const publishingOff = publicationStatus?.publishingEnabled === false;

  function navigate(next: AdminTab) {
    if (next !== section) {
      window.history.pushState(null, "", pathForSection(next));
    }
    setHasNavigated(true);
  }

  useEffect(() => {
    if (lastSectionRef.current === section) {
      return;
    }

    lastSectionRef.current = section;
    window.scrollTo({ top: 0 });
    // Screen readers announce the new page through its heading.
    document.getElementById("shell-title")?.focus({ preventScroll: true });
  }, [section]);

  useEffect(() => {
    document.title = `${title} · ${businessName}`;
  }, [title, businessName]);

  useEffect(() => {
    // The root layout cannot see a pinned workspace language.
    document.documentElement.lang = lang;
  }, [lang]);

  async function copyPublicLink() {
    if (!publicPath) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function navItems(group: DashboardNavGroup) {
    return DASHBOARD_SECTIONS.filter((entry) => entry.group === group).map((entry) => ({
      id: entry.id,
      href: pathForSection(entry.id),
      label: sectionTitle(entry.id, lang, verticalCopy),
      icon: SECTION_ICONS[entry.id],
    }));
  }

  const navGroups: ShellNavGroup[] = [
    { id: "operate", label: shell.groups.operate, items: navItems("operate") },
    { id: "setup", label: shell.groups.setup, items: navItems("setup") },
    { id: "account", items: navItems("account") },
  ];

  const sidebar = (
    <div className="flex min-h-full flex-1 flex-col gap-6 px-4 pb-5 pt-5">
      <ShellLink
        href={pathForSection("dashboard")}
        onNavigate={() => navigate("dashboard")}
        className="flex min-h-11 items-center gap-2.5 rounded-2xl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <span
          aria-hidden="true"
          className="relative grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary)] text-base font-extrabold text-white shadow-[0_10px_24px_rgba(0,91,191,0.24)]"
        >
          H
          <span className="absolute -right-[3px] -top-[3px] h-[10px] w-[10px] rounded-full border-2 border-[var(--surface-lowest)] bg-[var(--teal)]" />
        </span>
        <span className="text-base font-bold tracking-[-0.02em] text-[var(--ink)]">
          Haab Calendar
        </span>
      </ShellLink>

      <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-soft)] p-3">
        {snapshot.provider.logoImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded logo on an arbitrary host
          <img
            src={snapshot.provider.logoImageUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-xl bg-white object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--primary),var(--teal))] text-sm font-bold text-white"
          >
            {businessName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--ink)]" title={businessName}>
            {businessName}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <span
              aria-hidden="true"
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                publishingOff ? "bg-[var(--danger-strong)]" : "bg-[var(--teal)]",
              )}
            />
            {publishingOff ? shell.publishingOff : shell.pageLive}
          </p>
        </div>
      </div>

      <SidebarNav
        groups={navGroups}
        activeId={section}
        ariaLabel={shell.navLabel}
        onNavigate={(item) => navigate(item.id as AdminTab)}
      />

      {/* A flex column, not a grid: grid items default to their content's
          width, and a long email would push sign-out out of the sidebar. */}
      <div className="mt-auto flex flex-col gap-3 border-t border-[var(--line)]/60 pt-4">
        {isSuperAdmin ? (
          <Link
            href="/super-admin"
            className={cn(shellNavItemClass, SUPER_ADMIN_ACCENT_TEXT_CLASS, SUPER_ADMIN_ACCENT_HOVER_CLASS)}
          >
            <ShellIcon name="superAdmin" />
            <span className="min-w-0 flex-1 truncate">{shell.superAdmin}</span>
          </Link>
        ) : null}
        <div className="flex min-w-0 items-center gap-3 px-2">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-highest)] text-sm font-semibold text-[var(--ink)]"
          >
            {(email ?? businessName).slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-[var(--muted)]">{shell.signedInAs}</p>
            <p className="truncate text-sm font-medium text-[var(--ink)]" title={email}>
              {email}
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              aria-label={shell.signOut}
              title={shell.signOut}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <SignOut aria-hidden="true" size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const topBarActions = publicPath ? (
    <>
      <button
        type="button"
        onClick={copyPublicLink}
        className={cn(
          topActionClass,
          "border-[var(--line)] bg-[var(--surface-lowest)] text-[var(--ink)] hover:bg-[var(--surface-soft)]",
        )}
      >
        {copied ? (
          <Check aria-hidden="true" size={18} />
        ) : (
          <Copy aria-hidden="true" size={18} />
        )}
        <span className="sr-only sm:not-sr-only">{copied ? shell.linkCopied : shell.copyLink}</span>
      </button>
      <a
        href={publicPath}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          topActionClass,
          "border-transparent bg-[var(--ink)] text-white hover:opacity-90",
        )}
      >
        <ArrowSquareOut aria-hidden="true" size={18} />
        <span className="sr-only sm:not-sr-only">{shell.viewPage}</span>
      </a>
    </>
  ) : undefined;

  const showGoogleOutcome = section === "integrations" && googleOutcome && !hasNavigated;
  const banners =
    demoEdit || publicationStatus?.dashboardMessage || showGoogleOutcome ? (
      <>
        {demoEdit ? (
          <Alert
            tone="accent"
            title={shell.editingDemo}
            actions={
              <>
                <a
                  href={demoEdit.publicPath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center px-2 font-semibold underline-offset-4 hover:underline"
                >
                  {shell.viewLive}
                </a>
                <form action={stopDemoEdit}>
                  <button
                    type="submit"
                    className={cn(
                      "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition",
                      SUPER_ADMIN_ACCENT_CLASS,
                    )}
                  >
                    {shell.exitDemo}
                  </button>
                </form>
              </>
            }
          >
            {demoEdit.label} · {demoEdit.publicPath}
          </Alert>
        ) : null}
        {publicationStatus?.dashboardMessage ? (
          <Alert
            tone={publicationStatus.publishingEnabled ? "success" : "danger"}
            role={publicationStatus.publishingEnabled ? "status" : "alert"}
          >
            {publicationStatus.dashboardMessage}
          </Alert>
        ) : null}
        {showGoogleOutcome && googleOutcome ? (
          <Alert tone={googleOutcomeTone(googleOutcome)} role="status">
            {shell.google[googleOutcome]}
          </Alert>
        ) : null}
      </>
    ) : undefined;

  return (
    <AppShell
      sidebar={sidebar}
      title={title}
      description={shell.descriptions[section]}
      topBarActions={topBarActions}
      banners={banners}
      navigationKey={section}
      copy={{
        skipToContent: shell.skipToContent,
        openMenu: shell.openMenu,
        closeMenu: shell.closeMenu,
        menu: shell.navLabel,
      }}
      footer={
        <ShellFooter
          note={`© ${new Date().getFullYear()} ${shell.rights}`}
          links={[
            { href: "/terms", label: shell.terms },
            { href: "/privacy", label: shell.privacy },
            ...(publicPath ? [{ href: publicPath, label: shell.viewPage, external: true }] : []),
          ]}
        />
      }
    >
      {/* The module renders "today", this month and the viewer's time zones;
          a server in another zone would paint markup the browser disagrees
          with. The shell around it is server-rendered; the content mounts in
          the browser, as the dashboard always has. */}
      <ClientOnly fallback={<SectionPlaceholder />}>
        <HaabBookingModule
          injectedConfig={store}
          userEmail={email}
          persistAdminChanges
          viewerLanguage={lang}
          providerEntitlements={providerEntitlements}
          publishingEnabled={publicationStatus?.publishingEnabled}
          checkoutResult={hasNavigated ? undefined : checkoutResult}
          adminSection={section}
          onAdminSectionChange={navigate}
          chrome="shell"
          onStoreChange={setSnapshot}
          onSetupPersisted={setSnapshot}
        />
      </ClientOnly>
    </AppShell>
  );
}

/** Holds the section's space while the module mounts, without layout jump. */
function SectionPlaceholder() {
  return (
    <div aria-hidden="true" className="grid animate-pulse gap-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-28 rounded-[24px] bg-[var(--surface-highest)]/70" />
        ))}
      </div>
      <div className="h-64 rounded-[28px] bg-[var(--surface-highest)]/70" />
    </div>
  );
}
