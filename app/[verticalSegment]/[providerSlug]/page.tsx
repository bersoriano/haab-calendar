import { notFound, permanentRedirect } from "next/navigation";
import { PublicBookingPageShell } from "@/components/public-booking-page-shell";
import {
  isPublicUrlBackendUnavailable,
  resolvePublicBookingUrl,
} from "@/lib/public-booking-resolver";
import { normalizeUrlSlugSegment } from "@/lib/public-url";
import {
  parsePublicLanguage,
  withPublicLanguage,
} from "@/lib/public-language";

export const dynamic = "force-dynamic";

export default async function PublicProviderBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ verticalSegment: string; providerSlug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ verticalSegment, providerSlug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const publicLanguage = parsePublicLanguage(query.lang);
  let resolution: Awaited<ReturnType<typeof resolvePublicBookingUrl>>;

  try {
    resolution = await resolvePublicBookingUrl({ verticalSegment, providerSlug });
  } catch (error) {
    if (!isPublicUrlBackendUnavailable(error)) {
      throw error;
    }

    return (
      <PublicBookingPageShell
        requestedPublicSlug={normalizeUrlSlugSegment(providerSlug)}
        initialPublicLanguage={publicLanguage}
      />
    );
  }

  if (!resolution) {
    notFound();
  }

  if (resolution.status === "redirect") {
    permanentRedirect(withPublicLanguage(resolution.location, publicLanguage));
  }

  return (
    <PublicBookingPageShell
      injectedConfig={resolution.store}
      requestedPublicSlug={resolution.store.provider.publicSlug}
      initialPublicLanguage={publicLanguage}
      providerTimeZone={resolution.meta.timezone}
    />
  );
}
