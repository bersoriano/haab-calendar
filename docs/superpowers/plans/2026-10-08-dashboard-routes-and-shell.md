# Dashboard Routes, App Shell & Super Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every provider dashboard section its own URL under `/dashboard/*`, replace the stacked dashboard chrome with one sidebar shell + top bar + footer, reorganize each section, and move super admin onto the same shell with per-section routes — removing no functionality.

**Architecture:** One optional catch-all route `app/dashboard/[[...section]]/page.tsx` loads provider data server-side and renders a client `DashboardApp` that composes a shared `AppShell` with the existing `HaabBookingModule` in a new controlled `chrome="shell"` mode. Sidebar links are real anchors whose plain clicks become `history.pushState` (Next 16 syncs `usePathname`), so section switches never hit the server. Super admin uses an idiomatic `app/super-admin/layout.tsx` + one page per section on the same `AppShell`.

**Tech Stack:** Next.js 16.2 App Router, React 19.2, TypeScript, Tailwind v4, `@phosphor-icons/react`, Vitest 4 (node env, `react-dom/server`), Playwright 1.62, Supabase.

**Spec:** `docs/superpowers/specs/2026-10-08-dashboard-routes-and-shell-design.md`

## Global Constraints

- Dashboard routes live under `/dashboard`; section segments: `bookings`, `calendar`, `analytics`, `services`, `availability`, `appearance`, `integrations`, `settings` (overview = no segment).
- Section switching inside the dashboard must never request the server (offline-first).
- No new dependencies (runtime or dev).
- Same design tokens (`app/globals.css`), `liquid-glass-style-guide.md`, `components/provider/adminGlass.ts`. Hardcoded status colors → `--success-*` / `--danger-*` / `--warning-*`.
- Dashboard copy ships in English and Spanish; super admin is English-only.
- `HaabBookingModule` keeps working unchanged for hosts that do not pass the new props (`chrome` defaults to `"module"`).
- Component tests use `renderToStaticMarkup` in node env; interactions are covered by pure helpers + Playwright.
- Every commit follows Conventional Commits; never push to `main`.
- Gate per phase: `npm run typecheck && npm run lint && npm run test && npm run build`.

## Review Focus

- A signed-in provider whose page loaded but whose store has zero services → `integratedMode` is false in `useModuleStore`; `/dashboard` must still render (module falls back to standalone) rather than loop between `/` and `/dashboard`. Pinned by `resolveHomeRedirect` tests (configured flag only) + page logic test in Task 2.
- Modifier/middle clicks on sidebar links (⌘-click, Ctrl-click, middle click, `target=_blank`) must open a new tab, not be swallowed by `pushState`. Pinned by `shouldInterceptNavClick` tests in Task 1.
- `/dashboard/dashboard`, `/dashboard/bookings/extra`, `/dashboard/BOOKINGS` must 404, not render a section. Pinned by `sectionFromSegments` tests in Task 1.
- An admin save on any section must not navigate (old `router.replace("/")`). Pinned in Task 5 (`DashboardApp` passes no navigating `onSetupPersisted`) and E2E in Task 7.
- Unsaved Appearance edits must survive a section switch and be saved by the save bar. Pinned by `isStoreDirty` tests (Task 9) and E2E (Task 15).

---

## File Structure

| File | Responsibility | Phase |
|---|---|---|
| `lib/dashboard-routes.ts` (new) | Section list, section ↔ path, legacy redirect, Google outcome parsing | 1 |
| `lib/nav-click.ts` (new) | `shouldInterceptNavClick` pure predicate | 1 |
| `lib/supabase/dashboard-loader.ts` (new) | Server data load shared by `/` and `/dashboard` | 1 |
| `lib/demo-pages.ts` | + `DemoEditBanner` type (moved from home-experience) | 1 |
| `lib/types.ts` | `AdminTab` + `"availability"`, `"integrations"` | 1 |
| `lib/supabase/proxy.ts` | `/dashboard` protected | 1 |
| `components/ui/Alert.tsx` (new) | Token-colored alert/banner | 1 |
| `components/app-shell/*` (new) | `AppShell`, `SidebarNav`, `ShellIcon`, `ShellFooter`, `types.ts`, `super-admin-accent.ts` | 1 |
| `components/provider/dashboard-copy.ts` (new) | en/es shell copy | 1 |
| `components/provider/DashboardApp.tsx` (new) | Client composition for `/dashboard` | 1 |
| `components/provider/SetupHeader.tsx` (new) | Slim header for setup wizard / guest builder | 1 |
| `app/dashboard/[[...section]]/page.tsx` (new) | Dashboard route | 1 |
| `components/haab-booking-module.tsx` | `adminSection`, `onAdminSectionChange`, `chrome`, `onOpenDashboard`; availability/integrations sections; save bar (phase 2); section layouts (phase 2) | 1–2 |
| `components/provider/ProviderSettingsSurface.tsx` | Drops availability + integrations (phase 1), drops save props (phase 2) | 1–2 |
| `components/home-experience.tsx` | Setup/guest only; dashboard-only props removed | 1 |
| `app/page.tsx` | Loader + redirect | 1 |
| `app/api/provider/billing/checkout/route.ts`, `app/api/auth/callback/google/route.ts`, `app/super-admin/actions.ts` | Redirect targets | 1 |
| `lib/store-dirty.ts` (new) | `isStoreDirty` | 2 |
| `lib/booking-groups.ts` (new) | `groupBookingsByDate` | 2 |
| `lib/dashboard-overview.ts` (new) | `getNextSteps` | 2 |
| `components/provider/SaveBar.tsx` (new) | Sticky unsaved-changes bar | 2 |
| `components/provider/LanguageSettingsSection.tsx` | Split into `ClientLanguageField` + `DashboardLanguageField` | 2 |
| `lib/super-admin-accounts.ts` (new) | Account search/filter | 3 |
| `app/super-admin/layout.tsx`, `app/super-admin/{page,accounts/page,demo-pages/page,cleanups/page}.tsx` | Super-admin routes | 3 |
| `components/super-admin/SuperAdminShell.tsx` (new) | Client shell wrapper for super admin | 3 |

---

# Phase 1 — Routes, shell, header/footer, redirects (PR 1, branch `feat/dashboard-routes-shell`)

### Task 1: Route model + nav-click predicate

**Files:**
- Modify: `lib/types.ts:11-18`
- Create: `lib/dashboard-routes.ts`, `lib/nav-click.ts`
- Test: `lib/__tests__/dashboard-routes.test.ts`, `lib/__tests__/nav-click.test.ts`

**Interfaces:**
- Produces:
  - `type AdminTab = "dashboard" | "bookings" | "calendar" | "services" | "availability" | "appearance" | "analytics" | "integrations" | "settings"`
  - `DASHBOARD_BASE_PATH = "/dashboard"`
  - `type DashboardNavGroup = "operate" | "setup" | "account"`
  - `DASHBOARD_SECTIONS: readonly { id: AdminTab; segment: string; group: DashboardNavGroup }[]`
  - `isAdminTab(value: unknown): value is AdminTab`
  - `pathForSection(section: AdminTab, query?: Record<string, string | undefined>): string`
  - `sectionFromSegments(segments: string[] | undefined): AdminTab | null`
  - `sectionFromPathname(pathname: string): AdminTab | null`
  - `type CheckoutResult = "success" | "cancelled"`; `parseCheckoutResult(value?: string): CheckoutResult | undefined`
  - `resolveHomeRedirect(input: { loggedIn: boolean; configured: boolean; demoEditing: boolean; tab?: string; checkout?: string }): string | null`
  - `GOOGLE_OUTCOMES` tuple; `type GoogleOutcome`; `parseGoogleOutcome(value?: string): GoogleOutcome | undefined`
  - `shouldInterceptNavClick(event: NavClickLike): boolean`

- [ ] **Step 1: Write failing tests** — `lib/__tests__/dashboard-routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DASHBOARD_SECTIONS,
  isAdminTab,
  parseCheckoutResult,
  parseGoogleOutcome,
  pathForSection,
  resolveHomeRedirect,
  sectionFromPathname,
  sectionFromSegments,
} from "@/lib/dashboard-routes";

describe("dashboard sections", () => {
  it("maps every section to a unique path and back", () => {
    const paths = DASHBOARD_SECTIONS.map((section) => pathForSection(section.id));
    expect(new Set(paths).size).toBe(paths.length);
    for (const section of DASHBOARD_SECTIONS) {
      expect(sectionFromPathname(pathForSection(section.id))).toBe(section.id);
    }
  });

  it("serves the overview at the bare dashboard path", () => {
    expect(pathForSection("dashboard")).toBe("/dashboard");
    expect(sectionFromSegments(undefined)).toBe("dashboard");
    expect(sectionFromSegments([])).toBe("dashboard");
  });

  it("appends only the query values that are set", () => {
    expect(pathForSection("analytics", { checkout: "success" })).toBe(
      "/dashboard/analytics?checkout=success",
    );
    expect(pathForSection("analytics", { checkout: undefined })).toBe("/dashboard/analytics");
  });

  it("rejects unknown, nested, duplicated and miscased segments", () => {
    expect(sectionFromSegments(["dashboard"])).toBeNull();
    expect(sectionFromSegments(["bookings", "extra"])).toBeNull();
    expect(sectionFromSegments(["BOOKINGS"])).toBeNull();
    expect(sectionFromSegments(["nope"])).toBeNull();
  });

  it("reads sections from pathnames, ignoring a trailing slash", () => {
    expect(sectionFromPathname("/dashboard/")).toBe("dashboard");
    expect(sectionFromPathname("/dashboard/calendar/")).toBe("calendar");
    expect(sectionFromPathname("/dashboardx")).toBeNull();
    expect(sectionFromPathname("/")).toBeNull();
  });

  it("recognises admin tabs", () => {
    expect(isAdminTab("integrations")).toBe(true);
    expect(isAdminTab("billing")).toBe(false);
    expect(isAdminTab(undefined)).toBe(false);
  });
});

describe("resolveHomeRedirect", () => {
  it("leaves guests and providers without a page on the landing page", () => {
    expect(resolveHomeRedirect({ loggedIn: false, configured: false, demoEditing: false })).toBeNull();
    expect(resolveHomeRedirect({ loggedIn: true, configured: false, demoEditing: false })).toBeNull();
  });

  it("sends a configured provider to the dashboard", () => {
    expect(resolveHomeRedirect({ loggedIn: true, configured: true, demoEditing: false })).toBe(
      "/dashboard",
    );
  });

  it("sends a demo-editing super admin to the dashboard", () => {
    expect(resolveHomeRedirect({ loggedIn: true, configured: false, demoEditing: true })).toBe(
      "/dashboard",
    );
  });

  it("keeps legacy tab and checkout links working", () => {
    expect(
      resolveHomeRedirect({
        loggedIn: true,
        configured: true,
        demoEditing: false,
        tab: "analytics",
        checkout: "success",
      }),
    ).toBe("/dashboard/analytics?checkout=success");
  });

  it("drops unknown tabs and checkout values", () => {
    expect(
      resolveHomeRedirect({
        loggedIn: true,
        configured: true,
        demoEditing: false,
        tab: "billing",
        checkout: "maybe",
      }),
    ).toBe("/dashboard");
  });
});

describe("query parsing", () => {
  it("accepts only known checkout results", () => {
    expect(parseCheckoutResult("success")).toBe("success");
    expect(parseCheckoutResult("cancelled")).toBe("cancelled");
    expect(parseCheckoutResult("other")).toBeUndefined();
  });

  it("accepts only known Google outcomes", () => {
    expect(parseGoogleOutcome("connected")).toBe("connected");
    expect(parseGoogleOutcome("missing_scopes")).toBe("missing_scopes");
    expect(parseGoogleOutcome("<script>")).toBeUndefined();
    expect(parseGoogleOutcome(undefined)).toBeUndefined();
  });
});
```

