"use client";

import { ArrowSquareOut, Check, Copy, ShieldStar } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logout } from "@/app/login/actions";
import { stopDemoEdit } from "@/app/super-admin/actions";
import { AppShell } from "@/components/app-shell/AppShell";
import { ShellFooter } from "@/components/app-shell/ShellFooter";
import { ShellAccount, ShellBrand, ShellWorkspace } from "@/components/app-shell/ShellSidebarParts";
import {
  SidebarNav,
  shellNavItemAdminClass,
  shellNavItemClass,
} from "@/components/app-shell/SidebarNav";
import type { ShellIconName, ShellNavGroup } from "@/components/app-shell/types";
import { HaabBookingModule } from "@/components/haab-booking-module";
import { BusinessTypeSwitch, type DraftStorage } from "@/components/provider/BusinessTypeSwitch";
import { ChangeBusinessTypeDialog } from "@/components/provider/ChangeBusinessTypeDialog";
import { dashboardCopy, sectionTitle } from "@/components/provider/dashboard-copy";
import { translations as landingTranslations } from "@/components/landing/translations";
import { fillTemplate } from "@/components/booking/i18n/translations";
import { Alert, Button, ButtonLink, Skeleton, ToastProvider, useToast } from "@/components/app-ui";
import { ClientOnly } from "@/components/ui/ClientOnly";
import {
  DASHBOARD_SECTIONS,
  pathForSection,
  sectionFromPathname,
  type CheckoutResult,
  type DashboardNavGroup,
  type GoogleOutcome,
} from "@/lib/dashboard-routes";
import {
  findBlockingBookings,
  parseVerticalId,
  summarizeReplacement,
} from "@/lib/business-type-switch";
import { todayKey } from "@/lib/date";
import type { DemoEditBanner } from "@/lib/demo-pages";
import type { ProviderEntitlements } from "@/lib/entitlements/resolve";
import { buildProviderPath } from "@/lib/public-url";
import type { PublicationStatus } from "@/lib/supabase/publication";
import type { AdminTab, Lang, ModuleStore, VerticalId } from "@/lib/types";
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
  "business-type": "settings",
};

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
  /** Set right after a business-type switch, for the confirmation banner. */
  switchedTo?: VerticalId;
  /** The switch happened but the draft's profile changes did not save. */
  profileUnsaved?: boolean;
};

