import { SUPER_ADMIN_EMAIL } from "../../lib/super-admin-policy";

/**
 * The provider states the premium suite proves.
 *
 * Each one isolates a single rule about where an entitlement comes from, so a
 * failure names the rule that broke rather than "premium is wrong somewhere".
 * Every address is `.invalid`, which can never resolve — except the super
 * admin's, which the policy hard-codes; it is only ever created on the local
 * stack, already confirmed, so nothing is sent to it.
 */

export const E2E_PASSWORD = "haab-e2e-not-a-real-password";

export type E2ERole =
  | "free"
  | "billingPremium"
  | "premiumRevoked"
  | "freeGranted"
  | "billingInactive"
  | "businessTypeSwitch"
  | "businessTypeBlocked"
  | "bookingActions"
  | "publicManage"
  | "superAdmin"
  | "superAdminTarget";

export type E2EProviderSeed = {
  role: E2ERole;
  email: string;
  userId: string;
  providerId: string;
  businessName: string;
  slug: string;
  /** The legacy column, deliberately wrong in two cases to prove precedence. */
  legacyPlanTier: "free" | "premium";
  billing?: {
    status: string;
    planTier: "free" | "premium";
  };
  overrides?: Array<{
    featureKey: "custom_slug" | "google_calendar_sync";
    enabled: boolean;
  }>;
  /** Seeds one confirmed booking a week from today. */
  upcomingBooking?: boolean;
  /** Pins that booking to a fixed date, for screenshots that must not drift. */
  bookingDate?: string;
  /** A known manage-link token for that booking (stored hashed, as in production). */
  manageToken?: string;
  /** A fixed booking id: the public reference shown on the manage page derives from it. */
  bookingId?: string;
};

export const E2E_PROVIDERS: readonly E2EProviderSeed[] = [
  {
    role: "free",
    email: "free@example.invalid",
    userId: "00000000-0000-4000-8000-0000000e2e01",
    providerId: "00000000-0000-4000-8000-0000000e2ea1",
    businessName: "Free Clinic E2E",
    slug: "free-clinic-e2e",
    legacyPlanTier: "free",
  },
  {
    role: "billingPremium",
    email: "premium@example.invalid",
    userId: "00000000-0000-4000-8000-0000000e2e02",
    providerId: "00000000-0000-4000-8000-0000000e2ea2",
    businessName: "Premium Clinic E2E",
    slug: "premium-clinic-e2e",
    // Legacy stays free on purpose: premium must come from the subscription.
    legacyPlanTier: "free",
    billing: { status: "active", planTier: "premium" },
  },
  {
    role: "premiumRevoked",
    email: "premium-revoked@example.invalid",
    userId: "00000000-0000-4000-8000-0000000e2e03",
    providerId: "00000000-0000-4000-8000-0000000e2ea3",
    businessName: "Revoked Clinic E2E",
    slug: "revoked-clinic-e2e",
    legacyPlanTier: "free",
    // Paying, and still withheld: a support revoke outranks the subscription.
    billing: { status: "active", planTier: "premium" },
    overrides: [
      { featureKey: "custom_slug", enabled: false },
      { featureKey: "google_calendar_sync", enabled: false },
    ],
  },
  {
    role: "freeGranted",
    email: "free-granted@example.invalid",
    userId: "00000000-0000-4000-8000-0000000e2e04",
    providerId: "00000000-0000-4000-8000-0000000e2ea4",
    businessName: "Granted Clinic E2E",
    slug: "granted-clinic-e2e",
    legacyPlanTier: "free",
    overrides: [
      { featureKey: "custom_slug", enabled: true },
      { featureKey: "google_calendar_sync", enabled: true },
    ],
  },
  {
    role: "billingInactive",
    email: "billing-inactive@example.invalid",
    userId: "00000000-0000-4000-8000-0000000e2e05",
    providerId: "00000000-0000-4000-8000-0000000e2ea5",
    businessName: "Lapsed Clinic E2E",
    slug: "lapsed-clinic-e2e",
    // The legacy column says premium and the subscription has lapsed. The
    // subscription is what people pay for, so it decides.
    legacyPlanTier: "premium",
    billing: { status: "canceled", planTier: "free" },
  },
  {
    role: "businessTypeSwitch",
    email: "business-type@example.invalid",
    userId: "00000000-0000-4000-8000-0000000e2e06",
    providerId: "00000000-0000-4000-8000-0000000e2ea6",
    businessName: "Switching Clinic E2E",
    slug: "switching-clinic-e2e",
    legacyPlanTier: "free",
  },
  {
    role: "businessTypeBlocked",
    email: "business-type-blocked@example.invalid",
    userId: "00000000-0000-4000-8000-0000000e2e07",
    providerId: "00000000-0000-4000-8000-0000000e2ea7",
    businessName: "Busy Clinic E2E",
    slug: "busy-clinic-e2e",
    legacyPlanTier: "free",
    upcomingBooking: true,
  },
  {
    // Its booking is rescheduled and cancelled by the dashboard toast spec;
    // nothing else may depend on it.
    role: "bookingActions",
    email: "booking-actions@example.invalid",
    userId: "00000000-0000-4000-8000-0000000e2e08",
    providerId: "00000000-0000-4000-8000-0000000e2ea8",
    businessName: "Booking Actions E2E",
    slug: "booking-actions-e2e",
    legacyPlanTier: "free",
    upcomingBooking: true,
  },
  {
    // Read-only: the public visual guard screenshots its manage page and
    // opens (never confirms) the public cancel dialog.
    role: "publicManage",
    email: "public-manage@example.invalid",
    userId: "00000000-0000-4000-8000-0000000e2e09",
    providerId: "00000000-0000-4000-8000-0000000e2ea9",
    businessName: "Manage Page E2E",
    slug: "manage-page-e2e",
    legacyPlanTier: "free",
    upcomingBooking: true,
    bookingDate: "2027-01-15",
    manageToken: "e2e-public-manage-token",
    bookingId: "00000000-0000-4000-8000-0000000eb009",
  },
  {
    // Signs in to super admin. Nothing acts on this account itself.
    role: "superAdmin",
    email: SUPER_ADMIN_EMAIL,
    userId: "00000000-0000-4000-8000-0000000e2e10",
    providerId: "00000000-0000-4000-8000-0000000e2eaa",
    businessName: "Super Admin E2E",
    slug: "super-admin-e2e",
    legacyPlanTier: "free",
  },
  {
    // The super-admin spec toggles its publishing and feature overrides and
    // opens (never confirms) its deletion; nothing else may depend on it.
    role: "superAdminTarget",
    email: "super-admin-target@example.invalid",
    userId: "00000000-0000-4000-8000-0000000e2e11",
    providerId: "00000000-0000-4000-8000-0000000e2eab",
    businessName: "Managed Clinic E2E",
    slug: "managed-clinic-e2e",
    legacyPlanTier: "free",
  },
];

export function providerFor(role: E2ERole): E2EProviderSeed {
  const seed = E2E_PROVIDERS.find((provider) => provider.role === role);

  if (!seed) {
    throw new Error(`No E2E provider seeded for role: ${role}`);
  }

  return seed;
}

export function authStatePath(role: E2ERole) {
  return `.playwright/.auth/${role}.json`;
}
