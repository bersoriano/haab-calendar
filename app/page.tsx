import { redirect } from "next/navigation";
import { HomeExperience } from "@/components/home-experience";
import { getServerLanguage } from "@/lib/language/server";
import type { LandingVertical } from "@/components/landing/landing-ui";
import { isGuestPublishResume } from "@/lib/guest-builder";
import { pickFeaturedDemos } from "@/lib/demo-gallery";
import { resolveHomeRedirect } from "@/lib/dashboard-routes";
import { loadDashboard } from "@/lib/supabase/dashboard-loader";

const LANDING_VERTICALS: LandingVertical[] = [
  "healthcare",
  "spaces",
  "professional",
  "events",
  "restaurant",
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
    tab?: string;
    checkout?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const { lang, vertical, name, resumePublish, tab, checkout } = await searchParams;
  const load = await loadDashboard();

  // A provider with a finished page works from /dashboard. Old links that
  // carried a tab (Stripe Checkout sessions among them) keep their section.
  const dashboardTarget = resolveHomeRedirect({
    loggedIn: load.loggedIn,
    configured: load.configured,
    demoEditing: Boolean(load.demoEdit),
    tab,
    checkout,
  });

  if (dashboardTarget) {
    redirect(dashboardTarget);
  }

  const resolvedLanguage = await getServerLanguage(lang);

  return (
    <HomeExperience
      loggedIn={load.loggedIn}
      configured={load.configured}
      email={load.email}
      isSuperAdmin={load.isSuperAdmin}
      initialLanguage={resolvedLanguage}
      featuredDemos={pickFeaturedDemos()}
      initialVertical={parseVertical(vertical)}
      initialPageName={name}
      dashboardStore={load.dashboardStore}
      publicationStatus={load.publicationStatus}
      resumeGuestPublish={isGuestPublishResume(resumePublish)}
      viewerLanguage={resolvedLanguage}
    />
  );
}
