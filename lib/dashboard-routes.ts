import type { AdminTab } from "@/lib/types";

/**
 * The provider dashboard's URL model. Pure, so the server page, the client
 * shell and the `/` redirect all read one definition of which sections exist
 * and where they live.
 */
export const DASHBOARD_BASE_PATH = "/dashboard";

/** "hidden": routable, but reached from inside a section, not the sidebar. */
export type DashboardNavGroup = "operate" | "setup" | "account" | "hidden";

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
  { id: "business-type", segment: "business-type", group: "hidden" },
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
