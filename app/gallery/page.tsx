import type { Metadata } from "next";

import { DemoGalleryPage } from "@/components/landing/demo-gallery-page";
import { allDemoIndexes } from "@/lib/demo-gallery";
import { getServerLanguage } from "@/lib/language/server";
import { createClient } from "@/lib/supabase/server";
import { withAuthReturnLanguage } from "@/lib/auth-i18n";

export const metadata: Metadata = {
  title: "Live booking page examples",
};

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const [resolvedLanguage, supabase] = await Promise.all([
    getServerLanguage(lang),
    createClient(),
  ]);

  const { data: claimsData } = await supabase.auth.getClaims();

  return (
    <DemoGalleryPage
      indexes={allDemoIndexes()}
      initialLanguage={resolvedLanguage}
      loggedIn={Boolean(claimsData?.claims)}
      loginHref={withAuthReturnLanguage("/login?next=/gallery", resolvedLanguage)}
    />
  );
}