`lib/__tests__/nav-click.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { shouldInterceptNavClick, type NavClickLike } from "@/lib/nav-click";

function click(overrides: Partial<NavClickLike> = {}): NavClickLike {
  return {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    target: "",
    ...overrides,
  };
}

describe("shouldInterceptNavClick", () => {
  it("intercepts a plain primary click", () => {
    expect(shouldInterceptNavClick(click())).toBe(true);
    expect(shouldInterceptNavClick(click({ target: "_self" }))).toBe(true);
  });

  it("leaves new-tab gestures to the browser", () => {
    expect(shouldInterceptNavClick(click({ metaKey: true }))).toBe(false);
    expect(shouldInterceptNavClick(click({ ctrlKey: true }))).toBe(false);
    expect(shouldInterceptNavClick(click({ shiftKey: true }))).toBe(false);
    expect(shouldInterceptNavClick(click({ altKey: true }))).toBe(false);
    expect(shouldInterceptNavClick(click({ button: 1 }))).toBe(false);
    expect(shouldInterceptNavClick(click({ target: "_blank" }))).toBe(false);
  });

  it("respects a handler that already prevented default", () => {
    expect(shouldInterceptNavClick(click({ defaultPrevented: true }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run lib/__tests__/dashboard-routes.test.ts lib/__tests__/nav-click.test.ts` — Expected: FAIL (modules not found).

- [ ] **Step 3: Implement.** `lib/types.ts` — replace the `AdminTab` union:

```ts
export type AdminTab =
  | "dashboard"
  | "bookings"
  | "calendar"
  | "services"
  | "availability"
  | "appearance"
  | "analytics"
  | "integrations"
  | "settings";
```

`lib/dashboard-routes.ts`:

```ts
import type { AdminTab } from "@/lib/types";

/**
 * The provider dashboard's URL model. Pure, so the server page, the client
 * shell and the `/` redirect all read one definition of which sections exist
 * and where they live.
 */
export const DASHBOARD_BASE_PATH = "/dashboard";

export type DashboardNavGroup = "operate" | "setup" | "account";

export type DashboardSectionDef = {
  id: AdminTab;
  /** Path segment under /dashboard; empty for the overview. */
  segment: string;
  group: DashboardNavGroup;
};

export const DASHBOARD_SECTIONS: readonly DashboardSectionDef[] = [
  { id: "dashboard", segment: "", group: "operate" },
  { id: "bookings", segment: "bookings", group: "operate" },
  { id: "calendar", segment: "calendar", group: "operate" },
  { id: "analytics", segment: "analytics", group: "operate" },
  { id: "services", segment: "services", group: "setup" },
  { id: "availability", segment: "availability", group: "setup" },
  { id: "appearance", segment: "appearance", group: "setup" },
  { id: "integrations", segment: "integrations", group: "setup" },
  { id: "settings", segment: "settings", group: "account" },
];

export function isAdminTab(value: unknown): value is AdminTab {
  return DASHBOARD_SECTIONS.some((section) => section.id === value);
}

export function pathForSection(
  section: AdminTab,
  query?: Record<string, string | undefined>,
): string {
  const segment = DASHBOARD_SECTIONS.find((entry) => entry.id === section)?.segment ?? "";
  const path = segment ? `${DASHBOARD_BASE_PATH}/${segment}` : DASHBOARD_BASE_PATH;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) params.set(key, value);
  }

  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/** Catch-all route params → section. Null means the URL names no section. */
export function sectionFromSegments(segments: string[] | undefined): AdminTab | null {
  if (!segments || segments.length === 0) return "dashboard";
  if (segments.length > 1) return null;

  const [segment] = segments;
  return (
    DASHBOARD_SECTIONS.find((entry) => entry.segment !== "" && entry.segment === segment)?.id ??
    null
  );
}

export function sectionFromPathname(pathname: string): AdminTab | null {
  if (pathname !== DASHBOARD_BASE_PATH && !pathname.startsWith(`${DASHBOARD_BASE_PATH}/`)) {
    return null;
  }

  const rest = pathname.slice(DASHBOARD_BASE_PATH.length).replace(/^\/+|\/+$/g, "");
  return sectionFromSegments(rest ? rest.split("/") : []);
}

export type CheckoutResult = "success" | "cancelled";

export function parseCheckoutResult(value?: string): CheckoutResult | undefined {
  return value === "success" || value === "cancelled" ? value : undefined;
}

/**
 * Where `/` sends a signed-in visitor. Providers with a finished page (and a
 * super admin editing a demo page) belong on the dashboard; everyone else
 * stays on the landing page. Old `/?tab=…&checkout=…` links — including
 * Stripe Checkout sessions created before the dashboard had routes — land on
 * the matching section.
 */
export function resolveHomeRedirect(input: {
  loggedIn: boolean;
  configured: boolean;
  demoEditing: boolean;
  tab?: string;
  checkout?: string;
}): string | null {
  if (!input.loggedIn || (!input.configured && !input.demoEditing)) {
    return null;
  }

  const section = isAdminTab(input.tab) ? input.tab : "dashboard";
  return pathForSection(section, { checkout: parseCheckoutResult(input.checkout) });
}

/** Every outcome `app/api/auth/callback/google/route.ts` can report. */
export const GOOGLE_OUTCOMES = [
  "connected",
  "declined",
  "missing_scopes",
  "not_entitled",
  "no_refresh_token",
  "no_provider",
  "invalid",
  "signed_out",
  "unavailable",
  "failed",
] as const;

export type GoogleOutcome = (typeof GOOGLE_OUTCOMES)[number];

export function parseGoogleOutcome(value?: string): GoogleOutcome | undefined {
  return GOOGLE_OUTCOMES.find((outcome) => outcome === value);
}
```

`lib/nav-click.ts`:

```ts
/** The parts of a click a link handler needs to decide who owns it. */
export type NavClickLike = {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  /** The anchor's `target` attribute ("" when absent). */
  target: string;
};

/**
 * True when an in-app link click should be handled client-side. New-tab and
 * new-window gestures, non-primary buttons and explicit targets stay with the
 * browser so the real `href` keeps working.
 */
export function shouldInterceptNavClick(event: NavClickLike): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  return !event.target || event.target === "_self";
}
```

- [ ] **Step 4: Run** the two test files — Expected: PASS. Run `npm run typecheck` — fix any `Record<AdminTab, …>` exhaustiveness errors by adding the two new keys where the compiler points.

- [ ] **Step 5: Commit** — `feat(dashboard): add section route model and nav click predicate`.

---

### Task 2: Shared server loader, `/` redirect, protected route

**Files:**
- Create: `lib/supabase/dashboard-loader.ts`
- Modify: `lib/demo-pages.ts` (add type), `app/page.tsx`, `lib/supabase/proxy.ts:6-11`, `components/home-experience.tsx` (type import only)
- Test: `lib/__tests__/proxy-routes.test.ts`

**Interfaces:**
- Consumes: `resolveHomeRedirect` (Task 1)
- Produces:
  - `type DemoEditBanner = { label: string; publicPath: string }` exported from `lib/demo-pages.ts`
  - `type DashboardLoad = { loggedIn: boolean; email?: string; isSuperAdmin: boolean; configured: boolean; demoEdit?: DemoEditBanner; dashboardStore?: ModuleStore; providerEntitlements?: ProviderEntitlements; publicationStatus?: PublicationStatus }`
  - `loadDashboard(): Promise<DashboardLoad>`

- [ ] **Step 1: Failing test** — append to `lib/__tests__/proxy-routes.test.ts`:

```ts
it("protects the dashboard and every section under it", () => {
  expect(isProtectedRoute("/dashboard")).toBe(true);
  expect(isProtectedRoute("/dashboard/bookings")).toBe(true);
  expect(isProtectedRoute("/dashboards")).toBe(false);
});
```

- [ ] **Step 2: Run** `npx vitest run lib/__tests__/proxy-routes.test.ts` — Expected: FAIL on the new case.

