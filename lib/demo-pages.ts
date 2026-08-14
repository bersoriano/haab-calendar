import { buildProviderPath } from "@/lib/public-url";
import type { VerticalId } from "@/lib/types";

/**
 * The public example pages linked from the landing page. Each one is a real
 * provider row with its own synthetic owner account, so the normal
 * owner-scoped dashboard code can load and save it unchanged.
 *
 * `scripts/seed-public-examples.mjs` creates these rows and must stay in sync
 * with this list (see lib/__tests__/demo-pages.test.ts).
 */
export type DemoPage = {
  /** Stable key used in the demo-edit cookie and super-admin links. */
  key: string;
  vertical: VerticalId;
  providerSlug: string;
  /** Synthetic auth account that owns the provider row. */
  ownerEmail: string;
  label: string;
};

export const DEMO_OWNER_EMAIL_PREFIX = "public-examples+";
export const DEMO_OWNER_EMAIL_DOMAIN = "haab-calendar.invalid";

/** Names the demo being edited; grants nothing on its own. */
export const DEMO_EDIT_COOKIE = "haab_demo_edit";

export const DEMO_PAGES: readonly DemoPage[] = [
  {
    key: "doctors",
    vertical: "healthcare",
    providerSlug: "dr-maya-rivera",
    ownerEmail: "public-examples+doctors@haab-calendar.invalid",
    label: "Dr. Maya Rivera",
  },
  {
    key: "spaces",
    vertical: "spaces",
    providerSlug: "riverside-padel-club",
    ownerEmail: "public-examples+spaces@haab-calendar.invalid",
    label: "Riverside Padel Club",
  },
  {
    key: "professionals",
    vertical: "professional",
    providerSlug: "northstar-strategy",
    ownerEmail: "public-examples+professionals@haab-calendar.invalid",
    label: "Northstar Strategy",
  },
  {
    key: "events",
    vertical: "events",
    providerSlug: "makers-workshop",
    ownerEmail: "public-examples+events@haab-calendar.invalid",
    label: "Makers Workshop",
  },
  {
    key: "runners",
    vertical: "events",
    providerSlug: "kilometro-cero-running",
    ownerEmail: "public-examples+runners@haab-calendar.invalid",
    label: "Kilómetro Cero Running",
  },
  {
    key: "nails",
    vertical: "professional",
    providerSlug: "nube-rosa-nail-studio",
    ownerEmail: "public-examples+nails@haab-calendar.invalid",
    label: "Nube Rosa Nail Studio",
  },
  {
    key: "dentists",
    vertical: "healthcare",
    providerSlug: "brightpoint-dental",
    ownerEmail: "public-examples+dentists@haab-calendar.invalid",
    label: "Brightpoint Dental",
  },
  {
    key: "vets",
    vertical: "healthcare",
    providerSlug: "clinica-veterinaria-patitas",
    ownerEmail: "public-examples+vets@haab-calendar.invalid",
    label: "Clínica Veterinaria Patitas",
  },
  {
    key: "salons",
    vertical: "professional",
    providerSlug: "copperline-hair-studio",
    ownerEmail: "public-examples+salons@haab-calendar.invalid",
    label: "Copperline Hair Studio",
  },
  {
    key: "autoshops",
    vertical: "professional",
    providerSlug: "northgate-auto-service",
    ownerEmail: "public-examples+autoshops@haab-calendar.invalid",
    label: "Northgate Auto Service",
  },
  {
    key: "golf",
    vertical: "professional",
    providerSlug: "fairway-lab-golf",
    ownerEmail: "public-examples+golf@haab-calendar.invalid",
    label: "Fairway Lab Golf",
  },
] as const;

export function getDemoPagePath(page: DemoPage) {
  return buildProviderPath(page.vertical, page.providerSlug);
}

export function findDemoPage(key?: string | null): DemoPage | undefined {
  const normalized = key?.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  return DEMO_PAGES.find((page) => page.key === normalized);
}

/**
 * Second guard for demo editing: the provider row found by slug must still be
 * owned by one of the synthetic demo accounts, so a squatted slug can never
 * hand a real provider's dashboard to the super admin.
 */
export function isDemoOwnerEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return DEMO_PAGES.some((page) => page.ownerEmail === normalized);
}
