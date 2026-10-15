import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HomeExperience } from "@/components/home-experience";
import {
  buildLandingJsonLd,
  buildLandingMetadata,
  serializeJsonLd,
} from "@/components/landing/seo";
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

// In the language the page renders in, resolved exactly as the page resolves
// it, so the title, canonical URL and previews describe the version served.
export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const { lang } = await searchParams;

  return buildLandingMetadata(await getServerLanguage(lang));
}

export default async function Home({ searchParams }: HomePageProps) {
  const { lang, vertical, name, resumePublish, tab, checkout } = await searchParams;
  const load = await loadDashboard();

  // A provider with a finished page works from /dashboard. Old links that
  // carried a tab (Stripe Checkout sessions among them) keep their section.
  const dashboardTarget = resolveHomeRedirect({
    loggedIn: load.loggedIn,
    configured: load.configured,
    demoEditing: Boolean(load.demoEdit),
    storeLoadFailed: load.storeLoadFailed,
    tab,
    checkout,
  });

  if (dashboardTarget) {
    redirect(dashboardTarget);
  }

  const resolvedLanguage = await getServerLanguage(lang);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildLandingJsonLd(resolvedLanguage)),
        }}
      />
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
    </>
  );
}