- [ ] **Step 3: Implement.**
  - `lib/supabase/proxy.ts`: add `"/dashboard",` as the first entry of `protectedRoutePrefixes`.
  - `lib/demo-pages.ts`: add
    ```ts
    /** Set when the super admin is editing one of the public example pages. */
    export type DemoEditBanner = {
      label: string;
      publicPath: string;
    };
    ```
    and in `components/home-experience.tsx` replace the local `DemoEditBanner` type with `export type { DemoEditBanner } from "@/lib/demo-pages";` + `import type { DemoEditBanner } from "@/lib/demo-pages";`.
  - `lib/supabase/dashboard-loader.ts`: move the body of `app/page.tsx` (from `const supabase = await createClient()` through the entitlement try/catch) into:
    ```ts
    import { createClient } from "@/lib/supabase/server";
    import { getProviderDashboardContext } from "@/lib/supabase/bookings";
    import { getProviderEntitlements } from "@/lib/entitlements/server";
    import type { ProviderEntitlements } from "@/lib/entitlements/resolve";
    import { getPublicationStatus, type PublicationStatus } from "@/lib/supabase/publication";
    import { isSuperAdminEmail } from "@/lib/super-admin-policy";
    import { resolveDemoEditTarget } from "@/lib/supabase/demo-edit";
    import type { DemoEditBanner } from "@/lib/demo-pages";
    import type { ModuleStore } from "@/lib/types";

    export type DashboardLoad = {
      loggedIn: boolean;
      email?: string;
      isSuperAdmin: boolean;
      /** The provider (or demo page being edited) has finished setup. */
      configured: boolean;
      demoEdit?: DemoEditBanner;
      dashboardStore?: ModuleStore;
      providerEntitlements?: ProviderEntitlements;
      publicationStatus?: PublicationStatus;
    };

    /**
     * Everything the signed-in surfaces read about the current viewer, loaded
     * once per request. `/` and `/dashboard` both call it so the two can never
     * disagree about whether someone has a page.
     */
    export async function loadDashboard(): Promise<DashboardLoad> {
      // …the exact statements from app/page.tsx, unchanged, ending with:
      return {
        loggedIn: Boolean(user),
        email,
        isSuperAdmin,
        configured,
        demoEdit,
        dashboardStore,
        providerEntitlements,
        publicationStatus,
      };
    }
    ```
    Keep every comment that travels with the moved statements.
  - `app/page.tsx`: replace the moved block with
    ```ts
    const load = await loadDashboard();
    const target = resolveHomeRedirect({
      loggedIn: load.loggedIn,
      configured: load.configured,
      demoEditing: Boolean(load.demoEdit),
      tab,
      checkout,
    });

    if (target) {
      redirect(target);
    }
    ```
    (`import { redirect } from "next/navigation"`), delete `parseAdminTab`, and pass `load.*` into `HomeExperience`. Drop the `initialAdminTab`, `checkoutResult`, `providerEntitlements`, `demoEdit` props (they move to `/dashboard`; Task 6 removes them from `HomeExperience`).

- [ ] **Step 4: Run** `npx vitest run lib/__tests__/proxy-routes.test.ts && npm run typecheck` — Expected: PASS (typecheck errors in `home-experience.tsx` about removed props are resolved in Task 6; if you run tasks in order, temporarily keep passing them until Task 6).

- [ ] **Step 5: Commit** — `feat(dashboard): share the dashboard loader and redirect providers from home`.

---

### Task 3: Alert primitive + app shell components + dashboard copy

**Files:**
- Create: `components/ui/Alert.tsx`, `components/app-shell/types.ts`, `components/app-shell/ShellIcon.tsx`, `components/app-shell/SidebarNav.tsx`, `components/app-shell/AppShell.tsx`, `components/app-shell/ShellFooter.tsx`, `components/app-shell/super-admin-accent.ts`, `components/provider/dashboard-copy.ts`
- Modify: `components/ui/index.ts`
- Test: `components/app-shell/__tests__/app-shell.test.tsx`, `components/provider/__tests__/dashboard-copy.test.ts`

**Interfaces:**
- Consumes: `shouldInterceptNavClick` (Task 1), `AdminTab`
- Produces:
  - `Alert({ tone: "neutral" | "success" | "warning" | "danger" | "accent"; title?: ReactNode; children?: ReactNode; actions?: ReactNode; role?: "status" | "alert"; className?: string })`
  - `type ShellIconName = "overview" | "bookings" | "calendar" | "analytics" | "services" | "availability" | "appearance" | "integrations" | "settings" | "accounts" | "demo" | "cleanups" | "superAdmin" | "back"`
  - `type ShellNavItem = { id: string; href: string; label: string; icon: ShellIconName; badge?: string | number }`
  - `type ShellNavGroup = { id: string; label?: string; items: ShellNavItem[] }`
  - `SidebarNav({ groups, activeId, ariaLabel, onNavigate? }: { …; onNavigate?: (item: ShellNavItem) => void })`
  - `AppShell({ sidebar, title, description?, topBarActions?, banners?, footer, children, copy: { skipToContent; openMenu; closeMenu }, navigationKey })` where `sidebar: ReactNode`
  - `ShellFooter({ links: { href: string; label: string; external?: boolean }[]; note: string })`
  - `SUPER_ADMIN_ACCENT_CLASS`, `SUPER_ADMIN_ACCENT_SOFT_CLASS`
  - `dashboardCopy: Record<Lang, DashboardShellCopy>`; `sectionTitle(section: AdminTab, lang: Lang, copy: VerticalCopy): string`

- [ ] **Step 1: Failing tests.** `components/app-shell/__tests__/app-shell.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const { AppShell } = await import("@/components/app-shell/AppShell");
const { SidebarNav } = await import("@/components/app-shell/SidebarNav");
const { ShellFooter } = await import("@/components/app-shell/ShellFooter");
const { Alert } = await import("@/components/ui/Alert");

const groups = [
  {
    id: "operate",
    label: "Operate",
    items: [
      { id: "dashboard", href: "/dashboard", label: "Overview", icon: "overview" as const },
      { id: "bookings", href: "/dashboard/bookings", label: "Bookings", icon: "bookings" as const },
    ],
  },
];

describe("SidebarNav", () => {
  it("renders real links and marks only the active one", () => {
    const html = renderToStaticMarkup(
      <SidebarNav groups={groups} activeId="bookings" ariaLabel="Dashboard" />,
    );
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/dashboard/bookings"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*href="\/dashboard\/bookings"|href="\/dashboard\/bookings"[^>]*aria-current="page"/);
    expect(html).toContain('aria-label="Dashboard"');
  });
});

describe("AppShell", () => {
  const html = renderToStaticMarkup(
    <AppShell
      sidebar={<p>sidebar</p>}
      title="Bookings"
      description="Every booking"
      footer={<ShellFooter links={[{ href: "/terms", label: "Terms" }]} note="© 2026 Haab Calendar" />}
      copy={{ skipToContent: "Skip to content", openMenu: "Open menu", closeMenu: "Close menu" }}
      navigationKey="bookings"
    >
      <p>content</p>
    </AppShell>,
  );

  it("has one h1, a skip link and a main landmark", () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
  });

  it("renders the footer links", () => {
    expect(html).toContain('href="/terms"');
    expect(html).toContain("© 2026 Haab Calendar");
  });

  it("offers a menu button for small screens", () => {
    expect(html).toContain('aria-label="Open menu"');
    expect(html).toContain('aria-expanded="false"');
  });
});

describe("Alert", () => {
  it("uses status tokens instead of fixed colors", () => {
    const html = renderToStaticMarkup(<Alert tone="danger">Nope</Alert>);
    expect(html).toContain("var(--danger-soft)");
    expect(html).not.toMatch(/#[0-9a-f]{6}/i);
  });
});
```

`components/provider/__tests__/dashboard-copy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dashboardCopy, sectionTitle } from "@/components/provider/dashboard-copy";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard-routes";
import { getVerticalCopy } from "@/lib/vertical-copy";

describe("dashboard shell copy", () => {
  it("describes every section in both languages", () => {
    for (const lang of ["en", "es"] as const) {
      for (const section of DASHBOARD_SECTIONS) {
        expect(dashboardCopy[lang].descriptions[section.id]).toBeTruthy();
        expect(sectionTitle(section.id, lang, getVerticalCopy("events", lang))).toBeTruthy();
      }
    }
  });

  it("never reuses an English string in Spanish", () => {
    const en = dashboardCopy.en;
    const es = dashboardCopy.es;
    for (const key of ["copyLink", "viewPage", "signOut", "openMenu", "skipToContent"] as const) {
      expect(es[key]).not.toBe(en[key]);
    }
  });

  it("names bookings and services with the vertical's own words", () => {
    expect(sectionTitle("bookings", "en", getVerticalCopy("restaurant", "en"))).toBe(
      getVerticalCopy("restaurant", "en").Bookings,
    );
  });
});
```

- [ ] **Step 2: Run** `npx vitest run components/app-shell components/provider/__tests__/dashboard-copy.test.ts` — Expected: FAIL (modules missing).

- [ ] **Step 3: Implement.**

`components/ui/Alert.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SUPER_ADMIN_ACCENT_SOFT_CLASS } from "@/components/app-shell/super-admin-accent";

export type AlertTone = "neutral" | "success" | "warning" | "danger" | "accent";

const TONE_CLASS: Record<AlertTone, string> = {
  neutral: "border-[var(--line)] bg-[var(--surface-lowest)] text-[var(--ink)]",
  success: "border-[var(--success-line)] bg-[var(--success-soft)] text-[var(--success-strong)]",
  warning: "border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-strong)]",
  danger: "border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger-strong)]",
  accent: SUPER_ADMIN_ACCENT_SOFT_CLASS,
};

/** One status message style for the whole provider and admin UI. */
export function Alert({
  tone,
  title,
  children,
  actions,
  role,
  className,
}: {
  tone: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  role?: "status" | "alert";
  className?: string;
}) {
  return (
    <div
      role={role}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        TONE_CLASS[tone],
        className,
      )}
    >
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title ? "mt-0.5" : "font-medium")}>{children}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
```

Export from `components/ui/index.ts`: `export { Alert, type AlertTone } from "@/components/ui/Alert";`

`components/app-shell/super-admin-accent.ts`:

```ts
/** The one place super admin's violet signpost is defined. */
export const SUPER_ADMIN_ACCENT_CLASS = "bg-violet-700 text-white hover:bg-violet-800";
export const SUPER_ADMIN_ACCENT_SOFT_CLASS = "border-violet-200 bg-violet-50 text-violet-900";
```

`components/app-shell/types.ts`:

```ts
export type ShellIconName =
  | "overview" | "bookings" | "calendar" | "analytics" | "services" | "availability"
  | "appearance" | "integrations" | "settings" | "accounts" | "demo" | "cleanups"
  | "superAdmin" | "back";

export type ShellNavItem = {
  id: string;
  href: string;
  label: string;
  icon: ShellIconName;
  badge?: string | number;
};

export type ShellNavGroup = {
  id: string;
  label?: string;
  items: ShellNavItem[];
};
```

`components/app-shell/ShellIcon.tsx` (`"use client"`): map names → Phosphor icons (`SquaresFour`, `ListChecks`, `CalendarBlank`, `ChartLineUp`, `Stack`, `Clock`, `PaintBrush`, `PlugsConnected`, `GearSix`, `UsersThree`, `Browsers`, `Broom`, `ShieldStar`, `ArrowLeft`) and render `<Icon aria-hidden size={20} weight={active ? "fill" : "regular"} />`. Icon names cross the server→client boundary as strings because super admin's layout is a server component.

`components/app-shell/SidebarNav.tsx` (`"use client"`):

