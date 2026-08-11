import { HomeExperience } from "@/components/home-experience";
import { createClient } from "@/lib/supabase/server";
import { getProviderDashboardStore } from "@/lib/supabase/bookings";
import {
  getPublicationStatus,
  type PublicationStatus,
} from "@/lib/supabase/publication";
import { isSuperAdminEmail } from "@/lib/super-admin-policy";
import type { LandingVertical } from "@/components/landing/landing-ui";
import type { Lang } from "@/components/landing/translations";
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

function parseLanguage(value?: string): Lang | undefined {
  return value === "en" || value === "es" ? value : undefined;
}

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

  if (loggedIn) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? claimsData?.claims?.email;
    isSuperAdmin = isSuperAdminEmail(email);

    if (user) {
      try {
        [dashboardStore, publicationStatus] = await Promise.all([
          getProviderDashboardStore(supabase, user.id).then((store) => store ?? undefined),
          getPublicationStatus(supabase, user.id),
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

  return (
    <HomeExperience
      loggedIn={loggedIn}
      configured={configured}
      email={email}
      isSuperAdmin={isSuperAdmin}
      initialLanguage={parseLanguage(lang)}
      initialVertical={parseVertical(vertical)}
      initialPageName={name}
      dashboardStore={dashboardStore}
      publicationStatus={publicationStatus}
      resumeGuestPublish={isGuestPublishResume(resumePublish)}
    />
  );
}
