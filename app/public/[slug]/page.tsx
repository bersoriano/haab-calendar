import { PublicBookingPageShell } from "@/components/public-booking-page-shell";
import { normalizeUrlSlugSegment } from "@/lib/public-url";

export const dynamic = "force-dynamic";

export default async function StandalonePublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const normalizedSlug = normalizeUrlSlugSegment(slug);

  return <PublicBookingPageShell requestedPublicSlug={normalizedSlug} />;
}