```tsx
"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { shouldInterceptNavClick } from "@/lib/nav-click";
import { ShellIcon } from "@/components/app-shell/ShellIcon";
import type { ShellNavGroup, ShellNavItem } from "@/components/app-shell/types";

const itemClass =
  "group flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]";

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
    <nav aria-label={ariaLabel} className="grid gap-5">
      {groups.map((group) => (
        <div key={group.id}>
          {group.label ? (
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              {group.label}
            </p>
          ) : null}
          <ul className={cn("grid gap-1", group.label && "mt-2")}>
            {group.items.map((item) => {
              const active = item.id === activeId;
              const className = cn(
                itemClass,
                active
                  ? "bg-[var(--accent-soft)] text-[var(--primary)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]",
              );
              const content = (
                <>
                  <ShellIcon name={item.icon} active={active} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge !== undefined ? (
                    <span className="rounded-full bg-[var(--surface-highest)] px-2 py-0.5 text-xs font-semibold text-[var(--ink)]">
                      {item.badge}
                    </span>
                  ) : null}
                </>
              );

              return (
                <li key={item.id}>
                  {onNavigate ? (
                    <a
                      href={item.href}
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
                          onNavigate(item);
                        }
                      }}
                    >
                      {content}
                    </a>
                  ) : (
                    <Link href={item.href} aria-current={active ? "page" : undefined} className={className}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

`components/app-shell/AppShell.tsx` (`"use client"`): layout per spec §2 —
- root `div.min-h-screen bg-[var(--surface)] lg:grid lg:grid-cols-[272px_minmax(0,1fr)]`;
- skip link `<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] …">`;
- desktop `<aside className="hidden border-r border-[var(--line)] bg-[var(--surface-lowest)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">{sidebar}</aside>`;
- drawer: `const [openFor, setOpenFor] = useState<string | null>(null); const open = openFor === navigationKey;` (navigating changes `navigationKey`, which closes the drawer without an effect). When open: `role="dialog" aria-modal="true" aria-label={copy.openMenu}` panel (`fixed inset-y-0 left-0 z-50 w-[288px] max-w-[85vw] overflow-y-auto bg-[var(--surface-lowest)]`), backdrop button (`aria-label={copy.closeMenu}`), close button. Effect while open: lock `document.body.style.overflow`, focus the panel's first focusable, Esc closes, Tab/Shift+Tab wrap inside the panel; on close restore focus to the menu button.
- content column: sticky `header` (menu button `lg:hidden` with `aria-label={copy.openMenu}` + `aria-expanded={open}`; `<h1 id="shell-title" tabIndex={-1}>` + description; `topBarActions`), banners `div`, `<main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">`, then `footer`.

`components/app-shell/ShellFooter.tsx`:

```tsx
import Link from "next/link";

export function ShellFooter({
  links,
  note,
}: {
  links: { href: string; label: string; external?: boolean }[];
  note: string;
}) {
  return (
    <footer className="border-t border-[var(--line)] px-4 py-5 text-sm text-[var(--muted)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{note}</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <li key={link.href}>
              {link.external ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-[var(--ink)]">
                  {link.label}
                </a>
              ) : (
                <Link href={link.href} className="font-medium hover:text-[var(--ink)]">
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
```

`components/provider/dashboard-copy.ts`:

```ts
import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { GoogleOutcome } from "@/lib/dashboard-routes";
import type { AdminTab, Lang } from "@/lib/types";
import type { VerticalCopy } from "@/lib/vertical-copy";

export type DashboardShellCopy = {
  navLabel: string;
  groups: { operate: string; setup: string };
  titles: { overview: string; availability: string; integrations: string };
  descriptions: Record<AdminTab, string>;
  copyLink: string;
  linkCopied: string;
  viewPage: string;
  openMenu: string;
  closeMenu: string;
  skipToContent: string;
  signOut: string;
  superAdmin: string;
  signedInAs: string;
  pageLive: string;
  publishingOff: string;
  editingDemo: string;
  viewLive: string;
  exitDemo: string;
  terms: string;
  privacy: string;
  rights: string;
  google: Record<GoogleOutcome, string>;
};

export const dashboardCopy: Record<Lang, DashboardShellCopy> = {
  en: {
    navLabel: "Dashboard",
    groups: { operate: "Operate", setup: "Set up" },
    titles: { overview: "Overview", availability: "Availability", integrations: "Integrations" },
    descriptions: {
      dashboard: "What's coming up and how your page is doing.",
      bookings: "Search, filter and manage everything that's been booked.",
      calendar: "Your month at a glance. Pick an open day to add a booking.",
      analytics: "Visits, bookings and where they come from.",
      services: "What clients can book, with prices and times.",
      availability: "When you can be booked.",
      appearance: "How your public page looks and which language it speaks.",
      integrations: "Connect the tools you already use.",
      settings: "Business details, booking link and workspace language.",
    },
    copyLink: "Copy link",
    linkCopied: "Copied",
    viewPage: "View page",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    skipToContent: "Skip to content",
    signOut: "Sign out",
    superAdmin: "Super admin",
    signedInAs: "Signed in as",
    pageLive: "Page is live",
    publishingOff: "Publishing is off",
    editingDemo: "Editing demo page",
    viewLive: "View live",
    exitDemo: "Exit demo editing",
    terms: "Terms",
    privacy: "Privacy",
    rights: "Haab Calendar",
    google: {
      connected: "Google Calendar is connected.",
      declined: "Google Calendar wasn't connected because access was declined.",
      missing_scopes: "Google Calendar needs every permission it asks for. Connect again and allow all of them.",
      not_entitled: "Google Calendar sync is part of Premium.",
      no_refresh_token: "Google didn't grant lasting access. Connect again to finish.",
      no_provider: "Finish setting up your booking page before connecting Google Calendar.",
      invalid: "That Google sign-in expired. Please connect again.",
      signed_out: "Sign in again to connect Google Calendar.",
      unavailable: "Google Calendar isn't available right now.",
      failed: "Google Calendar couldn't be connected. Please try again.",
    },
  },
  es: {
    navLabel: "Panel",
    groups: { operate: "Operación", setup: "Configuración" },
    titles: { overview: "Resumen", availability: "Disponibilidad", integrations: "Integraciones" },
    descriptions: {
      dashboard: "Lo que viene y cómo va su página.",
      bookings: "Busque, filtre y gestione todo lo que le han reservado.",
      calendar: "Su mes de un vistazo. Elija un día abierto para agregar una reserva.",
      analytics: "Visitas, reservas y de dónde vienen.",
      services: "Lo que sus clientes pueden reservar, con precios y horarios.",
      availability: "Cuándo le pueden reservar.",
      appearance: "Cómo se ve su página pública y en qué idioma habla.",
      integrations: "Conecte las herramientas que ya usa.",
      settings: "Datos del negocio, enlace de reservas e idioma de su espacio.",
    },
    copyLink: "Copiar enlace",
    linkCopied: "Copiado",
    viewPage: "Ver página",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    skipToContent: "Saltar al contenido",
    signOut: "Cerrar sesión",
    superAdmin: "Superadministrador",
    signedInAs: "Sesión iniciada como",
    pageLive: "Página publicada",
    publishingOff: "Publicación desactivada",
    editingDemo: "Editando página de ejemplo",
    viewLive: "Ver publicada",
    exitDemo: "Salir de la edición",
    terms: "Términos",
    privacy: "Privacidad",
    rights: "Haab Calendar",
    google: {
      connected: "Google Calendar está conectado.",
      declined: "Google Calendar no se conectó porque se rechazó el acceso.",
      missing_scopes: "Google Calendar necesita todos los permisos que solicita. Conéctelo de nuevo y acéptelos todos.",
      not_entitled: "La sincronización con Google Calendar es parte de Premium.",
      no_refresh_token: "Google no otorgó acceso permanente. Conéctelo de nuevo para terminar.",
      no_provider: "Termine de configurar su página de reservas antes de conectar Google Calendar.",
      invalid: "Ese inicio de sesión con Google venció. Conéctelo de nuevo.",
      signed_out: "Inicie sesión de nuevo para conectar Google Calendar.",
      unavailable: "Google Calendar no está disponible en este momento.",
      failed: "No se pudo conectar Google Calendar. Inténtelo de nuevo.",
    },
  },
};

/** The page title for a section, in the owner's words for what they sell. */
export function sectionTitle(section: AdminTab, lang: Lang, copy: VerticalCopy): string {
  const shell = dashboardCopy[lang];
  const admin = bookingTranslations[lang].admin;

  switch (section) {
    case "dashboard":
      return shell.titles.overview;
    case "bookings":
      return copy.Bookings;
    case "calendar":
      return admin.tabCalendar;
    case "analytics":
      return admin.tabAnalytics;
    case "services":
      return copy.Services;
    case "availability":
      return shell.titles.availability;
    case "appearance":
      return admin.tabAppearance;
    case "integrations":
      return shell.titles.integrations;
    case "settings":
      return admin.tabSettings;
  }
}
```

- [ ] **Step 4: Run** the tests from Step 2 + `npm run typecheck` — Expected: PASS.

- [ ] **Step 5: Commit** — `feat(ui): add app shell, sidebar nav, footer and alert primitives`.

---

### Task 4: Module — controlled section, shell chrome, availability & integrations sections

**Files:**
- Modify: `components/haab-booking-module.tsx` (props ~212-268, destructure ~354-385, state ~403, Done step ~3594-3600, render shell ~7134-7305)
- Modify: `components/provider/ProviderSettingsSurface.tsx` (drop availability + integrations)
- Modify: `components/provider/ProviderIntegrationsSection.tsx` (accept `className`)
- Test: `components/provider/__tests__/provider-settings-surface.test.tsx`, `components/__tests__/settings-surface-composition.test.ts`

**Interfaces:**
- Consumes: `AdminTab` (Task 1), `dashboardCopy` (Task 3)
- Produces (new optional `HaabBookingModule` props):
  - `adminSection?: AdminTab`
  - `onAdminSectionChange?: (section: AdminTab) => void`
  - `chrome?: "module" | "shell"` (default `"module"`)
  - `onOpenDashboard?: () => void` — Done step "Go to dashboard"
  - `ProviderIntegrationsSection` gains `className?: string` (default keeps `"mt-6 border-t border-[var(--line)] pt-6"`)

- [ ] **Step 1: Update tests first.** In `provider-settings-surface.test.tsx`: delete the three cases that assert availability / manage-events / integrations live in Settings and the props they pass (`availability`, `vertical`, `onAvailabilityChange`, `onManageEvents`). Add:

```tsx
it("leaves availability and integrations to their own sections", () => {
  const html = render();
  expect(html).not.toContain(bookingTranslations.en.admin.weeklyAvailability);
  expect(html).not.toContain(bookingTranslations.en.admin.integrationsTitle);
});
```

