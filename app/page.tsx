import { HomeExperience } from "@/components/home-experience";
import { createClient } from "@/lib/supabase/server";
import type { LandingVertical } from "@/components/landing/landing-ui";

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
  searchParams: Promise<{ vertical?: string }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const { vertical } = await searchParams;
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const loggedIn = Boolean(claimsData?.claims);

  let configured = false;
  let email: string | undefined;

  if (loggedIn) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? claimsData?.claims?.email;

    if (user) {
      // "Configured" = this provider has completed setup. Drives whether the
      // landing shows verticals or a "go to your dashboard" panel.
      const { data: provider } = await supabase
        .from("providers")
        .select("setup_complete")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      configured = Boolean(provider?.setup_complete);
    }
  }

  return (
    <HomeExperience
      loggedIn={loggedIn}
      configured={configured}
      email={email}
      initialVertical={parseVertical(vertical)}
    />
  );
}
