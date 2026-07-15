import { HomeExperience } from "@/components/home-experience";
import { createClient } from "@/lib/supabase/server";
import { getProviderDashboardStore } from "@/lib/supabase/bookings";
import type { LandingVertical } from "@/components/landing/landing-ui";
import type { Lang } from "@/components/landing/translations";
import type { ModuleStore } from "@/lib/types";

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
  searchParams: Promise<{ lang?: string; vertical?: string }>;
};

function parseLanguage(value?: string): Lang | undefined {
  return value === "en" || value === "es" ? value : undefined;
}

export default async function Home({ searchParams }: HomePageProps) {
  const { lang, vertical } = await searchParams;
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const loggedIn = Boolean(claimsData?.claims);

  let configured = false;
  let email: string | undefined;
  let dashboardStore: ModuleStore | undefined;

  if (loggedIn) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? claimsData?.claims?.email;

    if (user) {
      try {
        dashboardStore = (await getProviderDashboardStore(supabase, user.id)) ?? undefined;
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
      initialLanguage={parseLanguage(lang)}
      initialVertical={parseVertical(vertical)}
      dashboardStore={dashboardStore}
    />
  );
}
