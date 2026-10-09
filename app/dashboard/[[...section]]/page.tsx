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
  "business-type": "Change business type",
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

/**
 * Every dashboard section is served by this one route. Switching sections in
 * the browser never comes back here (the shell pushes history client-side);
 * this renders refreshes, deep links and new tabs.
 */
export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const [{ section: segments }, { checkout, google }] = await Promise.all([
    params,
    searchParams,
  ]);
  const section = sectionFromSegments(segments);

  if (!section) {
    notFound();
  }

  const load = await loadDashboard();

  if (!load.loggedIn) {
    redirect(`/login?next=${encodeURIComponent(pathForSection(section))}`);
  }

  // No finished page, or it could not be read: the landing page owns setup.
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