/** Survives the module's test mocks and any browser that blocks storage. */
const noStorage: DraftStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function browserStorage(): DraftStorage {
  try {
    return typeof window === "undefined" ? noStorage : window.localStorage;
  } catch {
    return noStorage;
  }
}

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
  switchedTo,
  profileUnsaved = false,
}: DashboardAppProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Taken when the dialog opens: what blocks a switch at that moment.
  const [businessTypeCheck, setBusinessTypeCheck] = useState<ReturnType<
    typeof findBlockingBookings
  > | null>(null);
  const section = sectionFromPathname(pathname) ?? initialSection;
  // The module reports every edit and every save; the shell reads the latest
  // snapshot for the business name, logo, public link and workspace language.
  const [snapshot, setSnapshot] = useState<ModuleStore>(store);
  // One-shot notices from the URL (Checkout, Google) belong to the page the
  // provider landed on, not to every section they visit afterwards.
  const [hasNavigated, setHasNavigated] = useState(false);
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

  function navigate(next: AdminTab, query?: Record<string, string | undefined>) {
    if (next !== section || query) {
      window.history.pushState(null, "", pathForSection(next, query));
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
    <div className="flex min-h-full flex-1 flex-col gap-6 px-4 pb-5 pt-4">
      <ShellBrand href={pathForSection("dashboard")} onNavigate={() => navigate("dashboard")} />

      <ShellWorkspace
        name={businessName}
        logoUrl={snapshot.provider.logoImageUrl || undefined}
        status={
          publishingOff
            ? { tone: "danger", label: shell.publishingOff }
            : { tone: "success", label: shell.pageLive }
        }
      />

      <SidebarNav
        groups={navGroups}
        activeId={section}
        ariaLabel={shell.navLabel}
        onNavigate={(item) => navigate(item.id as AdminTab)}
      />

      <div className="mt-auto flex flex-col gap-3 border-t border-app-border pt-4">
        {isSuperAdmin ? (
          <Link href="/super-admin" className={cn(shellNavItemClass, shellNavItemAdminClass)}>
            <ShieldStar aria-hidden="true" size={20} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{shell.superAdmin}</span>
          </Link>
        ) : null}
        <ShellAccount
          email={email}
          signedInAsLabel={shell.signedInAs}
          signOutLabel={shell.signOut}
          signOutAction={logout}
        />
      </div>
    </div>
  );

  const topBarActions = publicPath ? (
    <>
      <CopyLinkButton publicPath={publicPath} lang={lang} />
      <ButtonLink
        href={publicPath}
        external
        newTabLabel={shell.opensInNewTab}
        externalIconClassName="max-sm:hidden"
        variant="secondary"
        className="max-sm:w-11 max-sm:px-0"
        leadingIcon={<ArrowSquareOut aria-hidden="true" size={16} className="sm:hidden" />}
      >
        <span className="sr-only sm:not-sr-only">{shell.viewPage}</span>
      </ButtonLink>
    </>
  ) : undefined;

  const showGoogleOutcome = section === "integrations" && googleOutcome && !hasNavigated;
  const showSwitched = Boolean(switchedTo) && !hasNavigated;
  const banners =
    demoEdit || publicationStatus?.dashboardMessage || showGoogleOutcome || showSwitched ? (
      <>
        {showSwitched && switchedTo ? (
          <Alert tone="success" role="status">
            {fillTemplate(shell.businessType.success, {
              type: landingTranslations[lang].home.verticals[switchedTo].label,
            })}
          </Alert>
        ) : null}
        {showSwitched && profileUnsaved ? (
          <Alert tone="warning" role="status">
            {shell.businessType.profileUnsaved}
          </Alert>
        ) : null}
        {demoEdit ? (
          <Alert
            tone="admin"
            title={shell.editingDemo}
            actions={
              <>
                <ButtonLink
                  href={demoEdit.publicPath}
                  external
                  newTabLabel={shell.opensInNewTab}
                  variant="plain"
                  size="sm"
                >
                  {shell.viewLive}
                </ButtonLink>
                <form action={stopDemoEdit}>
                  <Button type="submit" variant="secondary" size="sm">
                    {shell.exitDemo}
                  </Button>
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

  // Inside the component, not around it: the close-button label follows a
  // dashboard-language switch made mid-session.
  return (
    <ToastProvider dismissLabel={shell.dismiss}>
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
            newTabLabel={shell.opensInNewTab}
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
        {/* Stays mounted while the business-type switch runs, so unsaved edits
            to the live page survive a trip there and back. */}
        <div hidden={section === "business-type"}>
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
              onChangeBusinessType={
                demoEdit
                  ? undefined
                  : () =>
                      setBusinessTypeCheck(
                        findBlockingBookings(
                          snapshot.bookings,
                          snapshot.bookingHolds,
                          todayKey(),
                          Date.now(),
                        ),
                      )
              }
            />
          </ClientOnly>
        </div>

        {section === "business-type" ? (
          demoEdit ? (
            <Alert tone="neutral">{shell.businessType.demoUnavailable}</Alert>
          ) : (
            <ClientOnly fallback={<SectionPlaceholder />}>
              <BusinessTypeSwitch
                lang={lang}
                liveStore={snapshot}
                to={parseVerticalId(searchParams.get("to"))}
                storage={browserStorage()}
                onCancel={() => navigate("settings")}
              />
            </ClientOnly>
          )
        ) : null}

        {businessTypeCheck && snapshot.vertical ? (
          <ChangeBusinessTypeDialog
            lang={lang}
            currentVertical={snapshot.vertical}
            slug={slug}
            summary={summarizeReplacement(snapshot)}
            blocking={businessTypeCheck}
            onCancel={() => setBusinessTypeCheck(null)}
            onGoToBookings={() => {
              setBusinessTypeCheck(null);
              navigate("bookings");
            }}
            onContinue={(vertical) => {
              setBusinessTypeCheck(null);
              navigate("business-type", { to: vertical });
            }}
          />
        ) : null}
      </AppShell>
    </ToastProvider>
  );
}

/** Copies the public link; a child of the toast provider so it can confirm. */
function CopyLinkButton({ publicPath, lang }: { publicPath: string; lang: Lang }) {
  const shell = dashboardCopy[lang];
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
      setCopied(true);
      notify({ message: shell.linkCopiedToast });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      variant="secondary"
      onClick={copy}
      leadingIcon={copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
      className="max-sm:w-11 max-sm:px-0"
    >
      <span className="sr-only sm:not-sr-only">{copied ? shell.linkCopied : shell.copyLink}</span>
    </Button>
  );
}

/** Holds the section's space while the module mounts, without layout jump. */
function SectionPlaceholder() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
