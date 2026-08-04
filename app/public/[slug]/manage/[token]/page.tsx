import { PublicBookingPageShell } from "@/components/public-booking-page-shell";
import { normalizeUrlSlugSegment } from "@/lib/public-url";
import { parsePublicLanguage } from "@/lib/public-language";

export const dynamic = "force-dynamic";

export default async function StandaloneManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ slug, token }, { lang }] = await Promise.all([params, searchParams]);
  const normalizedSlug = normalizeUrlSlugSegment(slug);

  return (
    <PublicBookingPageShell
      requestedPublicSlug={normalizedSlug}
      manageBookingToken={token}
      initialPublicLanguage={parsePublicLanguage(lang)}
    />
  );
}
