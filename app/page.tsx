import { HomeExperience, type DemoEditBanner } from "@/components/home-experience";
import { createClient } from "@/lib/supabase/server";
import { getProviderDashboardStore } from "@/lib/supabase/bookings";
import {
  getPublicationStatus,
  type PublicationStatus,
} from "@/lib/supabase/publication";
import { isSuperAdminEmail } from "@/lib/super-admin-policy";
import { resolveDemoEditTarget } from "@/lib/supabase/demo-edit";
import { getServerLanguage } from "@/lib/language/server";
import type { LandingVertical } from "@/components/landing/landing-ui";
import type { ModuleStore } from "@/lib/types";
import { isGuestPublishResume } from "@/lib/guest-builder";

const LANDING_VERTICALS: LandingVertical[] = [
  "healthcare",
  "spaces",
  "professional",
  "events",
];

function parseVertical(value?: string): LandingVertical | undefined {
  return LANDING_VERTICALS.find((id) => id === value);
}

type HomePageProps = {
  searchParams: Promise<{
    lang?: string;
    vertical?: string;
    name?: string;
    resumePublish?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const { lang, vertical, name, resumePublish } = await searchParams;
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const loggedIn = Boolean(claimsData?.claims);

  let configured = false;
  let email: string | undefined;
  let dashboardStore: ModuleStore | undefined;
  let publicationStatus: PublicationStatus | undefined;
  let isSuperAdmin = false;
  let demoEdit: DemoEditBanner | undefined;

  if (loggedIn) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? claimsData?.claims?.email;
    isSuperAdmin = isSuperAdminEmail(email);

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
        [dashboardStore, publicationStatus] = await Promise.all([
          getProviderDashboardStore(storeClient, storeUserId).then((store) => store ?? undefined),
          getPublicationStatus(storeClient, storeUserId),
        ]);
        // "Configured" = this provider has completed setup. Drives whether the
        // landing shows verticals or a "go to your dashboard" panel.
        configured = Boolean(dashboardStore?.setupComplete);
      } catch (error) {
        console.error("provider_dashboard_store_load_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        configured = false;
      }
    }
  }

  const resolvedLanguage = await getServerLanguage(lang);

  return (
    <HomeExperience
      loggedIn={loggedIn}
      configured={configured}
      email={email}
      isSuperAdmin={isSuperAdmin}
      initialLanguage={resolvedLanguage}
      initialVertical={parseVertical(vertical)}
      initialPageName={name}
      dashboardStore={dashboardStore}
      publicationStatus={publicationStatus}
      demoEdit={demoEdit}
      resumeGuestPublish={isGuestPublishResume(resumePublish)}
    />
  );
}