Append to `components/__tests__/settings-surface-composition.test.ts` (source guards, like the file's existing ones):

```ts
describe("dashboard sections own availability and integrations", () => {
  const moduleSource = read("components/haab-booking-module.tsx");

  it("renders both as their own sections", () => {
    expect(moduleSource).toContain('currentSection === "availability"');
    expect(moduleSource).toContain('currentSection === "integrations"');
    expect(moduleSource).toContain("<AvailabilitySettingsSection");
    expect(moduleSource).toContain("<ProviderIntegrationsSection");
  });

  it("keeps the old header and tabs for hosts without the shell", () => {
    expect(moduleSource).toContain('chrome === "module"');
  });
});
```

- [ ] **Step 2: Run** `npx vitest run components/provider/__tests__/provider-settings-surface.test.tsx components/__tests__/settings-surface-composition.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement.**
  - Props block: add the four props with doc comments; destructure with `chrome = "module"`.
  - After `const [adminTab, setAdminTab] = …` add:
    ```ts
    // A host that owns routing (the /dashboard shell) controls the section;
    // otherwise the module keeps its own tab state, exactly as before.
    const currentSection: AdminTab = adminSection ?? adminTab;
    function goToSection(next: AdminTab) {
      if (onAdminSectionChange) {
        onAdminSectionChange(next);
        return;
      }
      setAdminTab(next);
    }
    ```
    Replace every read of `adminTab` in render code with `currentSection` and every `setAdminTab(x)` call outside the declaration with `goToSection(x)`.
  - Done step: the "Go to dashboard" `ActionButton` `onClick` becomes `() => (onOpenDashboard ? onOpenDashboard() : leaveSetupToSurface("management"))`.
  - Render shell (final `return`): wrap with `const showModuleChrome = chrome === "module";`. The `!isDedicatedPublicPage` header block renders only when `showModuleChrome`; in shell mode, when `surface === "public"` render just the back button row (`t.admin.backToWorkspace`, `onClick={() => setSurface("management")}`) above `renderPublicFlow()`. The outer `<section className={publicShellClass}>` stays for the public flow and module chrome; in shell mode the management branch renders inside a plain `<div>` (no rounded border/shadow, no `p-5 sm:p-8` — the shell's `<main>` pads).
  - Tab list (module chrome only) adds `["availability", dashboardCopy[lang].titles.availability]` after services and `["integrations", dashboardCopy[lang].titles.integrations]` after analytics.
  - Section switch adds:
    ```tsx
    {currentSection === "availability" ? (
      <AvailabilitySettingsSection
        vertical={vertical}
        availability={availability}
        onChange={updateAvailabilityDay}
        onManageEvents={() => goToSection("services")}
        maxBookingsPerDay={provider.maxBookingsPerDay}
        onMaxBookingsPerDayChange={(value) => updateProvider("maxBookingsPerDay", value)}
        disabled={isSavingAdmin}
        lang={lang}
      />
    ) : null}
    {currentSection === "integrations" ? (
      <ProviderIntegrationsSection
        entitlements={providerEntitlements}
        integratedMode={integratedMode}
        lang={lang}
        className={cn(adminPanelClass, "p-6")}
      />
    ) : null}
    ```
    Until Task 9 adds the save bar, the availability section shows the same Save button the Settings surface had (`SectionTitle` action, `integratedMode && persistAdminChanges`).
  - `ProviderSettingsSurface`: remove `AvailabilitySettingsSection`, `ProviderIntegrationsSection`, their props (`availability`, `vertical`, `onAvailabilityChange`, `onManageEvents`, `demoEdit`) and the two-column grid; render the single info panel at `max-w-3xl`. Keep `entitlements` (slug editor).
  - `ProviderIntegrationsSection`: `className = "mt-6 border-t border-[var(--line)] pt-6"` prop on the outer `<section>`.

- [ ] **Step 4: Run** Step 2 tests + `npm run typecheck && npm run lint` — Expected: PASS.

- [ ] **Step 5: Commit** — `feat(dashboard): let hosts control the module section and give availability and integrations their own sections`.

---

### Task 5: `DashboardApp` + `/dashboard/[[...section]]` route

**Files:**
- Create: `components/provider/DashboardApp.tsx`, `app/dashboard/[[...section]]/page.tsx`
- Test: `components/provider/__tests__/dashboard-app.test.tsx`

**Interfaces:**
- Consumes: `loadDashboard` (Task 2), shell (Task 3), module props (Task 4), `sectionFromPathname`, `pathForSection`, `parseCheckoutResult`, `parseGoogleOutcome`
- Produces: `DashboardApp(props: DashboardAppProps)` with
  ```ts
  type DashboardAppProps = {
    initialSection: AdminTab;
    store: ModuleStore;
    email?: string;
    isSuperAdmin: boolean;
    demoEdit?: DemoEditBanner;
    providerEntitlements?: ProviderEntitlements;
    publicationStatus?: PublicationStatus;
    viewerLanguage: Lang;
    checkoutResult?: CheckoutResult;
    googleOutcome?: GoogleOutcome;
  };
  ```

- [ ] **Step 1: Failing test** — `components/provider/__tests__/dashboard-app.test.tsx` (replaces the composed-language coverage that `dashboard-language.test.tsx` gave the old dashboard):

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyStore } from "@/lib/store";
import type { Lang, ModuleStore } from "@/lib/types";
import { dashboardCopy } from "@/components/provider/dashboard-copy";

const captured = vi.hoisted(() => ({ props: [] as Record<string, unknown>[], pathname: "/dashboard" }));

vi.mock("next/navigation", () => ({ usePathname: () => captured.pathname }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("@/app/login/actions", () => ({ logout: () => undefined }));
vi.mock("@/app/super-admin/actions", () => ({ stopDemoEdit: () => undefined }));
vi.mock("@/components/haab-booking-module", () => ({
  HaabBookingModule: (props: Record<string, unknown>) => {
    captured.props.push(props);
    return null;
  },
}));

const { DashboardApp } = await import("@/components/provider/DashboardApp");

function store(dashboardLanguage?: Lang): ModuleStore {
  const base = createEmptyStore();
  return {
    ...base,
    setupComplete: true,
    vertical: "events",
    provider: { ...base.provider, businessName: "Ferias del Sur", publicSlug: "ferias", language: "es", dashboardLanguage },
  };
}

function render(options: { pathname?: string; dashboardLanguage?: Lang; isSuperAdmin?: boolean; viewerLanguage?: Lang } = {}) {
  captured.props.length = 0;
  captured.pathname = options.pathname ?? "/dashboard";
  const html = renderToStaticMarkup(
    <DashboardApp
      initialSection="dashboard"
      store={store(options.dashboardLanguage)}
      email="owner@example.com"
      isSuperAdmin={options.isSuperAdmin ?? false}
      viewerLanguage={options.viewerLanguage ?? "en"}
    />,
  );
  return { html, moduleProps: captured.props[0] ?? {} };
}

describe("DashboardApp", () => {
  beforeEach(() => {
    captured.props.length = 0;
  });

  it("drives the module section from the URL", () => {
    expect(render({ pathname: "/dashboard/calendar" }).moduleProps.adminSection).toBe("calendar");
    expect(render({ pathname: "/dashboard" }).moduleProps.adminSection).toBe("dashboard");
  });

  it("asks the module for shell chrome and never navigates on save", () => {
    const { moduleProps } = render();
    expect(moduleProps.chrome).toBe("shell");
    expect(moduleProps).not.toHaveProperty("onSignOut");
  });

  it("writes the chrome in the same language it hands the module", () => {
    const { html, moduleProps } = render({ viewerLanguage: "en" });
    expect(html).toContain(dashboardCopy.en.copyLink);
    expect(moduleProps.viewerLanguage).toBe("en");
  });

  it("follows the owner's pinned workspace language, not the clients' language", () => {
    const { html, moduleProps } = render({ dashboardLanguage: "es", viewerLanguage: "en" });
    expect(html).toContain(dashboardCopy.es.copyLink);
    expect(moduleProps.viewerLanguage).toBe("es");
    expect(moduleProps).not.toHaveProperty("onLanguageChange");
  });

  it("links every section and shows super admin only to super admins", () => {
    const { html } = render();
    expect(html).toContain('href="/dashboard/integrations"');
    expect(html).not.toContain('href="/super-admin"');
    expect(render({ isSuperAdmin: true }).html).toContain('href="/super-admin"');
  });

  it("titles the page after the active section", () => {
    const { html } = render({ pathname: "/dashboard/availability" });
    expect(html).toMatch(/<h1[^>]*>Availability<\/h1>/);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run components/provider/__tests__/dashboard-app.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Implement `components/provider/DashboardApp.tsx`** (`"use client"`):
  - `const pathname = usePathname(); const section = sectionFromPathname(pathname) ?? initialSection;`
  - `const [snapshot, setSnapshot] = useState(store);` — fed by `onStoreChange` and `onSetupPersisted` (both `setSnapshot`; **no** router calls).
  - `const lang: Lang = snapshot.provider.dashboardLanguage ?? viewerLanguage;` `const copy = getVerticalCopy(snapshot.vertical, lang); const shell = dashboardCopy[lang];`
  - `const [hasNavigated, setHasNavigated] = useState(false);`
  - `navigate(next: AdminTab)`: `if (next !== section) window.history.pushState(null, "", pathForSection(next)); setHasNavigated(true);`
  - Effects on `section` change (skip first run via ref): `window.scrollTo({ top: 0 })`, focus `document.getElementById("shell-title")`. Separate effect: `document.title = \`${sectionTitle(section, lang, copy)} · ${snapshot.provider.businessName || "Haab Calendar"}\``.
  - Public path: `const slug = snapshot.provider.publicSlug || slugify(snapshot.provider.businessName || snapshot.provider.fullName || "haab-calendar"); const publicPath = snapshot.vertical ? buildProviderPath(snapshot.vertical, slug) : undefined;`
  - Copy link: `navigator.clipboard.writeText(\`${window.location.origin}${publicPath}\`)` with a 1.6s "Copied" state.
  - Nav groups from `DASHBOARD_SECTIONS`: `operate` and `setup` groups labelled from `shell.groups`; `settings` rendered in a second `SidebarNav` (no label) pinned near the bottom with the super-admin item (`href: "/super-admin"`, icon `superAdmin`, rendered via `Link` — not intercepted) when `isSuperAdmin`.
  - Sidebar content: `BrandMark` (`H` tile → `navigate("dashboard")` via an `<a href="/dashboard">` using the same interception), workspace card (logo `img` when `provider.logoImageUrl`, else initial; business name; status dot — `publicationStatus?.publishingEnabled === false` → `shell.publishingOff` + danger dot, else `shell.pageLive` + success dot), main nav, bottom nav, account row (initial avatar, `email` truncated with `title`, `<form action={logout}><button>{shell.signOut}</button></form>`).
  - Top bar actions: Copy link button + `<a href={publicPath} target="_blank" rel="noopener noreferrer">` View page (Phosphor `Copy` / `ArrowSquareOut`, label `sr-only sm:not-sr-only`).
  - Banners: demo edit → `<Alert tone="accent" title={shell.editingDemo} actions={<>View live link · <form action={stopDemoEdit}><button>…</button></form></>}>{demoEdit.label} · {demoEdit.publicPath}</Alert>`; publication message → `<Alert tone={publishingEnabled ? "success" : "danger"} role={publishingEnabled ? "status" : "alert"}>`.
  - Google outcome: when `section === "integrations" && googleOutcome && !hasNavigated`, render `<Alert tone={googleOutcome === "connected" ? "success" : googleOutcome === "declined" || googleOutcome === "not_entitled" ? "warning" : "danger"} role="status">{shell.google[googleOutcome]}</Alert>` in the shell banners slot.
  - Footer: `ShellFooter note={\`© ${new Date().getFullYear()} ${shell.rights}\`} links={[{ href: "/terms", label: shell.terms }, { href: "/privacy", label: shell.privacy }, …(publicPath ? [{ href: publicPath, label: shell.viewPage, external: true }] : [])]}`.
  - Module:
    ```tsx
    <HaabBookingModule
      injectedConfig={store}
      userEmail={email}
      persistAdminChanges
      viewerLanguage={lang}
      providerEntitlements={providerEntitlements}
      checkoutResult={hasNavigated ? undefined : checkoutResult}
      adminSection={section}
      onAdminSectionChange={navigate}
      chrome="shell"
      onStoreChange={setSnapshot}
      onSetupPersisted={setSnapshot}
    />
    ```

- [ ] **Step 4: Implement `app/dashboard/[[...section]]/page.tsx`:**

```tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DashboardApp } from "@/components/provider/DashboardApp";
import {
  parseCheckoutResult,
  parseGoogleOutcome,
  pathForSection,
  sectionFromSegments,
} from "@/lib/dashboard-routes";
import { getServerLanguage } from "@/lib/language/server";
import { loadDashboard } from "@/lib/supabase/dashboard-loader";
import type { AdminTab } from "@/lib/types";

const META_TITLES: Record<AdminTab, string> = {
  dashboard: "Overview",
  bookings: "Bookings",
  calendar: "Calendar",
  analytics: "Analytics",
  services: "Services",
  availability: "Availability",
  appearance: "Appearance",
  integrations: "Integrations",
  settings: "Settings",
};

type DashboardPageProps = {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ checkout?: string; google?: string }>;
};

export async function generateMetadata({ params }: DashboardPageProps): Promise<Metadata> {
  const section = sectionFromSegments((await params).section);
  return {
    // The client retitles in the owner's language and words after hydration.
    title: section ? `${META_TITLES[section]} · Haab Calendar` : "Haab Calendar",
    robots: { index: false, follow: false },
  };
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const [{ section: segments }, { checkout, google }] = await Promise.all([params, searchParams]);
  const section = sectionFromSegments(segments);

  if (!section) {
    notFound();
  }

  const load = await loadDashboard();

  if (!load.loggedIn) {
    redirect(`/login?next=${encodeURIComponent(pathForSection(section))}`);
  }

  // No finished page (or it could not be read): the landing page owns setup.
  if (!load.configured || !load.dashboardStore) {
    redirect("/");
  }

  return (
    <DashboardApp
      initialSection={section}
      store={load.dashboardStore}
      email={load.email}
      isSuperAdmin={load.isSuperAdmin}
      demoEdit={load.demoEdit}
      providerEntitlements={load.providerEntitlements}
      publicationStatus={load.publicationStatus}
      viewerLanguage={await getServerLanguage()}
      checkoutResult={parseCheckoutResult(checkout)}
      googleOutcome={parseGoogleOutcome(google)}
    />
  );
}
```

- [ ] **Step 5: Run** the Step 1 test + `npm run typecheck && npm run lint` — Expected: PASS.

- [ ] **Step 6: Commit** — `feat(dashboard): serve the provider dashboard at /dashboard with the app shell`.

---

### Task 6: Retarget redirects, slim setup header, trim `HomeExperience`

**Files:**
- Modify: `app/api/provider/billing/checkout/route.ts:89-90`, `app/api/provider/billing/checkout/route.test.ts:70-87`, `app/api/auth/callback/google/route.ts:49`, `app/super-admin/actions.ts` (redirects + revalidate), `components/home-experience.tsx`, `components/landing/use-cases.tsx` (`DashboardSection` open → `/dashboard`)
- Create: `components/provider/SetupHeader.tsx`
- Delete: `components/provider/AdminHero.tsx`, `components/provider/SelectedWorkflowHeader.tsx`, `components/provider/__tests__/admin-hero.test.tsx`, `components/provider/__tests__/selected-workflow-header.test.tsx`
- Test: `components/provider/__tests__/setup-header.test.tsx`, `components/__tests__/dashboard-language.test.tsx`, `components/__tests__/language-purity.test.tsx`

**Interfaces:**
- Produces: `SetupHeader({ lang, vertical?, userEmail?, onChooseAnother, onBackToHome, onSignOut? })`

- [ ] **Step 1: Update tests.**
  - `route.test.ts`: expected URLs become `https://haabcalendar.com/dashboard/analytics?checkout=success` / `…cancelled`.
  - `setup-header.test.tsx` — carry over every assertion from `selected-workflow-header.test.tsx` (workflow label, chooseAnother label, email, sign out only when `onSignOut`) against `SetupHeader`, plus: `expect(html.match(/<h1/g)).toBeNull()` is **not** required; assert a single header landmark: `expect(html).toContain("<header")`.
  - `dashboard-language.test.tsx`: rewrite `chromeLanguage` to read `landingTranslations[lang].home.selectedWorkflow` and `landingTranslations[lang].home.chooseAnotherWorkflow` (the setup header's strings) instead of `admin.heroTitle`; drop the `demoEdit`/`configured: true` case (configured owners are served by `/dashboard` now and covered by `dashboard-app.test.tsx`); keep the "same language as module" and "no `onLanguageChange` channel" cases.
  - `language-purity.test.tsx`: remove `AdminHero` render + its three markers (`"booking operations"`, `"workspace"`, `"sus reservas"`); add a `SetupHeader` render and markers `"Choose another workflow"` / `"Elegir otro flujo"`.

- [ ] **Step 2: Run** those tests — Expected: FAIL.

- [ ] **Step 3: Implement.**
  - Checkout route: `success_url: \`${origin}/dashboard/${returnTab}?checkout=success\``, same for cancel.
  - Google callback: `const settingsUrl = new URL("/dashboard/integrations", appOrigin);` and `finish` sets `settingsUrl.search = \`?google=${outcome}\``.
  - `startDemoEdit`: `revalidatePath("/", "layout"); redirect("/dashboard");` (non-admin early exit keeps `redirect("/")`). `stopDemoEdit`: `redirect("/super-admin/demo-pages")`.
  - `SetupHeader`: one sticky row — Haab `H` tile, workflow label + tagline (when `vertical`), `chooseAnotherWorkflow` button or `backToHome` button (no vertical), email + Sign out form when signed in.
  - `home-experience.tsx` `view === "app"` branch: render `AccountStatusBar`, `GuestDraftBar` (guest), `<SetupHeader …/>`, `<main>` with the module. Remove `DemoEditBar`, `AdminHero`, `SelectedWorkflowHeader`; remove props `providerEntitlements`, `initialAdminTab`, `checkoutResult`, `demoEdit` from the type and the module call; `onSetupPersisted={(store) => setPersistedDashboardStore(store)}` (no navigation); add `onOpenDashboard={() => router.push("/dashboard")}`. Landing `onOpenDashboard: () => router.push("/dashboard")`.
  - `use-cases.tsx` `DashboardSection`: if it renders a button with `onOpen`, keep the prop; the caller now pushes `/dashboard`.

- [ ] **Step 4: Run** `npm run test && npm run typecheck && npm run lint` — Expected: PASS.

- [ ] **Step 5: Commit** — `feat(dashboard): point redirects at dashboard routes and slim the setup header`.

---

### Task 7: Phase 1 verification

- [ ] **Step 1:** `npm run build` — Expected: success; route list shows `ƒ /dashboard/[[...section]]`.
- [ ] **Step 2:** Start `npm run dev`; in the browser (signed-in provider): `/` → `/dashboard`; each sidebar item changes the URL with no document request (Network panel); refresh on `/dashboard/calendar` stays on Calendar; back/forward step through sections; ⌘-click opens a new tab; `/dashboard/nope` → 404; mobile width 390px: menu opens drawer, Esc closes, item click navigates + closes. Signed out: `/dashboard/bookings` → `/login?next=/dashboard/bookings`.
- [ ] **Step 3:** Update `e2e/premium-entitlements.spec.ts` to open sections by URL (`page.goto("/dashboard/integrations")`, `/dashboard/settings`) instead of clicking the old tab buttons; add `e2e/dashboard-routes.spec.ts` covering deep link, refresh, back/forward, `/` redirect.
- [ ] **Step 4:** Commit — `test(e2e): cover dashboard section routes`.

---

# Phase 2 — Section organization + save bar (PR 2, branch `feat/dashboard-sections` from Phase 1)

### Task 9: Dirty tracking + save bar

**Files:**
- Create: `lib/store-dirty.ts`, `components/provider/SaveBar.tsx`
- Modify: `components/haab-booking-module.tsx` (track `savedStore`, render `SaveBar`, `beforeunload`, remove Save buttons in Appearance + Availability), `components/provider/ProviderSettingsSurface.tsx` (remove save props + button + messages), `components/provider/dashboard-copy.ts` (`unsavedChanges`, `discardHint` not needed — only `unsavedChanges`)
- Test: `lib/__tests__/store-dirty.test.ts`, `components/provider/__tests__/save-bar.test.tsx`, `components/provider/__tests__/provider-settings-surface.test.tsx`

**Interfaces:**
- Produces: `isStoreDirty(saved: ModuleStore, current: ModuleStore): boolean`; `SaveBar({ visible, saving, error, message, onSave, lang })`

- [ ] **Step 1: Failing tests.** `lib/__tests__/store-dirty.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createEmptyStore } from "@/lib/store";
import { isStoreDirty } from "@/lib/store-dirty";
import type { ModuleStore } from "@/lib/types";

function base(): ModuleStore {
  const store = createEmptyStore();
  return { ...store, setupComplete: true, vertical: "healthcare" };
}

describe("isStoreDirty", () => {
  it("is clean for an identical store", () => {
    expect(isStoreDirty(base(), base())).toBe(false);
  });

  it("flags provider, availability, services and vertical edits", () => {
    const saved = base();
    expect(isStoreDirty(saved, { ...saved, provider: { ...saved.provider, businessName: "New" } })).toBe(true);
    expect(
      isStoreDirty(saved, {
        ...saved,
        availability: { ...saved.availability, monday: { ...saved.availability.monday, enabled: !saved.availability.monday.enabled } },
      }),
    ).toBe(true);
    expect(isStoreDirty(saved, { ...saved, services: [] , vertical: "events" })).toBe(true);
  });

  it("ignores bookings and holds, which the server owns", () => {
    const saved = base();
    expect(
      isStoreDirty(saved, {
        ...saved,
        bookings: [{ id: "b1" } as ModuleStore["bookings"][number]],
        bookingHolds: [],
      }),
    ).toBe(false);
  });
});
```

`components/provider/__tests__/save-bar.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SaveBar } from "@/components/provider/SaveBar";
import { bookingTranslations } from "@/components/booking/i18n/translations";

const noop = () => undefined;

describe("SaveBar", () => {
  it("renders nothing when there is nothing to save or report", () => {
    expect(renderToStaticMarkup(<SaveBar visible={false} saving={false} onSave={noop} lang="en" />)).toBe("");
  });

  it("offers save while dirty", () => {
    const html = renderToStaticMarkup(<SaveBar visible saving={false} onSave={noop} lang="en" />);
    expect(html).toContain(bookingTranslations.en.admin.saveChanges);
    expect(html).toContain('role="region"');
  });

  it("shows the busy label while saving", () => {
    const html = renderToStaticMarkup(<SaveBar visible saving onSave={noop} lang="en" />);
    expect(html).toContain(bookingTranslations.en.common.saving);
  });

  it("keeps a failure visible", () => {
    const html = renderToStaticMarkup(<SaveBar visible saving={false} error="Nope" onSave={noop} lang="en" />);
    expect(html).toContain("Nope");
    expect(html).toContain('role="alert"');
  });

  it("confirms a save after the bar's work is done", () => {
    const html = renderToStaticMarkup(<SaveBar visible={false} saving={false} message="Saved" onSave={noop} lang="es" />);
    expect(html).toContain("Saved");
  });
});
```

In `provider-settings-surface.test.tsx` move the five save-related cases (offers save / withholds / busy / failure / confirmation) to `save-bar.test.tsx` (done above) and delete them from the surface test; add `expect(html).not.toContain(bookingTranslations.en.admin.saveChanges)`.

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Implement.**
  - `lib/store-dirty.ts`:
    ```ts
    import type { ModuleStore } from "@/lib/types";

    /** The parts of the store the "Save changes" PUT writes. */
    function persistedShape(store: ModuleStore) {
      return {
        provider: store.provider,
        availability: store.availability,
        services: store.services,
        vertical: store.vertical,
      };
    }

    /**
     * Whether the owner has edits the server has not seen. Bookings and holds
     * are excluded: they change from the server's side and through their own
     * endpoints, never through the settings save.
     */
    export function isStoreDirty(saved: ModuleStore, current: ModuleStore): boolean {
      return JSON.stringify(persistedShape(saved)) !== JSON.stringify(persistedShape(current));
    }
    ```
  - Module: `const [savedStore, setSavedStore] = useState<ModuleStore>(activeStore);` updated in `persistAdminStore` success (`setSavedStore(persistedStore)`) and in service upsert/remove success paths (they call `persistAdminStore`, so covered). `const hasUnsavedChanges = integratedMode && persistAdminChanges && isStoreDirty(savedStore, activeStore);` `useEffect` adds a `beforeunload` handler (`event.preventDefault(); event.returnValue = ""`) while `hasUnsavedChanges`. Render `<SaveBar visible={hasUnsavedChanges} saving={isSavingAdmin} error={adminSaveError} message={adminSaveMessage} onSave={() => void persistAdminStore(activeStore, t.admin.couldNotSaveSettings)} lang={lang} />` after the management sections (both chrome modes). Remove the Save `ActionButton` + inline error/message blocks from `renderAppearance` and the availability section.
  - `SaveBar`: `sticky bottom-4 z-30` container; when `visible || error`: `role="region" aria-label={copy.unsavedChanges}` card with text + primary `ActionButton`; `error` as `<Alert tone="danger" role="alert">`; `message` (when not visible) as `<Alert tone="success" role="status">`.
  - `ProviderSettingsSurface`: remove `canPersist` save button, `isSaving` → `disabled`, `saveError`, `saveMessage`, `onSave`; keep `canPersist` for the slug editor.

- [ ] **Step 4: Run** `npm run test && npm run typecheck && npm run lint` — Expected: PASS.

- [ ] **Step 5: Commit** — `feat(dashboard): one save bar for unsaved changes across sections`.

---

### Task 10: Overview reorganization + next steps

**Files:**
- Create: `lib/dashboard-overview.ts`
- Modify: `components/haab-booking-module.tsx` (`renderDashboard`), `components/provider/dashboard-copy.ts` (`overview` strings)
- Test: `lib/__tests__/dashboard-overview.test.ts`

**Interfaces:**
- Produces: `type NextStep = { id: "add-service" | "set-availability" | "publishing-off"; section: AdminTab }`; `getNextSteps(input: { serviceCount: number; vertical?: VerticalId; availability: WeeklyAvailability; publishingEnabled?: boolean }): NextStep[]`

- [ ] **Step 1: Failing test** `lib/__tests__/dashboard-overview.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createEmptyStore } from "@/lib/store";
import { getNextSteps } from "@/lib/dashboard-overview";

const openWeek = () => {
  const availability = createEmptyStore().availability;
  availability.monday.enabled = true;
  return availability;
};
const closedWeek = () => {
  const availability = createEmptyStore().availability;
  for (const day of Object.values(availability)) day.enabled = false;
  return availability;
};

describe("getNextSteps", () => {
  it("is empty when the page is ready", () => {
    expect(getNextSteps({ serviceCount: 2, vertical: "healthcare", availability: openWeek(), publishingEnabled: true })).toEqual([]);
  });

  it("asks for a service first", () => {
    expect(getNextSteps({ serviceCount: 0, vertical: "healthcare", availability: openWeek() }).map((s) => s.id)).toEqual(["add-service"]);
  });

  it("asks for availability when no day is open", () => {
    expect(getNextSteps({ serviceCount: 1, vertical: "healthcare", availability: closedWeek() })[0]).toEqual({
      id: "set-availability",
      section: "availability",
    });
  });

  it("does not ask events organisers for weekly hours", () => {
    expect(getNextSteps({ serviceCount: 1, vertical: "events", availability: closedWeek() })).toEqual([]);
  });

  it("surfaces publishing being off", () => {
    expect(getNextSteps({ serviceCount: 1, vertical: "spaces", availability: openWeek(), publishingEnabled: false }).map((s) => s.id)).toEqual(["publishing-off"]);
  });
});
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** `getNextSteps` (ordered add-service → set-availability → publishing-off; availability check `Object.values(availability).some((day) => day.enabled)`, skipped for `vertical === "events"`). Restructure `renderDashboard` per spec §3 Overview: stat grid `grid-cols-2 xl:grid-cols-4`; `xl:grid-cols-[minmax(0,1fr)_340px]` row with Upcoming (compact rows: left time block `formatTimeLabel`/full-day label + date, middle client/service/badges, right actions) + "See all bookings →" (`goToSection("bookings")`), side column with Booking page card (URL via `publicUrl`, `copyPublicLink`, view link, publish state passed in as new module prop `publishingEnabled?: boolean` from `DashboardApp`) and Next steps list (only when non-empty; each item a button → `goToSection(step.section)`). Add en/es strings `seeAllBookings`, `bookingPageTitle`, `nextStepsTitle`, `nextSteps: Record<NextStep["id"], { title: string; body: string; cta: string }>` to `dashboardCopy`.
- [ ] **Step 4: Run** tests + typecheck — PASS. **Step 5: Commit** — `feat(dashboard): reorganize the overview with booking page and next steps`.

---

### Task 11: Bookings — toolbar, result count, date groups, empty states

**Files:**
- Create: `lib/booking-groups.ts`
- Modify: `components/haab-booking-module.tsx` (`renderBookingsList`), `dashboard-copy.ts` (`results`, `clearFilters`, `today`, `tomorrow`, `noBookingsYetTitle`, `noBookingsYetBody`)
- Test: `lib/__tests__/booking-groups.test.ts`

**Interfaces:**
- Produces: `type BookingDateGroup<T> = { dateKey: string; relative: "today" | "tomorrow" | null; items: T[] }`; `groupBookingsByDate<T extends { dateKey: string }>(items: T[], todayKey: string): BookingDateGroup<T>[]` (preserves input order; groups in first-seen order)

- [ ] **Step 1: Failing test:**

```ts
import { describe, expect, it } from "vitest";
import { groupBookingsByDate } from "@/lib/booking-groups";

describe("groupBookingsByDate", () => {
  const items = [
    { id: "a", dateKey: "2026-10-08" },
    { id: "b", dateKey: "2026-10-08" },
    { id: "c", dateKey: "2026-10-09" },
    { id: "d", dateKey: "2026-10-12" },
  ];

  it("groups consecutive dates in order and labels today and tomorrow", () => {
    const groups = groupBookingsByDate(items, "2026-10-08");
    expect(groups.map((g) => [g.dateKey, g.relative, g.items.map((i) => i.id)])).toEqual([
      ["2026-10-08", "today", ["a", "b"]],
      ["2026-10-09", "tomorrow", ["c"]],
      ["2026-10-12", null, ["d"]],
    ]);
  });

  it("handles month and year boundaries for tomorrow", () => {
    expect(groupBookingsByDate([{ dateKey: "2027-01-01" }], "2026-12-31")[0].relative).toBe("tomorrow");
  });

  it("returns no groups for no bookings", () => {
    expect(groupBookingsByDate([], "2026-10-08")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** with `parseDateKey`/`addDays`/`getDateKey` from the date helpers the module already imports (locate with `grep -n "export function addDays\|export function getDateKey\|export function parseDateKey" lib/*.ts`). Restructure `renderBookingsList`: sticky toolbar (`sticky top-[72px] z-20` within the panel) with search/status/type, `{filteredBookings.length} {copy.bookings}` count, Clear filters (`ActionButton tone="ghost"` resetting the three filters, shown when any is active), Scan appointment (integrated). Groups render `<h3>` date headings (`today`/`tomorrow` copy or `formatDateLabel`). Empty: `bookings.length === 0` → "no bookings yet" copy; else existing "no matches" copy. Row markup keeps every field and action from today.
- [ ] **Step 4: Run** — PASS. **Step 5: Commit** — `feat(dashboard): group bookings by date with a filter toolbar`.

---

### Task 12: Calendar toolbar + compact mobile cells

**Files:** Modify `components/haab-booking-module.tsx` (`renderAdminCalendar`).

- [ ] **Step 1:** Restructure: single toolbar row (prev/today/next, month label, legend, service select labelled `t.admin.newBookingPrefix`). Weekday header `grid-cols-7 gap-1 sm:gap-2`. Cells: `min-h-[64px] sm:min-h-[124px] rounded-2xl sm:rounded-[26px] p-1.5 sm:p-3`; on `< sm` render booking chips as dots (`h-1.5 w-1.5 rounded-full`, color by type) capped at 3 + `+N`; on `sm+` keep chips. Keep `disabled`/`onClick` → `launchPublicFlow` logic byte-for-byte.
- [ ] **Step 2:** `npm run typecheck && npm run lint`; browser check at 390px and 1280px.
- [ ] **Step 3: Commit** — `feat(dashboard): tidy the calendar toolbar and compact it on phones`.

---

### Task 13: Appearance / Settings / language split + unified alerts

**Files:**
- Modify: `components/provider/LanguageSettingsSection.tsx` (export `ClientLanguageField`, `DashboardLanguageField`; keep `LanguageSettingsSection` composing both for module-chrome hosts), `components/haab-booking-module.tsx` (`renderAppearance` uses `ClientLanguageField`), `components/provider/ProviderSettingsSurface.tsx` (stacked cards: profile, booking link with copy button, `DashboardLanguageField`, danger zone), `components/provider/ProviderAnalyticsSurface.tsx` (`CheckoutResultBanner` → `Alert`; drop top `SectionTitle` when `hideTitle` prop set by module in shell chrome), `components/provider/ProviderIntegrationsSection.tsx` + `components/provider/GoogleCalendarCapabilities.tsx` (status pill classes → tokens where they are `rose`/`emerald`/hex)
- Test: `components/provider/__tests__/provider-settings-surface.test.tsx`, `components/provider/__tests__/appearance-split.test.tsx`, `components/__tests__/language-purity.test.tsx`

- [ ] **Step 1: Tests first.** Settings surface: add `onDashboardLanguageChange` prop + `dashboardLanguage`; assert `bookingTranslations.en.admin.dashboardLanguageLabel` renders in Settings and `clientLanguageLabel` does not. Appearance split: assert `ClientLanguageField` renders `clientLanguageLabel` and not `dashboardLanguageLabel`. Language purity: render `ClientLanguageField` + `DashboardLanguageField` instead of `LanguageSettingsSection` (markers unchanged).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** the split, settings cards (`grid gap-5 max-w-3xl`, each `cn(adminPanelClass, "p-6")` with `SectionTitle`), danger zone card with `--danger-line` border, replace hardcoded `#fecdd3`/`#fff1f2`/`#bbf7d0`/`#f0fdf4`/`#be123c`/`#15803d` alert blocks across `components/provider/*.tsx` with `<Alert>` (find with `grep -rn "#fecdd3\|#bbf7d0\|#fff1f2\|#f0fdf4" components/provider`).
- [ ] **Step 4: Run** `npm run test && npm run typecheck && npm run lint` — PASS. **Step 5: Commit** — `feat(dashboard): move workspace language to settings and unify alerts`.

---

### Task 14: Services sticky editor + mobile jump, analytics title

**Files:** Modify `components/provider/ServiceEditor.tsx` (editor column `lg:sticky lg:top-24`; list header gets "Add service" `ActionButton` on `< lg` that scrolls to and focuses `#service-editor-name`), `components/haab-booking-module.tsx` (pass `hideTitle` to analytics in shell chrome).

- [ ] **Step 1:** Implement; `npx vitest run components/__tests__/language-purity.test.tsx` (ServiceEditor markers) — PASS.
- [ ] **Step 2: Commit** — `feat(dashboard): keep the service editor in view`.

### Task 15: Phase 2 verification

- [ ] `npm run ci`; browser pass over every section at 390/768/1280/1440; E2E: unsaved Appearance edit survives switching to Bookings and back, save bar persists it, `beforeunload` armed. Commit — `test(e2e): cover the dashboard save bar`.

---

# Phase 3 — Super admin (PR 3, branch `feat/super-admin-shell` from Phase 2)

### Task 16: Account filtering model

**Files:** Create `lib/super-admin-accounts.ts`; Test `lib/__tests__/super-admin-accounts.test.ts`.

**Interfaces:** `type AccountStatusFilter = "all" | "enabled" | "disabled"`; `parseAccountStatusFilter(value?: string): AccountStatusFilter`; `filterManagedUsers<T extends { email: string | null; businessName?: string | null; publishingEnabled: boolean }>(users: T[], query: string, status: AccountStatusFilter): T[]`.

- [ ] **Step 1: Failing test:**

```ts
import { describe, expect, it } from "vitest";
import { filterManagedUsers, parseAccountStatusFilter } from "@/lib/super-admin-accounts";

const users = [
  { email: "ana@clinic.com", businessName: "Clínica Ana", publishingEnabled: true },
  { email: "bo@courts.io", businessName: "Bo Courts", publishingEnabled: false },
  { email: null, businessName: null, publishingEnabled: true },
];

describe("filterManagedUsers", () => {
  it("returns everyone for an empty query and all statuses", () => {
    expect(filterManagedUsers(users, "", "all")).toHaveLength(3);
  });

  it("matches email or business name, case and accent insensitive", () => {
    expect(filterManagedUsers(users, "CLINICA", "all").map((u) => u.email)).toEqual(["ana@clinic.com"]);
    expect(filterManagedUsers(users, "courts", "all").map((u) => u.email)).toEqual(["bo@courts.io"]);
  });

  it("filters by publishing state", () => {
    expect(filterManagedUsers(users, "", "disabled").map((u) => u.email)).toEqual(["bo@courts.io"]);
    expect(filterManagedUsers(users, "", "enabled")).toHaveLength(2);
  });

  it("parses unknown filters as all", () => {
    expect(parseAccountStatusFilter("disabled")).toBe("disabled");
    expect(parseAccountStatusFilter("x")).toBe("all");
  });
});
```

- [ ] **Step 2:** FAIL → **Step 3:** implement (normalize with `.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()`; confirm the real `ManagedUser` field names with `grep -n "export type ManagedUser" -A20 lib/supabase/publication.ts` and adapt the generic constraint to them) → **Step 4:** PASS → **Step 5:** commit `feat(super-admin): add account search and status filtering`.

### Task 17: Super-admin layout, shell and routes

**Files:**
- Create: `components/super-admin/SuperAdminShell.tsx` (`"use client"`: `AppShell` + `SidebarNav` with `next/link`, active id from `usePathname()`; title/description per route from a local map; account row; "← My dashboard" link), `app/super-admin/layout.tsx`, `app/super-admin/accounts/page.tsx`, `app/super-admin/demo-pages/page.tsx`, `app/super-admin/cleanups/page.tsx`
- Modify: `app/super-admin/page.tsx` (overview), `app/super-admin/actions.ts`, `app/api/super-admin/**` `revalidatePath` targets (find with `grep -rn "revalidatePath" app/api/super-admin app/super-admin`)
- Test: `components/super-admin/__tests__/super-admin-shell.test.tsx`

- [ ] **Step 1: Failing test** (markup): shell renders links `/super-admin`, `/super-admin/accounts`, `/super-admin/demo-pages`, `/super-admin/cleanups`, `/dashboard`; marks `aria-current` on the item matching the mocked pathname; shows the cleanup badge count when > 0.
- [ ] **Step 2:** FAIL → **Step 3:** Implement:
  - `layout.tsx`: `export const dynamic = "force-dynamic";` `try { await requireSuperAdmin() } catch (e) { if (e instanceof SuperAdminAccessError) notFound(); throw e; }`; load `email` via `createClient().auth.getUser()` and `pendingCleanups = (await listAccountDeletionCleanupJobs()).length`; render `<SuperAdminShell email pendingCleanups>{children}</SuperAdminShell>`.
  - `page.tsx` (overview): `listManagedUsers()` + `listAccountDeletionCleanupJobs()` → four tiles (`grid-cols-2 xl:grid-cols-4`) + "Needs attention" list (cleanups link when > 0; "{n} accounts can't publish" → `/super-admin/accounts?status=disabled` when > 0; else "Nothing needs attention").
  - `accounts/page.tsx`: `listManagedUsers()` → `<UserPublicationTable initialUsers={users} initialStatus={parseAccountStatusFilter(status)} initialQuery={q ?? ""} />`.
  - `demo-pages/page.tsx`: `<DemoPagesPanel demoPages={await listDemoPageSummaries()} />`.
  - `cleanups/page.tsx`: `<PendingDeletionCleanups initialJobs={await listAccountDeletionCleanupJobs()} />` with an empty state when none.
  - `revalidatePath("/super-admin")` calls become `revalidatePath("/super-admin", "layout")` so every sub-route refreshes.
- [ ] **Step 4:** PASS + typecheck → **Step 5:** commit `feat(super-admin): split super admin into routes on the app shell`.

### Task 18: Responsive accounts list, tokens, panels

**Files:** Modify `components/super-admin/UserPublicationTable.tsx` (search input + status chips updating `?q=`/`?status=` with `router.replace` and filtering via `filterManagedUsers`; `<table>` wrapped `hidden lg:block`; card list `lg:hidden` rendering the same fields and the same action buttons; remove `min-w-[1120px]` horizontal scroll at < lg), `components/super-admin/PendingDeletionCleanups.tsx` + `DemoPagesPanel.tsx` + `ProviderFeatureOverrides.tsx` + `DeleteAccountDialog.tsx` (emerald/rose/amber → status tokens; violet → `SUPER_ADMIN_ACCENT_*`; drop outer margins that the layout now provides).
- Test: existing `components/super-admin/__tests__/*` stay green; add a markup test that both the table and the card list render the account's action buttons.

- [ ] Step 1 test → Step 2 FAIL → Step 3 implement → Step 4 `npm run ci` PASS → Step 5 commit `feat(super-admin): responsive accounts list and status tokens`.

### Task 19: Phase 3 verification

- [ ] Browser: each super-admin route at 390/1280; non-admin gets 404 on every `/super-admin/*`; start demo edit → `/dashboard` with demo banner; exit → `/super-admin/demo-pages`. `npm run ci` green.
