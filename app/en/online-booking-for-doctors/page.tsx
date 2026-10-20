import type { Metadata } from "next";

import { DoctorsPage } from "@/components/landing/doctors-page";
import { buildDoctorsJsonLd, buildDoctorsMetadata } from "@/components/landing/doctors-seo";
import { serializeJsonLd } from "@/components/landing/seo";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";
import { DOCTORS_LANDING_PATHS } from "@/lib/language/localized-routes";
import { createClient } from "@/lib/supabase/server";

// The language is the URL's: see lib/language/localized-routes.ts.
const LANG = "en";

export const metadata: Metadata = buildDoctorsMetadata(LANG);

export default async function OnlineBookingForDoctors() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildDoctorsJsonLd(LANG)) }}
      />
      <DoctorsPage
        lang={LANG}
        loggedIn={Boolean(data?.claims)}
        loginHref={withAuthReturnLanguage(`/login?next=${DOCTORS_LANDING_PATHS[LANG]}`, LANG)}
      />
    </>
  );
}
