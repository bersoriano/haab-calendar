import { createClient } from "@/lib/supabase/server";
import { getProviderDashboardContext } from "@/lib/supabase/bookings";
import { getProviderEntitlements } from "@/lib/entitlements/server";
import type { ProviderEntitlements } from "@/lib/entitlements/resolve";
import {
  getPublicationStatus,
  type PublicationStatus,
} from "@/lib/supabase/publication";
import { isSuperAdminEmail } from "@/lib/super-admin-policy";
import { resolveDemoEditTarget } from "@/lib/supabase/demo-edit";
import type { DemoEditBanner } from "@/lib/demo-pages";
import type { ModuleStore } from "@/lib/types";

export type DashboardLoad = {
  loggedIn: boolean;
  email?: string;
  isSuperAdmin: boolean;
  /** The provider (or the demo page being edited) has finished setup. */
  configured: boolean;
  demoEdit?: DemoEditBanner;
  dashboardStore?: ModuleStore;
  providerEntitlements?: ProviderEntitlements;
  publicationStatus?: PublicationStatus;
};

/**
 * Everything the signed-in surfaces read about the current viewer, loaded once
 * per request. `/` and `/dashboard` both call it so the two can never disagree
 * about whether someone has a page.
 */
export async function loadDashboard(): Promise<DashboardLoad> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const hasClaims = Boolean(claimsData?.claims);

  let configured = false;
  let email: string | undefined;
  let dashboardStore: ModuleStore | undefined;
  let providerEntitlements: ProviderEntitlements | undefined;
  let publicationStatus: PublicationStatus | undefined;
  let isSuperAdmin = false;
  let demoEdit: DemoEditBanner | undefined;
  // Claims come out of the cookie; a user comes from the server. A token that
  // still parses but no longer resolves to a user is not a session, and
  // treating it as one hides the log-in link from someone who needs it.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;

  if (hasClaims) {
    ({
      data: { user },
    } = await supabase.auth.getUser());
    email = user?.email ?? claimsData?.claims?.email;
    // From the verified user only: a token that no longer resolves to one is
    // not a session, and must not light up the super-admin entry.
    isSuperAdmin = isSuperAdminEmail(user?.email);

    // Super admin editing an example page: the dashboard runs against that
    // demo provider instead of the caller's own booking page.
    const demoTarget = isSuperAdmin ? await resolveDemoEditTarget() : null;

    if (demoTarget) {
      demoEdit = {
        label: demoTarget.page.label,
        publicPath: demoTarget.publicPath,
      };
    }

    if (user) {
      const storeClient = demoTarget?.admin ?? supabase;
      const storeUserId = demoTarget?.ownerUserId ?? user.id;

      try {
        const [dashboardContext, status] = await Promise.all([
          getProviderDashboardContext(storeClient, storeUserId),
          getPublicationStatus(storeClient, storeUserId),
        ]);

        dashboardStore = dashboardContext?.store;
        publicationStatus = status;
        // "Configured" = this provider has completed setup. Drives whether the
        // landing shows verticals or sends the owner to their dashboard.
        configured = Boolean(dashboardStore?.setupComplete);

        if (dashboardContext) {
          // Resolved per request from the provider ID the server just read —
          // never from the browser, and never cached. A demo-editing session
          // resolves the demo provider's entitlements, not the admin's.
          try {
            providerEntitlements = await getProviderEntitlements(
              dashboardContext.providerId,
            );
          } catch (error) {
            // An unreadable entitlement is an unknown answer, not a yes. The
            // dashboard stays; the integrations card says it cannot tell.
            console.error("provider_entitlements_load_failed", {
              providerId: dashboardContext.providerId,
              error: error instanceof Error ? error.message : String(error),
            });
            providerEntitlements = undefined;
          }
        }
      } catch (error) {
        console.error("provider_dashboard_store_load_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        configured = false;
      }
    }
  }

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
